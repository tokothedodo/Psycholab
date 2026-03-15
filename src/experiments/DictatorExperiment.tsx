/**
 * DICTATOR GAME - Economic Decision Experiment
 * 
 * Tests altruism and resource allocation behavior.
 * The participant decides how to split a sum of money between themselves and a stranger.
 */

import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ExperimentWrapper } from './ExperimentWrapper';
import type { Experiment } from '../data/experiments';
import type { TrialData, ExperimentResults } from './ExperimentWrapper';
import { getDefaultConfig } from './config/experimentDefaults';

interface DictatorConfig {
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
  showPartnerInfo: boolean;
}

interface DictatorProps {
  experiment: Experiment;
  onComplete: (results: ExperimentResults) => void;
  participantId: string;
  roomId: string;
  config?: Partial<DictatorConfig>;
}

interface Recipient {
  id: string;
  name: string;
  description: string;
  descriptionKey: string;
}

const DEFAULT_CONFIG = {
  ...getDefaultConfig('dictator-game'),
  totalAmount: 100,
  showPartnerInfo: true,
  trials: 3,
} as DictatorConfig;

const RECIPIENTS: Recipient[] = [
  { id: 'stranger', name: 'Stranger', description: 'A random person from your country', descriptionKey: 'exp.dictator.recipient.stranger' },
  { id: 'charity', name: 'Charity', description: 'A local charity helping children', descriptionKey: 'exp.dictator.recipient.charity' },
  { id: 'friend', name: 'Friend', description: 'A close friend of yours', descriptionKey: 'exp.dictator.recipient.friend' },
];

export function DictatorExperiment({ experiment, onComplete, participantId, roomId, config = {} }: DictatorProps) {
  const { t, language } = useLanguage();

  const settings: DictatorConfig = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  const [phase, setPhase] = useState<'instruction' | 'experiment' | 'complete'>('instruction');
  const [trialIndex, setTrialIndex] = useState(0);
  const [trialData, setTrialData] = useState<TrialData[]>([]);
  const [experimentStartTime, setExperimentStartTime] = useState(0);
  const [trialStartTime, setTrialStartTime] = useState(0);
  const [userShare, setUserShare] = useState<number>(50);
  const [showResult, setShowResult] = useState(false);

  const generateStimuli = (): Recipient[] => {
    let stimuli = [...RECIPIENTS];
    if (settings.randomizeOrder) {
      stimuli = stimuli.sort(() => Math.random() - 0.5);
    }
    return stimuli.slice(0, settings.trials);
  };

  const [allRecipients] = useState(generateStimuli);

  useEffect(() => {
    if (phase === 'instruction') {
      setExperimentStartTime(performance.now());
    }
  }, [phase]);

  useEffect(() => {
    if (phase === 'experiment') {
      setTrialStartTime(performance.now());
      setUserShare(50);
      setShowResult(false);
    }
  }, [phase, trialIndex]);

  useEffect(() => {
    if (settings.responseTimeLimit > 0 && phase === 'experiment' && showResult) {
      const timer = setTimeout(() => {
        handleSubmit();
      }, settings.responseTimeLimit);
      return () => clearTimeout(timer);
    }
  }, [phase, trialIndex, settings.responseTimeLimit, showResult]);

  const handleSubmit = () => {
    const recipientShare = settings.totalAmount - userShare;
    const endTime = performance.now();
    const responseTime = Math.round(endTime - trialStartTime);

    const currentRecipient = allRecipients[trialIndex];

    const trial: TrialData = {
      trialNumber: trialIndex + 1,
      responseTimeMs: responseTime,
      answer: String(userShare),
      correctAnswer: String(recipientShare),
      stimulus: {
        recipientId: currentRecipient.id,
        recipientName: currentRecipient.name,
        totalAmount: settings.totalAmount,
      },
    };

    setTrialData(prev => [...prev, trial]);

    if (trialIndex < allRecipients.length - 1) {
      setTimeout(() => {
        setTrialIndex(prev => prev + 1);
      }, settings.isi > 0 ? settings.isi : 1000);
    } else {
      setTimeout(() => {
        completeExperiment();
      }, settings.isi > 0 ? settings.isi : 1000);
    }
  };

  const completeExperiment = () => {
    setPhase('complete');
    const endTime = performance.now();
    const totalTime = Math.round(endTime - experimentStartTime);

    const avgShare = trialData.reduce((sum, t) => sum + parseInt(String(t.answer), 10), 0) / trialData.length;

    const results: ExperimentResults = {
      experimentName: experiment.id,
      participantId,
      roomId,
      language,
      timestamp: new Date().toISOString(),
      totalTrials: trialData.length,
      responseTimeMs: totalTime,
      accuracy: avgShare,
      answer: avgShare,
      correctAnswer: 'average_offered_percentage',
      trialData: trialData,
      debrief: t(experiment.debriefKey),
    };

    onComplete(results);
  };

  if (phase === 'instruction') {
    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="max-w-2xl mx-auto p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
          <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-emerald-600 mb-6">{t('exp.dictator.name')}</h2>

          <div className="bg-slate-50 border-l-4 border-teal-500 p-5 rounded-r-lg shadow-sm mb-6">
            <p className="text-slate-700 leading-relaxed text-md">
              {settings.customInstructions || t('exp.dictator.instruction')}
            </p>
          </div>

          <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-5 mb-6">
            <p className="text-sm font-semibold text-indigo-900 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              {t('exp.dictator.howItWorks')}
            </p>
            <ul className="text-indigo-800 text-sm space-y-2 ml-6 list-[circle]">
              <li>{t('exp.dictator.step1')}</li>
              <li>{t('exp.dictator.step2')}</li>
              <li>{t('exp.dictator.step3')}</li>
            </ul>
          </div>

          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl mb-8 flex gap-3 text-amber-800 text-sm font-medium">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
            <p>{t('exp.dictator.realMoney')}</p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 pb-6 border-b border-gray-100">
            <p className="text-sm font-medium text-slate-400 flex items-center gap-2 mb-4 sm:mb-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
              {t('citation')}: {experiment.citation}, {experiment.year}
            </p>
            <p className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full inline-flex tracking-wide">
              {settings.trials} rounds <span className="mx-2">•</span> {t('exp.dictator.amount')}: ${settings.totalAmount}
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
    const avgGiven = trialData.reduce((sum, t) => sum + (settings.totalAmount - parseInt(String(t.answer), 10)), 0) / trialData.length;

    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="max-w-2xl mx-auto p-6">
          <h2 className="text-2xl font-bold text-navy-900 mb-4">{t('common.debrief.title')}</h2>

          <div className="bg-teal-50 border-l-4 border-teal-500 p-4 mb-4">
            <p className="text-teal-800 font-medium">{t('common.debrief.thankYou')}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-navy-900">{Math.round(avgGiven)}%</p>
              <p className="text-sm text-gray-600">{t('exp.dictator.avgGiven')}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-navy-900">{Math.round(trialData.reduce((s, t) => s + t.responseTimeMs, 0) / trialData.length)}ms</p>
              <p className="text-sm text-gray-600">{t('common.avgRT')}</p>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            {trialData.map((trial, i) => {
              const stimulus = trial.stimulus as { recipientName: string };
              return (
                <div key={i} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                  <span className="text-gray-600">{stimulus.recipientName}</span>
                  <span className="font-semibold">{trial.answer} / {settings.totalAmount}</span>
                </div>
              );
            })}
          </div>

          <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg mb-4">
            <p className="text-amber-800 font-medium mb-2">{t('exp.dictator.yourBehavior')}:</p>
            <p className="text-sm text-amber-700">
              {avgGiven > 40
                ? t('exp.dictator.highlyGenerous')
                : avgGiven > 20
                  ? t('exp.dictator.moderatelyGenerous')
                  : t('exp.dictator.selfInterested')}
            </p>
            <p className="text-sm text-amber-700 mt-2">{t('exp.dictator.interpretation')}</p>
          </div>

          <p className="text-gray-600 mb-4">{t('exp.dictator.debrief')}</p>
        </div>
      </ExperimentWrapper>
    );
  }

  const currentRecipient = allRecipients[trialIndex];

  return (
    <ExperimentWrapper experiment={experiment}>
      <div className="max-w-4xl mx-auto p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 min-h-[600px] flex flex-col relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-white -z-10"></div>
        {settings.showProgressBar && (
          <div className="mb-8 px-4 pt-2">
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-teal-400 to-teal-500 transition-all duration-500 ease-out"
                style={{ width: `${((trialIndex + 1) / allRecipients.length) * 100}%` }}
              />
            </div>
            <div className="flex justify-between items-center mt-3">
              <span className="text-xs font-bold text-slate-500 tracking-wider uppercase bg-slate-100 px-3 py-1 rounded-full">
                {t('exp.dictator.round')} {trialIndex + 1}
              </span>
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                {trialIndex + 1} / {allRecipients.length}
              </span>
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col items-center justify-center w-full max-w-2xl mx-auto animate-fade-in">
          {settings.showPartnerInfo && (
            <div className="w-full bg-indigo-50/50 border border-indigo-100 p-6 rounded-2xl mb-8 text-center relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full bg-indigo-400 transform origin-top group-hover:scale-y-110 transition-transform duration-500"></div>
              <p className="text-indigo-900 font-bold uppercase tracking-widest text-xs mb-3 flex justify-center items-center gap-2">
                <svg className="w-4 h-4 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                {t('exp.dictator.youWillSplitWith')}
              </p>
              <p className="text-indigo-700 text-lg font-medium">{t(currentRecipient.descriptionKey)}</p>
            </div>
          )}

          <div className="w-full bg-white p-8 sm:p-10 rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 mb-8">
            <div className="text-center mb-10 pb-6 border-b border-slate-100">
              <p className="text-slate-500 font-medium uppercase tracking-wider text-sm mb-3">
                {t('exp.dictator.totalAmount')}
              </p>
              <p className="font-extrabold text-5xl text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600 inline-block drop-shadow-sm">
                ${settings.totalAmount}
              </p>
            </div>

            <div className="mb-10 w-full max-w-lg mx-auto px-4">
              <div className="flex justify-between items-end mb-6">
                <div>
                  <span className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{t('exp.dictator.youKeep')}</span>
                  <span className="text-3xl font-bold text-teal-600">${userShare}</span>
                </div>
                <div className="text-right">
                  <span className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{t('exp.dictator.theyGet')}</span>
                  <span className="text-3xl font-bold text-indigo-500">${settings.totalAmount - userShare}</span>
                </div>
              </div>

              <div className="relative pt-4 pb-2">
                <input
                  type="range"
                  min="0"
                  max={settings.totalAmount}
                  value={userShare}
                  onChange={(e) => setUserShare(parseInt(e.target.value, 10))}
                  className="w-full h-3 bg-slate-100 rounded-full appearance-none cursor-pointer focus:outline-none focus:ring-4 focus:ring-teal-500/20 z-10 relative accent-teal-500"
                  style={{
                    background: `linear-gradient(to right, #14b8a6 ${Math.round((userShare / settings.totalAmount) * 100)}%, #f1f5f9 ${Math.round((userShare / settings.totalAmount) * 100)}%)`
                  }}
                />
              </div>
              <div className="flex justify-between mt-2 px-1">
                <span className="text-xs font-semibold text-slate-300">$0</span>
                <span className="text-xs font-semibold text-slate-300">${settings.totalAmount}</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            className="group relative bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-semibold flex tracking-wide items-center justify-center gap-3 px-12 py-5 rounded-2xl shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 text-lg w-full sm:w-auto"
          >
            {t('common.confirm')}
            <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </button>

          <p className="text-center text-xs font-medium text-slate-400 mt-6 mt-auto">
            {t('exp.dictator.sliderHint')}
          </p>
        </div>
      </div>
    </ExperimentWrapper>
  );
}

export default DictatorExperiment;
