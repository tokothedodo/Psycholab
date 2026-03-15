import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { getExperimentById, type Experiment } from '../data/experiments';
import { saveResult } from '../lib/supabase';
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
  'stroop': StroopExperiment,
  'muller-lyer': MullerLyerExperiment,
  'digit-span': DigitSpanExperiment,
  'reaction-time': ReactionTimeExperiment,
  'ponzo': PonzoExperiment,
  'anchoring': AnchoringExperiment,
  'trolley': TrolleyExperiment,
  'dictator': DictatorExperiment,
  'change-blindness': ChangeBlindnessExperiment,
  'jnd': JNDExperiment,
  'ebbinghaus': EbbinghausExperiment,
  'kanizsa': KanizsaExperiment,
  'ultimatum': UltimatumExperiment,
  'inattentional': InattentionalExperiment,
  'serial-position': SerialPositionExperiment,
  'sternberg': SternbergExperiment,
  'drm': DRMExperiment,
  'framing': FramingExperiment,
  'bystander': BystanderExperiment,
  'loss-aversion': LossAversionExperiment,
  'trust': TrustExperiment,
  'rubin-vase': RubinVaseExperiment,
  'zollner': ZollnerExperiment,
  'availability': AvailabilityExperiment,
  'wason': WasonExperiment,
  'linda': LindaExperiment,
  'hindsight': HindsightExperiment,
  'sunk-cost': SunkCostExperiment,
  'iowa-gambling': IowaGamblingExperiment,
  'prisoners-dilemma': PrisonersDilemmaExperiment,
  'asch': AschExperiment,
  'iat': IATExperiment,
  'false-consensus': FalseConsensusExperiment,
  'mcgurk': McGurkExperiment,
  'rubber-hand': RubberHandExperiment,
  'color-perception': ColorPerceptionExperiment,
  'motion-aftereffect': MotionAftereffectExperiment,
  'hollow-face': HollowFaceExperiment,
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
  const { t, language } = useLanguage();
  const [experiment, setExperiment] = useState<Experiment | null>(null);
  const [loading, setLoading] = useState(true);
  const [participantId] = useState(() => `P_${Math.random().toString(36).substr(2, 9)}`);
  const [roomId] = useState(() => `R_${Math.random().toString(36).substr(2, 6)}`);

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
    try {
      await saveResult({
        room_id: roomId,
        participant_id: participantId,
        experiment_name: results.experimentName,
        response_time_ms: results.responseTimeMs,
        answer: String(results.answer),
        correct_answer: String(results.correctAnswer),
        language,
        timestamp: results.timestamp,
      });
    } catch (error) {
      console.error('Error saving result:', error);
    }
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
    <ExperimentComponent
      experiment={experiment}
      onComplete={handleComplete}
      participantId={participantId}
      roomId={roomId}
    />
  );
}
