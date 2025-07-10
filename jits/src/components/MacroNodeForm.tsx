// src/components/MacroNodeForm.tsx
import { useState, type ChangeEvent } from 'react';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';

const macroNames = [
  'Closed Guard',
  'Half Guard',
  'Side Control',
  'Mount',
  'Back Control',
  'Turtle',
  'Leg Entanglement',
];

export default function MacroNodeForm() {
  const [selected, setSelected] = useState<string>('');
  const [custom, setCustom] = useState<string>('');

  const handleAdd = async () => {
    const name = custom.trim() || selected;
    if (!name) return;

    const position = {
      x: Math.random() * 600,
      y: Math.random() * 300
    };

    try {
      const docRef = await addDoc(collection(db, 'macroPositions'), {
        name,
        position,
        createdAt: Timestamp.now()
      });
      console.log('Added node with ID:', docRef.id);
      setSelected('');
      setCustom('');
    } catch (err) {
      console.error('Error adding node:', err);
      alert('Failed to add position.');
    }
  };

  return (
    <div className="space-y-2">
      <h2 className="text-lg font-semibold">Add Macro Position</h2>

      <select
        className="w-full border rounded p-2"
        value={selected}
        onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelected(e.target.value)}
      >
        <option value="">-- Select a position --</option>
        {macroNames.map((n) => (
          <option key={n} value={n}>{n}</option>
        ))}
      </select>

      <input
        className="w-full border rounded p-2"
        type="text"
        placeholder="Or enter custom name"
        value={custom}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setCustom(e.target.value)}
      />

      <button
        className="w-full bg-blue-500 text-white py-2 rounded"
        onClick={handleAdd}
      >
        Add Position
      </button>
    </div>
  );
}