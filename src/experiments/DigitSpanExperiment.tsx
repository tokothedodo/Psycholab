import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import type { Experiment } from '../data/experiments';
import type { TrialData } from '../components/experiments/ExperimentWrapper';

interface DigitSpanProps {
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

const TRIALS = [
  [3, 7, 2],
  [5, 1, 4],
  [6, 9, 2, 8],
  [4, 2, 7, 5],
  [1, 8, 3, 6, 9],
  [5, 2, 9, 1, 7, 4],
  [3, 6, 8, 2, 5, 7, 1],
  [9, 4, 2, 7, 1, 5, 8, 3],
];

export function DigitSpanExperiment({ experiment, onComplete, participantId, roomId }: DigitSpanProps) {
  const { t, language } = useLanguage();
  const [phase, setPhase] = useState<'instruction' | 'showing' | 'input' | 'feedback' | 'complete'>('instruction');
  const [trialIndex, setTrialIndex] = useState(0);
  const [sequence, setSequence] = useState<number[]>([]);
  const [userInput, setUserInput] = useState('');
  const [startTime, setStartTime] = useState(0);
  const [experimentStartTime, setExperimentStartTime] = useState(0);
  const [trialData, setTrialData] = useState<TrialData[]>([]);
  const [correctCount, setCorrectCount] = useState(0);
  const [showTimeout, setShowTimeout] = useState<number | null>(null);

  const showNextSequence = useCallback(() => {
    if (trialIndex >= TRIALS.length) {
      completeExperiment();
      return;
    }

    setSequence(TRIALS[trialIndex]);
    setPhase('showing');
    
    const timeout = window.setTimeout(() => {
      setPhase('input');
      setStartTime(performance.now());
    }, 1000 * (trialIndex + 1));
    
    setShowTimeout(timeout);
  }, [trialIndex]);

  useEffect(() => {
    if (phase === 'instruction') {
      setExperimentStartTime(performance.now());
    }
  }, [phase]);

  const handleSubmit = () => {
    if (!sequence.length) return;

    const endTime = performance.now();
    const responseTime = Math.round(endTime - startTime);
    const isCorrect = userInput === sequence.join('');
    
    if (isCorrect) setCorrectCount(prev => prev + 1);

    const trial: TrialData = {
      trialNumber: trialIndex + 1,
      responseTimeMs: responseTime,
      answer: userInput,
      correctAnswer: sequence.join(''),
      stimulus: { shown: sequence.join('') },
    };

    setTrialData(prev => [...prev, trial]);
    setPhase('feedback');

    setTimeout(() => {
      setUserInput('');
      setTrialIndex(prev => prev + 1);
      showNextSequence();
    }, 1000);
  };

  const completeExperiment = () => {
    setPhase('complete');
    const endTime = performance.now();
    const totalTime = Math.round(endTime - experimentStartTime);
    const maxSpan = Math.max(...TRIALS.slice(0, trialIndex).map(t => t.length));

    onComplete({
      experimentName: experiment.id,
      participantId,
      roomId,
      language,
      timestamp: new Date().toISOString(),
      totalTrials: TRIALS.length,
      responseTimeMs: totalTime,
      accuracy: (correctCount / TRIALS.length) * 100,
      answer: maxSpan,
      correctAnswer: 'forward_span',
      trialData,
    });
  };

  useEffect(() => {
    return () => {
      if (showTimeout) clearTimeout(showTimeout);
    };
  }, [showTimeout]);

  if (phase === 'instruction') {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <h2 className="text-2xl font-bold text-navy-900 mb-4">{t('exp.digitSpan.name')}</h2>
        <p className="text-gray-600 mb-6">{t('exp.digitSpan.instruction')}</p>
        <p className="text-sm text-gray-500 mb-4">{t('citation')}: {experiment.citation}, {experiment.year}</p>
        <button
          onClick={showNextSequence}
          className="bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 transition-colors"
        >
          {t('common.start')}
        </button>
      </div>
    );
  }

  if (phase === 'showing') {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="text-center mb-4 text-gray-500">
          {t('exp.digitSpan.trial')} {trialIndex + 1} / {TRIALS.length}
        </div>
        <div className="flex justify-center items-center min-h-[200px]">
          <span className="text-7xl font-bold text-navy-900 tracking-widest">
            {sequence.join(' ')}
          </span>
        </div>
      </div>
    );
  }

  if (phase === 'feedback') {
    const isCorrect = userInput === sequence.join('');
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="text-center">
          <div className={`text-6xl font-bold mb-4 ${isCorrect ? 'text-teal-600' : 'text-red-600'}`}>
            {isCorrect ? '✓' : '✗'}
          </div>
          {!isCorrect && (
            <p className="text-xl text-gray-600">
              {t('exp.digitSpan.was')}: <span className="font-mono">{sequence.join('')}</span>
            </p>
          )}
        </div>
      </div>
    );
  }

  if (phase === 'complete') {
    const maxSpan = Math.max(...TRIALS.map(t => t.length));
    
    return (
      <div className="max-w-2xl mx-auto p-6">
        <h2 className="text-2xl font-bold text-navy-900 mb-4">{t('common.debrief.title')}</h2>
        
        <div className="bg-teal-50 border-l-4 border-teal-500 p-4 mb-4">
          <p className="text-teal-800 font-medium">{t('common.debrief.thankYou')}</p>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg mb-4">
          <p className="text-lg text-center">
            {correctCount} / {TRIALS.length} {t('common.correct')}
          </p>
          <p className="text-sm text-gray-600 text-center mt-2">
            {t('exp.digitSpan.maxSpan')}: {maxSpan}
          </p>
        </div>

        <p className="text-gray-600 mb-4">{t('exp.digitSpan.debrief')}</p>
        <p className="text-sm text-gray-500 mb-4">{t('citation')}: {experiment.citation}, {experiment.year}</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="text-center mb-4 text-gray-500">
        {t('exp.digitSpan.trial')} {trialIndex + 1} / {TRIALS.length}
      </div>

      <p className="text-center text-gray-600 mb-6">{t('exp.digitSpan.enter')}</p>

      <div className="flex justify-center mb-6">
        <input
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value.replace(/[^0-9]/g, ''))}
          className="w-48 p-4 border-2 border-gray-200 rounded-lg text-center text-2xl tracking-widest focus:border-teal-500 focus:outline-none"
          placeholder="123"
          maxLength={sequence.length}
          autoFocus
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        />
      </div>

      <div className="text-center">
        <button
          onClick={handleSubmit}
          disabled={userInput.length !== sequence.length}
          className="bg-teal-600 text-white px-8 py-3 rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t('common.submit')}
        </button>
      </div>
    </div>
  );
}
