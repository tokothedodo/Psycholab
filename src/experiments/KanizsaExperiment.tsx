/**
 * KANIZSA TRIANGLE - Illusory Contour Experiment
 * 
 * Tests illusory contour formation and perception.
 * Participants perceive a white triangle that isn't actually drawn.
 */

import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ExperimentWrapper } from './ExperimentWrapper';
import type { Experiment } from '../data/experiments';
import type { TrialData, ExperimentResults } from './ExperimentWrapper';
import { getDefaultConfig } from './config/experimentDefaults';

interface KanizsaConfig {
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
}

interface KanizsaProps {
  experiment: Experiment;
  onComplete: (results: ExperimentResults) => void;
  participantId: string;
  roomId: string;
  config?: Partial<KanizsaConfig>;
}

interface Trial {
  hasIllusion: boolean;
  shape: 'triangle' | 'square' | 'circle';
}

const DEFAULT_CONFIG = {
  ...getDefaultConfig('kanizsa'),
  trials: 12,
} as KanizsaConfig;

const STIMULI: Trial[] = [
  { hasIllusion: true, shape: 'triangle' },
  { hasIllusion: false, shape: 'triangle' },
  { hasIllusion: true, shape: 'square' },
  { hasIllusion: false, shape: 'square' },
  { hasIllusion: true, shape: 'circle' },
  { hasIllusion: false, shape: 'circle' },
];

export function KanizsaExperiment({ experiment, onComplete, participantId, roomId, config = {} }: KanizsaProps) {
  const { t, language } = useLanguage();

  const settings: KanizsaConfig = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  const [phase, setPhase] = useState<'instruction' | 'practice' | 'experiment' | 'complete'>('instruction');
  const [trialIndex, setTrialIndex] = useState(0);
  const [trialData, setTrialData] = useState<TrialData[]>([]);
  const [experimentStartTime, setExperimentStartTime] = useState(0);
  const [trialStartTime, setTrialStartTime] = useState(0);
  const [currentTrial, setCurrentTrial] = useState<Trial | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [isWaiting, setIsWaiting] = useState(false);

  const generateStimuli = useCallback((): Trial[] => {
    let stimuli = [...STIMULI];
    if (settings.randomizeOrder) {
      stimuli = stimuli.sort(() => Math.random() - 0.5);
    }
    return stimuli.slice(0, settings.trials);
  }, [settings.trials, settings.randomizeOrder]);

  const [allStimuli] = useState(generateStimuli);
  const [practiceStimuli] = useState<Trial[]>([
    { hasIllusion: true, shape: 'triangle' },
    { hasIllusion: false, shape: 'triangle' },
  ]);

  useEffect(() => {
    if (phase === 'instruction') {
      setExperimentStartTime(performance.now());
    }
  }, [phase]);

  useEffect(() => {
    if ((phase === 'experiment' || phase === 'practice') && currentTrial) {
      setTrialStartTime(performance.now());
    }
  }, [phase, trialIndex, currentTrial]);

  useEffect(() => {
    if (phase === 'practice') {
      setCurrentTrial(practiceStimuli[trialIndex]);
    } else if (phase === 'experiment') {
      setCurrentTrial(allStimuli[trialIndex]);
    }
  }, [phase, trialIndex]);

  const handleResponse = (selected: string) => {
    if (!currentTrial || isWaiting) return;

    const endTime = performance.now();
    const responseTime = Math.round(endTime - trialStartTime);

    const isCorrect = (selected === 'yes' && currentTrial.hasIllusion) ||
      (selected === 'no' && !currentTrial.hasIllusion);

    if (phase === 'practice') {
      if (settings.showFeedback) {
        setLastCorrect(isCorrect);
        setShowFeedback(true);
        setTimeout(() => {
          setShowFeedback(false);
          advanceTrial();
        }, 800);
      } else {
        advanceTrial();
      }
      return;
    }

    const trial: TrialData = {
      trialNumber: trialIndex + 1,
      responseTimeMs: responseTime,
      answer: selected,
      correctAnswer: currentTrial.hasIllusion ? 'yes' : 'no',
      stimulus: { ...currentTrial },
    };

    setTrialData(prev => [...prev, trial]);

    if (settings.showFeedback) {
      setLastCorrect(isCorrect);
      setShowFeedback(true);
      setTimeout(() => {
        setShowFeedback(false);
        advanceTrial();
      }, 800);
    } else {
      advanceTrial();
    }
  };

  const advanceTrial = () => {
    if (settings.isi > 0) {
      setIsWaiting(true);
      setTimeout(() => {
        setIsWaiting(false);
        continueTrial();
      }, settings.isi);
    } else {
      continueTrial();
    }
  };

  const continueTrial = () => {
    if (phase === 'practice') {
      if (trialIndex < practiceStimuli.length - 1) {
        setTrialIndex(prev => prev + 1);
      } else {
        setPhase('experiment');
        setTrialIndex(0);
      }
    } else if (phase === 'experiment') {
      if (trialIndex < allStimuli.length - 1) {
        setTrialIndex(prev => prev + 1);
      } else {
        completeExperiment();
      }
    }
  };

  const removeOutliers = (data: TrialData[]): TrialData[] => {
    if (data.length < 3) return data;
    const times = data.map(t => t.responseTimeMs).sort((a, b) => a - b);
    const q1 = times[Math.floor(times.length * 0.25)];
    const q3 = times[Math.floor(times.length * 0.75)];
    const iqr = q3 - q1;
    const lower = q1 - settings.outlierThreshold * iqr;
    const upper = q3 + settings.outlierThreshold * iqr;
    return data.filter(t => t.responseTimeMs >= lower && t.responseTimeMs <= upper);
  };

  const completeExperiment = () => {
    setPhase('complete');
    const endTime = performance.now();
    const totalTime = Math.round(endTime - experimentStartTime);

    let finalTrialData = trialData;
    if (settings.outlierRemoval) {
      finalTrialData = removeOutliers(trialData);
    }

    const correctCount = finalTrialData.filter(t => t.answer === t.correctAnswer).length;
    const accuracy = finalTrialData.length > 0 ? (correctCount / finalTrialData.length) * 100 : 0;

    const results: ExperimentResults = {
      experimentName: experiment.id,
      participantId,
      roomId,
      language,
      timestamp: new Date().toISOString(),
      totalTrials: trialData.length,
      responseTimeMs: totalTime,
      accuracy,
      answer: correctCount,
      correctAnswer: 'correct_count',
      trialData: finalTrialData,
      debrief: t(experiment.debriefKey),
    };

    onComplete(results);
  };

  const renderStimulus = (trial: Trial) => {
    const size = 200;

    if (trial.shape === 'triangle') {
      return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {trial.hasIllusion && (
            <>
              <polygon points="100,30 40,150 160,150" fill="none" stroke="#1e3a5f" strokeWidth="8" />
              <circle cx="70" cy="100" r="15" fill="black" />
              <circle cx="130" cy="100" r="15" fill="black" />
              <circle cx="100" cy="55" r="15" fill="black" />
            </>
          )}
          {!trial.hasIllusion && (
            <polygon points="100,30 40,150 160,150" fill="#1e3a5f" />
          )}
        </svg>
      );
    }

    if (trial.shape === 'square') {
      return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {trial.hasIllusion && (
            <>
              <rect x="50" y="50" width="100" height="100" fill="none" stroke="#1e3a5f" strokeWidth="8" />
              <circle cx="65" cy="65" r="12" fill="black" />
              <circle cx="135" cy="65" r="12" fill="black" />
              <circle cx="65" cy="135" r="12" fill="black" />
              <circle cx="135" cy="135" r="12" fill="black" />
            </>
          )}
          {!trial.hasIllusion && (
            <rect x="50" y="50" width="100" height="100" fill="#1e3a5f" />
          )}
        </svg>
      );
    }

    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {trial.hasIllusion && (
          <>
            <circle cx="100" cy="100" r="60" fill="none" stroke="#1e3a5f" strokeWidth="8" />
            <circle cx="70" cy="70" r="12" fill="black" />
            <circle cx="130" cy="70" r="12" fill="black" />
            <circle cx="70" cy="130" r="12" fill="black" />
            <circle cx="130" cy="130" r="12" fill="black" />
          </>
        )}
        {!trial.hasIllusion && (
          <circle cx="100" cy="100" r="60" fill="#1e3a5f" />
        )}
      </svg>
    );
  };

  if (phase === 'instruction') {
    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="max-w-2xl mx-auto p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
          <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-emerald-600 mb-6">{t('exp.kanizsa.name')}</h2>

          <div className="bg-slate-50 border-l-4 border-teal-500 p-5 rounded-r-lg shadow-sm mb-6">
            <p className="text-slate-700 leading-relaxed text-md">
              {settings.customInstructions || t('exp.kanizsa.instruction')}
            </p>
          </div>

          <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-5 mb-8">
            <p className="text-sm font-semibold text-indigo-900 mb-2 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              {t('exp.kanizsa.instructionDetail')}
            </p>
          </div>

          <p className="text-sm font-medium text-slate-400 mb-8 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
            {t('citation')}: {experiment.citation}, {experiment.year}
          </p>

          <button
            onClick={() => {
              if (settings.practiceTrials > 0) {
                setPhase('practice');
                setTrialIndex(0);
              } else {
                setPhase('experiment');
                setTrialIndex(0);
              }
            }}
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
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-navy-900">{trialData.filter(t => t.answer === t.correctAnswer).length}/{trialData.length}</p>
              <p className="text-sm text-gray-600">{t('common.correct')}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-navy-900">{Math.round(trialData.reduce((s, t) => s + t.responseTimeMs, 0) / trialData.length)}ms</p>
              <p className="text-sm text-gray-600">{t('common.avgRT')}</p>
            </div>
          </div>
          <p className="text-gray-600 mb-4">{t('exp.kanizsa.debrief')}</p>
        </div>
      </ExperimentWrapper>
    );
  }

  if (!currentTrial) return null;

  const totalTrials = phase === 'practice' ? practiceStimuli.length : allStimuli.length;

  return (
    <ExperimentWrapper experiment={experiment}>
      <div className="max-w-3xl mx-auto p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 min-h-[500px] flex flex-col relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-white -z-10"></div>

        {settings.showProgressBar && (
          <div className="mb-8 px-4 pt-2">
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-teal-400 to-teal-500 transition-all duration-500 ease-out"
                style={{ width: `${((trialIndex + 1) / totalTrials) * 100}%` }}
              />
            </div>
            <div className="flex justify-between items-center mt-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{phase === 'practice' ? 'Practice' : 'Experiment'}</span>
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                {trialIndex + 1} / {totalTrials}
              </span>
            </div>
          </div>
        )}

        {showFeedback && (
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 z-20 pointer-events-none transform transition-all animate-bounce-short">
            <div className={`flex items-center justify-center w-24 h-24 rounded-full ${lastCorrect ? 'bg-emerald-100 text-emerald-500' : 'bg-rose-100 text-rose-500'} shadow-lg backdrop-blur-md bg-opacity-80`}>
              <span className="text-5xl font-bold">
                {lastCorrect ? '✓' : '✗'}
              </span>
            </div>
          </div>
        )}

        <div className="text-center mb-8">
          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">
            {t('exp.kanizsa.seeShape')}
          </h2>
        </div>

        <div className="flex-1 flex justify-center items-center min-h-[300px] mb-10 relative">
          <div className={`p-10 rounded-2xl transition-all duration-500 ${isWaiting ? 'opacity-0 scale-95' : 'opacity-100 scale-100 bg-white shadow-sm border border-slate-100'}`}>
            <div className="transform transition-transform duration-700 hover:scale-[1.02]">
              {renderStimulus(currentTrial)}
            </div>
          </div>
        </div>

        <div className="flex justify-center gap-6 mt-auto pb-4">
          <button
            onClick={() => handleResponse('yes')}
            disabled={isWaiting}
            className="group relative w-40 py-5 bg-white rounded-xl shadow-sm border-2 border-transparent hover:border-teal-200 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex items-center justify-center disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-sm"
          >
            <span className="absolute inset-0 bg-teal-50/0 group-hover:bg-teal-50/50 rounded-xl transition-colors"></span>
            <span className="text-xl font-bold text-slate-700 group-hover:text-teal-700 z-10 transition-colors uppercase tracking-wide">{t('common.yes')}</span>
          </button>

          <button
            onClick={() => handleResponse('no')}
            disabled={isWaiting}
            className="group relative w-40 py-5 bg-white rounded-xl shadow-sm border-2 border-transparent hover:border-slate-300 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex items-center justify-center disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-sm"
          >
            <span className="absolute inset-0 bg-slate-50/0 group-hover:bg-slate-50/50 rounded-xl transition-colors"></span>
            <span className="text-xl font-bold text-slate-700 group-hover:text-slate-800 z-10 transition-colors uppercase tracking-wide">{t('common.no')}</span>
          </button>
        </div>
      </div>
    </ExperimentWrapper>
  );
}

export default KanizsaExperiment;
