/**
 * ANCHORING BIAS - Cognitive Bias Experiment
 * 
 * Tests numerical estimation with random anchor numbers.
 * Participants estimate values after seeing a random "anchor" that influences their judgments.
 */

import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ExperimentWrapper } from '../components/experiments/ExperimentWrapper';
import type { Experiment } from '../data/experiments';
import type { TrialData, ExperimentResults } from '../components/experiments/ExperimentWrapper';
import { getDefaultConfig } from './config/experimentDefaults';

interface AnchoringConfig {
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
  showAnchor: boolean;
}

interface AnchoringProps {
  experiment: Experiment;
  onComplete: (results: ExperimentResults) => void;
  participantId: string;
  roomId: string;
  config?: Partial<AnchoringConfig>;
}

interface Trial {
  question: string;
  actualValue: number;
  lowAnchor: number;
  highAnchor: number;
}

const DEFAULT_CONFIG = {
  ...getDefaultConfig('anchoring'),
  showAnchor: true,
} as AnchoringConfig;

const QUESTIONS: Trial[] = [
  { question: 'population_tbilisi', actualValue: 1100000, lowAnchor: 500000, highAnchor: 2000000 },
  { question: 'height_mtketi', actualValue: 2654, lowAnchor: 1500, highAnchor: 4000 },
  { question: 'year_georgia_un', actualValue: 1992, lowAnchor: 1980, highAnchor: 2000 },
  { question: 'area_georgia', actualValue: 69700, lowAnchor: 50000, highAnchor: 100000 },
  { question: 'wine_production', actualValue: 100, lowAnchor: 50, highAnchor: 200 },
  { question: 'population_baku', actualValue: 2300000, lowAnchor: 1000000, highAnchor: 3000000 },
  { question: 'lake_sevan_area', actualValue: 940, lowAnchor: 500, highAnchor: 1500 },
  { question: 'mount_ararat_height', actualValue: 5165, lowAnchor: 3000, highAnchor: 6000 },
];

export function AnchoringExperiment({ experiment, onComplete, participantId, roomId, config = {} }: AnchoringProps) {
  const { t, language } = useLanguage();
  
  const settings: AnchoringConfig = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  const [phase, setPhase] = useState<'instruction' | 'practice' | 'experiment' | 'complete'>('instruction');
  const [trialIndex, setTrialIndex] = useState(0);
  const [trialData, setTrialData] = useState<TrialData[]>([]);
  const [experimentStartTime, setExperimentStartTime] = useState(0);
  const [trialStartTime, setTrialStartTime] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [, setLastCorrect] = useState<boolean | null>(null);
  const [currentAnchor, setCurrentAnchor] = useState<number | null>(null);
  const [userEstimate, setUserEstimate] = useState('');

  const generateStimuli = useCallback((): Trial[] => {
    let stimuli = [...QUESTIONS];
    if (settings.randomizeOrder) {
      stimuli = stimuli.sort(() => Math.random() - 0.5);
    }
    return stimuli.slice(0, settings.trials);
  }, [settings.trials, settings.randomizeOrder]);

  const [allStimuli] = useState(generateStimuli);

  const [practiceStimuli] = useState(QUESTIONS.slice(0, 2));

  useEffect(() => {
    if (phase === 'instruction') {
      setExperimentStartTime(performance.now());
    }
  }, [phase]);

  useEffect(() => {
    if ((phase === 'experiment' || phase === 'practice') && currentAnchor !== null) {
      setTrialStartTime(performance.now());
    }
  }, [phase, trialIndex, currentAnchor]);

  useEffect(() => {
    if (settings.responseTimeLimit > 0 && phase === 'experiment' && currentAnchor !== null) {
      const timer = setTimeout(() => {
        if (userEstimate) handleSubmit();
      }, settings.responseTimeLimit);
      return () => clearTimeout(timer);
    }
  }, [phase, currentAnchor, settings.responseTimeLimit, userEstimate]);

  const scheduleNextTrial = () => {
    if (settings.isi > 0) {
      setTimeout(() => {
        advanceTrial();
      }, settings.isi);
    } else {
      advanceTrial();
    }
  };

  const advanceTrial = () => {
    setUserEstimate('');
    setCurrentAnchor(null);
    
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

  const getAnchor = (trial: Trial): number => {
    return Math.random() > 0.5 ? trial.lowAnchor : trial.highAnchor;
  };

  useEffect(() => {
    if (phase === 'practice' && trialIndex < practiceStimuli.length) {
      setCurrentAnchor(getAnchor(practiceStimuli[trialIndex]));
    } else if (phase === 'experiment' && trialIndex < allStimuli.length) {
      setCurrentAnchor(getAnchor(allStimuli[trialIndex]));
    }
  }, [phase, trialIndex]);

  const handleSubmit = () => {
    if (!userEstimate || !currentAnchor) return;

    const currentTrial = phase === 'practice' ? practiceStimuli[trialIndex] : allStimuli[trialIndex];
    const estimate = parseInt(userEstimate, 10);
    const actualValue = currentTrial.actualValue;
    
    const endTime = performance.now();
    const responseTime = Math.round(endTime - trialStartTime);
    
    const error = Math.abs(estimate - actualValue);
    const isCorrect = error < actualValue * 0.2;

    if (phase === 'practice') {
      if (settings.showFeedback) {
        setLastCorrect(isCorrect);
        setShowFeedback(true);
        setTimeout(() => {
          setShowFeedback(false);
          scheduleNextTrial();
        }, 1500);
      } else {
        scheduleNextTrial();
      }
      return;
    }

    const trial: TrialData = {
      trialNumber: trialIndex + 1,
      responseTimeMs: responseTime,
      answer: userEstimate,
      correctAnswer: String(actualValue),
      stimulus: { anchor: currentAnchor, actualValue, question: currentTrial.question },
    };

    setTrialData(prev => [...prev, trial]);

    if (settings.showFeedback) {
      setLastCorrect(isCorrect);
      setShowFeedback(true);
      setTimeout(() => {
        setShowFeedback(false);
        scheduleNextTrial();
      }, 1500);
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

  const completeExperiment = () => {
    setPhase('complete');
    const endTime = performance.now();
    const totalTime = Math.round(endTime - experimentStartTime);
    
    let finalTrialData = trialData;
    if (settings.outlierRemoval) {
      finalTrialData = removeOutliers(trialData);
    }
    
    const avgError = finalTrialData.reduce((sum, t) => {
      const stimulus = t.stimulus as { actualValue: number };
      return sum + Math.abs(parseInt(String(t.answer), 10) - stimulus.actualValue);
    }, 0) / finalTrialData.length;

    const results: ExperimentResults = {
      experimentName: experiment.id,
      participantId,
      roomId,
      language,
      timestamp: new Date().toISOString(),
      totalTrials: trialData.length,
      responseTimeMs: totalTime,
      accuracy: 0,
      answer: avgError,
      correctAnswer: 'average_absolute_error',
      trialData: finalTrialData,
      debrief: t(experiment.debriefKey),
    };

    onComplete(results);
  };

  if (phase === 'instruction') {
    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="max-w-2xl mx-auto p-6">
          <h2 className="text-2xl font-bold text-navy-900 mb-4">{t('exp.anchoring.name')}</h2>
          <p className="text-gray-600 mb-4">
            {settings.customInstructions || t('exp.anchoring.instruction')}
          </p>
          <p className="text-sm text-gray-500 mb-4">
            {t('citation')}: {experiment.citation}, {experiment.year}
          </p>
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
            <p className="text-blue-800">{t('exp.anchoring.instructionDetail')}</p>
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
    const anchorHighTrials = trialData.filter(t => (t.stimulus as { anchor: number }).anchor > 1000000);
    const anchorLowTrials = trialData.filter(t => (t.stimulus as { anchor: number }).anchor < 1000000);
    
    const avgHighError = anchorHighTrials.length > 0 
      ? anchorHighTrials.reduce((sum, t) => sum + Math.abs(parseInt(String(t.answer), 10) - (t.stimulus as { actualValue: number }).actualValue), 0) / anchorHighTrials.length 
      : 0;
    const avgLowError = anchorLowTrials.length > 0 
      ? anchorLowTrials.reduce((sum, t) => sum + Math.abs(parseInt(String(t.answer), 10) - (t.stimulus as { actualValue: number }).actualValue), 0) / anchorLowTrials.length 
      : 0;

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
              <p className="text-2xl font-bold text-navy-900">{Math.round(avgHighError + avgLowError) / 2}</p>
              <p className="text-sm text-gray-600">{t('exp.anchoring.avgError')}</p>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg mb-4">
            <p className="text-amber-800 font-medium mb-2">{t('exp.anchoring.anchorEffect')}:</p>
            <p className="text-sm text-amber-700">{t('exp.anchoring.highAnchorError')}: {Math.round(avgHighError)}</p>
            <p className="text-sm text-amber-700">{t('exp.anchoring.lowAnchorError')}: {Math.round(avgLowError)}</p>
            <p className="text-sm text-amber-700 mt-2">{t('exp.anchoring.interpretation')}</p>
          </div>

          <p className="text-gray-600 mb-4">{t('exp.anchoring.debrief')}</p>
        </div>
      </ExperimentWrapper>
    );
  }

  const currentTrial = phase === 'practice' ? practiceStimuli[trialIndex] : allStimuli[trialIndex];
  const totalTrials = phase === 'practice' ? practiceStimuli.length : allStimuli.length;

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
              {phase === 'practice' ? 'Practice: ' : ''}{trialIndex + 1} / {totalTrials}
            </p>
          </div>
        )}

        {showFeedback && currentAnchor && (
          <div className="mb-4 p-4 bg-gray-100 rounded-lg">
            <p className="text-center">
              <span className="text-lg font-semibold">{t('exp.anchoring.actualWas')}: {currentTrial.actualValue.toLocaleString()}</span>
            </p>
          </div>
        )}

        {settings.showAnchor && currentAnchor && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
            <p className="text-blue-800">{t('exp.anchoring.randomNumber')}: <span className="font-bold text-xl">{currentAnchor.toLocaleString()}</span></p>
          </div>
        )}

        <h2 className="text-xl font-semibold text-navy-900 mb-6 text-center">
          {t(`exp.anchoring.${currentTrial.question}`)}
        </h2>

        <div className="max-w-xs mx-auto">
          <label className="block text-gray-600 mb-2 text-center">
            {t('exp.anchoring.enterEstimate')}
          </label>
          <input
            type="number"
            value={userEstimate}
            onChange={(e) => setUserEstimate(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            className="w-full px-4 py-3 text-center text-xl border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none"
            placeholder="0"
            autoFocus
          />
        </div>

        <div className="flex justify-center mt-6">
          <button
            onClick={handleSubmit}
            disabled={!userEstimate}
            className="bg-teal-600 text-white px-8 py-3 rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('common.submit')}
          </button>
        </div>
      </div>
    </ExperimentWrapper>
  );
}

export default AnchoringExperiment;
