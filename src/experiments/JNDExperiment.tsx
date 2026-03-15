/**
 * JUST NOTICEABLE DIFFERENCE (JND) - Psychophysics Experiment
 * 
 * Tests perceptual threshold using the staircase method.
 * Participants judge which of two stimuli is larger.
 */

import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ExperimentWrapper } from '../components/experiments/ExperimentWrapper';
import type { Experiment } from '../data/experiments';
import type { TrialData, ExperimentResults } from '../components/experiments/ExperimentWrapper';
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
  ...getDefaultConfig('jnd'),
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
        <div className="max-w-2xl mx-auto p-6">
          <h2 className="text-2xl font-bold text-navy-900 mb-4">{t('exp.jnd.name')}</h2>
          <p className="text-gray-600 mb-4">
            {settings.customInstructions || t('exp.jnd.instruction')}
          </p>
          <p className="text-sm text-gray-500 mb-4">
            {t('citation')}: {experiment.citation}, {experiment.year}
          </p>
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
            <p className="text-blue-800">{t('exp.jnd.instructionDetail')}</p>
          </div>
          <p className="text-xs text-gray-400 mb-4">
            {settings.trials} trials | {settings.practiceTrials} practice
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
            className="bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 transition-colors"
          >
            {t('common.start')}
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
      <div className="max-w-2xl mx-auto p-6">
        {settings.showProgressBar && (
          <div className="mb-6">
            <div className="h-2 bg-gray-200 rounded overflow-hidden">
              <div 
                className="h-full bg-teal-600 transition-all"
                style={{ width: `${((trialIndex + 1) / totalTrials) * 100}%` }}
              />
            </div>
            <p className="text-sm text-gray-500 text-center mt-1">
              {phase === 'practice' ? 'Practice: ' : ''}{trialIndex + 1} / {totalTrials} | Reversals: {reversals}/{settings.reversalTarget * 2}
            </p>
          </div>
        )}

        {showFeedback && (
          <div className="text-center mb-4">
            <span className={`text-2xl font-bold ${lastCorrect ? 'text-green-600' : 'text-red-600'}`}>
              {lastCorrect ? '✓' : '✗'}
            </span>
          </div>
        )}

        <h2 className="text-xl font-semibold text-navy-900 mb-8 text-center">
          {t('exp.jnd.whichLonger')}
        </h2>

        <div className="flex justify-center items-center gap-16 mb-8">
          <div className="text-center">
            <div 
              className="bg-navy-900 mx-auto mb-4"
              style={{ width: currentTrial.referenceValue, height: 8 }}
            />
            <p className="text-gray-600">{t('exp.jnd.left')}</p>
          </div>
          <div className="text-center">
            <div 
              className="bg-navy-900 mx-auto mb-4"
              style={{ width: currentTrial.comparisonValue, height: 8 }}
            />
            <p className="text-gray-600">{t('exp.jnd.right')}</p>
          </div>
        </div>

        <div className="flex justify-center gap-6">
          <button
            onClick={() => handleResponse('left')}
            disabled={isWaiting}
            className="bg-gray-100 hover:bg-teal-50 border-2 border-gray-200 hover:border-teal-500 px-8 py-4 rounded-lg transition-all disabled:opacity-50"
          >
            <span className="text-lg font-semibold text-navy-900">{t('exp.jnd.leftButton')}</span>
          </button>
          <button
            onClick={() => handleResponse('right')}
            disabled={isWaiting}
            className="bg-gray-100 hover:bg-teal-50 border-2 border-gray-200 hover:border-teal-500 px-8 py-4 rounded-lg transition-all disabled:opacity-50"
          >
            <span className="text-lg font-semibold text-navy-900">{t('exp.jnd.rightButton')}</span>
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          {t('exp.jnd.difference')}: {currentDifference}px
        </p>
      </div>
    </ExperimentWrapper>
  );
}

export default JNDExperiment;
