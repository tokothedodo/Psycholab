import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { getExperimentById, type Experiment } from '../data/experiments';
import { useResults } from '../hooks/useResults';
import {
  StroopExperiment,
  MullerLyerExperiment,
  DigitSpanExperiment,
  ReactionTimeExperiment,
  PonzoExperiment,
  AnchoringExperiment,
  TrolleyExperiment,
  DictatorExperiment,
  ChangeBlindnessExperiment,
  JNDExperiment,
  EbbinghausExperiment,
  KanizsaExperiment,
  UltimatumExperiment,
  InattentionalExperiment,
  SerialPositionExperiment,
  SternbergExperiment,
  DRMExperiment,
  FramingExperiment,
  BystanderExperiment,
  LossAversionExperiment,
  TrustExperiment,
  RubinVaseExperiment,
  ZollnerExperiment,
  AvailabilityExperiment,
  WasonExperiment,
  LindaExperiment,
  HindsightExperiment,
  SunkCostExperiment,
  IowaGamblingExperiment,
  PrisonersDilemmaExperiment,
  AschExperiment,
  IATExperiment,
  FalseConsensusExperiment,
  McGurkExperiment,
  RubberHandExperiment,
  ColorPerceptionExperiment,
  MotionAftereffectExperiment,
  HollowFaceExperiment,
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
  'ponzo-illusion': PonzoExperiment,
  'anchoring-and-adjustment-heuristic-task': AnchoringExperiment,
  'trolley-problem-paradigm': TrolleyExperiment,
  'dictator-game': DictatorExperiment,
  'change-detection-flicker-paradigm': ChangeBlindnessExperiment,
  'difference-threshold-staircase-paradigm': JNDExperiment,
  'ebbinghaus-illusion': EbbinghausExperiment,
  'kanizsa-illusory-contour-paradigm': KanizsaExperiment,
  'ultimatum-game': UltimatumExperiment,
  'inattentional-blindness-paradigm': InattentionalExperiment,
  'serial-position-effect-paradigm': SerialPositionExperiment,
  'sternberg-memory-scanning-task': SternbergExperiment,
  'deese-roediger-mcdermott-false-memory-paradigm': DRMExperiment,
  'attribute-framing-effect-paradigm': FramingExperiment,
  'bystander-intervention-paradigm': BystanderExperiment,
  'loss-aversion-task': LossAversionExperiment,
  'investment-game': TrustExperiment,
  'rubin-figure-ground-paradigm': RubinVaseExperiment,
  'zollner-illusion': ZollnerExperiment,
  'availability-heuristic-judgment-task': AvailabilityExperiment,
  'wason-selection-task': WasonExperiment,
  'conjunction-fallacy-paradigm': LindaExperiment,
  'hindsight-bias-paradigm': HindsightExperiment,
  'sunk-cost-effect-paradigm': SunkCostExperiment,
  'iowa-gambling-task': IowaGamblingExperiment,
  'iterated-prisoners-dilemma': PrisonersDilemmaExperiment,
  'asch-conformity-paradigm': AschExperiment,
  'implicit-association-test': IATExperiment,
  'false-consensus-effect-paradigm': FalseConsensusExperiment,
  'mcgurk-effect': McGurkExperiment,
  'rubber-hand-illusion': RubberHandExperiment,
  'color-category-perception-paradigm': ColorPerceptionExperiment,
  'motion-aftereffect-paradigm': MotionAftereffectExperiment,
  'hollow-face-illusion': HollowFaceExperiment,
};

const PLACEHOLDER_EXPERIMENTS: Record<string, React.ComponentType<{
  experiment: Experiment;
  onComplete: (results: ExperimentResults) => void;
  participantId: string;
  roomId: string;
}>> = {};

export function ExperimentPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [experiment, setExperiment] = useState<Experiment | null>(null);
  const [loading, setLoading] = useState(true);
  const [participantId] = useState(() => `P_${Math.random().toString(36).substr(2, 9)}`);
  const [roomId] = useState(() => `R_${Math.random().toString(36).substr(2, 6)}`);
  const { submitResults, error, setError } = useResults();

  useEffect(() => {
    if (id) {
      const exp = getExperimentById(id);
      if (exp) {
        setExperiment(exp);
      }
    }
    setLoading(false);
  }, [id]);

  const handleComplete = async (results: ExperimentResults) => {
    await submitResults(results);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">{t('common.loading')}</p>
      </div>
    );
  }

  if (!experiment) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Experiment not found</p>
          <button
            onClick={() => navigate('/experiments')}
            className="text-teal-600 hover:underline"
          >
            {t('nav.experiments')}
          </button>
        </div>
      </div>
    );
  }

  const ExperimentComponent = EXPERIMENT_COMPONENTS[experiment.id] || PLACEHOLDER_EXPERIMENTS[experiment.id];

  if (!ExperimentComponent) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Experiment "{experiment.name}" is coming soon!</p>
          <button
            onClick={() => navigate('/experiments')}
            className="text-teal-600 hover:underline"
          >
            {t('nav.experiments')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {error && (
        <div className="bg-error/10 text-error p-4 text-center border-b border-error/20 flex justify-center items-center gap-4">
          <p>{t('common.error')}: {error}</p>
          <button onClick={() => setError(null)} className="underline font-medium text-sm">
            {t('common.dismiss') || 'Dismiss'}
          </button>
        </div>
      )}
      <ExperimentComponent
        experiment={experiment}
        onComplete={handleComplete}
        participantId={participantId}
        roomId={roomId}
      />
    </>
  );
}
