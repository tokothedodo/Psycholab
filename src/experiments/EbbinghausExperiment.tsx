/**
 * EBBINGHAUS ILLUSION - Visual Perception Experiment
 * 
 * Tests size perception with surrounding context circles.
 * The central circle appears larger when surrounded by small circles.
 */

import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ExperimentWrapper } from '../components/experiments/ExperimentWrapper';
import type { Experiment } from '../data/experiments';
import type { TrialData, ExperimentResults } from '../components/experiments/ExperimentWrapper';
import { getDefaultConfig } from './config/experimentDefaults';

interface EbbinghausConfig {
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
  centerSize: number;
  inducerSize: 'small' | 'large';
}

interface EbbinghausProps {
  experiment: Experiment;
  onComplete: (results: ExperimentResults) => void;
  participantId: string;
  roomId: string;
  config?: Partial<EbbinghausConfig>;
}

interface Trial {
  centerSize: number;
  comparisonSize: number;
  correctAnswer: 'center' | 'comparison';
  inducerType: 'small' | 'large';
}

const DEFAULT_CONFIG = {
  ...getDefaultConfig('ebbinghaus'),
  centerSize: 40,
  inducerSize: 'small',
  trials: 16,
} as EbbinghausConfig;

export function EbbinghausExperiment({ experiment, onComplete, participantId, roomId, config = {} }: EbbinghausProps) {
  const { t, language } = useLanguage();
  
  const settings: EbbinghausConfig = {
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
    const stimuli: Trial[] = [];
    const baseSize = settings.centerSize;
    const maxVariation = 20;
    
    for (let i = 0; i < settings.trials; i++) {
      const variation = (Math.random() - 0.5) * maxVariation;
      const comparisonSize = baseSize + variation;
      const correctAnswer = Math.random() > 0.5 ? 'center' : 'comparison';
      const inducerType = Math.random() > 0.5 ? 'small' : 'large';
      
      stimuli.push({
        centerSize: baseSize,
        comparisonSize,
        correctAnswer,
        inducerType,
      });
    }
    
    if (settings.randomizeOrder) {
      return stimuli.sort(() => Math.random() - 0.5);
    }
    return stimuli;
  }, [settings.trials, settings.centerSize, settings.randomizeOrder]);

  const [allStimuli] = useState(generateStimuli);
  const [practiceStimuli] = useState<Trial[]>([
    { centerSize: 40, comparisonSize: 45, correctAnswer: 'comparison', inducerType: 'small' },
    { centerSize: 40, comparisonSize: 35, correctAnswer: 'center', inducerType: 'large' },
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
    if ((phase === 'experiment' || phase === 'practice') && currentTrial && !isWaiting) {
      if (settings.responseTimeLimit > 0) {
        const timer = setTimeout(() => handleResponse('timeout'), settings.responseTimeLimit);
        return () => clearTimeout(timer);
      }
    }
  }, [phase, currentTrial, isWaiting, settings.responseTimeLimit]);

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
    
    const isCorrect = selected === currentTrial.correctAnswer;

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
      responseTimeMs: responseTime === 0 && selected === 'timeout' ? settings.responseTimeLimit : responseTime,
      answer: selected,
      correctAnswer: currentTrial.correctAnswer,
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

    const smallInducer = finalTrialData.filter(t => (t.stimulus as Trial).inducerType === 'small');
    const largeInducer = finalTrialData.filter(t => (t.stimulus as Trial).inducerType === 'large');
    const smallInducerCorrect = smallInducer.filter(t => t.answer === t.correctAnswer).length;
    const largeInducerCorrect = largeInducer.filter(t => t.answer === t.correctAnswer).length;

    const results: ExperimentResults = {
      experimentName: experiment.id,
      participantId,
      roomId,
      language,
      timestamp: new Date().toISOString(),
      totalTrials: trialData.length,
      responseTimeMs: totalTime,
      accuracy,
      answer: `${smallInducerCorrect}:${largeInducerCorrect}`,
      correctAnswer: 'small:large_inducer_correct',
      trialData: finalTrialData,
      debrief: t(experiment.debriefKey),
    };

    onComplete(results);
  };

  const renderInducerCircles = (centerX: number, centerY: number, type: 'small' | 'large') => {
    const circles = [];
    const radius = type === 'small' ? 8 : 20;
    const distance = 55;
    const count = 8;
    
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const x = centerX + Math.cos(angle) * distance;
      const y = centerY + Math.sin(angle) * distance;
      circles.push(
        <circle key={i} cx={x} cy={y} r={radius} fill="#6b7280" />
      );
    }
    return circles;
  };

  if (phase === 'instruction') {
    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="max-w-2xl mx-auto p-6">
          <h2 className="text-2xl font-bold text-navy-900 mb-4">{t('exp.ebbinghaus.name')}</h2>
          <p className="text-gray-600 mb-4">
            {settings.customInstructions || t('exp.ebbinghaus.instruction')}
          </p>
          <p className="text-sm text-gray-500 mb-4">
            {t('citation')}: {experiment.citation}, {experiment.year}
          </p>
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
            <p className="text-blue-800">{t('exp.ebbinghaus.instructionDetail')}</p>
          </div>
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
    const smallInducer = trialData.filter(t => (t.stimulus as Trial).inducerType === 'small');
    const largeInducer = trialData.filter(t => (t.stimulus as Trial).inducerType === 'large');
    const smallCorrect = smallInducer.filter(t => t.answer === t.correctAnswer).length;
    const largeCorrect = largeInducer.filter(t => t.answer === t.correctAnswer).length;

    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="max-w-2xl mx-auto p-6">
          <h2 className="text-2xl font-bold text-navy-900 mb-4">{t('common.debrief.title')}</h2>
          <div className="bg-teal-50 border-l-4 border-teal-500 p-4 mb-4">
            <p className="text-teal-800 font-medium">{t('common.debrief.thankYou')}</p>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-navy-900">{Math.round(trialData.reduce((s, t) => s + t.responseTimeMs, 0) / trialData.length)}ms</p>
              <p className="text-sm text-gray-600">{t('common.avgRT')}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-navy-900">{trialData.filter(t => t.answer === t.correctAnswer).length}/{trialData.length}</p>
              <p className="text-sm text-gray-600">{t('common.correct')}</p>
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg mb-4">
            <p className="text-amber-800 font-medium mb-2">{t('exp.ebbinghaus.illusionStrength')}:</p>
            <p className="text-sm text-amber-700">{t('exp.ebbinghaus.smallInducer')}: {smallCorrect}/{smallInducer.length}</p>
            <p className="text-sm text-amber-700">{t('exp.ebbinghaus.largeInducer')}: {largeCorrect}/{largeInducer.length}</p>
            <p className="text-sm text-amber-700 mt-2">{t('exp.ebbinghaus.interpretation')}</p>
          </div>
          <p className="text-gray-600 mb-4">{t('exp.ebbinghaus.debrief')}</p>
        </div>
      </ExperimentWrapper>
    );
  }

  if (!currentTrial) return null;

  const totalTrials = phase === 'practice' ? practiceStimuli.length : allStimuli.length;

  return (
    <ExperimentWrapper experiment={experiment}>
      <div className="max-w-2xl mx-auto p-6">
        {settings.showProgressBar && (
          <div className="mb-6">
            <div className="h-2 bg-gray-200 rounded overflow-hidden">
              <div className="h-full bg-teal-600 transition-all" style={{ width: `${((trialIndex + 1) / totalTrials) * 100}%` }} />
            </div>
            <p className="text-sm text-gray-500 text-center mt-1">
              {phase === 'practice' ? 'Practice: ' : ''}{trialIndex + 1} / {totalTrials}
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
          {t('exp.ebbinghaus.whichCenter')}
        </h2>

        <div className="flex justify-center items-center gap-16 mb-8">
          <div className="text-center">
            <svg width="150" height="150" viewBox="0 0 150 150">
              {renderInducerCircles(75, 75, currentTrial.inducerType)}
              <circle cx={75} cy={75} r={currentTrial.centerSize} fill="#dc2626" />
            </svg>
            <p className="text-gray-600 mt-2">{t('exp.ebbinghaus.centerCircle')}</p>
          </div>
          
          <div className="text-center">
            <svg width="150" height="150" viewBox="0 0 150 150">
              <circle cx={75} cy={75} r={currentTrial.comparisonSize} fill="#2563eb" />
            </svg>
            <p className="text-gray-600 mt-2">{t('exp.ebbinghaus.comparisonCircle')}</p>
          </div>
        </div>

        <div className="flex justify-center gap-6">
          <button
            onClick={() => handleResponse('center')}
            disabled={isWaiting}
            className="bg-gray-100 hover:bg-teal-50 border-2 border-gray-200 hover:border-teal-500 px-8 py-4 rounded-lg transition-all disabled:opacity-50"
          >
            <span className="text-lg font-semibold text-navy-900">{t('exp.ebbinghaus.left')}</span>
          </button>
          <button
            onClick={() => handleResponse('comparison')}
            disabled={isWaiting}
            className="bg-gray-100 hover:bg-teal-50 border-2 border-gray-200 hover:border-teal-500 px-8 py-4 rounded-lg transition-all disabled:opacity-50"
          >
            <span className="text-lg font-semibold text-navy-900">{t('exp.ebbinghaus.right')}</span>
          </button>
        </div>
      </div>
    </ExperimentWrapper>
  );
}

export default EbbinghausExperiment;
