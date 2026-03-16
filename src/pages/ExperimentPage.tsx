import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getExperimentById, type Experiment } from '../data/experiments';
import { useResults } from '../hooks/useResults';
import './Participant.css';
import {
  StroopExperiment,
  MullerLyerExperiment,
  DigitSpanExperiment,
  ReactionTimeExperiment,
  UltimatumExperiment,
} from '../experiments';
import type { ExperimentResults } from '../experiments/ExperimentWrapper';

const EXPERIMENT_COMPONENTS: Record<string, React.ComponentType<{
  experiment: Experiment;
  onComplete: (results: ExperimentResults) => void;
  participantId: string;
  roomId: string;
}>> = {
  'stroop-color-word-interference-task': StroopExperiment,
  'muller-lyer-illusion': MullerLyerExperiment,
  'digit-span-task': DigitSpanExperiment,
  'simple-and-choice-reaction-time-task': ReactionTimeExperiment,
  'ultimatum-game': UltimatumExperiment,
};

export function ExperimentPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [experiment, setExperiment] = useState<Experiment | null>(null);
  const [loading, setLoading] = useState(true);
  const [participantId] = useState(() => `PREVIEW_${Math.random().toString(36).substr(2, 5)}`);
  const [roomId] = useState(() => `DEV_${Math.random().toString(36).substr(2, 4)}`);
  const { submitResults, error } = useResults();

  useEffect(() => {
    if (id) {
      const exp = getExperimentById(id);
      if (exp) setExperiment(exp);
    }
    setLoading(false);
  }, [id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-surface font-mono">PREVIEW INITIALIZING...</div>;

  if (!experiment) return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-8 text-center">
      <div className="max-w-md">
        <h2 className="text-error">Module Missing</h2>
        <p className="text-text-secondary mt-4 mb-8">The requested experiment ID is not registered in the PsychoLab database.</p>
        <button onClick={() => navigate('/experiments')} className="btn-outline">Go to Catalog</button>
      </div>
    </div>
  );

  const ExperimentComponent = EXPERIMENT_COMPONENTS[experiment.id];

  if (!ExperimentComponent) return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-8 text-center">
      <div className="max-w-md">
        <h1 className="mb-4">Internal Preview</h1>
        <p className="text-text-secondary mb-10 leading-relaxed">
          The development component for "{experiment.name}" is not yet linked for direct preview.
          Check internal documentation for implementation status.
        </p>
        <button onClick={() => navigate('/experiments')} className="btn-primary">Browse Active Tasks</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      <header className="fixed top-0 left-0 w-full z-[100] px-8 py-4 flex justify-between items-center bg-white/80 backdrop-blur-md border-b border-gray-100">
        <span className="font-mono text-sm font-bold text-gray-900 tracking-tight">
          PREVIEW // <span className="text-blue-600">{experiment.name}</span>
        </span>
        <span className="text-[10px] font-black text-gray-400 tracking-[0.2em] uppercase bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
          Sandboxed Environment
        </span>
      </header>

      {error && (
        <div className="msg msg-error rounded-none m-0 text-center">
          Prototype Synchronization Error: {error}
        </div>
      )}

      <main className="experiment-layout">
        <ExperimentComponent
          experiment={experiment}
          onComplete={submitResults}
          participantId={participantId}
          roomId={roomId}
        />
      </main>
    </div>
  );
}
