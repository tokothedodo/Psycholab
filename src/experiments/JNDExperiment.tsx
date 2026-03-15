/**
 * JUST NOTICEABLE DIFFERENCE (JND) - Psychophysics Experiment
 * 
 * Tests perceptual threshold using the staircase method.
 * Participants judge which of two stimuli is larger.
 */

import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ExperimentWrapper } from './ExperimentWrapper';
import type { Experiment } from '../data/experiments';
import type { TrialData, ExperimentResults } from './ExperimentWrapper';
import { getDefaultConfig } from './config/experimentDefaults';

interface JNDConfig {
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
  stimulusType: 'length' | 'brightness' | 'size';
  initialDifference: number;
  stepSize: number;
  reversalTarget: number;
}

interface JNDProps {
  experiment: Experiment;
  onComplete: (results: ExperimentResults) => void;
  participantId: string;
  roomId: string;
  config?: Partial<JNDConfig>;
}

interface Trial {
  referenceValue: number;
  comparisonValue: number;
  correctAnswer: 'reference' | 'comparison';
}

const DEFAULT_CONFIG = {
  ...getDefaultConfig('difference-threshold-staircase-paradigm'),
  stimulusType: 'length',
  initialDifference: 50,
  stepSize: 10,
  reversalTarget: 6,
  trials: 40,
} as JNDConfig;

export function JNDExperiment({ experiment, onComplete, participantId, roomId, config = {} }: JNDProps) {
  const { t, language } = useLanguage();

  const settings: JNDConfig = {
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

  const [currentDifference, setCurrentDifference] = useState(settings.initialDifference);
  const [reversals, setReversals] = useState(0);
  const [recentResponses, setRecentResponses] = useState<boolean[]>([]);
  const [direction, setDirection] = useState<'increase' | 'decrease' | null>(null);

  const generateTrial = useCallback((): Trial => {
    const referenceValue = 200;
    const comparisonValue = referenceValue + currentDifference;
    const correctAnswer = Math.random() > 0.5 ? 'reference' : 'comparison';

    return {
      referenceValue,
      comparisonValue,
      correctAnswer,
    };
  }, [currentDifference]);

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
    if (phase === 'experiment' || phase === 'practice') {
      setCurrentTrial(generateTrial());
    }
  }, [phase, trialIndex]);

  useEffect(() => {
    if (settings.responseTimeLimit > 0 && phase === 'experiment' && currentTrial && !isWaiting) {
      const timer = setTimeout(() => {
        handleResponse('timeout');
      }, settings.responseTimeLimit);
      return () => clearTimeout(timer);
    }
  }, [phase, currentTrial, isWaiting, settings.responseTimeLimit]);

  const scheduleNextTrial = () => {
    if (settings.isi > 0) {
      setIsWaiting(true);
      setTimeout(() => {
        setIsWaiting(false);
        advanceTrial();
      }, settings.isi);
    } else {
      advanceTrial();
    }
  };

  const advanceTrial = () => {
    if (phase === 'practice') {
      if (trialIndex < settings.practiceTrials - 1) {
        setTrialIndex(prev => prev + 1);
      } else {
        setPhase('experiment');
        setTrialIndex(0);
        setCurrentDifference(settings.initialDifference);
        setReversals(0);
        setRecentResponses([]);
        setDirection(null);
      }
    } else if (phase === 'experiment') {
      if (trialIndex < settings.trials - 1 && reversals < settings.reversalTarget * 2) {
        setTrialIndex(prev => prev + 1);
      } else {
        completeExperiment();
      }
    }
  };

  const updateDifference = (correct: boolean) => {
    const newResponses = [...recentResponses, correct].slice(-3);
    setRecentResponses(newResponses);

    const majorityCorrect = newResponses.filter(Boolean).length >= 2;

    if (direction === null) {
      if (majorityCorrect) {
        setDirection('decrease');
        setCurrentDifference(prev => Math.max(5, prev - settings.stepSize));
      } else {
        setDirection('increase');
        setCurrentDifference(prev => prev + settings.stepSize);
      }
    } else if (direction === 'increase' && !correct) {
      setReversals(prev => prev + 1);
      setDirection('decrease');
      setCurrentDifference(prev => Math.max(5, prev - settings.stepSize));
    } else if (direction === 'decrease' && correct) {
      setReversals(prev => prev + 1);
      setDirection('increase');
      setCurrentDifference(prev => prev + settings.stepSize);
    }
  };

  const handleResponse = (selected: string) => {
    if (!currentTrial || isWaiting) return;

    const endTime = performance.now();
    const responseTime = Math.round(endTime - trialStartTime);

    const isCorrect = selected === currentTrial.correctAnswer ||
      (selected === 'left' && currentTrial.correctAnswer === 'reference') ||
      (selected === 'right' && currentTrial.correctAnswer === 'comparison');

    if (phase === 'practice') {
      if (settings.showFeedback) {
        setLastCorrect(isCorrect);
        setShowFeedback(true);
        setTimeout(() => {
          setShowFeedback(false);
          scheduleNextTrial();
        }, 800);
      } else {
        scheduleNextTrial();
      }
      return;
    }

    updateDifference(isCorrect);

    const trial: TrialData = {
      trialNumber: trialIndex + 1,
      responseTimeMs: responseTime === 0 && selected === 'timeout' ? settings.responseTimeLimit : responseTime,
      answer: selected,
      correctAnswer: currentTrial.correctAnswer,
      stimulus: {
        referenceValue: currentTrial.referenceValue,
        comparisonValue: currentTrial.comparisonValue,
        difference: currentDifference,
      },
    };

    setTrialData(prev => [...prev, trial]);

    if (settings.showFeedback) {
      setLastCorrect(isCorrect);
      setShowFeedback(true);
      setTimeout(() => {
        setShowFeedback(false);
        scheduleNextTrial();
      }, 800);
    } else {
      scheduleNextTrial();
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

  const calculateJND = (): number => {
    const reversalsData = trialData.filter((_, i) => i > settings.practiceTrials);
    if (reversalsData.length < 2) return currentDifference;

    const midPoint = Math.floor(reversalsData.length / 2);
    const firstHalf = reversalsData.slice(0, midPoint);
    const secondHalf = reversalsData.slice(midPoint);

    const firstAvg = firstHalf.reduce((sum, t) => sum + (t.stimulus as { difference: number }).difference, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, t) => sum + (t.stimulus as { difference: number }).difference, 0) / secondHalf.length;

    return Math.round((firstAvg + secondAvg) / 2);
  };

  const completeExperiment = () => {
    setPhase('complete');
    const endTime = performance.now();
    const totalTime = Math.round(endTime - experimentStartTime);

    let finalTrialData = trialData;
    if (settings.outlierRemoval) {
      finalTrialData = removeOutliers(trialData);
    }

    const correctCount = finalTrialData.filter(t =>
      (t.answer === 'left' && t.correctAnswer === 'reference') ||
      (t.answer === 'right' && t.correctAnswer === 'comparison')
    ).length;
    const accuracy = finalTrialData.length > 0 ? (correctCount / finalTrialData.length) * 100 : 0;
    const jnd = calculateJND();

    const results: ExperimentResults = {
      experimentName: experiment.id,
      participantId,
      roomId,
      language,
      timestamp: new Date().toISOString(),
      totalTrials: trialData.length,
      responseTimeMs: totalTime,
      accuracy,
      answer: jnd,
      correctAnswer: 'jnd_threshold',
      trialData: finalTrialData,
      debrief: t(experiment.debriefKey),
    };

    onComplete(results);
  };

  if (phase === 'instruction') {
    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="max-w-2xl mx-auto p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
          <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-emerald-600 mb-6">{t('exp.jnd.name')}</h2>

          <div className="bg-slate-50 border-l-4 border-teal-500 p-5 rounded-r-lg shadow-sm mb-6">
            <p className="text-slate-700 leading-relaxed text-md">
              {settings.customInstructions || t('exp.jnd.instruction')}
            </p>
          </div>

          <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-5 mb-8">
            <p className="text-sm font-semibold text-indigo-900 mb-2 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              {t('exp.jnd.instructionDetail')}
            </p>
            <p className="text-xs font-medium text-indigo-700 mt-2 bg-indigo-100/50 inline-block px-3 py-1 rounded-full">
              {settings.trials} trials <span className="mx-1">•</span> {settings.practiceTrials} practice
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
    const jnd = calculateJND();
    const referenceValue = 200;
    const weberFraction = (jnd / referenceValue) * 100;

    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="max-w-2xl mx-auto p-6">
          <h2 className="text-2xl font-bold text-navy-900 mb-4">{t('common.debrief.title')}</h2>

          <div className="bg-teal-50 border-l-4 border-teal-500 p-4 mb-4">
            <p className="text-teal-800 font-medium">{t('common.debrief.thankYou')}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-navy-900">{jnd}px</p>
              <p className="text-sm text-gray-600">{t('exp.jnd.yourJND')}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-navy-900">{weberFraction.toFixed(1)}%</p>
              <p className="text-sm text-gray-600">{t('exp.jnd.weberFraction')}</p>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg mb-4">
            <p className="text-amber-800 font-medium mb-2">{t('exp.jnd.interpretation')}:</p>
            <p className="text-sm text-amber-700">
              {weberFraction < 5
                ? t('exp.jnd.excellent')
                : weberFraction < 10
                  ? t('exp.jnd.average')
                  : t('exp.jnd.highThreshold')}
            </p>
          </div>

          <p className="text-gray-600 mb-4">{t('exp.jnd.debrief')}</p>
        </div>
      </ExperimentWrapper>
    );
  }

  if (!currentTrial) return null;

  const totalTrials = phase === 'practice' ? settings.practiceTrials : settings.trials;

  return (
    <ExperimentWrapper experiment={experiment}>
      <div className="max-w-4xl mx-auto p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 min-h-[500px] flex flex-col relative overflow-hidden">
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
              <div className="flex gap-3 text-xs font-semibold text-slate-500">
                <span className="bg-slate-100 px-2.5 py-1 rounded-md">{trialIndex + 1} / {totalTrials}</span>
                <span className="bg-slate-100 px-2.5 py-1 rounded-md">Reversals: {reversals}/{settings.reversalTarget * 2}</span>
              </div>
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

        <div className="text-center mb-10">
          <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">
            {t('exp.jnd.whichLonger')}
          </h2>
        </div>

        <div className={`flex flex-col md:flex-row justify-center items-center gap-12 md:gap-24 mb-12 transition-all duration-500 ${isWaiting ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
          <div className="text-center w-full md:w-auto flex flex-col items-center">
            <div className="h-48 flex items-center justify-center bg-white rounded-2xl shadow-sm border border-slate-100 w-full md:w-[350px] p-6">
              <div
                className="bg-gradient-to-r from-slate-700 to-slate-900 rounded-full shadow-inner transition-all duration-300"
                style={{ width: currentTrial.referenceValue, height: 12 }}
              />
            </div>
            <p className="text-slate-500 font-medium mt-4 uppercase tracking-wider text-sm">{t('exp.jnd.left')}</p>
          </div>
          <div className="text-center w-full md:w-auto flex flex-col items-center">
            <div className="h-48 flex items-center justify-center bg-white rounded-2xl shadow-sm border border-slate-100 w-full md:w-[350px] p-6">
              <div
                className="bg-gradient-to-r from-slate-700 to-slate-900 rounded-full shadow-inner transition-all duration-300"
                style={{ width: currentTrial.comparisonValue, height: 12 }}
              />
            </div>
            <p className="text-slate-500 font-medium mt-4 uppercase tracking-wider text-sm">{t('exp.jnd.right')}</p>
          </div>
        </div>

        <div className="flex justify-center gap-6 mt-auto pb-6 relative">
          {/* Visual indicator of the difference for debugging/awareness - subtle */}
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 text-center text-xs font-mono text-slate-300">
            Δ {currentDifference}px
          </div>

          <button
            onClick={() => handleResponse('left')}
            disabled={isWaiting}
            className="group relative w-48 py-5 bg-white rounded-xl shadow-sm border-2 border-transparent hover:border-teal-200 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex items-center justify-center disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-sm"
          >
            <span className="absolute inset-0 bg-teal-50/0 group-hover:bg-teal-50/50 rounded-xl transition-colors"></span>
            <span className="flex items-center gap-2 text-xl font-bold text-slate-700 group-hover:text-teal-700 z-10 transition-colors tracking-wide">
              <svg className="w-5 h-5 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
              {t('exp.jnd.leftButton')}
            </span>
          </button>

          <button
            onClick={() => handleResponse('right')}
            disabled={isWaiting}
            className="group relative w-48 py-5 bg-white rounded-xl shadow-sm border-2 border-transparent hover:border-teal-200 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex items-center justify-center disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-sm"
          >
            <span className="absolute inset-0 bg-teal-50/0 group-hover:bg-teal-50/50 rounded-xl transition-colors"></span>
            <span className="flex items-center gap-2 text-xl font-bold text-slate-700 group-hover:text-teal-700 z-10 transition-colors tracking-wide">
              {t('exp.jnd.rightButton')}
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
            </span>
          </button>
        </div>
      </div>
    </ExperimentWrapper>
  );
}

export default JNDExperiment;
