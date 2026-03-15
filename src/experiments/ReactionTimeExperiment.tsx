import { useState, useEffect, useCallback, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import type { Experiment } from '../data/experiments';
import type { TrialData } from '../components/experiments/ExperimentWrapper';

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
      <div className="max-w-2xl mx-auto p-6">
        <h2 className="text-2xl font-bold text-navy-900 mb-4">{t('exp.reactionTime.name')}</h2>
        <div className="space-y-4 mb-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">{t('exp.reactionTime.simple')}</h3>
            <p className="text-gray-600 text-sm">{t('exp.reactionTime.simpleDesc')}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">{t('exp.reactionTime.choice')}</h3>
            <p className="text-gray-600 text-sm">{t('exp.reactionTime.choiceDesc')}</p>
            <p className="text-xs text-gray-500 mt-2">{t('exp.reactionTime.keys')}</p>
          </div>
        </div>
        <p className="text-sm text-gray-500 mb-4">{t('citation')}: {experiment.citation}, {experiment.year}</p>
        <button
          onClick={() => setPhase('simple')}
          className="bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 transition-colors"
        >
          {t('common.start')}
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
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <span className="text-gray-500">
          {currentTest === 'simple' ? t('exp.reactionTime.simple') : t('exp.reactionTime.choice')}
          {' '}{trialIndex + 1} / {totalTrials}
        </span>
      </div>

      <div className="flex justify-center items-center min-h-[300px]">
        {waiting && (
          <p className="text-gray-400 text-lg">{t('exp.reactionTime.wait')}</p>
        )}
        {showStimulus && stimulus && (
          <span className="text-8xl text-navy-900">{stimulus}</span>
        )}
      </div>

      {currentTest === 'choice' && (
        <div className="flex justify-center gap-4 mt-8">
          {STIMULI.map((s) => (
            <button
              key={s}
              onClick={() => handleResponse(s)}
              disabled={!showStimulus}
              className="w-16 h-16 bg-gray-100 rounded-lg hover:bg-teal-50 transition-colors text-2xl disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
