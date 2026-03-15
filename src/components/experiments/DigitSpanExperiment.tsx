import { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';

interface ExperimentProps {
  onComplete: (result: {
    experiment_name: string;
    response_time_ms: number;
    answer: string | number;
    correct_answer: string | number;
  }) => void;
}

const CITATION = 'Miller, G.A. (1956)';

type Phase = 'instruction' | 'showing' | 'input' | 'feedback' | 'debrief';

export function DigitSpanExperiment({ onComplete }: ExperimentProps) {
  const { t } = useLanguage();
  const [phase, setPhase] = useState<Phase>('instruction');
  const [sequence, setSequence] = useState<number[]>([]);
  const [userInput, setUserInput] = useState('');
  const [trial, setTrial] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [showTimeout, setShowTimeout] = useState<number | null>(null);

  const trials = [
    [3, 7, 2],
    [5, 1, 4, 8],
    [2, 9, 6, 3, 1],
    [4, 7, 2, 5, 8, 3],
    [1, 5, 9, 2, 6, 4, 7],
  ];

  const handleStart = () => {
    setPhase('showing');
    setTrial(0);
    setCorrect(0);
    showSequence(0);
  };

  const showSequence = (trialIndex: number) => {
    if (trialIndex >= trials.length) {
      setPhase('debrief');
      const avgTime = 0;
      onComplete({
        experiment_name: 'digit-span',
        response_time_ms: avgTime,
        answer: correct,
        correct_answer: trials.length,
      });
      return;
    }

    setSequence(trials[trialIndex]);
    setShowTimeout(window.setTimeout(() => {
      setPhase('input');
      setStartTime(performance.now());
    }, 1500));
  };

  const handleSubmit = () => {
    const endTime = performance.now();
    Math.round(endTime - startTime); // Response time calculated but not stored for this simple version
    
    const isCorrect = userInput === sequence.join('');
    if (isCorrect) {
      setCorrect(prev => prev + 1);
    }

    setPhase('feedback');
    
    setTimeout(() => {
      setUserInput('');
      const nextTrial = trial + 1;
      setTrial(nextTrial);
      setPhase('showing');
      showSequence(nextTrial);
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (showTimeout) {
        clearTimeout(showTimeout);
      }
    };
  }, [showTimeout]);

  if (phase === 'instruction') {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <h2 className="text-2xl font-bold text-navy-900 mb-4">{t('experiment.digitSpan.title')}</h2>
        <p className="text-gray-600 mb-6">{t('experiment.digitSpan.instruction')}</p>
        <p className="text-sm text-gray-500 mb-6">{t('citation')}: {CITATION}</p>
        <button
          onClick={handleStart}
          className="bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 transition-colors"
        >
          {t('experiment.digitSpan.start')}
        </button>
      </div>
    );
  }

  if (phase === 'debrief') {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <h2 className="text-2xl font-bold text-navy-900 mb-4">{t('common.debrief.title')}</h2>
        <div className="bg-teal-50 p-4 rounded-lg mb-4">
          <p className="text-xl font-semibold text-teal-800">
            {correct} / {trials.length} {t('common.correct')}
          </p>
        </div>
        <p className="text-gray-600 mb-6">{t('experiment.digitSpan.debrief')}</p>
        <p className="text-sm text-gray-500 mb-4">{t('citation')}: {CITATION}</p>
        <div className="bg-teal-50 border-l-4 border-teal-500 p-4">
          <p className="text-teal-800 font-medium">{t('common.debrief.thankYou')}</p>
        </div>
      </div>
    );
  }

  if (phase === 'showing') {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="text-center mb-4 text-gray-500">
          {trial + 1} / {trials.length}
        </div>
        <div className="flex justify-center items-center min-h-[200px]">
          <span className="text-6xl font-bold text-navy-900 tracking-widest">
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
          <div className={`text-4xl font-bold mb-4 ${isCorrect ? 'text-teal-600' : 'text-red-600'}`}>
            {isCorrect ? '✓' : '✗'}
          </div>
          <p className="text-gray-600">
            {isCorrect ? t('common.correct') : t('common.incorrect')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="text-center mb-4 text-gray-500">
        {trial + 1} / {trials.length}
      </div>

      <p className="text-center text-gray-600 mb-6">{t('experiment.digitSpan.enter')}</p>

      <div className="flex justify-center mb-6">
        <input
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value.replace(/[^0-9]/g, ''))}
          className="w-48 p-4 border-2 border-gray-200 rounded-lg text-center text-2xl tracking-widest focus:border-teal-500 focus:outline-none"
          placeholder="123"
          maxLength={7}
          autoFocus
        />
      </div>

      <div className="text-center">
        <button
          onClick={handleSubmit}
          disabled={!userInput || userInput.length !== sequence.length}
          className="bg-teal-600 text-white px-8 py-3 rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t('common.submit')}
        </button>
      </div>
    </div>
  );
}
