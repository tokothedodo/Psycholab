/**
 * SUNK COST FALLACY - Decision Making Experiment
 * 
 * Tests irrational commitment to losing ventures.
 */

import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ExperimentWrapper } from './ExperimentWrapper';
import type { Experiment } from '../data/experiments';
import type { TrialData, ExperimentResults } from './ExperimentWrapper';
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
        <div className="max-w-2xl mx-auto p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
          <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-emerald-600 mb-6">{t('exp.sunkCost.name')}</h2>

          <div className="bg-slate-50 border-l-4 border-teal-500 p-5 rounded-r-lg shadow-sm mb-8">
            <p className="text-slate-700 leading-relaxed text-md">
              {settings.customInstructions || t('exp.sunkCost.instruction')}
            </p>
          </div>

          <button
            onClick={() => setPhase('experiment')}
            className="group relative w-full sm:w-auto bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-semibold flex tracking-wide items-center justify-center gap-3 px-8 py-4 rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
          >
            {t('common.start')}
            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
          </button>
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
      <div className="max-w-3xl mx-auto p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 min-h-[500px] flex flex-col relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-white -z-10"></div>

        {settings.showProgressBar && (
          <div className="mb-8 px-4 pt-2">
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-teal-400 to-teal-500 transition-all duration-500 ease-out"
                style={{ width: `${((trialIndex + 1) / settings.trials) * 100}%` }}
              />
            </div>
            <div className="flex justify-between items-center mt-3">
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                {trialIndex + 1} / {settings.trials}
              </span>
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col items-center justify-center animate-fade-in w-full max-w-xl mx-auto">

          <div className="w-full bg-slate-50 p-6 sm:p-8 rounded-2xl border border-slate-100 mb-10 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-400 transform origin-top group-hover:scale-y-110 transition-transform duration-500"></div>
            <p className="text-lg sm:text-xl font-medium text-slate-700 leading-relaxed italic text-center">
              "{t(`exp.sunkCost.scenario.${currentScenario.id}`)}"
            </p>
          </div>

          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight mb-8 text-center">
            {t('exp.sunkCost.whatDo')}
          </h2>

          <div className="flex flex-col sm:flex-row justify-center gap-5 w-full">
            <button
              onClick={() => handleResponse('continue')}
              className="group relative flex-1 py-6 px-4 bg-white rounded-2xl shadow-sm border-2 border-transparent hover:border-teal-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col items-center justify-center focus:outline-none focus:ring-4 focus:ring-teal-500/20"
            >
              <span className="absolute inset-0 bg-teal-50/0 group-hover:bg-teal-50/50 rounded-2xl transition-colors"></span>
              <span className="text-xl font-bold text-slate-700 group-hover:text-teal-700 z-10 transition-colors">{t('exp.sunkCost.continue')}</span>
            </button>
            <button
              onClick={() => handleResponse('quit')}
              className="group relative flex-1 py-6 px-4 bg-white rounded-2xl shadow-sm border-2 border-transparent hover:border-indigo-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col items-center justify-center focus:outline-none focus:ring-4 focus:ring-indigo-500/20"
            >
              <span className="absolute inset-0 bg-indigo-50/0 group-hover:bg-indigo-50/50 rounded-2xl transition-colors"></span>
              <span className="text-xl font-bold text-slate-700 group-hover:text-indigo-700 z-10 transition-colors">{t('exp.sunkCost.quit')}</span>
            </button>
          </div>
        </div>
      </div>
    </ExperimentWrapper>
  );
}

export default SunkCostExperiment;
