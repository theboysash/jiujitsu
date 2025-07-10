// src/components/MicroNodeFormLocal.tsx
import { useState } from 'react';

export type NodeType = 'variant' | 'myMove' | 'opponentMove' | 'outcome';

interface Props {
  onAdd: (data: { name: string; type?: NodeType }) => void;
}

export default function MicroNodeFormLocal({ onAdd }: Props) {
  const [name, setName] = useState('');
  const [type, setType] = useState<NodeType>('variant');

  const handleAdd = () => {
    if (!name.trim()) return;
    onAdd({ name, type });
    setName('');
    setType('variant');
  };

  return (
    <div className="p-4 border rounded bg-white shadow-md mt-4">
      <h2 className="text-lg font-semibold mb-2">Create Manual Node</h2>
      <input
        type="text"
        placeholder="Node Label"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="border px-2 py-1 rounded w-full mb-2"
      />
      <select
        value={type}
        onChange={(e) => setType(e.target.value as NodeType)}
        className="border px-2 py-1 rounded w-full mb-2"
      >
        <option value="variant">Variant</option>
        <option value="myMove">My Move</option>
        <option value="opponentMove">Opponent Move</option>
        <option value="outcome">Outcome</option>
      </select>
      <button
        onClick={handleAdd}
        className="mt-2 px-4 py-2 bg-blue-600 text-white rounded"
      >
        Add Node
      </button>
    </div>
  );
}
