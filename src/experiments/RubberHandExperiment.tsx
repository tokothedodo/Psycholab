/**
 * RUBBER HAND ILLUSION - Body Perception Experiment
 * 
 * Tests body ownership and proprioception.
 */

import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ExperimentWrapper } from './ExperimentWrapper';
import type { Experiment } from '../data/experiments';
import type { TrialData, ExperimentResults } from './ExperimentWrapper';
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

const DEFAULT_CONFIG = { ...getDefaultConfig('rubber-hand-illusion'), trials: 6 } as RubberHandConfig;

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
        <div className="max-w-2xl mx-auto p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
          <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-emerald-600 mb-6">{t('exp.rubberHand.name')}</h2>

          <div className="bg-slate-50 border-l-4 border-teal-500 p-5 rounded-r-lg shadow-sm mb-6">
            <p className="text-slate-700 leading-relaxed text-md">
              {settings.customInstructions || t('exp.rubberHand.instruction')}
            </p>
          </div>

          <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-5 mb-8">
            <p className="text-sm font-semibold text-indigo-900 mb-2 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              {t('exp.rubberHand.instructionDetail')}
            </p>
          </div>

          <p className="text-sm font-medium text-slate-400 mb-8 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
            {t('citation')}: {experiment.citation}, {experiment.year}
          </p>

          <button
            onClick={() => setPhase('synchronization')}
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
        <div className="max-w-2xl mx-auto p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 text-center animate-fade-in">
          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight mb-8">
            {t('exp.rubberHand.syncInstruction')}
          </h2>

          <div className="flex justify-center gap-10 sm:gap-16 mb-12">
            <div className="flex flex-col items-center group">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-peach-300/20 rounded-xl blur-xl group-hover:bg-peach-300/40 transition-colors"></div>
                <div className="w-24 h-48 sm:w-28 sm:h-56 bg-peach-300 rounded-xl border-4 border-white shadow-lg relative z-10 transition-transform group-hover:-translate-y-1 duration-300"></div>
              </div>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">{t('exp.rubberHand.yourHand')}</p>
            </div>

            <div className="flex flex-col items-center group">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-slate-400/20 rounded-xl blur-xl group-hover:bg-slate-400/40 transition-colors"></div>
                <div className="w-24 h-48 sm:w-28 sm:h-56 bg-slate-300 rounded-xl border-4 border-white shadow-lg relative z-10 transition-transform group-hover:-translate-y-1 duration-300 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent pointer-events-none"></div>
                </div>
              </div>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">{t('exp.rubberHand.rubberHand')}</p>
            </div>
          </div>

          <button
            onClick={() => setPhase('test')}
            className="group relative inline-flex px-8 py-4 bg-white rounded-xl shadow-sm border-2 border-slate-200 hover:border-teal-400 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 items-center justify-center gap-2 focus:outline-none focus:ring-4 focus:ring-teal-500/20"
          >
            <span className="text-lg font-bold text-slate-700 group-hover:text-teal-600 transition-colors">{t('common.continue')}</span>
            <svg className="w-5 h-5 text-slate-400 group-hover:text-teal-500 transition-colors group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
          </button>
        </div>
      </ExperimentWrapper>
    );
  }

  return (
    <ExperimentWrapper experiment={experiment}>
      <div className="max-w-3xl mx-auto p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 min-h-[400px] flex flex-col relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-white -z-10"></div>

        <div className="mb-10 px-4 pt-2">
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

        <div className="flex-1 flex flex-col items-center justify-center animate-fade-in w-full max-w-xl mx-auto">
          <div className="bg-slate-50 border border-slate-100 p-6 rounded-2xl shadow-sm text-center mb-10 w-full relative group">
            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-400 transform origin-top group-hover:scale-y-110 transition-transform duration-500 rounded-l-2xl"></div>
            <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight leading-relaxed">
              {t('exp.rubberHand.howOwnership')}
            </h2>
          </div>

          <div className="w-full bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-100 mb-10 group">
            <div className="flex justify-between text-indigo-900 font-black text-2xl mb-4 transition-all duration-300 group-hover:-translate-y-1 group-hover:text-teal-600">
              <span>{ownership}%</span>
            </div>

            <input
              type="range"
              min="0"
              max="100"
              value={ownership}
              onChange={e => setOwnership(parseInt(e.target.value))}
              className="w-full h-3 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-teal-500 hover:accent-teal-400 transition-colors focus:outline-none focus:ring-4 focus:ring-teal-500/20"
            />

            <div className="flex justify-between mt-4 text-xs font-bold text-slate-400 uppercase tracking-widest px-1">
              <span>{t('common.no')}</span>
              <span>{t('common.yes')}</span>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            className="group relative w-full sm:w-auto px-10 py-4 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-bold text-lg rounded-xl shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2 focus:outline-none focus:ring-4 focus:ring-teal-500/30"
          >
            {t('common.submit')}
            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
          </button>
        </div>
      </div>
    </ExperimentWrapper>
  );
}

export default RubberHandExperiment;
