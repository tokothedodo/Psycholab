/**
 * LINDA PROBLEM - Conjunction Fallacy Experiment
 * 
 * Tests conjunction fallacy in probability reasoning.
 */

import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ExperimentWrapper } from '../components/experiments/ExperimentWrapper';
import type { Experiment } from '../data/experiments';
import type { TrialData, ExperimentResults } from '../components/experiments/ExperimentWrapper';
import { getDefaultConfig } from './config/experimentDefaults';

interface LindaConfig {
  trials: number;
  showFeedback: boolean;
  customInstructions: string;
}

interface LindaProps {
  experiment: Experiment;
  onComplete: (results: ExperimentResults) => void;
  participantId: string;
  roomId: string;
  config?: Partial<LindaConfig>;
}

const DEFAULT_CONFIG = { ...getDefaultConfig('linda'), trials: 1 } as LindaConfig;

export function LindaExperiment({ experiment, onComplete, participantId, roomId, config = {} }: LindaProps) {
  const { t, language } = useLanguage();
  const settings: LindaConfig = { ...DEFAULT_CONFIG, ...config };

  const [phase, setPhase] = useState<'instruction' | 'question' | 'complete'>('instruction');
  const [trialData, setTrialData] = useState<TrialData[]>([]);
  const [experimentStartTime, setExperimentStartTime] = useState(0);

  useEffect(() => { if (phase === 'instruction') setExperimentStartTime(performance.now()); }, [phase]);

  const handleResponse = (answer: string) => {
    const correctAnswer = 'teller';
    const isConjunction = answer === 'teller_activist';
    const trial: TrialData = {
      trialNumber: 1,
      responseTimeMs: 500,
      answer,
      correctAnswer,
      stimulus: { isConjunction },
    };
    setTrialData([trial]);
    setTimeout(() => completeExperiment(), 500);
  };

  const completeExperiment = () => {
    setPhase('complete');
    const isConjunction = trialData[0]?.answer === 'teller_activist';
    const results: ExperimentResults = {
      experimentName: experiment.id,
      participantId,
      roomId,
      language,
      timestamp: new Date().toISOString(),
      totalTrials: 1,
      responseTimeMs: Math.round(performance.now() - experimentStartTime),
      accuracy: isConjunction ? 0 : 100,
      answer: isConjunction ? 'fallacy' : 'correct',
      correctAnswer: 'fallacy_detected',
      trialData,
      debrief: t(experiment.debriefKey),
    };
    onComplete(results);
  };

  if (phase === 'instruction') {
    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="max-w-2xl mx-auto p-6">
          <h2 className="text-2xl font-bold text-navy-900 mb-4">{t('exp.linda.name')}</h2>
          <p className="text-gray-600 mb-4">{settings.customInstructions || t('exp.linda.instruction')}</p>
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
            <p className="text-blue-800">{t('exp.linda.instructionDetail')}</p>
          </div>
          <button onClick={() => setPhase('question')} className="bg-teal-600 text-white px-6 py-3 rounded-lg">{t('common.start')}</button>
        </div>
      </ExperimentWrapper>
    );
  }

  if (phase === 'complete') {
    const isConjunction = trialData[0]?.answer === 'teller_activist';
    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="max-w-2xl mx-auto p-6">
          <h2 className="text-2xl font-bold text-navy-900 mb-4">{t('common.debrief.title')}</h2>
          <div className="bg-teal-50 border-l-4 border-teal-500 p-4 mb-4">
            <p className="text-teal-800 font-medium">{t('common.debrief.thankYou')}</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg mb-4">
            <p className="text-amber-800 font-medium">{t('exp.linda.yourAnswer')}: {isConjunction ? t('exp.linda.fallacy') : t('exp.linda.correct')}</p>
            <p className="text-sm text-amber-700 mt-2">{t('exp.linda.explanation')}</p>
          </div>
          <p className="text-gray-600 mb-4">{t('exp.linda.debrief')}</p>
        </div>
      </ExperimentWrapper>
    );
  }

  return (
    <ExperimentWrapper experiment={experiment}>
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-gray-50 p-6 rounded-lg mb-6">
          <p className="text-gray-700 mb-4">{t('exp.linda.description')}</p>
        </div>
        <h2 className="text-xl font-semibold text-navy-900 mb-6 text-center">{t('exp.linda.mostLikely')}</h2>
        <div className="space-y-3 mb-6">
          {['teller', 'teller_activist', 'feminist', 'teller_feminist'].map(opt => (
            <button key={opt} onClick={() => handleResponse(opt)} className="w-full text-left bg-gray-100 hover:bg-teal-50 border border-gray-200 hover:border-teal-500 px-6 py-4 rounded-lg transition-all">
              <span className="font-medium">{t(`exp.linda.option.${opt}`)}</span>
            </button>
          ))}
        </div>
      </div>
    </ExperimentWrapper>
  );
}

export default LindaExperiment;
