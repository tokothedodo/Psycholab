/**
 * RUBBER HAND ILLUSION - Body Perception Experiment
 * 
 * Tests body ownership and proprioception.
 */

import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ExperimentWrapper } from '../components/experiments/ExperimentWrapper';
import type { Experiment } from '../data/experiments';
import type { TrialData, ExperimentResults } from '../components/experiments/ExperimentWrapper';
import { getDefaultConfig } from './config/experimentDefaults';

interface RubberHandConfig {
  trials: number;
  showFeedback: boolean;
  customInstructions: string;
}

interface RubberHandProps {
  experiment: Experiment;
  onComplete: (results: ExperimentResults) => void;
  participantId: string;
  roomId: string;
  config?: Partial<RubberHandConfig>;
}

const DEFAULT_CONFIG = { ...getDefaultConfig('rubber-hand'), trials: 6 } as RubberHandConfig;

export function RubberHandExperiment({ experiment, onComplete, participantId, roomId, config = {} }: RubberHandProps) {
  const { t, language } = useLanguage();
  const settings: RubberHandConfig = { ...DEFAULT_CONFIG, ...config };

  const [phase, setPhase] = useState<'instruction' | 'synchronization' | 'test' | 'complete'>('instruction');
  const [trialIndex, setTrialIndex] = useState(0);
  const [trialData, setTrialData] = useState<TrialData[]>([]);
  const [experimentStartTime, setExperimentStartTime] = useState(0);
  const [ownership, setOwnership] = useState(50);

  useEffect(() => { if (phase === 'instruction') setExperimentStartTime(performance.now()); }, [phase]);

  const handleSubmit = () => {
    const trial: TrialData = {
      trialNumber: trialIndex + 1,
      responseTimeMs: 500,
      answer: String(ownership),
      correctAnswer: 'ownership_rating',
      stimulus: { rating: ownership },
    };
    setTrialData(prev => [...prev, trial]);
    if (trialIndex < settings.trials - 1) {
      setTrialIndex(prev => prev + 1);
    } else {
      completeExperiment();
    }
  };

  const completeExperiment = () => {
    setPhase('complete');
    const avgOwnership = trialData.reduce((s, t) => s + parseInt(String(t.answer)), 0) / trialData.length;
    const results: ExperimentResults = {
      experimentName: experiment.id,
      participantId,
      roomId,
      language,
      timestamp: new Date().toISOString(),
      totalTrials: trialData.length,
      responseTimeMs: Math.round(performance.now() - experimentStartTime),
      accuracy: avgOwnership,
      answer: avgOwnership,
      correctAnswer: 'illusion_strength',
      trialData,
      debrief: t(experiment.debriefKey),
    };
    onComplete(results);
  };

  if (phase === 'instruction') {
    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="max-w-2xl mx-auto p-6">
          <h2 className="text-2xl font-bold text-navy-900 mb-4">{t('exp.rubberHand.name')}</h2>
          <p className="text-gray-600 mb-4">{settings.customInstructions || t('exp.rubberHand.instruction')}</p>
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
            <p className="text-blue-800">{t('exp.rubberHand.instructionDetail')}</p>
          </div>
          <button onClick={() => setPhase('synchronization')} className="bg-teal-600 text-white px-6 py-3 rounded-lg">{t('common.start')}</button>
        </div>
      </ExperimentWrapper>
    );
  }

  if (phase === 'complete') {
    const avgOwnership = trialData.reduce((s, t) => s + parseInt(String(t.answer)), 0) / trialData.length;
    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="max-w-2xl mx-auto p-6">
          <h2 className="text-2xl font-bold text-navy-900 mb-4">{t('common.debrief.title')}</h2>
          <div className="bg-teal-50 border-l-4 border-teal-500 p-4 mb-4">
            <p className="text-teal-800 font-medium">{t('common.debrief.thankYou')}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg text-center mb-6">
            <p className="text-2xl font-bold text-navy-900">{Math.round(avgOwnership)}%</p>
            <p className="text-sm text-gray-600">{t('exp.rubberHand.illusionStrength')}</p>
          </div>
          <p className="text-gray-600 mb-4">{t('exp.rubberHand.debrief')}</p>
        </div>
      </ExperimentWrapper>
    );
  }

  if (phase === 'synchronization') {
    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="max-w-2xl mx-auto p-6">
          <h2 className="text-xl font-semibold text-navy-900 mb-6 text-center">{t('exp.rubberHand.syncInstruction')}</h2>
          <div className="flex justify-center gap-8 mb-8">
            <div className="text-center">
              <div className="w-24 h-48 bg-peach-300 rounded-lg border-4 border-peach-400 mb-4"></div>
              <p className="text-gray-600">{t('exp.rubberHand.yourHand')}</p>
            </div>
            <div className="text-center">
              <div className="w-24 h-48 bg-rubber-300 rounded-lg border-4 border-rubber-400 mb-4"></div>
              <p className="text-gray-600">{t('exp.rubberHand.rubberHand')}</p>
            </div>
          </div>
          <div className="flex justify-center">
            <button onClick={() => setPhase('test')} className="bg-teal-600 text-white px-8 py-3 rounded-lg">{t('common.continue')}</button>
          </div>
        </div>
      </ExperimentWrapper>
    );
  }

  return (
    <ExperimentWrapper experiment={experiment}>
      <div className="max-w-2xl mx-auto p-6">
        <div className="mb-6"><div className="h-2 bg-gray-200 rounded"><div className="h-full bg-teal-600" style={{ width: `${((trialIndex + 1) / settings.trials) * 100}%` }} /></div></div>
        <h2 className="text-xl font-semibold text-navy-900 mb-6 text-center">{t('exp.rubberHand.howOwnership')}</h2>
        <div className="mb-6">
          <input type="range" min="0" max="100" value={ownership} onChange={e => setOwnership(parseInt(e.target.value))} className="w-full" />
          <div className="flex justify-between text-gray-500 text-sm"><span>{t('common.no')}</span><span>{t('common.yes')}</span></div>
        </div>
        <div className="flex justify-center">
          <button onClick={handleSubmit} className="bg-teal-600 text-white px-8 py-3 rounded-lg">{t('common.submit')}</button>
        </div>
      </div>
    </ExperimentWrapper>
  );
}

export default RubberHandExperiment;
