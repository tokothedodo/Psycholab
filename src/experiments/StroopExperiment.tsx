/**
 * STROOP TEST - Full implementation with variable config support
 * 
 * This is the reference implementation showing how to integrate
 * the experiment configuration system.
 */

import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ExperimentWrapper } from './ExperimentWrapper';
import type { Experiment } from '../data/experiments';
import type { TrialData, ExperimentResults } from './ExperimentWrapper';
import { getDefaultConfig } from './config/experimentDefaults';

interface StroopConfig {
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
  congruentRatio: number;
  colors: string[];
  fontSize: number;
  inputMethod: 'keyboard' | 'click';
}

interface StroopProps {
  experiment: Experiment;
  onComplete: (results: ExperimentResults) => void;
  participantId: string;
  roomId: string;
  config?: Partial<StroopConfig>;
}

const COLOR_MAP: Record<string, { hex: string; key: string }> = {
  red: { hex: '#dc2626', key: 'color.red' },
  blue: { hex: '#2563eb', key: 'color.blue' },
  green: { hex: '#16a34a', key: 'color.green' },
  yellow: { hex: '#ca8a04', key: 'color.yellow' },
  purple: { hex: '#7c3aed', key: 'color.purple' },
  orange: { hex: '#ea580c', key: 'color.orange' },
};

const DEFAULT_CONFIG = {
  ...getDefaultConfig('stroop'),
  colors: ['red', 'green', 'blue', 'yellow'],
} as StroopConfig;

export function StroopExperiment({ experiment, onComplete, participantId, roomId, config = {} }: StroopProps) {
  const { t, language } = useLanguage();

  const settings: StroopConfig = {
    ...DEFAULT_CONFIG,
    ...config,
    colors: config.colors || DEFAULT_CONFIG.colors,
  };

  const availableColors = settings.colors.map(name => ({
    name,
    ...COLOR_MAP[name]
  }));

  const [phase, setPhase] = useState<'instruction' | 'practice' | 'experiment' | 'complete'>('instruction');
  const [trialIndex, setTrialIndex] = useState(0);
  const [currentStimulus, setCurrentStimulus] = useState<{ word: string; color: string; congruent: boolean } | null>(null);
  const [experimentStartTime, setExperimentStartTime] = useState(0);
  const [trialStartTime, setTrialStartTime] = useState(0);
  const [trialData, setTrialData] = useState<TrialData[]>([]);
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [isWaiting, setIsWaiting] = useState(false);

  const generateStimuli = useCallback(() => {
    const stimuli: { word: string; color: string; congruent: boolean }[] = [];
    const congruentCount = Math.round(settings.trials * settings.congruentRatio);
    const incongruentCount = settings.trials - congruentCount;

    for (let i = 0; i < congruentCount; i++) {
      const color = availableColors[Math.floor(Math.random() * availableColors.length)];
      stimuli.push({ word: color.name, color: color.hex, congruent: true });
    }

    for (let i = 0; i < incongruentCount; i++) {
      const wordColor = availableColors[Math.floor(Math.random() * availableColors.length)];
      let inkColor: typeof availableColors[0];
      do {
        inkColor = availableColors[Math.floor(Math.random() * availableColors.length)];
      } while (inkColor.name === wordColor.name);
      stimuli.push({ word: wordColor.name, color: inkColor.hex, congruent: false });
    }

    if (settings.randomizeOrder) {
      return stimuli.sort(() => Math.random() - 0.5);
    }
    return stimuli;
  }, [settings.trials, settings.congruentRatio, settings.randomizeOrder, availableColors]);

  const [allStimuli] = useState(generateStimuli);

  const generatePracticeStimuli = useCallback(() => {
    const stimuli: { word: string; color: string; congruent: boolean }[] = [];
    for (let i = 0; i < settings.practiceTrials; i++) {
      const wordColor = availableColors[Math.floor(Math.random() * availableColors.length)];
      let inkColor: typeof availableColors[0];
      do {
        inkColor = availableColors[Math.floor(Math.random() * availableColors.length)];
      } while (inkColor.name === wordColor.name);
      stimuli.push({ word: wordColor.name, color: inkColor.hex, congruent: false });
    }
    return stimuli;
  }, [settings.practiceTrials, availableColors]);

  const [practiceStimuli] = useState(generatePracticeStimuli);

  useEffect(() => {
    if ((phase === 'experiment' || phase === 'practice') && currentStimulus && !isWaiting) {
      setTrialStartTime(performance.now());
    }
  }, [phase, trialIndex, currentStimulus, isWaiting]);

  useEffect(() => {
    if (phase === 'instruction') {
      setExperimentStartTime(performance.now());
    }
  }, [phase]);

  useEffect(() => {
    if (settings.responseTimeLimit > 0 && phase === 'experiment' && currentStimulus && !isWaiting) {
      const timer = setTimeout(() => {
        handleResponse('timeout');
      }, settings.responseTimeLimit);
      return () => clearTimeout(timer);
    }
  }, [phase, currentStimulus, isWaiting, settings.responseTimeLimit]);

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

  const handleResponse = (selectedColor: string) => {
    if (!currentStimulus || isWaiting) return;

    const endTime = performance.now();
    const responseTime = Math.round(endTime - trialStartTime);

    const correctColorName = Object.keys(COLOR_MAP).find(
      key => COLOR_MAP[key].hex === currentStimulus.color
    ) || '';
    const isCorrect = selectedColor === correctColorName;

    if (phase === 'practice') {
      if (settings.showFeedback) {
        setLastCorrect(isCorrect);
        setShowFeedback(true);
        setTimeout(() => {
          setShowFeedback(false);
          scheduleNextTrial();
        }, 500);
      } else {
        scheduleNextTrial();
      }
      return;
    }

    const trial: TrialData = {
      trialNumber: trialIndex + 1,
      responseTimeMs: responseTime === 0 && selectedColor === 'timeout'
        ? settings.responseTimeLimit
        : responseTime,
      answer: selectedColor === 'timeout' ? 'timeout' : selectedColor,
      correctAnswer: correctColorName,
      stimulus: { ...currentStimulus, correctAnswer: correctColorName },
    };

    setTrialData(prev => [...prev, trial]);

    if (settings.showFeedback) {
      setLastCorrect(isCorrect);
      setShowFeedback(true);
      setTimeout(() => {
        setShowFeedback(false);
        scheduleNextTrial();
      }, 500);
    } else {
      scheduleNextTrial();
    }
  };

  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    if (phase !== 'experiment' && phase !== 'practice') return;
    if (!currentStimulus || isWaiting) return;
    if (settings.inputMethod !== 'keyboard') return;

    const keyMap: Record<string, string> = {
      'r': 'red', 'g': 'green', 'b': 'blue', 'y': 'yellow',
      'p': 'purple', 'o': 'orange',
      'R': 'red', 'G': 'green', 'B': 'blue', 'Y': 'yellow',
      'P': 'purple', 'O': 'orange',
    };

    if (keyMap[e.key]) {
      handleResponse(keyMap[e.key]);
    }
  }, [phase, currentStimulus, isWaiting, settings.inputMethod]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

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

    const congruentTrials = finalTrialData.filter(t => (t.stimulus as { congruent?: boolean })?.congruent);
    const incongruentTrials = finalTrialData.filter(t => !(t.stimulus as { congruent?: boolean })?.congruent);
    const congruentRT = congruentTrials.length > 0
      ? congruentTrials.reduce((s, t) => s + t.responseTimeMs, 0) / congruentTrials.length
      : 0;
    const incongruentRT = incongruentTrials.length > 0
      ? incongruentTrials.reduce((s, t) => s + t.responseTimeMs, 0) / incongruentTrials.length
      : 0;
    const interference = incongruentRT - congruentRT;

    const results: ExperimentResults = {
      experimentName: experiment.id,
      participantId,
      roomId,
      language,
      timestamp: new Date().toISOString(),
      totalTrials: trialData.length,
      responseTimeMs: totalTime,
      accuracy,
      answer: interference,
      correctAnswer: 'interference_score',
      trialData: finalTrialData,
      debrief: t(experiment.debriefKey),
    };

    onComplete(results);
  };

  if (phase === 'instruction') {
    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="max-w-2xl mx-auto p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
          <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-emerald-600 mb-4">{t('exp.stroop.name')}</h2>
          <div className="bg-slate-50 border-l-4 border-teal-500 p-5 rounded-r-lg mb-6">
            <p className="text-slate-700 leading-relaxed text-lg">
              {settings.customInstructions || t('exp.stroop.instruction')}
            </p>
          </div>

          <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-5 mb-8">
            <p className="text-sm font-semibold text-indigo-900 mb-3">{t('exp.stroop.keys')}</p>
            <div className="flex flex-wrap gap-4">
              {availableColors.map(c => (
                <div key={c.name} className="flex items-center gap-3 bg-white px-3 py-2 rounded-lg shadow-sm border border-slate-100">
                  <div className="w-6 h-6 rounded-full shadow-inner" style={{ backgroundColor: c.hex }} />
                  <span className="font-mono text-slate-600 font-bold uppercase">{c.name[0]}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium text-slate-400 mb-8 bg-slate-50 py-3 px-4 rounded-lg">
            <span className="flex items-center gap-1"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>{settings.trials} trials</span>
            <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
            <span className="flex items-center gap-1"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>{settings.practiceTrials} practice</span>
            <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
            <span className="flex items-center gap-1"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>ISI: {settings.isi}ms</span>
          </div>

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
    const correctCount = trialData.filter(t => t.answer === t.correctAnswer).length;
    const congruentTrials = trialData.filter(t => (t.stimulus as { congruent?: boolean })?.congruent);
    const incongruentTrials = trialData.filter(t => !(t.stimulus as { congruent?: boolean })?.congruent);
    const congruentRT = congruentTrials.reduce((s, t) => s + t.responseTimeMs, 0) / congruentTrials.length;
    const incongruentRT = incongruentTrials.reduce((s, t) => s + t.responseTimeMs, 0) / incongruentTrials.length;
    const interference = incongruentRT - congruentRT;

    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="max-w-2xl mx-auto p-6">
          <h2 className="text-2xl font-bold text-navy-900 mb-4">{t('common.debrief.title')}</h2>

          <div className="bg-teal-50 border-l-4 border-teal-500 p-4 mb-4">
            <p className="text-teal-800 font-medium">{t('common.debrief.thankYou')}</p>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-navy-900">{correctCount}/{trialData.length}</p>
              <p className="text-sm text-gray-600">{t('common.correct')}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-navy-900">{Math.round(congruentRT)}ms</p>
              <p className="text-sm text-gray-600">{t('exp.stroop.congruent')} RT</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-navy-900">{Math.round(incongruentRT)}ms</p>
              <p className="text-sm text-gray-600">{t('exp.stroop.incongruent')} RT</p>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg mb-4">
            <p className="text-amber-800 font-medium">{t('exp.stroop.interference')}: {Math.round(interference)}ms</p>
            <p className="text-sm text-amber-700">{t('exp.stroop.interpretation')}</p>
          </div>

          <p className="text-gray-600 mb-4">{t('exp.stroop.debrief')}</p>
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

        <div className="flex justify-center items-center min-h-[200px] mb-8">
          {currentStimulusData && (
            <span
              className="font-bold"
              style={{
                color: currentStimulusData.color,
                fontSize: `${settings.fontSize}px`,
              }}
            >
              {currentStimulusData.word.toUpperCase()}
            </span>
          )}
        </div>

        <p className="text-center text-gray-600 mb-4">{t('exp.stroop.selectColor')}</p>

        {settings.inputMethod === 'click' ? (
          <div className="flex justify-center gap-3">
            {availableColors.map((color) => (
              <button
                key={color.name}
                onClick={() => handleResponse(color.name)}
                disabled={isWaiting}
                className="w-20 h-20 rounded-lg border-2 border-gray-200 hover:border-teal-500 hover:bg-teal-50 transition-all flex flex-col items-center justify-center gap-1 disabled:opacity-50"
                style={{ backgroundColor: color.hex + '15' }}
              >
                <span className="text-lg font-semibold capitalize" style={{ color: color.hex }}>
                  {color.name}
                </span>
                <span className="text-xs text-gray-400 uppercase">{color.name[0]}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex justify-center gap-3">
            {availableColors.map((color) => (
              <button
                key={color.name}
                onClick={() => handleResponse(color.name)}
                disabled={isWaiting}
                className="w-20 h-20 rounded-lg border-2 border-gray-200 hover:border-teal-500 hover:bg-teal-50 transition-all flex flex-col items-center justify-center gap-1 disabled:opacity-50"
                style={{ backgroundColor: color.hex + '15' }}
              >
                <span className="text-lg font-semibold capitalize" style={{ color: color.hex }}>
                  {color.name}
                </span>
                <span className="text-xs text-gray-400 uppercase">{color.name[0]}</span>
              </button>
            ))}
          </div>
        )}

        <p className="text-center text-xs text-gray-400 mt-4">
          {settings.inputMethod === 'keyboard' ? t('exp.stroop.keyboard') : ''}
        </p>
      </div>
    </ExperimentWrapper>
  );
}

export default StroopExperiment;
