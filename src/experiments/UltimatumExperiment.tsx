/**
 * ULTIMATUM GAME - Economic Decision Experiment
 * 
 * Tests fairness preferences in bargaining.
 * Proposer suggests a split, responder can accept or reject.
 */

import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ExperimentWrapper } from './ExperimentWrapper';
import type { Experiment } from '../data/experiments';
import type { TrialData, ExperimentResults } from './ExperimentWrapper';
import { getDefaultConfig } from './config/experimentDefaults';

interface UltimatumConfig {
  trials: number;
  isi: number;
  stimulusDuration: number;
  responseTimeLimit: number;
  showFeedback: boolean;
  showProgressBar: boolean;
  customInstructions: string;
  randomizeOrder: boolean;
  practiceTrials: number;
  outlierRemoval: boolean;
  outlierThreshold: number;
  totalAmount: number;
  minOffer: number;
}

interface UltimatumProps {
  experiment: Experiment;
  onComplete: (results: ExperimentResults) => void;
  participantId: string;
  roomId: string;
  config?: Partial<UltimatumConfig>;
}

const DEFAULT_CONFIG = {
  ...getDefaultConfig('ultimatum-game'),
  totalAmount: 100,
  minOffer: 5,
  trials: 10,
} as UltimatumConfig;

export function UltimatumExperiment({ experiment, onComplete, participantId, roomId, config = {} }: UltimatumProps) {
  const { t, language } = useLanguage();

  const settings: UltimatumConfig = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  const [phase, setPhase] = useState<'instruction' | 'experiment' | 'complete'>('instruction');
  const [trialIndex, setTrialIndex] = useState(0);
  const [trialData, setTrialData] = useState<TrialData[]>([]);
  const [experimentStartTime, setExperimentStartTime] = useState(0);
  const [trialStartTime, setTrialStartTime] = useState(0);
  const [currentOffer, setCurrentOffer] = useState(0);
  const [playerRole, setPlayerRole] = useState<'proposer' | 'responder'>('responder');

  const generateOffers = (): number[] => {
    const offers: number[] = [];
    for (let i = settings.minOffer; i <= settings.totalAmount; i += 10) {
      offers.push(i);
    }
    return offers.sort(() => Math.random() - 0.5).slice(0, settings.trials);
  };

  const [allOffers] = useState(generateOffers);

  useEffect(() => {
    if (phase === 'instruction') {
      setExperimentStartTime(performance.now());
    }
  }, [phase]);

  useEffect(() => {
    if (phase === 'experiment') {
      setTrialStartTime(performance.now());
      setCurrentOffer(allOffers[trialIndex]);
      setPlayerRole(trialIndex % 2 === 0 ? 'responder' : 'proposer');
    }
  }, [phase, trialIndex]);

  const handleResponse = (response: 'accept' | 'reject' | 'offer') => {
    const endTime = performance.now();
    const responseTime = Math.round(endTime - trialStartTime);

    const fairnessThreshold = settings.totalAmount * 0.4;
    const isFair = currentOffer >= fairnessThreshold;

    const trial: TrialData = {
      trialNumber: trialIndex + 1,
      responseTimeMs: responseTime,
      answer: response,
      correctAnswer: isFair ? 'accept' : 'reject',
      stimulus: { offer: currentOffer, role: playerRole, amount: settings.totalAmount },
    };

    setTrialData(prev => [...prev, trial]);

    setTimeout(() => {
      if (trialIndex < allOffers.length - 1) {
        setTrialIndex(prev => prev + 1);
      } else {
        completeExperiment();
      }
    }, settings.isi > 0 ? settings.isi : 500);
  };

  const completeExperiment = () => {
    setPhase('complete');
    const endTime = performance.now();
    const totalTime = Math.round(endTime - experimentStartTime);

    const acceptedOffers = trialData.filter(t => t.answer === 'accept').length;
    const rejectionRate = ((trialData.length - acceptedOffers) / trialData.length) * 100;

    const results: ExperimentResults = {
      experimentName: experiment.id,
      participantId,
      roomId,
      language,
      timestamp: new Date().toISOString(),
      totalTrials: trialData.length,
      responseTimeMs: totalTime,
      accuracy: 100 - rejectionRate,
      answer: rejectionRate,
      correctAnswer: 'rejection_rate',
      trialData: trialData,
      debrief: t(experiment.debriefKey),
    };

    onComplete(results);
  };

  if (phase === 'instruction') {
    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="max-w-2xl mx-auto p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
          <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-emerald-600 mb-6">{t('exp.ultimatum.name')}</h2>

          <div className="bg-slate-50 border-l-4 border-teal-500 p-5 rounded-r-lg shadow-sm mb-6">
            <p className="text-slate-700 leading-relaxed text-md">
              {settings.customInstructions || t('exp.ultimatum.instruction')}
            </p>
          </div>

          <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-5 mb-8">
            <p className="text-sm font-semibold text-indigo-900 mb-2 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              {t('exp.ultimatum.instructionDetail')}
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
    const accepted = trialData.filter(t => t.answer === 'accept').length;
    const rejected = trialData.filter(t => t.answer === 'reject').length;

    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="max-w-2xl mx-auto p-6">
          <h2 className="text-2xl font-bold text-navy-900 mb-4">{t('common.debrief.title')}</h2>
          <div className="bg-teal-50 border-l-4 border-teal-500 p-4 mb-4">
            <p className="text-teal-800 font-medium">{t('common.debrief.thankYou')}</p>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-navy-900">{accepted}</p>
              <p className="text-sm text-gray-600">{t('exp.ultimatum.accepted')}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-navy-900">{rejected}</p>
              <p className="text-sm text-gray-600">{t('exp.ultimatum.rejected')}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-navy-900">{Math.round(trialData.reduce((s, t) => s + t.responseTimeMs, 0) / trialData.length)}ms</p>
              <p className="text-sm text-gray-600">{t('common.avgRT')}</p>
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg mb-4">
            <p className="text-amber-800 font-medium mb-2">{t('exp.ultimatum.yourBehavior')}:</p>
            <p className="text-sm text-amber-700">
              {rejected > accepted / 2
                ? t('exp.ultimatum.strict')
                : rejected > accepted / 4
                  ? t('exp.ultimatum.moderate')
                  : t('exp.ultimatum.flexible')}
            </p>
            <p className="text-sm text-amber-700 mt-2">{t('exp.ultimatum.interpretation')}</p>
          </div>
          <p className="text-gray-600 mb-4">{t('exp.ultimatum.debrief')}</p>
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
                style={{ width: `${((trialIndex + 1) / allOffers.length) * 100}%` }}
              />
            </div>
            <div className="flex justify-between items-center mt-3">
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                {trialIndex + 1} / {allOffers.length}
              </span>
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col items-center justify-center animate-fade-in w-full max-w-xl mx-auto">
          <div className="w-full bg-white p-8 sm:p-10 rounded-2xl shadow-sm border border-slate-100 mb-10 text-center relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-400 transform origin-top group-hover:scale-y-110 transition-transform duration-500"></div>
            <p className="text-slate-500 font-semibold uppercase tracking-wider text-sm mb-4">
              {t('exp.ultimatum.offer')}
            </p>
            <div className="flex items-end justify-center gap-3">
              <span className="font-extrabold text-6xl text-transparent bg-clip-text bg-gradient-to-b from-indigo-500 to-indigo-700 inline-block drop-shadow-sm leading-none">
                ${currentOffer}
              </span>
              <span className="text-2xl font-bold text-slate-300 pb-1">
                / ${settings.totalAmount}
              </span>
            </div>
          </div>

          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight mb-8 text-center">
            {playerRole === 'responder' ? t('exp.ultimatum.acceptOffer') : t('exp.ultimatum.makeOffer')}
          </h2>

          {playerRole === 'responder' ? (
            <div className="flex flex-col sm:flex-row justify-center gap-5 w-full">
              <button
                onClick={() => handleResponse('accept')}
                className="group relative flex-1 py-5 bg-white rounded-2xl shadow-sm border-2 border-transparent hover:border-teal-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col items-center justify-center focus:outline-none focus:ring-4 focus:ring-teal-500/20"
              >
                <span className="absolute inset-0 bg-teal-50/0 group-hover:bg-teal-50/50 rounded-2xl transition-colors"></span>
                <span className="text-xl font-bold text-slate-700 group-hover:text-teal-700 z-10 transition-colors uppercase tracking-wide mb-1">{t('exp.ultimatum.accept')}</span>
                <span className="text-sm font-medium text-teal-600/80 z-10">${settings.totalAmount - currentOffer} for you</span>
              </button>

              <button
                onClick={() => handleResponse('reject')}
                className="group relative flex-1 py-5 bg-white rounded-2xl shadow-sm border-2 border-transparent hover:border-rose-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col items-center justify-center focus:outline-none focus:ring-4 focus:ring-rose-500/20"
              >
                <span className="absolute inset-0 bg-slate-50/0 group-hover:bg-rose-50/50 rounded-2xl transition-colors"></span>
                <span className="text-xl font-bold text-slate-700 group-hover:text-rose-700 z-10 transition-colors uppercase tracking-wide mb-1">{t('exp.ultimatum.reject')}</span>
                <span className="text-sm font-medium text-rose-500/80 z-10">{t('exp.ultimatum.bothGetNothing')}</span>
              </button>
            </div>
          ) : (
            <div className="flex justify-center w-full">
              <button
                onClick={() => handleResponse('offer')}
                className="group relative w-full sm:w-2/3 py-5 bg-gradient-to-r from-teal-500 to-emerald-500 rounded-2xl shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col items-center justify-center focus:outline-none focus:ring-4 focus:ring-teal-500/30"
              >
                <span className="text-xl font-bold text-white z-10 uppercase tracking-wide mb-1 flex items-center gap-2">
                  {t('exp.ultimatum.propose')}
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                </span>
                <span className="text-sm font-medium text-teal-100 z-10">${currentOffer} / ${settings.totalAmount}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </ExperimentWrapper>
  );
}

export default UltimatumExperiment;
