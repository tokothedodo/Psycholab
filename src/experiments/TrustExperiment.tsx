/**
 * TRUST GAME - Economic Decision Experiment
 * 
 * Tests trust and reciprocity.
 * Player decides how much to send to partner who may reciprocate.
 */

import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ExperimentWrapper } from './ExperimentWrapper';
import type { Experiment } from '../data/experiments';
import type { TrialData, ExperimentResults } from './ExperimentWrapper';
import { getDefaultConfig } from './config/experimentDefaults';

interface TrustConfig {
  trials: number;
  isi: number;
  showFeedback: boolean;
  showProgressBar: boolean;
  customInstructions: string;
  randomizeOrder: boolean;
  practiceTrials: number;
  initialAmount: number;
  multiplier: number;
}

interface TrustProps {
  experiment: Experiment;
  onComplete: (results: ExperimentResults) => void;
  participantId: string;
  roomId: string;
  config?: Partial<TrustConfig>;
}

const DEFAULT_CONFIG = {
  ...getDefaultConfig('trust'),
  trials: 10,
  initialAmount: 100,
  multiplier: 3,
} as TrustConfig;

export function TrustExperiment({ experiment, onComplete, participantId, roomId, config = {} }: TrustProps) {
  const { t, language } = useLanguage();

  const settings: TrustConfig = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  const [phase, setPhase] = useState<'instruction' | 'experiment' | 'complete'>('instruction');
  const [trialIndex, setTrialIndex] = useState(0);
  const [trialData, setTrialData] = useState<TrialData[]>([]);
  const [experimentStartTime, setExperimentStartTime] = useState(0);
  const [trialStartTime, setTrialStartTime] = useState(0);
  const [sendAmount, setSendAmount] = useState(settings.initialAmount / 2);

  useEffect(() => {
    if (phase === 'instruction') setExperimentStartTime(performance.now());
  }, [phase]);

  useEffect(() => {
    if (phase === 'experiment') {
      setTrialStartTime(performance.now());
      setSendAmount(settings.initialAmount / 2);
    }
  }, [phase, trialIndex]);

  const handleSubmit = () => {
    const endTime = performance.now();
    const responseTime = Math.round(endTime - trialStartTime);

    const returnRate = 0.3 + Math.random() * 0.4;
    const returnedAmount = Math.round(sendAmount * settings.multiplier * returnRate);

    const trial: TrialData = {
      trialNumber: trialIndex + 1,
      responseTimeMs: responseTime,
      answer: String(sendAmount),
      correctAnswer: String(returnedAmount),
      stimulus: { sent: sendAmount, returned: returnedAmount, multiplier: settings.multiplier },
    };

    setTrialData(prev => [...prev, trial]);

    if (trialIndex < settings.trials - 1) {
      setTimeout(() => setTrialIndex(prev => prev + 1), settings.isi > 0 ? settings.isi : 500);
    } else {
      completeExperiment();
    }
  };

  const completeExperiment = () => {
    setPhase('complete');
    const endTime = performance.now();
    const totalTime = Math.round(endTime - experimentStartTime);

    const avgSent = trialData.reduce((sum, t) => sum + parseInt(String(t.answer), 10), 0) / trialData.length;

    const results: ExperimentResults = {
      experimentName: experiment.id,
      participantId,
      roomId,
      language,
      timestamp: new Date().toISOString(),
      totalTrials: trialData.length,
      responseTimeMs: totalTime,
      accuracy: 50,
      answer: avgSent,
      correctAnswer: 'avg_amount_sent',
      trialData: trialData,
      debrief: t(experiment.debriefKey),
    };

    onComplete(results);
  };

  if (phase === 'instruction') {
    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="max-w-2xl mx-auto p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
          <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-emerald-600 mb-6">{t('exp.trust.name')}</h2>

          <div className="bg-slate-50 border-l-4 border-teal-500 p-5 rounded-r-lg shadow-sm mb-6">
            <p className="text-slate-700 leading-relaxed text-md">
              {settings.customInstructions || t('exp.trust.instruction')}
            </p>
          </div>

          <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-5 mb-8">
            <p className="text-sm font-semibold text-indigo-900 mb-2 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              {t('exp.trust.instructionDetail')}
            </p>
          </div>

          <p className="text-sm font-medium text-slate-400 mb-8 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
            {t('citation')}: {experiment.citation}, {experiment.year}
          </p>

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
    const avgSent = trialData.reduce((sum, t) => sum + parseInt(String(t.answer), 10), 0) / trialData.length;
    const trustLevel = avgSent / settings.initialAmount * 100;

    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="max-w-2xl mx-auto p-6">
          <h2 className="text-2xl font-bold text-navy-900 mb-4">{t('common.debrief.title')}</h2>
          <div className="bg-teal-50 border-l-4 border-teal-500 p-4 mb-4">
            <p className="text-teal-800 font-medium">{t('common.debrief.thankYou')}</p>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-navy-900">{Math.round(avgSent)}</p>
              <p className="text-sm text-gray-600">{t('exp.trust.avgSent')}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-navy-900">{Math.round(trustLevel)}%</p>
              <p className="text-sm text-gray-600">{t('exp.trust.trustLevel')}</p>
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg mb-4">
            <p className="text-amber-800 font-medium">{t('exp.trust.interpretation')}</p>
            <p className="text-sm text-amber-700">
              {trustLevel > 50 ? t('exp.trust.highTrust') : trustLevel > 25 ? t('exp.trust.moderateTrust') : t('exp.trust.lowTrust')}
            </p>
          </div>
          <p className="text-gray-600 mb-4">{t('exp.trust.debrief')}</p>
        </div>
      </ExperimentWrapper>
    );
  }

  return (
    <ExperimentWrapper experiment={experiment}>
      <div className="max-w-3xl mx-auto p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 min-h-[550px] flex flex-col relative overflow-hidden">
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
          <div className="w-full bg-white p-8 sm:p-10 rounded-2xl shadow-sm border border-slate-100 mb-10 text-center relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-400 transform origin-top group-hover:scale-y-110 transition-transform duration-500"></div>
            <p className="text-slate-500 font-semibold uppercase tracking-wider text-sm mb-4">
              {t('exp.trust.round')} {trialIndex + 1}
            </p>
            <div className="flex items-end justify-center gap-3">
              <span className="font-extrabold text-6xl text-transparent bg-clip-text bg-gradient-to-b from-indigo-500 to-indigo-700 inline-block drop-shadow-sm leading-none">
                ${settings.initialAmount}
              </span>
            </div>
          </div>

          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight mb-8 text-center">
            {t('exp.trust.howMuchSend')}
          </h2>

          <div className="w-full bg-slate-50 p-8 rounded-2xl border border-slate-100 mb-10">
            <div className="relative pt-4 pb-2 mb-8">
              <input
                type="range"
                min="0"
                max={settings.initialAmount}
                value={sendAmount}
                onChange={(e) => setSendAmount(parseInt(e.target.value))}
                className="w-full h-3 bg-slate-200 rounded-full appearance-none cursor-pointer focus:outline-none focus:ring-4 focus:ring-teal-500/20 z-10 relative accent-teal-500"
                style={{
                  background: `linear-gradient(to right, #14b8a6 ${Math.round((sendAmount / settings.initialAmount) * 100)}%, #e2e8f0 ${Math.round((sendAmount / settings.initialAmount) * 100)}%)`
                }}
              />
            </div>

            <div className="flex justify-between items-center px-2">
              <div className="flex flex-col items-center group">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 transition-colors group-hover:text-teal-500">{t('exp.trust.youKeep')}</span>
                <span className="text-2xl font-bold text-teal-600 transition-transform group-hover:scale-105">${settings.initialAmount - sendAmount}</span>
              </div>

              <div className="h-10 w-px bg-slate-200"></div>

              <div className="flex flex-col items-center">
                <span className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-1">{t('exp.trust.sending')}</span>
                <span className="text-3xl font-extrabold text-indigo-600 px-4 py-1 bg-indigo-50 rounded-xl">${sendAmount}</span>
              </div>

              <div className="h-10 w-px bg-slate-200"></div>

              <div className="flex flex-col items-center group">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 transition-colors group-hover:text-amber-500">{t('exp.trust.partnerGets')}</span>
                <span className="text-2xl font-bold text-amber-500 flex items-center gap-1 transition-transform group-hover:scale-105">
                  <span className="text-sm opacity-70">({settings.multiplier}x)</span>
                  ${sendAmount * settings.multiplier}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            className="group relative w-full sm:w-2/3 py-5 bg-gradient-to-r from-teal-500 to-emerald-500 rounded-2xl shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center justify-center focus:outline-none focus:ring-4 focus:ring-teal-500/30 text-white font-bold text-xl uppercase tracking-wider"
          >
            {t('common.confirm')}
            <svg className="w-6 h-6 ml-3 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
          </button>
        </div>
      </div>
    </ExperimentWrapper>
  );
}

export default TrustExperiment;
