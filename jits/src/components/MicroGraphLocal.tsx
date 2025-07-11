// src/components/MicroGraphLocal.tsx
import { useCallback, useState, useMemo, useEffect, useRef } from 'react';
import ReactFlow, {
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type Connection,
  type NodeMouseHandler,
  type NodeProps,
  Handle,
  Position,
  ConnectionLineType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import MicroNodeFormLocal, { type NodeType } from './MicroNodeFormLocal';
import VideoAnnotator, { extractVideoId as extractVideoIdFromAnnotator } from './VideoAnnotator';
import YouTube, { type YouTubeProps } from 'react-youtube';

import { db } from '../firebase';
import { collection, onSnapshot, addDoc, Timestamp } from 'firebase/firestore';

interface Data {
  label: string;
  nodeType: NodeType;
  parentId?: string;
  depth: number;
  youtubeId?: string;
  start?: number;
  end?: number;
  loop?: boolean;
  position: { x: number; y: number };
}

const getNodeStyle = (type: NodeType) => {
  switch (type) {
    case 'variant': return { background: '#ADD8E6', color: '#000', borderRadius: 6 };
    case 'myMove': return { background: '#0000FF', color: '#FFF', borderRadius: 6 };
    case 'opponentMove': return { background: '#008000', color: '#FFF', borderRadius: 6 };
    case 'outcome': return { background: '#FF0000', color: '#FFF', borderRadius: 6 };
    default: return { background: '#EEE', color: '#000', borderRadius: 6 };
  }
};

export default function MicroGraphLocal() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Data>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [annotationMode, setAnnotationMode] = useState(false);
  const [currentVideoId, setCurrentVideoId] = useState('');

  // Increased spacing to accommodate video nodes
  const H_SPACING = 400; // Increased from 180 to 240 (video width 160 + padding)
  const V_SPACING = 240; // Increased from 100 to 180 (video height 110 + label + padding)

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'microPositions'), snap => {
      const docs = snap.docs.map(doc => {
        const d = doc.data() as Data;
        return {
          id: doc.id,
          position: d.position,
          data: d,
          type: d.youtubeId ? 'videoNode' : 'default',
          style: getNodeStyle(d.nodeType)
        } as Node<Data>;
      });
      setNodes(docs);
    });
    return () => unsub();
  }, [setNodes]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'microEdges'), snap => {
      const docs = snap.docs.map(doc => {
        const d = doc.data() as { source: string; target: string };
        return { id: doc.id, source: d.source, target: d.target } as Edge;
      });
      setEdges(docs);
    });
    return () => unsub();
  }, [setEdges]);

  const calculateTreeLayout = useCallback(() => {
    const nodePositions = new Map<string, { x: number; y: number }>();
    
    // Get all nodes grouped by depth
    const nodesByDepth = new Map<number, Node<Data>[]>();
    nodes.forEach(node => {
      const depth = node.data.depth;
      if (!nodesByDepth.has(depth)) {
        nodesByDepth.set(depth, []);
      }
      nodesByDepth.get(depth)!.push(node);
    });

    // Position nodes level by level
    const maxDepth = Math.max(...Array.from(nodesByDepth.keys()));
    
    for (let depth = 0; depth <= maxDepth; depth++) {
      const nodesAtDepth = nodesByDepth.get(depth) || [];
      
      if (depth === 0) {
        // Root level - spread horizontally with more space
        nodesAtDepth.forEach((node, index) => {
          nodePositions.set(node.id, {
            x: 200 + index * H_SPACING * 1.5, // Increased initial spacing
            y: 80 // Increased top margin
          });
        });
      } else {
        // Group nodes by parent
        const nodesByParent = new Map<string, Node<Data>[]>();
        nodesAtDepth.forEach(node => {
          const parentId = node.data.parentId || 'root';
          if (!nodesByParent.has(parentId)) {
            nodesByParent.set(parentId, []);
          }
          nodesByParent.get(parentId)!.push(node);
        });

        // Position children under each parent
        nodesByParent.forEach((children, parentId) => {
          const parentPos = nodePositions.get(parentId);
          if (!parentPos) return;

          const numChildren = children.length;
          const totalWidth = (numChildren - 1) * H_SPACING;
          const startX = parentPos.x - totalWidth / 2;

          children.forEach((child, index) => {
            nodePositions.set(child.id, {
              x: startX + index * H_SPACING,
              y: parentPos.y + V_SPACING
            });
          });
        });
      }
    }

    return nodePositions;
  }, [nodes, H_SPACING, V_SPACING]);

  // Auto-reorganize tree layout when nodes change
  useEffect(() => {
    if (nodes.length === 0) return;
    
    const positions = calculateTreeLayout();
    const updatedNodes = nodes.map(node => ({
      ...node,
      position: positions.get(node.id) || node.position
    }));
    
    // Only update if positions actually changed
    const hasChanges = updatedNodes.some((node, index) => {
      const oldPos = nodes[index]?.position;
      const newPos = node.position;
      return !oldPos || oldPos.x !== newPos.x || oldPos.y !== newPos.y;
    });
    
    if (hasChanges) {
      setNodes(updatedNodes);
    }
  }, [nodes.length, calculateTreeLayout]); // Only recalculate when node count changes

  const reorganizeLayout = useCallback(() => {
    const positions = calculateTreeLayout();
    const updatedNodes = nodes.map(node => ({
      ...node,
      position: positions.get(node.id) || node.position
    }));
    setNodes(updatedNodes);
  }, [nodes, calculateTreeLayout, setNodes]);

  const onNodeClick: NodeMouseHandler = useCallback((_, node) => setSelectedNodeId(node.id), []);

  const computePosition = useCallback(
    (parentId: string | null, depth: number, siblingIndex: number) => {
      if (!parentId) {
        // Root nodes: spread horizontally at the top with more space
        const rootNodes = nodes.filter(n => n.data.depth === 0);
        return { x: 200 + rootNodes.length * H_SPACING * 1.5, y: 80 };
      }
      
      const parent = nodes.find(n => n.id === parentId);
      if (!parent) return { x: 200, y: 80 };
      
      // Get existing siblings with same parent
      const siblings = nodes.filter(n => 
        n.data.parentId === parentId && n.data.depth === depth
      );
      
      // Calculate position for the new node
      const totalSiblings = siblings.length + 1; // +1 for the new node
      const totalWidth = (totalSiblings - 1) * H_SPACING;
      const startX = parent.position.x - totalWidth / 2;
      
      return {
        x: startX + siblingIndex * H_SPACING,
        y: parent.position.y + V_SPACING
      };
    },
    [nodes, H_SPACING, V_SPACING]
  );

  const handleAddNode = useCallback(async (data: {
    name: string;
    type?: NodeType;
    youtubeId?: string;
    start?: number;
    end?: number;
    loop?: boolean;
  }) => {
    const nodeType = data.type ?? 'variant';
    const youtubeId = data.youtubeId;
    const { name, start, end, loop } = data;
    
    let parentId: string | null = null;
    let depth = 0;

    if (nodeType !== 'variant' && selectedNodeId) {
      const selectedNode = nodes.find(n => n.id === selectedNodeId)!;
      
      // Check if we're adding the same type as the selected node
      if (selectedNode.data.nodeType === nodeType) {
        // Same type = sibling (same level, same parent)
        parentId = selectedNode.data.parentId ?? null;
        depth = selectedNode.data.depth;
      } else {
        // Different type = child (next level down)
        parentId = selectedNodeId;
        depth = selectedNode.data.depth + 1;
      }
    }

    const siblings = nodes.filter(n => n.data.parentId === parentId && n.data.depth === depth);
    const position = computePosition(parentId, depth, siblings.length);
    
    try {
      const docRef = await addDoc(collection(db, 'microPositions'), {
        label: name,
        nodeType,
        parentId,
        depth,
        position,
        youtubeId,
        start,
        end,
        loop,
        createdAt: Timestamp.now(),
      });

      // Auto-connect to parent if not a root variant
      if (parentId) {
        await addDoc(collection(db, 'microEdges'), {
          source: parentId,
          target: docRef.id,
          createdAt: Timestamp.now(),
        });
      } else if (nodeType !== 'variant' && selectedNodeId) {
        // For siblings, connect to the same parent as the selected node
        const selectedNode = nodes.find(n => n.id === selectedNodeId)!;
        if (selectedNode.data.parentId) {
          await addDoc(collection(db, 'microEdges'), {
            source: selectedNode.data.parentId,
            target: docRef.id,
            createdAt: Timestamp.now(),
          });
        }
      }

      setSelectedNodeId(docRef.id);
      setAnnotationMode(false);
    } catch (err) {
      console.error('Error adding node:', err);
    }
  }, [nodes, selectedNodeId, computePosition]);

  // Persist manual connections to Firestore so edges snapshot updates
  const onConnectHandler = useCallback(async (connection: Connection) => {
    const { source, target } = connection;
    try {
      await addDoc(collection(db, 'microEdges'), {
        source: source!,
        target: target!,
        createdAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error creating edge:', error);
    }
  }, []);

  const VideoNode = useCallback(({ data }: NodeProps<Data>) => {
    const playerRef = useRef<any>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const vid = data.youtubeId ? extractVideoIdFromAnnotator(data.youtubeId) : undefined;

    const opts: YouTubeProps['opts'] = {
      height: '110',
      width: '160',
      playerVars: {
        autoplay: 1,
        mute: 1,
        controls: 0,
        rel: 0,
        modestbranding: 1,
        playsinline: 1,
        // @ts-ignore
        start: data.start,
        // @ts-ignore
        end: data.end,
      }
    };

    const onReady = (event: any) => {
      playerRef.current = event.target;
      const { loop, start, end } = data;
      if (start !== undefined) {
        playerRef.current.seekTo(start, true);
      }
      if (loop && start !== undefined && end !== undefined) {
        intervalRef.current = setInterval(() => {
          const currentTime = playerRef.current.getCurrentTime();
          if (currentTime >= end) {
            playerRef.current.seekTo(start);
          }
        }, 500);
      }
    };

    const onPause = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    useEffect(() => {
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }, []);

    return (
      <div className="rounded overflow-hidden shadow bg-white" style={{ minWidth: '180px' }}>
        <Handle type="target" position={Position.Top} />
        {vid && (
          <YouTube videoId={vid} opts={opts} onReady={onReady} onPause={onPause} />
        )}
        <p className="text-xs text-center font-semibold pt-2 pb-1 px-2">{data.label}</p>
        <Handle type="source" position={Position.Bottom} />
      </div>
    );
  }, []);

  // Custom default node component with handles
  const DefaultNode = useCallback(({ data }: NodeProps<Data>) => {
    return (
      <div 
        className="px-4 py-3 shadow-md border-2 border-gray-300 rounded min-w-[120px]"
        style={getNodeStyle(data.nodeType)}
      >
        <Handle type="target" position={Position.Top} />
        <div className="text-sm font-medium text-center">{data.label}</div>
        <Handle type="source" position={Position.Bottom} />
      </div>
    );
  }, []);

  const nodeTypes = useMemo(() => ({ 
    videoNode: VideoNode,
    default: DefaultNode 
  }), [VideoNode, DefaultNode]);

  return (
    <div className="flex h-screen">
      <div className="w-1/2 p-4 border-r overflow-y-auto">
        <input
          className="border px-2 py-1 rounded w-full"
          placeholder="YouTube URL or ID"
          value={currentVideoId}
          onChange={e => setCurrentVideoId(e.target.value)}
        />
        <button
          className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded"
          onClick={() => setAnnotationMode(m => !m)}
        >
          {annotationMode ? 'Manual Form' : 'Annotate Video'}
        </button>
        
        <button
          className="mt-2 ml-2 px-4 py-2 bg-green-600 text-white rounded"
          onClick={reorganizeLayout}
        >
          Reorganize Tree
        </button>

        {annotationMode ? (
          <VideoAnnotator
            youtubeId={currentVideoId}
            onCreateClip={(clip) => {
              console.log('Annotator callback:', clip, 'youtubeId:', currentVideoId);
              handleAddNode({
                name: clip.name,
                type: clip.type,
                youtubeId: currentVideoId,
                start: clip.start,
                end: clip.end,
                loop: clip.loop,
              });
            }}
          />
        ) : (
          <MicroNodeFormLocal
            onAdd={({ name, type }) => handleAddNode({ name, type })}
          />
        )}

        {selectedNodeId && (
          <p className="mt-4 text-sm text-gray-600">
            Selected: <strong>{nodes.find(n => n.id === selectedNodeId)?.data.label}</strong>
          </p>
        )}
      </div>

      <div className="flex-1" style={{ width: '400vh', height: '100vh' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          onConnect={onConnectHandler}
          deleteKeyCode={['Delete', 'Backspace']}
          nodeTypes={nodeTypes}
          connectionLineType={ConnectionLineType.SmoothStep}
          fitView
          style={{ width: '100%', height: '100%' }}
        />
      </div>
    </div>
  );
}