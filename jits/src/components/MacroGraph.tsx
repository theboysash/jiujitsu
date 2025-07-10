// src/components/MacroGraph.tsx
import { useEffect, useCallback, useMemo } from 'react';
import ReactFlow, { useNodesState, useEdgesState, type Connection, type Edge } from 'reactflow';
import 'reactflow/dist/style.css';

import MacroNodeForm from './MacroNodeForm';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, Timestamp } from 'firebase/firestore';

export default function MacroGraph() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Firestore snapshot for nodes
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'macroPositions'), (snap) => {
      const docs = snap.docs.map(doc => {
        const data = doc.data() as { name: string; position: { x: number; y: number } };
        return { id: doc.id, data: { label: data.name }, position: data.position };
      });
      setNodes(docs);
    });
    return () => unsub();
  }, [setNodes]);

  // Firestore snapshot for edges
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'macroEdges'), (snap) => {
      const docs = snap.docs.map(doc => {
        const data = doc.data() as { fromId: string; toId: string };
        return { id: doc.id, source: data.fromId, target: data.toId } as Edge;
      });
      setEdges(docs);
    });
    return () => unsub();
  }, [setEdges]);

  // Save new edge to Firestore
  const onConnectHandler = useCallback(async (params: Connection) => {
    if (!params.source || !params.target) return;
    try {
      await addDoc(collection(db, 'macroEdges'), {
        fromId: params.source,
        toId: params.target,
        createdAt: Timestamp.now()
      });
    } catch (err) {
      console.error('Error adding edge:', err);
    }
  }, []);

  // silence warnings
  const nodeTypes = useMemo(() => ({}), []);
  const edgeTypes = useMemo(() => ({}), []);

  return (
    <div className="flex h-screen">
      <div className="w-1/4 p-4 border-r overflow-y-auto">
        <MacroNodeForm />
      </div>
      <div className="flex-1" style={{ height: '100vh' }}>
        <ReactFlow
          style={{ width: '100%', height: '100%' }}
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnectHandler}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
        />
      </div>
    </div>
  );
}
