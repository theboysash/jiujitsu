//MicroGraph.tsx

import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, onSnapshot } from "firebase/firestore";

type MicroPosition = {
  id: string;
  name: string;
  // add other fields here if needed
};

export default function MicroGraph() {
  const [positions, setPositions] = useState<MicroPosition[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "microPositions"), snapshot => {
      const data: MicroPosition[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as Omit<MicroPosition, "id">),
      }));
      setPositions(data);
    });
    return unsub;
  }, []);

  return (
    <div>
      <h1>Micro Positions</h1>
      <ul>
        {positions.map(p => (
          <li key={p.id}>{p.name}</li>
        ))}
      </ul>
    </div>
  );
}
