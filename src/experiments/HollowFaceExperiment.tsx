/**
 * HOLLOW FACE - Bistable Perception Experiment
 * 
 * Tests bistable perception where a concave face appears as convex.
 * This demonstrates top-down processing in visual perception.
 * The hollow mask illusion shows how our brain interprets depth from flat images.
 */

import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ExperimentWrapper } from './ExperimentWrapper';
import type { Experiment } from '../data/experiments';
import type { TrialData, ExperimentResults } from './ExperimentWrapper';
import { getDefaultConfig } from './config/experimentDefaults';

interface HollowFaceConfig {
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
  exposureDuration: number;
}

interface HollowFaceProps {
  experiment: Experiment;
  onComplete: (results: ExperimentResults) => void;
  participantId: string;
  roomId: string;
  config?: Partial<HollowFaceConfig>;
}

interface Trial {
  isHollow: boolean;
  orientation: 'normal' | 'inverted';
}

const DEFAULT_CONFIG = {
  ...getDefaultConfig('hollowFace'),
  trials: 16,
  exposureDuration: 5000,
} as HollowFaceConfig;

const STIMULI: Trial[] = [
  { isHollow: true, orientation: 'normal' },
  { isHollow: true, orientation: 'inverted' },
  { isHollow: false, orientation: 'normal' },
  { isHollow: false, orientation: 'inverted' },
];

export function HollowFaceExperiment({ experiment, onComplete, participantId, roomId, config = {} }: HollowFaceProps) {
  const { t, language } = useLanguage();
  
  const settings: HollowFaceConfig = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  const [phase, setPhase] = useState<'instruction' | 'exposure' | 'response' | 'complete'>('instruction');
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

  useEffect(() => {
    if (phase === 'instruction') {
      setExperimentStartTime(performance.now());
    }
  }, [phase]);

  useEffect(() => {
    if (phase === 'response' && currentTrial) {
      setTrialStartTime(performance.now());
    }
  }, [phase, trialIndex, currentTrial]);

  useEffect(() => {
    if (phase === 'exposure') {
      setCurrentTrial(allStimuli[trialIndex]);
      
      if (settings.exposureDuration > 0) {
        const timer = setTimeout(() => {
          setPhase('response');
        }, settings.exposureDuration);
        
        return () => clearTimeout(timer);
      } else {
        setPhase('response');
      }
    }
  }, [phase, trialIndex]);

  const startExperiment = () => {
    if (settings.practiceTrials > 0) {
      setPhase('exposure');
      setTrialIndex(0);
    } else {
      setPhase('exposure');
      setTrialIndex(0);
    }
  };

  const handleResponse = (perceived: string) => {
    if (!currentTrial || isWaiting) return;

    const endTime = performance.now();
    const responseTime = Math.round(endTime - trialStartTime);
    
    const isCorrect = (perceived === 'convex' && !currentTrial.isHollow) || 
                      (perceived === 'concave' && currentTrial.isHollow);

    if (phase === 'exposure' || settings.practiceTrials === 0) {
      const trial: TrialData = {
        trialNumber: trialIndex + 1,
        responseTimeMs: responseTime,
        answer: perceived,
        correctAnswer: currentTrial.isHollow ? 'concave' : 'convex',
        stimulus: { ...currentTrial },
      };

      setTrialData(prev => [...prev, trial]);

      if (settings.showFeedback) {
        setLastCorrect(isCorrect);
        setShowFeedback(true);
        setTimeout(() => {
          setShowFeedback(false);
          advanceTrial();
        }, 1000);
      } else {
        advanceTrial();
      }
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
      setPhase('exposure');
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

  const renderFace = (trial: Trial) => {
    const width = 200;
    const height = 280;
    const rotation = trial.orientation === 'inverted' ? 180 : 0;
    
    return (
      <svg 
        width={width} 
        height={height} 
        viewBox={`0 0 ${width} ${height}`}
        style={{ transform: `rotate(${rotation}deg)` }}
      >
        <defs>
          <radialGradient id="faceGradient" cx="50%" cy="40%" r="50%">
            <stop offset="0%" stopColor="#e8c4a0" />
            <stop offset="70%" stopColor="#c9a882" />
            <stop offset="100%" stopColor="#8b6f5c" />
          </radialGradient>
          <linearGradient id="shadowLeft" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(0,0,0,0.4)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </linearGradient>
          <linearGradient id="shadowRight" x1="100%" y1="0%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="rgba(0,0,0,0.4)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </linearGradient>
        </defs>
        
        {trial.isHollow ? (
          <g>
            <ellipse cx="100" cy="140" rx="85" ry="120" fill="url(#faceGradient)" />
            <ellipse cx="100" cy="140" rx="80" ry="115" fill="#1e3a5f" opacity="0.1" />
            <ellipse cx="70" cy="120" rx="15" ry="20" fill="#1e3a5f" />
            <ellipse cx="130" cy="120" rx="15" ry="20" fill="#1e3a5f" />
            <path d="M 60 170 Q 100 190 140 170" fill="none" stroke="#1e3a5f" strokeWidth="4" strokeLinecap="round" />
            <path d="M 100 140 L 100 200" fill="none" stroke="#8b6f5c" strokeWidth="2" opacity="0.3" />
            <rect x="50" y="100" width="100" height="80" fill="url(#shadowLeft)" opacity={trial.orientation === 'normal' ? 0.3 : 0} />
          </g>
        ) : (
          <g>
            <ellipse cx="100" cy="140" rx="85" ry="120" fill="url(#faceGradient)" />
            <ellipse cx="70" cy="120" rx="12" ry="16" fill="white" />
            <ellipse cx="70" cy="122" rx="6" ry="8" fill="#1e3a5f" />
            <ellipse cx="130" cy="120" rx="12" ry="16" fill="white" />
            <ellipse cx="130" cy="122" rx="6" ry="8" fill="#1e3a5f" />
            <path d="M 70 175 Q 100 155 130 175" fill="none" stroke="#c97878" strokeWidth="4" strokeLinecap="round" />
            <ellipse cx="85" cy="80" rx="8" ry="5" fill="rgba(0,0,0,0.1)" />
            <ellipse cx="115" cy="80" rx="8" ry="5" fill="rgba(0,0,0,0.1)" />
          </g>
        )}
      </svg>
    );
  };

  if (phase === 'instruction') {
    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="max-w-2xl mx-auto p-6">
          <h2 className="text-2xl font-bold text-navy-900 mb-4">{t('exp.hollowFace.name')}</h2>
          <p className="text-gray-600 mb-4">
            {settings.customInstructions || t('exp.hollowFace.instruction')}
          </p>
          <p className="text-sm text-gray-500 mb-4">
            {t('citation')}: {experiment.citation}, {experiment.year}
          </p>
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
            <p className="text-blue-800">{t('exp.hollowFace.instructionDetail')}</p>
          </div>
          <button
            onClick={startExperiment}
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
          <p className="text-gray-600 mb-4">{t('exp.hollowFace.debrief')}</p>
        </div>
      </ExperimentWrapper>
    );
  }

  if (!currentTrial) return null;

  const totalTrials = allStimuli.length;

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
          {phase === 'exposure' ? t('exp.hollowFace.lookAtFace') : t('exp.hollowFace.whatDoYouSee')}
        </h2>

        <div className="flex justify-center items-center min-h-[320px] mb-8">
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-lg">
            {renderFace(currentTrial)}
          </div>
        </div>

        {phase === 'response' && (
          <div className="flex justify-center gap-6">
            <button
              onClick={() => handleResponse('convex')}
              disabled={isWaiting}
              className="bg-gray-100 hover:bg-teal-50 border-2 border-gray-200 hover:border-teal-500 px-8 py-4 rounded-lg transition-all disabled:opacity-50"
            >
              <span className="text-lg font-semibold text-navy-900">{t('exp.hollowFace.convex')}</span>
            </button>
            <button
              onClick={() => handleResponse('concave')}
              disabled={isWaiting}
              className="bg-gray-100 hover:bg-teal-50 border-2 border-gray-200 hover:border-teal-500 px-8 py-4 rounded-lg transition-all disabled:opacity-50"
            >
              <span className="text-lg font-semibold text-navy-900">{t('exp.hollowFace.concave')}</span>
            </button>
          </div>
        )}

        {phase === 'exposure' && (
          <p className="text-center text-gray-500">{t('exp.hollowFace.starePrompt')}</p>
        )}
      </div>
    </ExperimentWrapper>
  );
}

export default HollowFaceExperiment;
