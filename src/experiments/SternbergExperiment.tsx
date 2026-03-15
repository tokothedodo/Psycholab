/**
 * STERNBERG MEMORY SCANNING - Memory Experiment
 * 
 * Tests memory search time complexity.
 * Participants determine if a probe is in a remembered set.
 */

import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ExperimentWrapper } from '../components/experiments/ExperimentWrapper';
import type { Experiment } from '../data/experiments';
import type { TrialData, ExperimentResults } from '../components/experiments/ExperimentWrapper';
import { getDefaultConfig } from './config/experimentDefaults';

interface SternbergConfig {
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
  setSizes: number[];
}

interface SternbergProps {
  experiment: Experiment;
  onComplete: (results: ExperimentResults) => void;
  participantId: string;
  roomId: string;
  config?: Partial<SternbergConfig>;
}

interface Trial {
  memorySet: number[];
  probe: number;
  isPresent: boolean;
  setSize: number;
}

const DEFAULT_CONFIG = {
  ...getDefaultConfig('sternberg'),
  setSizes: [2, 4, 6, 8],
  trials: 60,
} as SternbergConfig;

export function SternbergExperiment({ experiment, onComplete, participantId, roomId, config = {} }: SternbergProps) {
  const { t, language } = useLanguage();
  
  const settings: SternbergConfig = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  const [phase, setPhase] = useState<'instruction' | 'memory' | 'probe' | 'complete'>('instruction');
  const [trialIndex, setTrialIndex] = useState(0);
  const [trialData, setTrialData] = useState<TrialData[]>([]);
  const [experimentStartTime, setExperimentStartTime] = useState(0);
  const [trialStartTime, setTrialStartTime] = useState(0);
  const [currentTrial, setCurrentTrial] = useState<Trial | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);

  const generateStimuli = useCallback((): Trial[] => {
    const stimuli: Trial[] = [];
    const trialsPerSetSize = Math.floor(settings.trials / settings.setSizes.length);
    
    settings.setSizes.forEach(setSize => {
      for (let i = 0; i < trialsPerSetSize; i++) {
        const memorySet: number[] = [];
        while (memorySet.length < setSize) {
          const num = Math.floor(Math.random() * 9) + 1;
          if (!memorySet.includes(num)) memorySet.push(num);
        }
        
        const isPresent = Math.random() > 0.5;
        let probe: number;
        if (isPresent) {
          probe = memorySet[Math.floor(Math.random() * memorySet.length)];
        } else {
          do {
            probe = Math.floor(Math.random() * 9) + 1;
          } while (memorySet.includes(probe));
        }
        
        stimuli.push({ memorySet, probe, isPresent, setSize });
      }
    });
    
    if (settings.randomizeOrder) {
      return stimuli.sort(() => Math.random() - 0.5);
    }
    return stimuli;
  }, [settings.trials, settings.setSizes, settings.randomizeOrder]);

  const [allStimuli] = useState(generateStimuli);
  const [practiceStimuli] = useState<Trial[]>([
    { memorySet: [1, 2, 3], probe: 2, isPresent: true, setSize: 3 },
    { memorySet: [4, 5, 6], probe: 7, isPresent: false, setSize: 3 },
  ]);

  useEffect(() => {
    if (phase === 'instruction') {
      setExperimentStartTime(performance.now());
    }
  }, [phase]);

  const startTrial = (isPractice: boolean) => {
    const stimuli = isPractice ? practiceStimuli : allStimuli;
    const idx = isPractice ? trialIndex : trialIndex;
    setCurrentTrial(stimuli[idx]);
    setPhase('memory');
    
    setTimeout(() => {
      setPhase('probe');
      setTrialStartTime(performance.now());
    }, settings.stimulusDuration > 0 ? settings.stimulusDuration : 1000);
  };

  const handleResponse = (response: 'yes' | 'no') => {
    if (!currentTrial) return;

    const endTime = performance.now();
    const responseTime = Math.round(endTime - trialStartTime);
    
    const isCorrect = (response === 'yes' && currentTrial.isPresent) || 
                     (response === 'no' && !currentTrial.isPresent);

    if (phase === 'memory') return;

    if (settings.showFeedback && trialIndex < settings.practiceTrials) {
      setLastCorrect(isCorrect);
      setShowFeedback(true);
      setTimeout(() => {
        setShowFeedback(false);
        advanceTrial();
      }, 500);
      return;
    }

    const trial: TrialData = {
      trialNumber: trialIndex + 1,
      responseTimeMs: responseTime,
      answer: response,
      correctAnswer: currentTrial.isPresent ? 'yes' : 'no',
      stimulus: { ...currentTrial },
    };

    setTrialData(prev => [...prev, trial]);
    advanceTrial();
  };

  const advanceTrial = () => {
    if (trialIndex < settings.practiceTrials - 1) {
      setTrialIndex(prev => prev + 1);
      setTimeout(() => startTrial(true), settings.isi > 0 ? settings.isi : 500);
    } else if (trialIndex === settings.practiceTrials - 1) {
      setTrialIndex(0);
      setTimeout(() => startTrial(false), settings.isi > 0 ? settings.isi : 500);
    } else if (trialIndex < settings.trials + settings.practiceTrials - 1) {
      setTrialIndex(prev => prev + 1);
      setTimeout(() => startTrial(false), settings.isi > 0 ? settings.isi : 500);
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
    
    const finalTrialData = removeOutliers(trialData);
    
    const bySetSize: Record<number, { times: number[]; correct: number }> = {};
    finalTrialData.forEach(t => {
      const setSize = (t.stimulus as Trial).setSize;
      if (!bySetSize[setSize]) bySetSize[setSize] = { times: [], correct: 0 };
      bySetSize[setSize].times.push(t.responseTimeMs);
      if (t.answer === t.correctAnswer) bySetSize[setSize].correct++;
    });

    const avgBySetSize: Record<number, number> = {};
    Object.entries(bySetSize).forEach(([size, data]) => {
      avgBySetSize[Number(size)] = data.times.reduce((a, b) => a + b, 0) / data.times.length;
    });

    const results: ExperimentResults = {
      experimentName: experiment.id,
      participantId,
      roomId,
      language,
      timestamp: new Date().toISOString(),
      totalTrials: trialData.length,
      responseTimeMs: totalTime,
      accuracy: (finalTrialData.filter(t => t.answer === t.correctAnswer).length / finalTrialData.length) * 100,
      answer: JSON.stringify(avgBySetSize),
      correctAnswer: 'rt_by_set_size',
      trialData: finalTrialData,
      debrief: t(experiment.debriefKey),
    };

    onComplete(results);
  };

  if (phase === 'instruction') {
    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="max-w-2xl mx-auto p-6">
          <h2 className="text-2xl font-bold text-navy-900 mb-4">{t('exp.sternberg.name')}</h2>
          <p className="text-gray-600 mb-4">
            {settings.customInstructions || t('exp.sternberg.instruction')}
          </p>
          <p className="text-sm text-gray-500 mb-4">
            {t('citation')}: {experiment.citation}, {experiment.year}
          </p>
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
            <p className="text-blue-800">{t('exp.sternberg.instructionDetail')}</p>
          </div>
          <button
            onClick={() => startTrial(true)}
            className="bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 transition-colors"
          >
            {t('common.start')}
          </button>
        </div>
      </ExperimentWrapper>
    );
  }

  if (phase === 'complete') {
    const bySetSize: Record<number, number[]> = {};
    trialData.forEach(t => {
      const setSize = (t.stimulus as Trial).setSize;
      if (!bySetSize[setSize]) bySetSize[setSize] = [];
      bySetSize[setSize].push(t.responseTimeMs);
    });

    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="max-w-2xl mx-auto p-6">
          <h2 className="text-2xl font-bold text-navy-900 mb-4">{t('common.debrief.title')}</h2>
          <div className="bg-teal-50 border-l-4 border-teal-500 p-4 mb-4">
            <p className="text-teal-800 font-medium">{t('common.debrief.thankYou')}</p>
          </div>
          <div className="grid grid-cols-4 gap-4 mb-6">
            {settings.setSizes.map(size => (
              <div key={size} className="bg-gray-50 p-4 rounded-lg text-center">
                <p className="text-2xl font-bold text-navy-900">
                  {Math.round(bySetSize[size]?.reduce((a, b) => a + b, 0) / bySetSize[size]?.length || 0)}ms
                </p>
                <p className="text-sm text-gray-600">n={size}</p>
              </div>
            ))}
          </div>
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg mb-4">
            <p className="text-amber-800 font-medium mb-2">{t('exp.sternberg.interpretation')}</p>
            <p className="text-sm text-amber-700">{t('exp.sternberg.slopeExplanation')}</p>
          </div>
          <p className="text-gray-600 mb-4">{t('exp.sternberg.debrief')}</p>
        </div>
      </ExperimentWrapper>
    );
  }

  if (!currentTrial) return null;

  return (
    <ExperimentWrapper experiment={experiment}>
      <div className="max-w-2xl mx-auto p-6">
        {settings.showProgressBar && (
          <div className="mb-6">
            <div className="h-2 bg-gray-200 rounded overflow-hidden">
              <div className="h-full bg-teal-600 transition-all" style={{ width: `${((trialIndex + 1) / (settings.trials + settings.practiceTrials)) * 100}%` }} />
            </div>
          </div>
        )}

        {showFeedback && (
          <div className="text-center mb-4">
            <span className={`text-2xl font-bold ${lastCorrect ? 'text-green-600' : 'text-red-600'}`}>
              {lastCorrect ? '✓' : '✗'}
            </span>
          </div>
        )}

        {phase === 'memory' && (
          <>
            <h2 className="text-xl font-semibold text-navy-900 mb-8 text-center">
              {t('exp.sternberg.remember')}
            </h2>
            <div className="flex justify-center gap-4 mb-8">
              {currentTrial.memorySet.map((num, i) => (
                <div key={i} className="w-16 h-16 bg-navy-900 text-white rounded-lg flex items-center justify-center text-2xl font-bold">
                  {num}
                </div>
              ))}
            </div>
          </>
        )}

        {phase === 'probe' && (
          <>
            <h2 className="text-xl font-semibold text-navy-900 mb-8 text-center">
              {t('exp.sternberg.wasInSet')}
            </h2>
            <div className="flex justify-center mb-8">
              <div className="w-20 h-20 bg-teal-600 text-white rounded-lg flex items-center justify-center text-3xl font-bold">
                {currentTrial.probe}
              </div>
            </div>
            <div className="flex justify-center gap-6">
              <button
                onClick={() => handleResponse('yes')}
                className="bg-gray-100 hover:bg-teal-50 border-2 border-gray-200 hover:border-teal-500 px-8 py-4 rounded-lg transition-all"
              >
                <span className="text-lg font-semibold text-navy-900">{t('common.yes')}</span>
              </button>
              <button
                onClick={() => handleResponse('no')}
                className="bg-gray-100 hover:bg-teal-50 border-2 border-gray-200 hover:border-teal-500 px-8 py-4 rounded-lg transition-all"
              >
                <span className="text-lg font-semibold text-navy-900">{t('common.no')}</span>
              </button>
            </div>
          </>
        )}
      </div>
    </ExperimentWrapper>
  );
}

export default SternbergExperiment;
