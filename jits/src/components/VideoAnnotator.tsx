// src/components/VideoAnnotator.tsx
import { useState, useCallback, useMemo } from 'react';
import YouTube, { type YouTubeProps } from 'react-youtube';
import type { NodeType } from './MicroNodeFormLocal';

interface VideoAnnotatorProps {
  youtubeId: string; // can be full URL or just the ID
  onCreateClip: (clip: {
    name: string;
    type: NodeType;
    start: number;
    end: number;
    loop: boolean;
  }) => void;
}

// ✅ Export this helper to use elsewhere (e.g. MicroGraphLocal.tsx)
export function extractVideoId(input: string): string {
  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([\w-_-]{11})/,             // youtu.be/ID
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([\w-_-]{11})/, // youtube.com/watch?v=ID
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([\w-_-]{11})/    // youtube.com/embed/ID
  ];
  for (const pat of patterns) {
    const m = input.match(pat);
    if (m && m[1]) return m[1];
  }
  // fallback: if input length is 11 assume it's already a YouTube video ID
  return input;
}

export default function VideoAnnotator({ youtubeId, onCreateClip }: VideoAnnotatorProps) {
  const videoId = useMemo(() => extractVideoId(youtubeId), [youtubeId]);
  const [player, setPlayer] = useState<any>(null);
  const [start, setStart] = useState<number | null>(null);
  const [end, setEnd] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<NodeType>('variant');
  const [loop, setLoop] = useState(true);
  const [error, setError] = useState('');

  const onReady = useCallback((event: any) => {
    setPlayer(event.target);
  }, []);

  const onError = useCallback(() => {
    setError('Invalid YouTube ID or URL.');
  }, []);

  const markIn = useCallback(() => {
    if (player) setStart(player.getCurrentTime());
  }, [player]);

  const markOut = useCallback(() => {
    if (player) setEnd(player.getCurrentTime());
  }, [player]);

  const handleCreate = useCallback(() => {
    if (start === null || end === null) return;
    onCreateClip({ name, type, start, end, loop });
    // reset fields
    setName('');
    setType('variant');
    setStart(null);
    setEnd(null);
  }, [name, type, start, end, loop, onCreateClip]);

  const opts: YouTubeProps['opts'] = {
    height: '360',
    width: '640',
    playerVars: {
      autoplay: 0,
      controls: 1,
      mute: 0,
      modestbranding: 1,
    },
  };

  return (
    <div className="p-4 border rounded bg-white shadow-md">
      <h2 className="text-lg font-semibold mb-2">Annotate Clip</h2>
      {error && <p className="text-red-600">{error}</p>}
      {!error && (
        <YouTube
          videoId={videoId}
          opts={opts}
          onReady={onReady}
          onError={onError}
        />
      )}

      <div className="mt-4 flex space-x-2">
        <button
          onClick={markIn}
          disabled={!player}
          className="px-3 py-1 bg-green-500 text-white rounded disabled:opacity-50"
        >
          Mark In {start !== null && `(${start.toFixed(1)}s)`}
        </button>
        <button
          onClick={markOut}
          disabled={!player}
          className="px-3 py-1 bg-red-500 text-white rounded disabled:opacity-50"
        >
          Mark Out {end !== null && `(${end.toFixed(1)}s)`}
        </button>
      </div>

      <div className="mt-4 flex flex-col space-y-2">
        <input
          type="text"
          placeholder="Clip Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border px-2 py-1 rounded"
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value as NodeType)}
          className="border px-2 py-1 rounded"
        >
          <option value="variant">Variant</option>
          <option value="myMove">My Move</option>
          <option value="opponentMove">Opponent Move</option>
          <option value="outcome">Outcome</option>
        </select>
        <label className="inline-flex items-center">
          <input
            type="checkbox"
            checked={loop}
            onChange={() => setLoop((l) => !l)}
            className="mr-2"
          />
          Loop Clip
        </label>
      </div>

      <button
        onClick={handleCreate}
        disabled={start === null || end === null || !name || !!error}
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
      >
        Create Node from Clip
      </button>
    </div>
  );
}
