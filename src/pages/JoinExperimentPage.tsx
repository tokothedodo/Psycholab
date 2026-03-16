import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { getRoomByCode, saveResult, type Room } from '../lib/supabase';
import type { Language } from '../types';
import type { ExperimentResults } from '../experiments/ExperimentWrapper';
import type { Experiment } from '../data/experiments';
import { getExperimentById } from '../data/experiments';
import {
  MullerLyerExperiment,
  StroopExperiment,
  AnchoringExperiment,
  UltimatumExperiment,
  DigitSpanExperiment,
  PonzoExperiment,
  ReactionTimeExperiment,
  TrolleyExperiment,
  DictatorExperiment,
  ChangeBlindnessExperiment,
  JNDExperiment,
  EbbinghausExperiment,
  KanizsaExperiment,
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

const EXPERIMENT_COMPONENTS: Record<string, React.ComponentType<{
  experiment: Experiment;
  onComplete: (results: ExperimentResults) => void;
  participantId: string;
  roomId: string;
}>> = {
  'muller-lyer-illusion': MullerLyerExperiment,
  'stroop-color-word-interference-task': StroopExperiment,
  'anchoring-and-adjustment-heuristic-task': AnchoringExperiment,
  'ultimatum-game': UltimatumExperiment,
  'digit-span-task': DigitSpanExperiment,
  'ponzo-illusion': PonzoExperiment,
  'simple-and-choice-reaction-time-task': ReactionTimeExperiment,
  'trolley-problem-paradigm': TrolleyExperiment,
  'dictator-game': DictatorExperiment,
  'change-detection-flicker-paradigm': ChangeBlindnessExperiment,
  'difference-threshold-staircase-paradigm': JNDExperiment,
  'ebbinghaus-illusion': EbbinghausExperiment,
  'kanizsa-illusory-contour-paradigm': KanizsaExperiment,
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

export function JoinExperimentPage() {
  const { code } = useParams<{ code: string }>();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();

  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [completed, setCompleted] = useState(false);
  const [participantId] = useState(() => `P_${Math.random().toString(36).substr(2, 9)}`);
  const [showLanguagePicker, setShowLanguagePicker] = useState(true);

  const languages: { code: Language; name: string; flag: string }[] = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'ka', name: 'Georgian', flag: '🇬🇪' },
    { code: 'hy', name: 'Armenian', flag: '🇦🇲' },
    { code: 'az', name: 'Azerbaijani', flag: '🇦🇿' },
  ];

  useEffect(() => {
    if (code) {
      loadRoom();
    }
  }, [code]);

  const loadRoom = async () => {
    try {
      const roomData = await getRoomByCode(code!);
      if (!roomData) {
        setError('Room not found or closed');
        return;
      }
      setRoom(roomData);
    } catch {
      setError('Failed to load room');
    } finally {
      setLoading(false);
    }
  };

  const handleExperimentComplete = async (results: ExperimentResults) => {
    if (!room) return;

    try {
      await saveResult({
        room_id: room.id,
        participant_id: participantId,
        experiment_name: results.experimentName,
        response_time_ms: results.responseTimeMs,
        answer: String(results.answer),
        correct_answer: String(results.correctAnswer),
        language,
        timestamp: results.timestamp,
      });
      setCompleted(true);
    } catch (error) {
      console.error('Error saving result:', error);
      setCompleted(true); // Still mark complete even if save fails
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">{t('common.loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="text-teal-600 hover:underline"
          >
            {t('nav.home')}
          </button>
        </div>
      </div>
    );
  }

  if (showLanguagePicker && room) {
    return (
      <div className="min-h-screen bg-white">
        <header className="bg-navy-900 text-white py-6">
          <div className="max-w-2xl mx-auto px-4">
            <h1 className="text-2xl font-bold">{t('app.title')}</h1>
            <p className="text-teal-400">{t('participant.joined')}</p>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-4 py-12">
          <h2 className="text-xl font-semibold text-navy-900 mb-6 text-center">
            {t('home.chooseLanguage')}
          </h2>

          <div className="grid grid-cols-2 gap-4">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  setLanguage(lang.code);
                  setShowLanguagePicker(false);
                }}
                className="p-6 rounded-xl border-2 border-gray-200 hover:border-teal-500 hover:bg-teal-50 transition-all text-left"
              >
                <span className="text-3xl mr-3">{lang.flag}</span>
                <span className="font-semibold text-lg">{lang.name}</span>
              </button>
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="min-h-screen bg-white">
        <header className="bg-navy-900 text-white py-6">
          <div className="max-w-2xl mx-auto px-4">
            <h1 className="text-2xl font-bold">{t('app.title')}</h1>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-4 py-12 text-center">
          <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">✓</span>
          </div>
          <h2 className="text-2xl font-bold text-navy-900 mb-4">
            {t('participant.completed')}
          </h2>
          <p className="text-gray-600 mb-8">{t('participant.thankYou')}</p>
          <button
            onClick={() => navigate('/')}
            className="bg-teal-600 text-white px-8 py-3 rounded-lg hover:bg-teal-700 transition-colors"
          >
            {t('nav.home')}
          </button>
        </main>
      </div>
    );
  }

  // Single experiment — use room.experiment directly
  const currentExperimentId = room!.experiment;
  const currentExperiment = getExperimentById(currentExperimentId);
  const ExperimentComponent = currentExperimentId && EXPERIMENT_COMPONENTS[currentExperimentId];

  if (!currentExperiment || !ExperimentComponent) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-2">Experiment not found: {currentExperimentId}</p>
          <p className="text-gray-400 text-sm">This experiment may not be implemented yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-navy-900 text-white py-4">
        <div className="max-w-4xl mx-auto px-4 flex justify-between items-center">
          <div>
            <h1 className="font-bold">{t('app.title')}</h1>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              className="bg-navy-800 text-white px-3 py-1 rounded border border-navy-700"
            >
              {languages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.flag} {lang.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <main className="py-8">
        <ExperimentComponent
          experiment={currentExperiment}
          onComplete={handleExperimentComplete}
          participantId={participantId}
          roomId={room!.id}
        />
      </main>
    </div>
  );
}
