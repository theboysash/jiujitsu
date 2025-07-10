import { useState, type ChangeEvent } from 'react';

type Props = {
  onAdd: (data: { name: string; type: 'variant' | 'decision' | 'outcome' }) => void;
};

export default function MicroNodeFormLocal({ onAdd }: Props) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'variant' | 'decision' | 'outcome'>('variant');

  const handleSubmit = () => {
    if (!name.trim()) return;
    onAdd({ name: name.trim(), type });
    setName('');
  };

  return (
    <div className="space-y-2">
      <h2 className="text-lg font-semibold">Add Micro Node</h2>

      <input
        className="w-full border rounded p-2"
        value={name}
        placeholder="Technique or state name"
        onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
      />

      <select
        className="w-full border rounded p-2"
        value={type}
        onChange={(e) => setType(e.target.value as 'variant' | 'decision' | 'outcome')}
      >
        <option value="variant">Variant (e.g., Knee Shield)</option>
        <option value="decision">Decision (fork/opponent action)</option>
        <option value="outcome">Outcome (sweep, submission)</option>
      </select>

      <button
        className="w-full bg-green-500 text-white py-2 rounded"
        onClick={handleSubmit}
      >
        Add Node
      </button>
    </div>
  );
}
