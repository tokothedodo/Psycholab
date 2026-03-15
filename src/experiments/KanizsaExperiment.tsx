/**
 * KANIZSA TRIANGLE - Illusory Contour Experiment
 * 
 * Tests illusory contour formation and perception.
 * Participants perceive a white triangle that isn't actually drawn.
 */

import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ExperimentWrapper } from '../components/experiments/ExperimentWrapper';
import type { Experiment } from '../data/experiments';
import type { TrialData, ExperimentResults } from '../components/experiments/ExperimentWrapper';
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
        <div className="max-w-2xl mx-auto p-6">
          <h2 className="text-2xl font-bold text-navy-900 mb-4">{t('exp.kanizsa.name')}</h2>
          <p className="text-gray-600 mb-4">
            {settings.customInstructions || t('exp.kanizsa.instruction')}
          </p>
          <p className="text-sm text-gray-500 mb-4">
            {t('citation')}: {experiment.citation}, {experiment.year}
          </p>
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
            <p className="text-blue-800">{t('exp.kanizsa.instructionDetail')}</p>
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
          {t('exp.kanizsa.seeShape')}
        </h2>

        <div className="flex justify-center items-center min-h-[250px] mb-8">
          <div className="bg-white p-8 rounded-lg border border-gray-200">
            {renderStimulus(currentTrial)}
          </div>
        </div>

        <div className="flex justify-center gap-6">
          <button
            onClick={() => handleResponse('yes')}
            disabled={isWaiting}
            className="bg-gray-100 hover:bg-teal-50 border-2 border-gray-200 hover:border-teal-500 px-8 py-4 rounded-lg transition-all disabled:opacity-50"
          >
            <span className="text-lg font-semibold text-navy-900">{t('common.yes')}</span>
          </button>
          <button
            onClick={() => handleResponse('no')}
            disabled={isWaiting}
            className="bg-gray-100 hover:bg-teal-50 border-2 border-gray-200 hover:border-teal-500 px-8 py-4 rounded-lg transition-all disabled:opacity-50"
          >
            <span className="text-lg font-semibold text-navy-900">{t('common.no')}</span>
          </button>
        </div>
      </div>
    </ExperimentWrapper>
  );
}

export default KanizsaExperiment;
