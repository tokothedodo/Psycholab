import { useState, useEffect, useCallback, useRef } from 'react';
import type { Experiment } from '../data/experiments';
import type { ExperimentResults } from './ExperimentWrapper';

interface DigitSpanProps {
  experiment: Experiment;
  onComplete: (results: ExperimentResults) => void;
  participantId: string;
  roomId: string;
}

export function DigitSpanExperiment({ experiment, onComplete, participantId, roomId }: DigitSpanProps) {
  const [phase, setPhase] = useState<'instruction' | 'presentation' | 'recall' | 'debrief'>('instruction');
  const [level, setLevel] = useState(3);
  const [sequence, setSequence] = useState<number[]>([]);
  const [presentationIndex, setPresentationIndex] = useState(0);
  const [input, setInput] = useState<number[]>([]);
  const [errors, setErrors] = useState(0);
  const [maxLevel, setMaxLevel] = useState(3);
  const timeoutRef = useRef<any>(null);

  const startTrial = useCallback(() => {
    const newSequence = Array.from({ length: level }, () => Math.floor(Math.random() * 10));
    setSequence(newSequence);
    setPresentationIndex(0);
    setPhase('presentation');
  }, [level]);

  useEffect(() => {
    if (phase === 'presentation') {
      if (presentationIndex < sequence.length) {
        timeoutRef.current = setTimeout(() => {
          setPresentationIndex(prev => prev + 1);
        }, 1000);
      } else {
        timeoutRef.current = setTimeout(() => {
          setPhase('recall');
          setInput([]);
        }, 500);
      }
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [phase, presentationIndex, sequence]);

  const handleInput = useCallback((digit: number) => {
    if (phase !== 'recall') return;
    const newInput = [...input, digit];
    setInput(newInput);

    // Auto-submit when length matches
    if (newInput.length === sequence.length) {
      const isCorrect = newInput.every((val, idx) => val === sequence[idx]);
      if (isCorrect) {
        setMaxLevel(Math.max(maxLevel, level));
        setLevel(prev => prev + 1);
        setErrors(0);
        setPhase('presentation'); // Next level
        setPresentationIndex(0);
        // Start next trial logic
        const nextSequence = Array.from({ length: level + 1 }, () => Math.floor(Math.random() * 10));
        setSequence(nextSequence);
      } else {
        const newErrorCount = errors + 1;
        setErrors(newErrorCount);
        if (newErrorCount >= 2) {
          setPhase('debrief');
          onComplete({
            experimentName: experiment.id,
            participantId,
            roomId,
            timestamp: new Date().toISOString(),
            totalTrials: level - 3,
            responseTimeMs: 0,
            accuracy: maxLevel,
            answer: maxLevel,
            correctAnswer: 'working_memory_span',
            trialData: [],
            debrief: 'Task complete. Your working memory span is ' + maxLevel + ' digits.'
          } as any);
        } else {
          // Retry same level
          setPhase('presentation');
          setPresentationIndex(0);
          const retrySequence = Array.from({ length: level }, () => Math.floor(Math.random() * 10));
          setSequence(retrySequence);
        }
      }
    }
  }, [phase, input, sequence, level, errors, maxLevel, experiment.id, participantId, roomId, onComplete]);

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (phase === 'instruction' && (e.code === 'Space' || e.key === ' ')) {
        e.preventDefault();
        startTrial();
        return;
      }

      if (phase === 'recall') {
        if (e.key >= '0' && e.key <= '9') {
          handleInput(parseInt(e.key));
        } else if (e.key === 'Backspace') {
          setInput(prev => prev.slice(0, -1));
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, handleInput, startTrial]);

  if (phase === 'instruction') {
    return (
      <div className="flex flex-col items-center justify-center p-8 sm:p-16 text-center bg-white rounded-[2.5rem] sm:rounded-[3rem] shadow-2xl border border-gray-100 w-full max-w-5xl mx-auto animate-fade-up">
        <div className="w-16 h-16 sm:w-24 sm:h-24 bg-purple-100 text-purple-600 rounded-2xl sm:rounded-3xl flex items-center justify-center text-3xl sm:text-5xl mb-6 sm:mb-10 shadow-inner">🔢</div>
        <h1 className="text-3xl sm:text-6xl font-black text-gray-900 mb-6 sm:mb-8 tracking-tighter">Digit Span</h1>
        <p className="text-lg sm:text-2xl text-gray-500 mb-8 sm:mb-12 max-w-2xl leading-relaxed">
          Memorize the sequence of numbers shown.<br />
          Recall them in the <b>exact same order</b>.
        </p>
        <button
          onClick={startTrial}
          className="w-full sm:w-auto px-10 sm:px-16 py-6 sm:py-8 bg-purple-600 text-white rounded-[1.5rem] sm:rounded-[2rem] font-black text-xl sm:text-3xl hover:bg-purple-700 transition-all shadow-[0_20px_50px_rgba(147,51,234,0.3)] hover:scale-105 active:scale-95"
        >
          START EXPERIMENT
        </button>
      </div>
    );
  }

  if (phase === 'debrief') {
    return (
      <div className="flex flex-col items-center justify-center p-8 sm:p-16 text-center bg-white rounded-[2.5rem] sm:rounded-[3rem] shadow-2xl border border-gray-100 w-full max-w-5xl mx-auto animate-fade-up">
        <h1 className="text-4xl sm:text-6xl font-black text-gray-900 mb-8 sm:mb-12 tracking-tighter">Results</h1>
        <div className="bg-purple-600 p-10 sm:p-16 rounded-[2.5rem] sm:rounded-[4rem] shadow-2xl mb-8 sm:mb-12 w-full max-w-2xl text-white">
          <p className="text-[10px] sm:text-xs font-black uppercase tracking-[0.4em] mb-4 opacity-70">Working Memory Span</p>
          <p className="text-6xl sm:text-9xl font-black tabular-nums leading-none">{maxLevel}<span className="text-2xl sm:text-3xl ml-2 font-medium opacity-50">digits</span></p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="w-full sm:w-auto px-10 sm:px-12 py-5 sm:py-6 border-4 border-gray-100 text-gray-400 rounded-[1.5rem] sm:rounded-[2.5rem] font-black text-lg sm:text-xl hover:bg-gray-900 hover:text-white hover:border-black transition-all"
        >
          NEW SESSION
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] sm:min-h-[750px] w-full max-w-6xl mx-auto p-6 sm:p-12 bg-white rounded-[2.5rem] sm:rounded-[4rem] shadow-sm border border-gray-50 relative overflow-hidden">
      <div className="absolute top-8 sm:top-12 left-8 sm:left-16 flex items-center gap-6">
        <div className="px-4 sm:px-6 py-1 sm:py-2 bg-gray-900 rounded-full text-[10px] sm:text-xs font-black text-white tracking-[0.3em] uppercase">
          Digit Span
        </div>
        <div className="px-4 sm:px-6 py-1 sm:py-2 bg-purple-50 rounded-full text-[10px] sm:text-xs font-black text-purple-600 tracking-[0.3em] uppercase">
          LEVEL {level}
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center w-full min-h-[250px] sm:min-h-[400px]">
        {phase === 'presentation' ? (
          <div key={presentationIndex} className="text-8xl sm:text-[12rem] lg:text-[16rem] font-black tabular-nums text-gray-900 animate-in zoom-in duration-200 leading-none">
            {presentationIndex < sequence.length ? sequence[presentationIndex] : ''}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-8 sm:gap-16 w-full max-w-2xl animate-fade-in">
            <div className="flex flex-wrap justify-center gap-3 sm:gap-6 min-h-[100px] sm:min-h-[140px] w-full p-6 sm:p-10 bg-gray-50 rounded-[2rem] sm:rounded-[3rem] border-4 border-dashed border-gray-200">
              {input.map((d, i) => (
                <div key={i} className="w-12 h-12 sm:w-20 sm:h-20 bg-white rounded-2xl sm:rounded-3xl shadow-xl flex items-center justify-center text-2xl sm:text-5xl font-black text-purple-600 animate-in slide-in-from-bottom-4 duration-150">
                  {d}
                </div>
              ))}
              {input.length === 0 && <span className="text-gray-200 font-black uppercase tracking-[0.3em] sm:tracking-[0.5em] self-center text-[10px] sm:text-sm">RECALL SEQUENCE</span>}
            </div>

            <div className="grid grid-cols-5 gap-3 sm:gap-6 w-full">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(d => (
                <button
                  key={d}
                  onClick={() => handleInput(d)}
                  className="h-16 sm:h-24 bg-white border-2 border-gray-100 rounded-[1.5rem] sm:rounded-[2rem] text-xl sm:text-3xl font-black text-gray-700 hover:bg-gray-900 hover:text-white hover:border-black hover:shadow-2xl hover:-translate-y-2 transition-all active:scale-90"
                >
                  {d}
                </button>
              ))}
            </div>
            <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em] sm:tracking-[0.4em]">Use Numpad or Click Buttons</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default DigitSpanExperiment;
