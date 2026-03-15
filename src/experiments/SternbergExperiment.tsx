/**
 * STERNBERG MEMORY SCANNING - Memory Experiment
 * 
 * Tests memory search time complexity.
 * Participants determine if a probe is in a remembered set.
 */

import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ExperimentWrapper } from './ExperimentWrapper';
import type { Experiment } from '../data/experiments';
import type { TrialData, ExperimentResults } from './ExperimentWrapper';
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
        <div className="max-w-2xl mx-auto p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
          <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-emerald-600 mb-6">{t('exp.sternberg.name')}</h2>

          <div className="bg-slate-50 border-l-4 border-teal-500 p-5 rounded-r-lg shadow-sm mb-6">
            <p className="text-slate-700 leading-relaxed text-md">
              {settings.customInstructions || t('exp.sternberg.instruction')}
            </p>
          </div>

          <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-5 mb-8">
            <p className="text-sm font-semibold text-indigo-900 mb-2 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              {t('exp.sternberg.instructionDetail')}
            </p>
          </div>

          <p className="text-sm font-medium text-slate-400 mb-8 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
            {t('citation')}: {experiment.citation}, {experiment.year}
          </p>

          <button
            onClick={() => startTrial(true)}
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
      <div className="max-w-4xl mx-auto p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 min-h-[500px] flex flex-col relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-white -z-10"></div>
        {settings.showProgressBar && (
          <div className="mb-8 px-4 pt-2">
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-teal-400 to-teal-500 transition-all duration-500 ease-out"
                style={{ width: `${((trialIndex + 1) / (settings.trials + settings.practiceTrials)) * 100}%` }}
              />
            </div>
            <div className="flex justify-between items-center mt-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{trialIndex < settings.practiceTrials ? 'Practice' : 'Experiment'}</span>
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                {trialIndex + 1} / {settings.trials + settings.practiceTrials}
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

        {phase === 'memory' && (
          <div className="flex-1 flex flex-col items-center justify-center animate-fade-in">
            <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight mb-12 text-center">
              {t('exp.sternberg.remember')}
            </h2>
            <div className="flex flex-wrap justify-center gap-4 sm:gap-6 mb-8 w-full max-w-2xl bg-white/50 p-8 rounded-2xl shadow-sm border border-slate-100">
              {currentTrial.memorySet.map((num, i) => (
                <div
                  key={i}
                  className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-slate-700 to-slate-900 text-white rounded-xl shadow-lg flex items-center justify-center text-3xl font-bold transform transition-transform duration-300 hover:scale-105"
                  style={{ animationDelay: `${i * 100}ms`, animationFillMode: 'both' }}
                >
                  {num}
                </div>
              ))}
            </div>
          </div>
        )}

        {phase === 'probe' && (
          <div className="flex-1 flex flex-col items-center justify-center animate-fade-in w-full">
            <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight mb-12 text-center">
              {t('exp.sternberg.wasInSet')}
            </h2>
            <div className="flex justify-center mb-12">
              <div className="relative group w-28 h-28">
                <div className="absolute inset-0 bg-teal-400 rounded-2xl opacity-50 blur-lg group-hover:opacity-75 transition-opacity duration-300 animate-pulse"></div>
                <div className="relative w-full h-full bg-gradient-to-br from-teal-500 to-teal-600 text-white rounded-2xl shadow-xl border border-teal-400/50 flex items-center justify-center text-5xl font-extrabold">
                  {currentTrial.probe}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-center gap-6 w-full max-w-xl">
              <button
                onClick={() => handleResponse('yes')}
                className="group relative flex-1 py-6 bg-white rounded-2xl shadow-sm border-2 border-transparent hover:border-teal-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center justify-center focus:outline-none focus:ring-4 focus:ring-teal-500/20"
              >
                <span className="absolute inset-0 bg-teal-50/0 group-hover:bg-teal-50/50 rounded-2xl transition-colors"></span>
                <span className="text-2xl font-bold text-slate-700 group-hover:text-teal-700 z-10 transition-colors uppercase tracking-wide">{t('common.yes')}</span>
              </button>

              <button
                onClick={() => handleResponse('no')}
                className="group relative flex-1 py-6 bg-white rounded-2xl shadow-sm border-2 border-transparent hover:border-slate-300 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center justify-center focus:outline-none focus:ring-4 focus:ring-slate-500/20"
              >
                <span className="absolute inset-0 bg-slate-50/0 group-hover:bg-slate-50/50 rounded-2xl transition-colors"></span>
                <span className="text-2xl font-bold text-slate-700 group-hover:text-slate-800 z-10 transition-colors uppercase tracking-wide">{t('common.no')}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </ExperimentWrapper>
  );
}

export default SternbergExperiment;
