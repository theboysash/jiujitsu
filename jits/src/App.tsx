import { useState } from 'react';
import reactLogo from './assets/react.svg';
import viteLogo from '/vite.svg';
import './App.css';

import AnnotatorWrapper from './components/AnnotatorWrapper';
import MacroGraph from './components/MacroGraph';
import MicroGraphLocal from './components/MicroGraphLocal';

import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link
} from 'react-router-dom';

function App() {
  const [count, setCount] = useState(0);

  return (
    <Router>
      <div>
        <nav style={{ marginBottom: '1rem' }}>
          <Link to="/">Home</Link> |{" "}
          <Link to="/macro">Macro Graph</Link> |{" "}
          <Link to="/micro">Micro Graph (Local)</Link>
        </nav>

        <Routes>
          {/* Home */}
          <Route
            path="/"
            element={
              <>
                <div>
                  <a href="https://vite.dev" target="_blank">
                    <img src={viteLogo} className="logo" alt="Vite logo" />
                  </a>
                  <a href="https://react.dev" target="_blank">
                    <img src={reactLogo} className="logo react" alt="React logo" />
                  </a>
                </div>
                <h1>Vite + React</h1>
                <div className="card">
                  <button onClick={() => setCount((count) => count + 1)}>
                    count is {count}
                  </button>
                  <p>
                    Edit <code>src/App.tsx</code> and save to test HMR
                  </p>
                </div>
                <p className="read-the-docs">
                  Click on the Vite and React logos to learn more
                </p>
              </>
            }
          />

          {/* Macro Graph */}
          <Route path="/macro" element={<MacroGraph />} />

          {/* Micro Graph (local only) */}
          <Route path="/micro" element={<MicroGraphLocal />} />

          // App.tsx or your routes file
          <Route path="/annotate/:youtubeId" element={<AnnotatorWrapper />} />

          
        </Routes>
      </div>
    </Router>
  );
}

export default App;
