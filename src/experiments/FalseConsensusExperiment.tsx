/**
 * FALSE CONSENSUS EFFECT - Social Psychology Experiment
 * 
 * Tests overestimation of agreement with others.
 */

import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ExperimentWrapper } from '../components/experiments/ExperimentWrapper';
import type { Experiment } from '../data/experiments';
import type { TrialData, ExperimentResults } from '../components/experiments/ExperimentWrapper';
import { getDefaultConfig } from './config/experimentDefaults';

interface FalseConsensusConfig {
  trials: number;
  isi: number;
  showFeedback: boolean;
  customInstructions: string;
}

interface FalseConsensusProps {
  experiment: Experiment;
  onComplete: (results: ExperimentResults) => void;
  participantId: string;
  roomId: string;
  config?: Partial<FalseConsensusConfig>;
}

const QUESTIONS = [
  { id: 'introvert', question: 'introvert_estimate', yourAnswer: 'extrovert' },
  { id: 'optimist', question: 'optimist_estimate', yourAnswer: 'optimist' },
  { id: 'risk', question: 'risk_estimate', yourAnswer: 'risk_averse' },
  { id: 'early', question: 'early_estimate', yourAnswer: 'morning' },
];

const DEFAULT_CONFIG = { ...getDefaultConfig('false-consensus'), trials: 8 } as FalseConsensusConfig;

export function FalseConsensusExperiment({ experiment, onComplete, participantId, roomId, config = {} }: FalseConsensusProps) {
  const { t, language } = useLanguage();
  const settings: FalseConsensusConfig = { ...DEFAULT_CONFIG, ...config };

  const [phase, setPhase] = useState<'instruction' | 'experiment' | 'complete'>('instruction');
  const [trialIndex, setTrialIndex] = useState(0);
  const [trialData, setTrialData] = useState<TrialData[]>([]);
  const [experimentStartTime, setExperimentStartTime] = useState(0);
  const [estimate, setEstimate] = useState(50);

  useEffect(() => { if (phase === 'instruction') setExperimentStartTime(performance.now()); }, [phase]);

  const currentQuestion = QUESTIONS[trialIndex % QUESTIONS.length];

  const handleSubmit = () => {
    const actualPercent = 30 + Math.random() * 40;
    const trial: TrialData = {
      trialNumber: trialIndex + 1,
      responseTimeMs: 500,
      answer: String(estimate),
      correctAnswer: String(actualPercent),
      stimulus: { question: currentQuestion.id, actual: actualPercent },
    };
    setTrialData(prev => [...prev, trial]);
    setEstimate(50);
    setTimeout(() => {
      if (trialIndex < settings.trials - 1) setTrialIndex(prev => prev + 1);
      else completeExperiment();
    }, settings.isi);
  };

  const completeExperiment = () => {
    setPhase('complete');
    const avgEstimate = trialData.reduce((s, t) => s + parseInt(String(t.answer)), 0) / trialData.length;
    const results: ExperimentResults = {
      experimentName: experiment.id,
      participantId,
      roomId,
      language,
      timestamp: new Date().toISOString(),
      totalTrials: trialData.length,
      responseTimeMs: Math.round(performance.now() - experimentStartTime),
      accuracy: 100 - (avgEstimate - 50),
      answer: avgEstimate,
      correctAnswer: 'avg_estimate',
      trialData,
      debrief: t(experiment.debriefKey),
    };
    onComplete(results);
  };

  if (phase === 'instruction') {
    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="max-w-2xl mx-auto p-6">
          <h2 className="text-2xl font-bold text-navy-900 mb-4">{t('exp.falseConsensus.name')}</h2>
          <p className="text-gray-600 mb-4">{settings.customInstructions || t('exp.falseConsensus.instruction')}</p>
          <button onClick={() => setPhase('experiment')} className="bg-teal-600 text-white px-6 py-3 rounded-lg">{t('common.start')}</button>
        </div>
      </ExperimentWrapper>
    );
  }

  if (phase === 'complete') {
    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="max-w-2xl mx-auto p-6">
          <h2 className="text-2xl font-bold text-navy-900 mb-4">{t('common.debrief.title')}</h2>
          <div className="bg-teal-50 border-l-4 border-teal-500 p-4 mb-4">
            <p className="text-teal-800 font-medium">{t('common.debrief.thankYou')}</p>
          </div>
          <p className="text-gray-600 mb-4">{t('exp.falseConsensus.debrief')}</p>
        </div>
      </ExperimentWrapper>
    );
  }

  return (
    <ExperimentWrapper experiment={experiment}>
      <div className="max-w-2xl mx-auto p-6">
        <div className="mb-6"><div className="h-2 bg-gray-200 rounded"><div className="h-full bg-teal-600" style={{ width: `${((trialIndex + 1) / settings.trials) * 100}%` }} /></div></div>
        <h2 className="text-xl font-semibold text-navy-900 mb-6 text-center">{t(`exp.falseConsensus.${currentQuestion.question}`)}</h2>
        <div className="mb-6">
          <input type="range" min="0" max="100" value={estimate} onChange={e => setEstimate(parseInt(e.target.value))} className="w-full" />
          <div className="flex justify-between text-gray-500 text-sm"><span>0%</span><span>{estimate}%</span><span>100%</span></div>
        </div>
        <div className="flex justify-center">
          <button onClick={handleSubmit} className="bg-teal-600 text-white px-8 py-3 rounded-lg">{t('common.submit')}</button>
        </div>
      </div>
    </ExperimentWrapper>
  );
}

export default FalseConsensusExperiment;
