/**
 * LOSS AVERSION - Decision Making Experiment
 * 
 * Tests asymmetric weighting of gains vs losses.
 * Participants make choices between sure gains/losses and probabilistic options.
 */

import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ExperimentWrapper } from './ExperimentWrapper';
import type { Experiment } from '../data/experiments';
import type { TrialData, ExperimentResults } from './ExperimentWrapper';
import { getDefaultConfig } from './config/experimentDefaults';

interface LossAversionConfig {
  trials: number;
  isi: number;
  showFeedback: boolean;
  showProgressBar: boolean;
  customInstructions: string;
  randomizeOrder: boolean;
  practiceTrials: number;
}

interface LossAversionProps {
  experiment: Experiment;
  onComplete: (results: ExperimentResults) => void;
  participantId: string;
  roomId: string;
  config?: Partial<LossAversionConfig>;
}

interface Trial {
  type: 'gain' | 'loss';
  sureAmount: number;
  gambleWin: number;
  gambleLose: number;
  gambleProb: number;
}

const TRIALS: Trial[] = [
  { type: 'gain', sureAmount: 30, gambleWin: 45, gambleLose: 0, gambleProb: 0.5 },
  { type: 'gain', sureAmount: 20, gambleWin: 40, gambleLose: 0, gambleProb: 0.5 },
  { type: 'gain', sureAmount: 10, gambleWin: 30, gambleLose: 0, gambleProb: 0.5 },
  { type: 'loss', sureAmount: -30, gambleWin: -45, gambleLose: 0, gambleProb: 0.5 },
  { type: 'loss', sureAmount: -20, gambleWin: -40, gambleLose: 0, gambleProb: 0.5 },
  { type: 'loss', sureAmount: -10, gambleWin: -30, gambleLose: 0, gambleProb: 0.5 },
];

const DEFAULT_CONFIG = {
  ...getDefaultConfig('loss-aversion-task'),
  trials: 20,
} as LossAversionConfig;

export function LossAversionExperiment({ experiment, onComplete, participantId, roomId, config = {} }: LossAversionProps) {
  const { t, language } = useLanguage();

  const settings: LossAversionConfig = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  const [phase, setPhase] = useState<'instruction' | 'experiment' | 'complete'>('instruction');
  const [trialIndex, setTrialIndex] = useState(0);
  const [trialData, setTrialData] = useState<TrialData[]>([]);
  const [experimentStartTime, setExperimentStartTime] = useState(0);
  const [trialStartTime, setTrialStartTime] = useState(0);

  const generateTrials = (): Trial[] => {
    let trials: Trial[] = [];
    while (trials.length < settings.trials) {
      trials = [...trials, ...TRIALS];
    }
    trials = trials.slice(0, settings.trials);
    if (settings.randomizeOrder) {
      trials = trials.sort(() => Math.random() - 0.5);
    }
    return trials;
  };

  const [allTrials] = useState(generateTrials);

  useEffect(() => {
    if (phase === 'instruction') setExperimentStartTime(performance.now());
  }, [phase]);

  useEffect(() => {
    if (phase === 'experiment') setTrialStartTime(performance.now());
  }, [phase, trialIndex]);

  const handleResponse = (choice: 'sure' | 'gamble') => {
    const endTime = performance.now();
    const responseTime = Math.round(endTime - trialStartTime);
    const currentTrial = allTrials[trialIndex];

    const trial: TrialData = {
      trialNumber: trialIndex + 1,
      responseTimeMs: responseTime,
      answer: choice,
      correctAnswer: currentTrial.type === 'gain' ? 'sure' : 'gamble',
      stimulus: { ...currentTrial },
    };

    setTrialData(prev => [...prev, trial]);

    if (trialIndex < allTrials.length - 1) {
      setTimeout(() => setTrialIndex(prev => prev + 1), settings.isi > 0 ? settings.isi : 300);
    } else {
      completeExperiment();
    }
  };

  const completeExperiment = () => {
    setPhase('complete');
    const endTime = performance.now();
    const totalTime = Math.round(endTime - experimentStartTime);

    const gainTrials = trialData.filter(t => (t.stimulus as Trial).type === 'gain');
    const lossTrials = trialData.filter(t => (t.stimulus as Trial).type === 'loss');
    const gainSure = gainTrials.filter(t => t.answer === 'sure').length;
    const lossGamble = lossTrials.filter(t => t.answer === 'gamble').length;
    const lossAversion = (lossGamble / lossTrials.length) / (gainSure / gainTrials.length);

    const results: ExperimentResults = {
      experimentName: experiment.id,
      participantId,
      roomId,
      language,
      timestamp: new Date().toISOString(),
      totalTrials: trialData.length,
      responseTimeMs: totalTime,
      accuracy: 50,
      answer: lossAversion,
      correctAnswer: 'loss_aversion_coefficient',
      trialData: trialData,
      debrief: t(experiment.debriefKey),
    };

    onComplete(results);
  };

  if (phase === 'instruction') {
    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="max-w-2xl mx-auto p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
          <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-emerald-600 mb-6">{t('exp.lossAversion.name')}</h2>

          <div className="bg-slate-50 border-l-4 border-teal-500 p-5 rounded-r-lg shadow-sm mb-6">
            <p className="text-slate-700 leading-relaxed text-md">
              {settings.customInstructions || t('exp.lossAversion.instruction')}
            </p>
          </div>

          <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-5 mb-8">
            <p className="text-sm font-semibold text-indigo-900 mb-2 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              {t('exp.lossAversion.instructionDetail')}
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
    const gainSure = trialData.filter(t => (t.stimulus as Trial).type === 'gain' && t.answer === 'sure').length;
    const lossGamble = trialData.filter(t => (t.stimulus as Trial).type === 'loss' && t.answer === 'gamble').length;
    const gainTrials = trialData.filter(t => (t.stimulus as Trial).type === 'gain').length;
    const lossTrials = trialData.filter(t => (t.stimulus as Trial).type === 'loss').length;

    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="max-w-2xl mx-auto p-6">
          <h2 className="text-2xl font-bold text-navy-900 mb-4">{t('common.debrief.title')}</h2>
          <div className="bg-teal-50 border-l-4 border-teal-500 p-4 mb-4">
            <p className="text-teal-800 font-medium">{t('common.debrief.thankYou')}</p>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-navy-900">{gainSure}/{gainTrials}</p>
              <p className="text-sm text-gray-600">{t('exp.lossAversion.preferSureGains')}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-navy-900">{lossGamble}/{lossTrials}</p>
              <p className="text-sm text-gray-600">{t('exp.lossAversion.riskSeekLosses')}</p>
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg mb-4">
            <p className="text-amber-800 font-medium">{t('exp.lossAversion.interpretation')}</p>
            <p className="text-sm text-amber-700">{t('exp.lossAversion.explanation')}</p>
          </div>
          <p className="text-gray-600 mb-4">{t('exp.lossAversion.debrief')}</p>
        </div>
      </ExperimentWrapper>
    );
  }

  const currentTrial = allTrials[trialIndex];
  const isGain = currentTrial.type === 'gain';

  return (
    <ExperimentWrapper experiment={experiment}>
      <div className="max-w-3xl mx-auto p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 min-h-[550px] flex flex-col relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-white -z-10"></div>

        {settings.showProgressBar && (
          <div className="mb-8 px-4 pt-2">
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-teal-400 to-teal-500 transition-all duration-500 ease-out"
                style={{ width: `${((trialIndex + 1) / allTrials.length) * 100}%` }}
              />
            </div>
            <div className="flex justify-between items-center mt-3">
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                {trialIndex + 1} / {allTrials.length}
              </span>
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col items-center justify-center animate-fade-in w-full max-w-xl mx-auto">

          <div className={`w-full p-4 mb-8 text-center rounded-xl font-bold uppercase tracking-wider text-sm transition-colors ${isGain
            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-[inset_0_2px_10px_rgba(16,185,129,0.05)]'
            : 'bg-rose-50 text-rose-600 border border-rose-100 shadow-[inset_0_2px_10px_rgba(244,63,94,0.05)]'
            }`}>
            {isGain ? t('exp.lossAversion.gain') : t('exp.lossAversion.loss')}
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight mb-10 text-center leading-tight">
            {t('exp.lossAversion.choose')}
          </h2>

          <div className="flex flex-col sm:flex-row justify-center gap-5 w-full">
            <button
              onClick={() => handleResponse('sure')}
              className="group relative flex-1 py-8 px-6 bg-white rounded-2xl shadow-sm border-2 border-transparent hover:border-teal-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col items-center justify-center focus:outline-none focus:ring-4 focus:ring-teal-500/20"
            >
              <span className="absolute inset-0 bg-teal-50/0 group-hover:bg-teal-50/50 rounded-2xl transition-colors"></span>
              <span className={`text-3xl font-black z-10 transition-colors mb-2 ${isGain ? 'text-emerald-500 group-hover:text-emerald-600' : 'text-rose-500 group-hover:text-rose-600'}`}>
                {isGain ? `+ $${currentTrial.sureAmount}` : `- $${Math.abs(currentTrial.sureAmount)}`}
              </span>
              <span className="text-sm font-semibold text-slate-500 uppercase tracking-widest z-10">{t('exp.lossAversion.sure')}</span>
            </button>

            <button
              onClick={() => handleResponse('gamble')}
              className="group relative flex-1 py-8 px-6 bg-white rounded-2xl shadow-sm border-2 border-transparent hover:border-indigo-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col items-center justify-center focus:outline-none focus:ring-4 focus:ring-indigo-500/20"
            >
              <span className="absolute inset-0 bg-indigo-50/0 group-hover:bg-indigo-50/50 rounded-2xl transition-colors"></span>
              <span className={`text-3xl font-black z-10 transition-colors mb-1 ${isGain ? 'text-emerald-500 group-hover:text-emerald-600' : 'text-rose-500 group-hover:text-rose-600'}`}>
                {isGain ? `+ $${currentTrial.gambleWin}` : `- $${Math.abs(currentTrial.gambleLose)}`}
              </span>
              <span className="text-sm font-bold text-indigo-400 mb-2 z-10">{currentTrial.gambleProb * 100}% {t('common.probability')}</span>
              <span className="text-sm font-semibold text-slate-500 uppercase tracking-widest z-10">{t('exp.lossAversion.gamble')}</span>
            </button>
          </div>
        </div>
      </div>
    </ExperimentWrapper>
  );
}

export default LossAversionExperiment;
