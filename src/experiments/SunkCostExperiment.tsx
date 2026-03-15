/**
 * SUNK COST FALLACY - Decision Making Experiment
 * 
 * Tests irrational commitment to losing ventures.
 */

import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ExperimentWrapper } from '../components/experiments/ExperimentWrapper';
import type { Experiment } from '../data/experiments';
import type { TrialData, ExperimentResults } from '../components/experiments/ExperimentWrapper';
import { getDefaultConfig } from './config/experimentDefaults';

interface SunkCostConfig {
  trials: number;
  isi: number;
  showFeedback: boolean;
  showProgressBar: boolean;
  customInstructions: string;
}

interface SunkCostProps {
  experiment: Experiment;
  onComplete: (results: ExperimentResults) => void;
  participantId: string;
  roomId: string;
  config?: Partial<SunkCostConfig>;
}

const SCENARIOS = [
  { id: 'concert', invested: 50, worth: 0, refund: 0, continueWorth: 25 },
  { id: 'movie', invested: 20, worth: 5, refund: 5, continueWorth: 0 },
  { id: 'project', invested: 1000, costToFinish: 500, value: 300 },
];

const DEFAULT_CONFIG = { ...getDefaultConfig('sunk-cost'), trials: 6 } as SunkCostConfig;

export function SunkCostExperiment({ experiment, onComplete, participantId, roomId, config = {} }: SunkCostProps) {
  const { t, language } = useLanguage();
  const settings: SunkCostConfig = { ...DEFAULT_CONFIG, ...config };

  const [phase, setPhase] = useState<'instruction' | 'experiment' | 'complete'>('instruction');
  const [trialIndex, setTrialIndex] = useState(0);
  const [trialData, setTrialData] = useState<TrialData[]>([]);
  const [experimentStartTime, setExperimentStartTime] = useState(0);

  useEffect(() => { if (phase === 'instruction') setExperimentStartTime(performance.now()); }, [phase]);

  const currentScenario = SCENARIOS[trialIndex % SCENARIOS.length];

  const handleResponse = (choice: 'continue' | 'quit') => {
    const trial: TrialData = {
      trialNumber: trialIndex + 1,
      responseTimeMs: 500,
      answer: choice,
      correctAnswer: 'quit',
      stimulus: { scenario: currentScenario.id },
    };
    setTrialData(prev => [...prev, trial]);
    setTimeout(() => {
      if (trialIndex < settings.trials - 1) setTrialIndex(prev => prev + 1);
      else completeExperiment();
    }, settings.isi);
  };

  const completeExperiment = () => {
    setPhase('complete');
    const sunkCount = trialData.filter(t => t.answer === 'continue').length;
    const results: ExperimentResults = {
      experimentName: experiment.id,
      participantId,
      roomId,
      language,
      timestamp: new Date().toISOString(),
      totalTrials: trialData.length,
      responseTimeMs: Math.round(performance.now() - experimentStartTime),
      accuracy: ((settings.trials - sunkCount) / settings.trials) * 100,
      answer: sunkCount,
      correctAnswer: 'sunk_cost_count',
      trialData,
      debrief: t(experiment.debriefKey),
    };
    onComplete(results);
  };

  if (phase === 'instruction') {
    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="max-w-2xl mx-auto p-6">
          <h2 className="text-2xl font-bold text-navy-900 mb-4">{t('exp.sunkCost.name')}</h2>
          <p className="text-gray-600 mb-4">{settings.customInstructions || t('exp.sunkCost.instruction')}</p>
          <button onClick={() => setPhase('experiment')} className="bg-teal-600 text-white px-6 py-3 rounded-lg">{t('common.start')}</button>
        </div>
      </ExperimentWrapper>
    );
  }

  if (phase === 'complete') {
    const sunk = trialData.filter(t => t.answer === 'continue').length;
    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="max-w-2xl mx-auto p-6">
          <h2 className="text-2xl font-bold text-navy-900 mb-4">{t('common.debrief.title')}</h2>
          <div className="bg-teal-50 border-l-4 border-teal-500 p-4 mb-4">
            <p className="text-teal-800 font-medium">{t('common.debrief.thankYou')}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg text-center mb-6">
            <p className="text-2xl font-bold text-navy-900">{sunk}/{trialData.length}</p>
            <p className="text-sm text-gray-600">{t('exp.sunkCost.fallacyInstances')}</p>
          </div>
          <p className="text-gray-600 mb-4">{t('exp.sunkCost.debrief')}</p>
        </div>
      </ExperimentWrapper>
    );
  }

  return (
    <ExperimentWrapper experiment={experiment}>
      <div className="max-w-2xl mx-auto p-6">
        {settings.showProgressBar && <div className="mb-6"><div className="h-2 bg-gray-200 rounded"><div className="h-full bg-teal-600" style={{ width: `${((trialIndex + 1) / settings.trials) * 100}%` }} /></div></div>}
        <div className="bg-gray-50 p-6 rounded-lg mb-6">
          <p className="text-gray-700">{t(`exp.sunkCost.scenario.${currentScenario.id}`)}</p>
        </div>
        <h2 className="text-xl font-semibold text-navy-900 mb-6 text-center">{t('exp.sunkCost.whatDo')}</h2>
        <div className="flex justify-center gap-6">
          <button onClick={() => handleResponse('continue')} className="bg-gray-100 hover:bg-teal-50 border-2 border-gray-200 hover:border-teal-500 px-8 py-4 rounded-lg">
            <span className="text-lg font-semibold">{t('exp.sunkCost.continue')}</span>
          </button>
          <button onClick={() => handleResponse('quit')} className="bg-gray-100 hover:bg-teal-50 border-2 border-gray-200 hover:border-teal-500 px-8 py-4 rounded-lg">
            <span className="text-lg font-semibold">{t('exp.sunkCost.quit')}</span>
          </button>
        </div>
      </div>
    </ExperimentWrapper>
  );
}

export default SunkCostExperiment;
