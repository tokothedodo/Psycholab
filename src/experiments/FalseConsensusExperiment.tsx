/**
 * FALSE CONSENSUS EFFECT - Social Psychology Experiment
 * 
 * Tests overestimation of agreement with others.
 */

import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ExperimentWrapper } from './ExperimentWrapper';
import type { Experiment } from '../data/experiments';
import type { TrialData, ExperimentResults } from './ExperimentWrapper';
import { getDefaultConfig } from './config/experimentDefaults';

interface FalseConsensusConfig {
  trials: number;
  isi: number;
  showFeedback: boolean;
  showProgressBar: boolean;
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
        <div className="max-w-2xl mx-auto p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
          <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-emerald-600 mb-6">{t('exp.falseConsensus.name')}</h2>

          <div className="bg-slate-50 border-l-4 border-teal-500 p-5 rounded-r-lg shadow-sm mb-8">
            <p className="text-slate-700 leading-relaxed text-md">
              {settings.customInstructions || t('exp.falseConsensus.instruction')}
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
      <div className="max-w-3xl mx-auto p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 min-h-[450px] flex flex-col relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-white -z-10"></div>
        {settings.showProgressBar && (
          <div className="mb-8 px-4 pt-2">
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden flex">
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
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight mb-12 text-center leading-tight">
            {t(`exp.falseConsensus.${currentQuestion.question}`)}
          </h2>

          <div className="w-full bg-slate-50 p-8 rounded-2xl border border-slate-100 mb-10">
            <div className="flex justify-between items-end mb-4 px-2">
              <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-emerald-500">{estimate}%</span>
            </div>
            <div className="relative pt-2 pb-4">
              <input
                type="range"
                min="0"
                max="100"
                value={estimate}
                onChange={e => setEstimate(parseInt(e.target.value))}
                className="w-full h-3 bg-slate-200 rounded-full appearance-none cursor-pointer focus:outline-none focus:ring-4 focus:ring-teal-500/20 relative z-10 accent-teal-500"
                style={{
                  background: `linear-gradient(to right, #14b8a6 ${estimate}%, #e2e8f0 ${estimate}%)`
                }}
              />
            </div>
            <div className="flex justify-between text-slate-400 font-bold text-xs uppercase tracking-wider px-2">
              <span>0% <span className="hidden sm:inline">({t('common.none')})</span></span>
              <span>100% <span className="hidden sm:inline">({t('common.everyone')})</span></span>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            className="group relative w-full sm:w-2/3 py-5 bg-gradient-to-r from-teal-500 to-emerald-500 rounded-2xl shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center justify-center focus:outline-none focus:ring-4 focus:ring-teal-500/30 text-white font-bold text-xl uppercase tracking-wider"
          >
            {t('common.submit')}
            <svg className="w-6 h-6 ml-3 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
          </button>
        </div>
      </div>
    </ExperimentWrapper>
  );
}

export default FalseConsensusExperiment;
