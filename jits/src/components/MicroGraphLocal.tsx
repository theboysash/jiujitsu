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

  const onNodeClick: NodeMouseHandler = useCallback((_, node) => setSelectedNodeId(node.id), []);
  const V_SPACING = 80;

  const computePosition = useCallback(
    (parentId: string | null, idx: number, count: number) => {
      if (!parentId) return { x: 50 + idx * V_SPACING, y: 50 };
      const parent = nodes.find(n => n.id === parentId)!;
      return { x: ((idx + 1) / (count + 1)) * window.innerWidth, y: parent.position.y + V_SPACING };
    },
    [nodes]
  );

  // Replace the entire handleAddNode function:
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
  const position = computePosition(parentId, siblings.length, siblings.length + 1);
  
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
      <div className="rounded overflow-hidden shadow">
        {vid && (
          <YouTube videoId={vid} opts={opts} onReady={onReady} onPause={onPause} />
        )}
        <p className="text-xs text-center font-semibold pt-1">{data.label}</p>
      </div>
    );
  }, []);

  const nodeTypes = useMemo(() => ({ videoNode: VideoNode }), [VideoNode]);

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
            Parent: <strong>{nodes.find(n => n.id === selectedNodeId)?.data.label}</strong>
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
          fitView
          style={{ width: '100%', height: '100%' }}
        />
      </div>
    </div>
  );
}
