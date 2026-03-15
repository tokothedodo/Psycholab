/**
 * LINDA PROBLEM - Conjunction Fallacy Experiment
 * 
 * Tests conjunction fallacy in probability reasoning.
 */

import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ExperimentWrapper } from './ExperimentWrapper';
import type { Experiment } from '../data/experiments';
import type { TrialData, ExperimentResults } from './ExperimentWrapper';
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

const DEFAULT_CONFIG = { ...getDefaultConfig('conjunction-fallacy-paradigm'), trials: 1 } as LindaConfig;

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
        <div className="max-w-2xl mx-auto p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
          <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-emerald-600 mb-6">{t('exp.linda.name')}</h2>

          <div className="bg-slate-50 border-l-4 border-teal-500 p-5 rounded-r-lg shadow-sm mb-6">
            <p className="text-slate-700 leading-relaxed text-md">
              {settings.customInstructions || t('exp.linda.instruction')}
            </p>
          </div>

          <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-5 mb-8">
            <p className="text-sm font-semibold text-indigo-900 mb-2 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              {t('exp.linda.instructionDetail')}
            </p>
          </div>

          <button
            onClick={() => setPhase('question')}
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
      <div className="max-w-3xl mx-auto p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 min-h-[450px] flex flex-col relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-white -z-10"></div>

        <div className="flex-1 flex flex-col items-center justify-center animate-fade-in w-full max-w-xl mx-auto">

          <div className="w-full bg-slate-50 p-6 sm:p-8 rounded-2xl border border-slate-100 mb-10 text-center relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-400 transform origin-top group-hover:scale-y-110 transition-transform duration-500"></div>
            <p className="text-xl sm:text-2xl font-medium text-slate-700 leading-relaxed italic">
              "{t('exp.linda.description')}"
            </p>
          </div>

          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight mb-8 text-center">
            {t('exp.linda.mostLikely')}
          </h2>

          <div className="w-full flex flex-col gap-4 mb-4">
            {['teller', 'teller_activist', 'feminist', 'teller_feminist'].map((opt, index) => (
              <button
                key={opt}
                onClick={() => handleResponse(opt)}
                className="group relative w-full py-5 px-6 bg-white rounded-xl shadow-sm border-2 border-transparent hover:border-teal-200 hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex items-center justify-start text-left focus:outline-none focus:ring-4 focus:ring-teal-500/20"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold mr-4 group-hover:bg-teal-100 group-hover:text-teal-600 transition-colors">
                  {String.fromCharCode(65 + index)}
                </div>
                <span className="text-lg font-medium text-slate-700 group-hover:text-teal-700 z-10 transition-colors">
                  {t(`exp.linda.option.${opt}`)}
                </span>
                <span className="absolute inset-0 bg-teal-50/0 group-hover:bg-teal-50/50 rounded-xl transition-colors -z-10"></span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </ExperimentWrapper>
  );
}

export default LindaExperiment;
