import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getExperimentById, type Experiment } from '../data/experiments';
import { useResults } from '../hooks/useResults';
import './Participant.css';
import {
  StroopExperiment,
  MullerLyerExperiment,
  DigitSpanExperiment,
  UltimatumExperiment,
  AutonomousVehicleExperiment,
  ArabGeorgianIAT,
} from '../experiments';

const EXPERIMENT_COMPONENTS: Record<string, React.ComponentType<{
  experiment: Experiment;
  onComplete: (results: any) => void;
  participantId: string;
  roomId: string;
  isSubmitting?: boolean;
}>> = {
  'stroop-color-word-interference-task': StroopExperiment,
  'muller-lyer-illusion': MullerLyerExperiment,
  'digit-span-task': DigitSpanExperiment,
  'ultimatum-game': UltimatumExperiment,
  'moral-machine-ingroup': AutonomousVehicleExperiment,
  'iat-arab-georgian': ArabGeorgianIAT,
};

export function ExperimentPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [experiment, setExperiment] = useState<Experiment | null>(null);
  const [loading, setLoading] = useState(true);
  const [participantId] = useState(() => `PREVIEW_${Math.random().toString(36).substr(2, 5)}`);
  const [roomId] = useState(() => `DEV_${Math.random().toString(36).substr(2, 4)}`);
  const { submitResults, isSubmitting } = useResults();

  const initializeExperiment = () => {
    if (id) {
      const exp = getExperimentById(id);
      if (exp) setExperiment(exp);
    }
    setLoading(false);
  };

  useEffect(() => {
    initializeExperiment();
  }, [id, initializeExperiment]);

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
      <header className="fixed top-0 left-0 w-full z-[100] px-6 py-4 flex items-center bg-white/80 backdrop-blur-md border-b border-gray-100">
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span className="text-sm font-medium">Back</span>
        </button>
      </header>

      <main className={(experiment.id === 'iat-arab-georgian' || experiment.id === 'moral-machine-ingroup') ? "w-full min-h-screen" : "experiment-layout pt-20"}>
        <ExperimentComponent
          experiment={experiment}
          onComplete={submitResults}
          participantId={participantId}
          roomId={roomId}
          isSubmitting={isSubmitting}
        />
      </main>
    </div>
  );
}
