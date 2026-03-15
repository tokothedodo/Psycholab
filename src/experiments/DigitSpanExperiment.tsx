import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import type { Experiment } from '../data/experiments';
import type { TrialData } from './ExperimentWrapper';

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
      <div className="max-w-2xl mx-auto p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
        <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-emerald-600 mb-4">{t('exp.digitSpan.name')}</h2>
        <div className="bg-slate-50 border-l-4 border-teal-500 p-5 rounded-r-lg mb-6">
          <p className="text-slate-700 leading-relaxed text-lg">{t('exp.digitSpan.instruction')}</p>
        </div>
        <p className="text-sm font-medium text-slate-400 mb-8 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
          {t('citation')}: {experiment.citation}, {experiment.year}
        </p>
        <button
          onClick={showNextSequence}
          className="group w-full sm:w-auto bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-semibold flex tracking-wide items-center justify-center gap-3 px-8 py-4 rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
        >
          {t('common.start')}
          <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
        </button>
      </div>
    );
  }

  if (phase === 'showing') {
    return (
      <div className="max-w-2xl mx-auto p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 min-h-[400px] flex flex-col items-center justify-center">
        <div className="absolute top-8 inline-flex items-center justify-center px-4 py-1.5 bg-teal-50 text-teal-700 font-medium rounded-full text-sm shadow-sm border border-teal-100">
          {t('exp.digitSpan.trial')} {trialIndex + 1} / {TRIALS.length}
        </div>
        <div className="flex justify-center items-center w-full">
          <span className="text-7xl md:text-8xl font-black text-slate-800 tracking-[0.25em] ml-[0.25em] drop-shadow-sm transition-all animate-pulse">
            {sequence.join(' ')}
          </span>
        </div>
      </div>
    );
  }

  if (phase === 'feedback') {
    const isCorrect = userInput === sequence.join('');
    return (
      <div className="max-w-2xl mx-auto p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 min-h-[400px] flex flex-col items-center justify-center">
        <div className="text-center transform transition-all animate-bounce">
          <div className={`text-8xl md:text-9xl font-bold drop-shadow-sm mb-6 ${isCorrect ? 'text-emerald-500' : 'text-rose-500'}`}>
            {isCorrect ? '✓' : '✗'}
          </div>
          {!isCorrect && (
            <p className="text-2xl text-slate-600 font-medium">
              {t('exp.digitSpan.was')}: <span className="font-mono font-bold text-slate-800 ml-2 tracking-widest">{sequence.join(' ')}</span>
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
    <div className="max-w-2xl mx-auto p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 min-h-[400px] flex flex-col relative">
      <div className="absolute top-8 left-1/2 -translate-x-1/2 inline-flex items-center justify-center px-4 py-1.5 bg-teal-50 text-teal-700 font-medium rounded-full text-sm shadow-sm border border-teal-100">
        {t('exp.digitSpan.trial')} {trialIndex + 1} / {TRIALS.length}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center mt-12 w-full">
        <p className="text-center text-slate-500 font-medium text-lg mb-8">{t('exp.digitSpan.enter')}</p>

        <div className="flex justify-center mb-8 w-full max-w-sm">
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value.replace(/[^0-9]/g, ''))}
            className="w-full p-6 bg-slate-50 border-2 border-slate-200 rounded-xl text-center text-4xl font-mono font-bold tracking-[0.2em] text-slate-800 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/20 focus:bg-white transition-all outline-none shadow-inner"
            placeholder="• • •"
            maxLength={sequence.length}
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && userInput.length === sequence.length && handleSubmit()}
          />
        </div>

        <div className="text-center">
          <button
            onClick={handleSubmit}
            disabled={userInput.length !== sequence.length}
            className="group bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-bold text-lg px-12 py-4 rounded-xl shadow-[0_4px_14px_0_rgba(20,184,166,0.39)] hover:shadow-[0_6px_20px_rgba(20,184,166,0.23)] hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-[0_4px_14px_0_rgba(20,184,166,0.39)] disabled:cursor-not-allowed flex items-center gap-2"
          >
            {t('common.submit')}
            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
          </button>
        </div>
      </div>
    </div>
  );
}
