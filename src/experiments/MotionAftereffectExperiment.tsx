/**
 * MOTION AFTEREFFECT - Waterfall Illusion Experiment
 * 
 * Tests the motion aftereffect phenomenon where prolonged exposure to 
 * moving stimuli causes stationary stimuli to appear moving in the opposite direction.
 * Known as the "waterfall illusion" first described by Aristotle.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ExperimentWrapper } from '../components/experiments/ExperimentWrapper';
import type { Experiment } from '../data/experiments';
import type { TrialData, ExperimentResults } from '../components/experiments/ExperimentWrapper';
import { getDefaultConfig } from './config/experimentDefaults';

interface MotionAftereffectConfig {
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
  adaptationDuration: number;
  testDirection: 'vertical' | 'horizontal';
}

interface MotionAftereffectProps {
  experiment: Experiment;
  onComplete: (results: ExperimentResults) => void;
  participantId: string;
  roomId: string;
  config?: Partial<MotionAftereffectConfig>;
}

interface Trial {
  direction: 'up' | 'down' | 'left' | 'right';
  isIllusionTest: boolean;
}

const DEFAULT_CONFIG = {
  ...getDefaultConfig('motionAftereffect'),
  trials: 20,
  adaptationDuration: 30000,
  testDirection: 'vertical',
} as MotionAftereffectConfig;

const STIMULI: Trial[] = [
  { direction: 'up', isIllusionTest: true },
  { direction: 'down', isIllusionTest: true },
  { direction: 'left', isIllusionTest: false },
  { direction: 'right', isIllusionTest: false },
];

export function MotionAftereffectExperiment({ experiment, onComplete, participantId, roomId, config = {} }: MotionAftereffectProps) {
  const { t, language } = useLanguage();
  
  const settings: MotionAftereffectConfig = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  const [phase, setPhase] = useState<'instruction' | 'adaptation' | 'test' | 'complete'>('instruction');
  const [trialIndex, setTrialIndex] = useState(0);
  const [trialData, setTrialData] = useState<TrialData[]>([]);
  const [experimentStartTime, setExperimentStartTime] = useState(0);
  const [trialStartTime, setTrialStartTime] = useState(0);
  const [currentTrial, setCurrentTrial] = useState<Trial | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [isWaiting, setIsWaiting] = useState(false);
  const [adaptationProgress, setAdaptationProgress] = useState(0);
  const adaptationRef = useRef<number | null>(null);

  const generateStimuli = useCallback((): Trial[] => {
    let stimuli = [...STIMULI];
    if (settings.randomizeOrder) {
      stimuli = stimuli.sort(() => Math.random() - 0.5);
    }
    return stimuli.slice(0, settings.trials);
  }, [settings.trials, settings.randomizeOrder]);

  const [allStimuli] = useState(generateStimuli);

  useEffect(() => {
    if (phase === 'instruction') {
      setExperimentStartTime(performance.now());
    }
  }, [phase]);

  useEffect(() => {
    if (phase === 'test' && currentTrial) {
      setTrialStartTime(performance.now());
    }
  }, [phase, trialIndex, currentTrial]);

  useEffect(() => {
    if (phase === 'test') {
      setCurrentTrial(allStimuli[trialIndex]);
    }
  }, [phase, trialIndex]);

  const startAdaptation = () => {
    setPhase('adaptation');
    setAdaptationProgress(0);
    
    const startTime = Date.now();
    const duration = settings.adaptationDuration;
    
    const updateProgress = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / duration) * 100, 100);
      setAdaptationProgress(progress);
      
      if (elapsed < duration) {
        adaptationRef.current = requestAnimationFrame(updateProgress);
      } else {
        setPhase('test');
        setTrialIndex(0);
      }
    };
    
    adaptationRef.current = requestAnimationFrame(updateProgress);
  };

  useEffect(() => {
    return () => {
      if (adaptationRef.current) {
        cancelAnimationFrame(adaptationRef.current);
      }
    };
  }, []);

  const handleResponse = (selected: string) => {
    if (!currentTrial || isWaiting) return;

    const endTime = performance.now();
    const responseTime = Math.round(endTime - trialStartTime);
    
    const correctDirection = currentTrial.direction === 'up' || currentTrial.direction === 'down' 
      ? (currentTrial.direction === 'up' ? 'down' : 'up')
      : (currentTrial.direction === 'left' ? 'right' : 'left');
    
    const isCorrect = selected === correctDirection;

    const trial: TrialData = {
      trialNumber: trialIndex + 1,
      responseTimeMs: responseTime,
      answer: selected,
      correctAnswer: correctDirection,
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
    if (trialIndex < allStimuli.length - 1) {
      setTrialIndex(prev => prev + 1);
    } else {
      completeExperiment();
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

  const renderMovingPattern = (isTest: boolean = false) => {
    const size = 300;
    const dotCount = 50;
    const dots: React.ReactNode[] = [];
    
    for (let i = 0; i < dotCount; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const radius = 3 + Math.random() * 4;
      
      dots.push(
        <circle
          key={i}
          cx={x}
          cy={y}
          r={radius}
          fill={isTest ? '#1e3a5f' : '#4a90d9'}
        />
      );
    }

    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="bg-white rounded-lg">
        {dots}
      </svg>
    );
  };

  if (phase === 'instruction') {
    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="max-w-2xl mx-auto p-6">
          <h2 className="text-2xl font-bold text-navy-900 mb-4">{t('exp.motionAftereffect.name')}</h2>
          <p className="text-gray-600 mb-4">
            {settings.customInstructions || t('exp.motionAftereffect.instruction')}
          </p>
          <p className="text-sm text-gray-500 mb-4">
            {t('citation')}: {experiment.citation}, {experiment.year}
          </p>
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
            <p className="text-blue-800">{t('exp.motionAftereffect.instructionDetail')}</p>
          </div>
          <button
            onClick={() => startAdaptation()}
            className="bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 transition-colors"
          >
            {t('common.start')}
          </button>
        </div>
      </ExperimentWrapper>
    );
  }

  if (phase === 'adaptation') {
    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="max-w-2xl mx-auto p-6">
          <h2 className="text-2xl font-bold text-navy-900 mb-4">{t('exp.motionAftereffect.adapting')}</h2>
          <div className="flex justify-center items-center min-h-[350px] mb-6">
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              {renderMovingPattern(false)}
            </div>
          </div>
          <div className="mb-4">
            <div className="h-4 bg-gray-200 rounded overflow-hidden">
              <div 
                className="h-full bg-teal-600 transition-all" 
                style={{ width: `${adaptationProgress}%` }}
              />
            </div>
            <p className="text-sm text-gray-500 text-center mt-2">
              {Math.round(adaptationProgress)}% {t('exp.motionAftereffect.complete')}
            </p>
          </div>
          <p className="text-gray-600 text-center">{t('exp.motionAftereffect.adaptationWarning')}</p>
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
          <p className="text-gray-600 mb-4">{t('exp.motionAftereffect.debrief')}</p>
        </div>
      </ExperimentWrapper>
    );
  }

  if (!currentTrial) return null;

  const totalTrials = allStimuli.length;
  const directions = {
    up: t('exp.motionAftereffect.up'),
    down: t('exp.motionAftereffect.down'),
    left: t('exp.motionAftereffect.left'),
    right: t('exp.motionAftereffect.right'),
  };

  return (
    <ExperimentWrapper experiment={experiment}>
      <div className="max-w-2xl mx-auto p-6">
        {settings.showProgressBar && (
          <div className="mb-6">
            <div className="h-2 bg-gray-200 rounded overflow-hidden">
              <div className="h-full bg-teal-600 transition-all" style={{ width: `${((trialIndex + 1) / totalTrials) * 100}%` }} />
            </div>
            <p className="text-sm text-gray-500 text-center mt-1">
              {trialIndex + 1} / {totalTrials}
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

        <h2 className="text-xl font-semibold text-navy-900 mb-6 text-center">
          {t('exp.motionAftereffect.whichDirection')}
        </h2>

        <div className="flex justify-center items-center min-h-[350px] mb-8">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            {renderMovingPattern(true)}
          </div>
        </div>

        <div className="flex justify-center gap-4 flex-wrap">
          <button
            onClick={() => handleResponse('up')}
            disabled={isWaiting}
            className="bg-gray-100 hover:bg-teal-50 border-2 border-gray-200 hover:border-teal-500 px-6 py-3 rounded-lg transition-all disabled:opacity-50"
          >
            <span className="text-lg font-semibold text-navy-900">↑ {directions.up}</span>
          </button>
          <button
            onClick={() => handleResponse('down')}
            disabled={isWaiting}
            className="bg-gray-100 hover:bg-teal-50 border-2 border-gray-200 hover:border-teal-500 px-6 py-3 rounded-lg transition-all disabled:opacity-50"
          >
            <span className="text-lg font-semibold text-navy-900">↓ {directions.down}</span>
          </button>
          <button
            onClick={() => handleResponse('left')}
            disabled={isWaiting}
            className="bg-gray-100 hover:bg-teal-50 border-2 border-gray-200 hover:border-teal-500 px-6 py-3 rounded-lg transition-all disabled:opacity-50"
          >
            <span className="text-lg font-semibold text-navy-900">← {directions.left}</span>
          </button>
          <button
            onClick={() => handleResponse('right')}
            disabled={isWaiting}
            className="bg-gray-100 hover:bg-teal-50 border-2 border-gray-200 hover:border-teal-500 px-6 py-3 rounded-lg transition-all disabled:opacity-50"
          >
            <span className="text-lg font-semibold text-navy-900">→ {directions.right}</span>
          </button>
        </div>
      </div>
    </ExperimentWrapper>
  );
}

export default MotionAftereffectExperiment;
