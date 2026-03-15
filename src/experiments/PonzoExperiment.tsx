/**
 * PONZO ILLUSION - Visual Perception Experiment
 * 
 * Tests depth perception with converging lines (the "Ponzo illusion").
 * Both horizontal lines appear equal length due to depth cues from converging lines.
 */

import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ExperimentWrapper } from './ExperimentWrapper';
import type { Experiment } from '../data/experiments';
import type { TrialData, ExperimentResults } from './ExperimentWrapper';
import { getDefaultConfig } from './config/experimentDefaults';

interface PonzoConfig {
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
  topBarLength: number;
  bottomBarLength: number;
  lineConvergence: number;
}

interface PonzoProps {
  experiment: Experiment;
  onComplete: (results: ExperimentResults) => void;
  participantId: string;
  roomId: string;
  config?: Partial<PonzoConfig>;
}

interface Stimulus {
  topLength: number;
  bottomLength: number;
  correctAnswer: 'equal' | 'top' | 'bottom';
}

const DEFAULT_CONFIG = {
  ...getDefaultConfig('ponzo-illusion'),
  topBarLength: 200,
  bottomBarLength: 200,
  lineConvergence: 150,
} as PonzoConfig;

export function PonzoExperiment({ experiment, onComplete, participantId, roomId, config = {} }: PonzoProps) {
  const { t, language } = useLanguage();
  
  const settings: PonzoConfig = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  const [phase, setPhase] = useState<'instruction' | 'practice' | 'experiment' | 'complete'>('instruction');
  const [trialIndex, setTrialIndex] = useState(0);
  const [trialData, setTrialData] = useState<TrialData[]>([]);
  const [experimentStartTime, setExperimentStartTime] = useState(0);
  const [trialStartTime, setTrialStartTime] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [currentStimulus, setCurrentStimulus] = useState<Stimulus | null>(null);

  const generateStimuli = useCallback((): Stimulus[] => {
    const stimuli: Stimulus[] = [];
    const baseLength = 150;
    const maxVariation = 100;
    
    for (let i = 0; i < settings.trials; i++) {
      const variation = (Math.random() - 0.5) * maxVariation;
      const topLength = baseLength + variation;
      const bottomLength = baseLength - variation;
      
      stimuli.push({
        topLength: Math.round(topLength),
        bottomLength: Math.round(bottomLength),
        correctAnswer: topLength > bottomLength ? 'top' : topLength < bottomLength ? 'bottom' : 'equal',
      });
    }
    
    if (settings.randomizeOrder) {
      return stimuli.sort(() => Math.random() - 0.5);
    }
    return stimuli;
  }, [settings.trials, settings.randomizeOrder]);

  const [allStimuli] = useState(generateStimuli);

  const generatePracticeStimuli = useCallback((): Stimulus[] => {
    return [
      { topLength: 180, bottomLength: 150, correctAnswer: 'top' },
      { topLength: 160, bottomLength: 190, correctAnswer: 'bottom' },
    ];
  }, []);

  const [practiceStimuli] = useState(generatePracticeStimuli);

  useEffect(() => {
    if (phase === 'instruction') {
      setExperimentStartTime(performance.now());
    }
  }, [phase]);

  useEffect(() => {
    if ((phase === 'experiment' || phase === 'practice') && currentStimulus) {
      setTrialStartTime(performance.now());
    }
  }, [phase, trialIndex, currentStimulus]);

  useEffect(() => {
    if (settings.responseTimeLimit > 0 && phase === 'experiment' && currentStimulus) {
      const timer = setTimeout(() => {
        handleResponse('timeout');
      }, settings.responseTimeLimit);
      return () => clearTimeout(timer);
    }
  }, [phase, currentStimulus, settings.responseTimeLimit]);

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
    if (phase === 'practice') {
      if (trialIndex < practiceStimuli.length - 1) {
        setTrialIndex(prev => prev + 1);
        setCurrentStimulus(practiceStimuli[trialIndex + 1]);
      } else {
        setPhase('experiment');
        setTrialIndex(0);
        setCurrentStimulus(allStimuli[0]);
      }
    } else if (phase === 'experiment') {
      if (trialIndex < allStimuli.length - 1) {
        setTrialIndex(prev => prev + 1);
        setCurrentStimulus(allStimuli[trialIndex + 1]);
      } else {
        completeExperiment();
      }
    }
  };

  const handleResponse = (selected: string) => {
    if (!currentStimulus || phase === 'instruction' || phase === 'complete') return;

    const endTime = performance.now();
    const responseTime = Math.round(endTime - trialStartTime);
    
    const isCorrect = selected === currentStimulus.correctAnswer || 
      (selected === 'equal' && currentStimulus.correctAnswer === 'equal');

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

    const trial: TrialData = {
      trialNumber: trialIndex + 1,
      responseTimeMs: responseTime === 0 && selected === 'timeout' ? settings.responseTimeLimit : responseTime,
      answer: selected,
      correctAnswer: currentStimulus.correctAnswer,
      stimulus: { ...currentStimulus },
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

  const completeExperiment = () => {
    setPhase('complete');
    const endTime = performance.now();
    const totalTime = Math.round(endTime - experimentStartTime);
    
    let finalTrialData = trialData;
    if (settings.outlierRemoval) {
      finalTrialData = removeOutliers(trialData);
    }
    
    const correctCount = finalTrialData.filter(t => 
      t.answer === t.correctAnswer || 
      (t.answer === 'equal' && t.correctAnswer === 'equal')
    ).length;
    const accuracy = finalTrialData.length > 0 ? (correctCount / finalTrialData.length) * 100 : 0;

    const topResponses = finalTrialData.filter(t => t.answer === 'top').length;
    const bottomResponses = finalTrialData.filter(t => t.answer === 'bottom').length;
    const equalResponses = finalTrialData.filter(t => t.answer === 'equal').length;

    const results: ExperimentResults = {
      experimentName: experiment.id,
      participantId,
      roomId,
      language,
      timestamp: new Date().toISOString(),
      totalTrials: trialData.length,
      responseTimeMs: totalTime,
      accuracy,
      answer: `${topResponses}:${bottomResponses}:${equalResponses}`,
      correctAnswer: 'top:bottom:equal_response_counts',
      trialData: finalTrialData,
      debrief: t(experiment.debriefKey),
    };

    onComplete(results);
  };

  if (phase === 'instruction') {
    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="max-w-2xl mx-auto p-6">
          <h2 className="text-2xl font-bold text-navy-900 mb-4">{t('exp.ponzo.name')}</h2>
          <p className="text-gray-600 mb-4">
            {settings.customInstructions || t('exp.ponzo.instruction')}
          </p>
          <p className="text-sm text-gray-500 mb-4">
            {t('citation')}: {experiment.citation}, {experiment.year}
          </p>
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
            <p className="text-blue-800">{t('exp.ponzo.instructionDetail')}</p>
          </div>
          <p className="text-xs text-gray-400 mb-4">
            {settings.trials} trials | {settings.practiceTrials} practice | ISI: {settings.isi}ms
          </p>
          <button
            onClick={() => {
              if (settings.practiceTrials > 0) {
                setPhase('practice');
                setTrialIndex(0);
                setCurrentStimulus(practiceStimuli[0]);
              } else {
                setPhase('experiment');
                setTrialIndex(0);
                setCurrentStimulus(allStimuli[0]);
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
    const correctCount = trialData.filter(t => 
      t.answer === t.correctAnswer || 
      (t.answer === 'equal' && t.correctAnswer === 'equal')
    ).length;
    const topResponses = trialData.filter(t => t.answer === 'top').length;
    const bottomResponses = trialData.filter(t => t.answer === 'bottom').length;

    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="max-w-2xl mx-auto p-6">
          <h2 className="text-2xl font-bold text-navy-900 mb-4">{t('common.debrief.title')}</h2>
          
          <div className="bg-teal-50 border-l-4 border-teal-500 p-4 mb-4">
            <p className="text-teal-800 font-medium">{t('common.debrief.thankYou')}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-navy-900">{correctCount}/{trialData.length}</p>
              <p className="text-sm text-gray-600">{t('common.correct')}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-navy-900">{Math.round(trialData.reduce((s, t) => s + t.responseTimeMs, 0) / trialData.length)}ms</p>
              <p className="text-sm text-gray-600">{t('common.avgRT')}</p>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg mb-4">
            <p className="text-amber-800 font-medium mb-2">{t('exp.ponzo.illusionStrength')}:</p>
            <p className="text-sm text-amber-700">{t('exp.ponzo.topBarChose')}: {topResponses} | {t('exp.ponzo.bottomBarChose')}: {bottomResponses}</p>
            <p className="text-sm text-amber-700 mt-1">{t('exp.ponzo.interpretation')}</p>
          </div>

          <p className="text-gray-600 mb-4">{t('exp.ponzo.debrief')}</p>
        </div>
      </ExperimentWrapper>
    );
  }

  const currentStimulusData = phase === 'practice' ? practiceStimuli[trialIndex] : allStimuli[trialIndex];
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

        {showFeedback && (
          <div className="text-center mb-4">
            <span className={`text-2xl font-bold ${lastCorrect ? 'text-green-600' : 'text-red-600'}`}>
              {lastCorrect ? '✓' : '✗'}
            </span>
          </div>
        )}

        <h2 className="text-xl font-semibold text-navy-900 mb-6 text-center">
          {t('exp.ponzo.question')}
        </h2>

        <div className="flex justify-center mb-8">
          <svg width="400" height="280" viewBox="0 0 400 280" className="overflow-visible">
            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#1e3a5f" />
              </marker>
            </defs>
            
            <line x1="50" y1="280" x2="200" y2="20" stroke="#1e3a5f" strokeWidth="3" />
            <line x1="350" y1="280" x2="200" y2="20" stroke="#1e3a5f" strokeWidth="3" />
            
            <line 
              x1={200 - currentStimulusData.topLength / 2} 
              y1="80" 
              x2={200 + currentStimulusData.topLength / 2} 
              y2="80" 
              stroke="#1e3a5f" 
              strokeWidth="6" 
            />
            
            <line 
              x1={200 - currentStimulusData.bottomLength / 2} 
              y1="200" 
              x2={200 + currentStimulusData.bottomLength / 2} 
              y2="200" 
              stroke="#1e3a5f" 
              strokeWidth="6" 
            />
          </svg>
        </div>

        <p className="text-center text-gray-600 mb-6">{t('exp.ponzo.whichLonger')}</p>
        
        <div className="flex justify-center gap-6">
          <button
            onClick={() => handleResponse('top')}
            className="bg-gray-100 hover:bg-teal-50 border-2 border-gray-200 hover:border-teal-500 px-8 py-4 rounded-lg transition-all"
          >
            <span className="text-lg font-semibold text-navy-900">{t('exp.ponzo.topBar')}</span>
          </button>
          <button
            onClick={() => handleResponse('equal')}
            className="bg-gray-100 hover:bg-teal-50 border-2 border-gray-200 hover:border-teal-500 px-8 py-4 rounded-lg transition-all"
          >
            <span className="text-lg font-semibold text-navy-900">{t('exp.ponzo.equal')}</span>
          </button>
          <button
            onClick={() => handleResponse('bottom')}
            className="bg-gray-100 hover:bg-teal-50 border-2 border-gray-200 hover:border-teal-500 px-8 py-4 rounded-lg transition-all"
          >
            <span className="text-lg font-semibold text-navy-900">{t('exp.ponzo.bottomBar')}</span>
          </button>
        </div>
      </div>
    </ExperimentWrapper>
  );
}

export default PonzoExperiment;
