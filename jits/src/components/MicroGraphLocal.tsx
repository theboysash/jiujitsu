// src/components/MicroGraphLocal.tsx
import { useCallback, useMemo } from 'react';
import ReactFlow, {
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
} from 'reactflow';
import 'reactflow/dist/style.css';
import MicroNodeFormLocal from './MicroNodeFormLocal';

export default function MicroGraphLocal() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // handle drag-connect
  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge(params, eds));
    },
    [setEdges]
  );

  // add a new node to state
  const handleAddNode = useCallback(
    (nodeData: { name: string; type: 'variant' | 'decision' | 'outcome' }) => {
      const id = `${Date.now()}`;
      const position = { x: Math.random() * 600, y: Math.random() * 300 };
      setNodes((nds) =>
        nds.concat({
          id,
          position,
          data: { label: nodeData.name, nodeType: nodeData.type },
          type: 'default',
        })
      );
    },
    [setNodes]
  );

  // empty maps for now
  const nodeTypes = useMemo(() => ({}), []);
  const edgeTypes = useMemo(() => ({}), []);

  return (
    <div className="flex h-screen">
      {/* form panel */}
      <div className="w-1/4 p-4 border-r overflow-y-auto">
        <MicroNodeFormLocal onAdd={handleAddNode} />
      </div>

      {/* graph canvas */}
      <div className="flex-1" style={{ height: '100vh' }}>
        <ReactFlow
          style={{ width: '100%', height: '100%' }}
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
        />
      </div>
    </div>
  );
}
