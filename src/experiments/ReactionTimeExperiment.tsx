import { useState, useEffect, useCallback, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import type { Experiment } from '../data/experiments';
import type { TrialData } from './ExperimentWrapper';

interface ReactionTimeProps {
  experiment: Experiment;
  onComplete: (results: {
    experimentName: string;
    participantId: string;
    roomId: string;
    language: string;
    timestamp: string;
    totalTrials: number;
    responseTimeMs: number;
    accuracy: number;
    answer: string | number | boolean;
    correctAnswer: string | number | boolean;
    trialData: TrialData[];
  }) => void;
  participantId: string;
  roomId: string;
}

type TestType = 'simple' | 'choice';

const SIMPLE_TRIALS = 40;
const CHOICE_TRIALS = 40;
const STIMULI = ['▲', '●', '■'];

export function ReactionTimeExperiment({ experiment, onComplete, participantId, roomId }: ReactionTimeProps) {
  const { t, language } = useLanguage();
  const [phase, setPhase] = useState<'instruction' | 'simple' | 'choice' | 'complete'>('instruction');
  const [currentTest, setCurrentTest] = useState<TestType>('simple');
  const [trialIndex, setTrialIndex] = useState(0);
  const [stimulus, setStimulus] = useState<string | null>(null);
  const [showStimulus, setShowStimulus] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [experimentStartTime, setExperimentStartTime] = useState(0);
  const [trialData, setTrialData] = useState<TrialData[]>([]);
  const [results, setResults] = useState<{ simple: number[]; choice: number[] }>({ simple: [], choice: [] });
  const timeoutRef = useRef<number | null>(null);

  const getRandomDelay = () => 1000 + Math.random() * 2000;

  const startTrial = useCallback(() => {
    setWaiting(true);
    const delay = getRandomDelay();

    timeoutRef.current = window.setTimeout(() => {
      setWaiting(false);
      setShowStimulus(true);
      setStartTime(performance.now());

      if (currentTest === 'simple') {
        setStimulus('●');
      } else {
        setStimulus(STIMULI[Math.floor(Math.random() * STIMULI.length)]);
      }
    }, delay);
  }, [currentTest]);

  useEffect(() => {
    if (phase === 'simple' || phase === 'choice') {
      setExperimentStartTime(performance.now());
      startTrial();
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [phase]);

  useEffect(() => {
    if (phase === 'simple' && trialIndex > 0) {
      startTrial();
    }
  }, [trialIndex, phase]);

  useEffect(() => {
    if (phase === 'choice' && trialIndex > 0 && trialIndex < CHOICE_TRIALS) {
      startTrial();
    }
  }, [trialIndex, phase]);

  const handleResponse = (response: string) => {
    if (!showStimulus || !stimulus) return;

    const endTime = performance.now();
    const responseTime = Math.round(endTime - startTime);

    if (currentTest === 'choice') {
      // In choice RT, we track correctness via stimulus comparison
    }

    const trial: TrialData = {
      trialNumber: trialIndex + 1,
      responseTimeMs: responseTime,
      answer: response,
      correctAnswer: stimulus,
      stimulus,
    };

    setTrialData(prev => [...prev, trial]);
    setResults(prev => ({
      ...prev,
      [currentTest]: [...prev[currentTest], responseTime],
    }));

    setShowStimulus(false);
    setStimulus(null);

    const totalTrials = currentTest === 'simple' ? SIMPLE_TRIALS : CHOICE_TRIALS;

    if (trialIndex < totalTrials - 1) {
      setTrialIndex(prev => prev + 1);
    } else if (currentTest === 'simple') {
      setCurrentTest('choice');
      setTrialIndex(0);
      setTimeout(() => startTrial(), 1000);
    } else {
      completeExperiment();
    }
  };

  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    if (!showStimulus) return;

    if (currentTest === 'simple') {
      if (e.key === ' ' || e.key === 'Enter') {
        handleResponse('any');
      }
    } else {
      const keyMap: Record<string, string> = {
        '1': '▲', '2': '●', '3': '■',
        'ArrowLeft': '▲', 'ArrowDown': '●', 'ArrowRight': '■',
      };
      if (keyMap[e.key]) {
        handleResponse(keyMap[e.key]);
      }
    }
  }, [showStimulus, currentTest, stimulus]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  const completeExperiment = () => {
    setPhase('complete');
    const endTime = performance.now();
    const totalTime = Math.round(endTime - experimentStartTime);

    const cleanSimple = removeOutliers(results.simple);
    const cleanChoice = removeOutliers(results.choice);
    const simpleMean = cleanSimple.reduce((a, b) => a + b, 0) / cleanSimple.length;
    const choiceMean = cleanChoice.reduce((a, b) => a + b, 0) / cleanChoice.length;

    onComplete({
      experimentName: experiment.id,
      participantId,
      roomId,
      language,
      timestamp: new Date().toISOString(),
      totalTrials: SIMPLE_TRIALS + CHOICE_TRIALS,
      responseTimeMs: totalTime,
      accuracy: 100,
      answer: choiceMean - simpleMean,
      correctAnswer: 'choice_minus_simple',
      trialData,
    });
  };

  const removeOutliers = (arr: number[]): number[] => {
    if (arr.length < 3) return arr;
    const sorted = [...arr].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1;
    const lower = q1 - 2 * iqr;
    const upper = q3 + 2 * iqr;
    return arr.filter(x => x >= lower && x <= upper);
  };

  if (phase === 'instruction') {
    return (
      <div className="max-w-2xl mx-auto p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
        <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-emerald-600 mb-6">{t('exp.reactionTime.name')}</h2>

        <div className="space-y-6 mb-8">
          <div className="bg-slate-50 border-l-4 border-teal-500 p-5 rounded-r-lg shadow-sm">
            <h3 className="font-bold text-slate-800 text-lg mb-2">{t('exp.reactionTime.simple')}</h3>
            <p className="text-slate-600 leading-relaxed text-md">{t('exp.reactionTime.simpleDesc')}</p>
          </div>
          <div className="bg-slate-50 border-l-4 border-purple-500 p-5 rounded-r-lg shadow-sm">
            <h3 className="font-bold text-slate-800 text-lg mb-2">{t('exp.reactionTime.choice')}</h3>
            <p className="text-slate-600 leading-relaxed text-md mb-3">{t('exp.reactionTime.choiceDesc')}</p>
            <div className="bg-white px-4 py-2 rounded-md border border-slate-100 shadow-sm inline-block">
              <p className="text-xs font-semibold text-slate-500 tracking-wide uppercase">{t('exp.reactionTime.keys')}</p>
            </div>
          </div>
        </div>

        <p className="text-sm font-medium text-slate-400 mb-8 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
          {t('citation')}: {experiment.citation}, {experiment.year}
        </p>

        <button
          onClick={() => setPhase('simple')}
          className="group relative w-full sm:w-auto bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-semibold flex tracking-wide items-center justify-center gap-3 px-8 py-4 rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
        >
          {t('common.start')}
          <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
        </button>
      </div>
    );
  }

  if (phase === 'complete') {
    const cleanSimple = removeOutliers(results.simple);
    const cleanChoice = removeOutliers(results.choice);
    const simpleMean = cleanSimple.reduce((a, b) => a + b, 0) / cleanSimple.length;
    const simpleSD = Math.sqrt(cleanSimple.reduce((s, x) => s + Math.pow(x - simpleMean, 2), 0) / cleanSimple.length);
    const choiceMean = cleanChoice.reduce((a, b) => a + b, 0) / cleanChoice.length;
    const choiceSD = Math.sqrt(cleanChoice.reduce((s, x) => s + Math.pow(x - choiceMean, 2), 0) / cleanChoice.length);

    return (
      <div className="max-w-2xl mx-auto p-6">
        <h2 className="text-2xl font-bold text-navy-900 mb-4">{t('common.debrief.title')}</h2>

        <div className="bg-teal-50 border-l-4 border-teal-500 p-4 mb-4">
          <p className="text-teal-800 font-medium">{t('common.debrief.thankYou')}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-50 p-4 rounded-lg text-center">
            <p className="text-3xl font-bold text-navy-900">{Math.round(simpleMean)}ms</p>
            <p className="text-sm text-gray-600">{t('exp.reactionTime.simple')} ±{Math.round(simpleSD)}ms</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg text-center">
            <p className="text-3xl font-bold text-navy-900">{Math.round(choiceMean)}ms</p>
            <p className="text-sm text-gray-600">{t('exp.reactionTime.choice')} ±{Math.round(choiceSD)}ms</p>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg mb-4">
          <p className="text-amber-800 font-medium">
            {t('exp.reactionTime.decision')}: {Math.round(choiceMean - simpleMean)}ms
          </p>
        </div>

        <p className="text-gray-600 mb-4">{t('exp.reactionTime.debrief')}</p>
        <p className="text-sm text-gray-500 mb-4">{t('citation')}: {experiment.citation}, {experiment.year}</p>
      </div>
    );
  }

  const totalTrials = currentTest === 'simple' ? SIMPLE_TRIALS : CHOICE_TRIALS;

  return (
    <div className="max-w-3xl mx-auto p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 min-h-[500px] flex flex-col relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-white -z-10"></div>

      <div className="flex justify-between items-center mb-10 w-full px-4 pt-4">
        <div className="inline-flex items-center justify-center px-4 py-1.5 bg-teal-50 text-teal-700 font-medium rounded-full text-sm shadow-sm border border-teal-100 backdrop-blur-sm">
          {currentTest === 'simple' ? t('exp.reactionTime.simple') : t('exp.reactionTime.choice')}
          <span className="mx-2 opacity-50">|</span>
          {trialIndex + 1} / {totalTrials}
        </div>

        {currentTest === 'choice' && (
          <div className="inline-flex items-center px-3 py-1 bg-purple-50 text-purple-700 font-semibold rounded-full text-xs shadow-sm border border-purple-100 animate-pulse">
            Press 1, 2, or 3
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center w-full min-h-[300px] relative rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50">
        {waiting && (
          <p className="text-slate-400 text-xl font-medium tracking-wide animate-pulse">{t('exp.reactionTime.wait')}</p>
        )}
        {showStimulus && stimulus && (
          <div className="transform transition-all animate-bounce-short">
            <span className="text-[10rem] leading-none text-slate-800 drop-shadow-xl select-none" style={{ textShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
              {stimulus}
            </span>
          </div>
        )}
      </div>

      {currentTest === 'choice' && (
        <div className="flex justify-center gap-6 mt-10">
          {STIMULI.map((s, index) => (
            <button
              key={s}
              onClick={() => handleResponse(s)}
              disabled={!showStimulus}
              className="group relative w-20 h-20 bg-white rounded-2xl shadow-sm border-2 border-transparent hover:border-purple-200 hover:shadow-xl hover:-translate-y-1 hover:bg-purple-50 transition-all duration-300 flex flex-col items-center justify-center disabled:opacity-50 disabled:hover:translate-y-0 text-3xl text-slate-700 disabled:cursor-not-allowed overflow-hidden"
            >
              <span className="z-10">{s}</span>
              <span className="absolute bottom-1 right-2 text-xs font-bold text-slate-300 uppercase z-10 group-hover:text-purple-300 transition-colors">Key {index + 1}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
