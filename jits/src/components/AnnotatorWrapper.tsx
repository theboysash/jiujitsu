// AnnotatorWrapper.tsx
import { useParams } from 'react-router-dom';
import VideoAnnotator from './VideoAnnotator';

export default function AnnotatorWrapper() {
  const { youtubeId } = useParams<{ youtubeId: string }>();

  const handleCreateClip = (clipData: any) => {
    console.log('Create Node from Clip:', clipData);
    // later: call your Firestore node creation logic here
  };

  return (
    <VideoAnnotator youtubeId={youtubeId!} onCreateClip={handleCreateClip} />
  );
}
