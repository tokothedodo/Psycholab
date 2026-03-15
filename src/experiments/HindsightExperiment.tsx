/**
 * HINDSIGHT BIAS - Cognitive Bias Experiment
 * 
 * Tests outcome knowledge distortion (knew-it-all-along effect).
 */

import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ExperimentWrapper } from './ExperimentWrapper';
import type { Experiment } from '../data/experiments';
import type { TrialData, ExperimentResults } from './ExperimentWrapper';
import { getDefaultConfig } from './config/experimentDefaults';

interface HindsightConfig {
  trials: number;
  isi: number;
  showFeedback: boolean;
  customInstructions: string;
}

interface HindsightProps {
  experiment: Experiment;
  onComplete: (results: ExperimentResults) => void;
  participantId: string;
  roomId: string;
  config?: Partial<HindsightConfig>;
}

const SCENARIOS = [
  { id: 'market', pre: 'market_pre', outcome: 'market_crash', knewLikelihood: 20 },
  { id: 'election', pre: 'election_pre', outcome: 'winner', knewLikelihood: 25 },
  { id: 'war', pre: 'war_pre', outcome: 'outbreak', knewLikelihood: 15 },
];

const DEFAULT_CONFIG = { ...getDefaultConfig('hindsight-bias-paradigm'), trials: 5 } as HindsightConfig;

export function HindsightExperiment({ experiment, onComplete, participantId, roomId, config = {} }: HindsightProps) {
  const { t, language } = useLanguage();
  const settings: HindsightConfig = { ...DEFAULT_CONFIG, ...config };

  const [phase, setPhase] = useState<'instruction' | 'pre' | 'outcome' | 'rating' | 'complete'>('instruction');
  const [trialIndex, setTrialIndex] = useState(0);
  const [trialData, setTrialData] = useState<TrialData[]>([]);
  const [experimentStartTime, setExperimentStartTime] = useState(0);
  const [preEstimate, setPreEstimate] = useState(50);
  const [hindsightRating, setHindsightRating] = useState(50);

  useEffect(() => { if (phase === 'instruction') setExperimentStartTime(performance.now()); }, [phase]);

  const currentScenario = SCENARIOS[trialIndex % SCENARIOS.length];

  const handlePreSubmit = () => {
    setPhase('outcome');
  };

  const handleOutcome = () => {
    setPhase('rating');
  };

  const handleRatingSubmit = () => {
    const trial: TrialData = {
      trialNumber: trialIndex + 1,
      responseTimeMs: 500,
      answer: String(hindsightRating),
      correctAnswer: String(currentScenario.knewLikelihood),
      stimulus: { preEstimate, hindsightRating },
    };
    setTrialData(prev => [...prev, trial]);
    setPreEstimate(50);
    setHindsightRating(50);
    setTimeout(() => {
      if (trialIndex < settings.trials - 1) {
        setTrialIndex(prev => prev + 1);
        setPhase('pre');
      } else completeExperiment();
    }, settings.isi);
  };

  const completeExperiment = () => {
    setPhase('complete');
    const avgHindsightScore = trialData.reduce((sum, t) => sum + parseInt(String(t.answer)), 0) / trialData.length;
    const results: ExperimentResults = {
      experimentName: experiment.id,
      participantId,
      roomId,
      language,
      timestamp: new Date().toISOString(),
      totalTrials: trialData.length,
      responseTimeMs: Math.round(performance.now() - experimentStartTime),
      accuracy: 100 - Math.abs(avgHindsightScore - 30),
      answer: avgHindsightScore,
      correctAnswer: 'hindsight_score',
      trialData,
      debrief: t(experiment.debriefKey),
    };
    onComplete(results);
  };

  if (phase === 'instruction') {
    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="max-w-2xl mx-auto p-6">
          <h2 className="text-2xl font-bold text-navy-900 mb-4">{t('exp.hindsight.name')}</h2>
          <p className="text-gray-600 mb-4">{settings.customInstructions || t('exp.hindsight.instruction')}</p>
          <button onClick={() => setPhase('pre')} className="bg-teal-600 text-white px-6 py-3 rounded-lg">{t('common.start')}</button>
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
          <p className="text-gray-600 mb-4">{t('exp.hindsight.debrief')}</p>
        </div>
      </ExperimentWrapper>
    );
  }

  if (phase === 'pre') {
    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="max-w-2xl mx-auto p-6">
          <div className="bg-gray-50 p-6 rounded-lg mb-6">
            <p className="text-gray-700">{t(`exp.hindsight.${currentScenario.pre}`)}</p>
          </div>
          <h2 className="text-xl font-semibold text-navy-900 mb-6 text-center">{t('exp.hindsight.howLikely')}</h2>
          <div className="mb-6">
            <input type="range" min="0" max="100" value={preEstimate} onChange={e => setPreEstimate(parseInt(e.target.value))} className="w-full" />
            <div className="flex justify-between text-gray-500 text-sm"><span>0%</span><span>{preEstimate}%</span><span>100%</span></div>
          </div>
          <div className="flex justify-center">
            <button onClick={handlePreSubmit} className="bg-teal-600 text-white px-8 py-3 rounded-lg">{t('common.submit')}</button>
          </div>
        </div>
      </ExperimentWrapper>
    );
  }

  if (phase === 'outcome') {
    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="max-w-2xl mx-auto p-6">
          <div className="bg-red-50 border border-red-200 p-6 rounded-lg mb-6">
            <p className="text-red-800 font-medium">{t(`exp.hindsight.${currentScenario.outcome}`)}</p>
          </div>
          <div className="flex justify-center">
            <button onClick={handleOutcome} className="bg-teal-600 text-white px-8 py-3 rounded-lg">{t('exp.hindsight.sawOutcome')}</button>
          </div>
        </div>
      </ExperimentWrapper>
    );
  }

  return (
    <ExperimentWrapper experiment={experiment}>
      <div className="max-w-2xl mx-auto p-6">
        <h2 className="text-xl font-semibold text-navy-900 mb-6 text-center">{t('exp.hindsight.howLikelyNow')}</h2>
        <div className="mb-6">
          <input type="range" min="0" max="100" value={hindsightRating} onChange={e => setHindsightRating(parseInt(e.target.value))} className="w-full" />
          <div className="flex justify-between text-gray-500 text-sm"><span>0%</span><span>{hindsightRating}%</span><span>100%</span></div>
        </div>
        <div className="flex justify-center">
          <button onClick={handleRatingSubmit} className="bg-teal-600 text-white px-8 py-3 rounded-lg">{t('common.submit')}</button>
        </div>
      </div>
    </ExperimentWrapper>
  );
}

export default HindsightExperiment;
