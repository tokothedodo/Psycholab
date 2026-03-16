import { useState, useEffect, useCallback, useRef } from 'react';
import type { Experiment } from '../data/experiments';
import type { ExperimentResults } from './ExperimentWrapper';

interface ReactionTimeProps {
  experiment: Experiment;
  onComplete: (results: ExperimentResults) => void;
  participantId: string;
  roomId: string;
}

export function ReactionTimeExperiment({ experiment, onComplete, participantId, roomId }: ReactionTimeProps) {
  const [phase, setPhase] = useState<'instruction' | 'test' | 'debrief'>('instruction');
  const [trial, setTrial] = useState(0);
  const [stimulusVisible, setStimulusVisible] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [results, setResults] = useState<{ trial: number; rt: number }[]>([]);
  const totalTrials = 10;
  const timeoutRef = useRef<any>(null);

  const startTrial = useCallback(() => {
    setStimulusVisible(false);
    // Random delay between 1.5 and 4.5 seconds
    const delay = Math.random() * 3000 + 1500;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      setStimulusVisible(true);
      setStartTime(performance.now());
    }, delay);
  }, []);

  const handleResponse = useCallback(() => {
    if (phase !== 'test' || !stimulusVisible) return;

    const rt = performance.now() - startTime;
    const newResults = [...results, { trial: trial + 1, rt }];
    setResults(newResults);
    setStimulusVisible(false);

    if (trial + 1 < totalTrials) {
      setTrial(prev => prev + 1);
    } else {
      setPhase('debrief');
      const avgRt = newResults.reduce((acc, r) => acc + r.rt, 0) / newResults.length;
      onComplete({
        experimentName: experiment.id,
        participantId,
        roomId,
        timestamp: new Date().toISOString(),
        totalTrials: newResults.length,
        responseTimeMs: Math.round(avgRt),
        accuracy: 100,
        trialData: newResults.map(r => ({
          trialNumber: r.trial,
          responseTimeMs: Math.round(r.rt),
          stimulus: 'circle',
          answer: 'detected',
          correctAnswer: 'detected'
        })),
        debrief: 'Task complete. Average reaction time: ' + Math.round(avgRt) + 'ms.'
      } as any);
    }
  }, [phase, stimulusVisible, startTime, results, trial, experiment.id, participantId, roomId, onComplete]);

  // Keyboard support - prioritized
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        if (phase === 'instruction') {
          setPhase('test');
        } else if (phase === 'test') {
          handleResponse();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, handleResponse]);

  useEffect(() => {
    if (phase === 'test') {
      startTrial();
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [phase, trial, startTrial]);

  if (phase === 'instruction') {
    return (
      <div className="flex flex-col items-center justify-center p-8 sm:p-16 text-center bg-white rounded-[2.5rem] sm:rounded-[4rem] shadow-2xl border border-gray-100 w-full max-w-5xl mx-auto animate-fade-up">
        <div className="w-16 h-16 sm:w-24 sm:h-24 bg-blue-100 text-blue-600 rounded-2xl sm:rounded-3xl flex items-center justify-center text-3xl sm:text-5xl mb-6 sm:mb-10 shadow-inner">⚡</div>
        <h1 className="text-4xl sm:text-6xl font-black text-gray-900 mb-6 sm:mb-8 tracking-tighter">Reaction Time</h1>
        <p className="text-lg sm:text-2xl text-gray-500 mb-8 sm:mb-12 max-w-2xl leading-relaxed">
          A massive <span className="text-blue-600 font-black">BLUE DISK</span> will appear in the center.
          Respond as fast as possible by pressing <kbd className="hidden sm:inline-block bg-gray-900 text-white px-4 py-1 rounded-xl mx-2 font-mono">SPACE</kbd>
          <span className="sm:hidden font-bold"> tapping the screen</span>.
        </p>
        <button
          onClick={() => setPhase('test')}
          className="w-full sm:w-auto px-10 sm:px-16 py-6 sm:py-8 bg-blue-600 text-white rounded-[1.5rem] sm:rounded-[2rem] font-black text-xl sm:text-3xl hover:bg-blue-700 transition-all shadow-[0_20px_50px_rgba(37,99,235,0.3)] hover:scale-105 active:scale-95"
        >
          START EXPERIMENT
        </button>
      </div>
    );
  }

  if (phase === 'debrief') {
    const avgRt = Math.round(results.reduce((acc, r) => acc + r.rt, 0) / results.length);
    return (
      <div className="flex flex-col items-center justify-center p-8 sm:p-16 text-center bg-white rounded-[2.5rem] sm:rounded-[4rem] shadow-2xl border border-gray-100 w-full max-w-5xl mx-auto animate-fade-up">
        <h1 className="text-4xl sm:text-6xl font-black text-gray-900 mb-8 sm:mb-10 tracking-tighter">Results</h1>
        <div className="bg-blue-600 p-10 sm:p-16 rounded-[2.5rem] sm:rounded-[4rem] shadow-2xl mb-8 sm:mb-12 w-full max-w-2xl text-white">
          <p className="text-[10px] sm:text-xs font-black uppercase tracking-[0.4em] mb-4 opacity-70">Mean Response Time</p>
          <p className="text-6xl sm:text-9xl font-black tabular-nums leading-none">{avgRt}<span className="text-2xl sm:text-3xl ml-2 font-medium opacity-50">ms</span></p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="w-full sm:w-auto px-10 sm:px-12 py-5 sm:py-6 border-4 border-gray-100 text-gray-400 rounded-[1.5rem] sm:rounded-[2rem] font-black text-lg sm:text-xl hover:bg-gray-900 hover:text-white hover:border-black transition-all"
        >
          NEW SESSION
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] sm:min-h-[700px] w-full max-w-6xl mx-auto p-6 sm:p-12 bg-white rounded-[2.5rem] sm:rounded-[4rem] shadow-sm border border-gray-50 relative overflow-hidden touch-none" onClick={handleResponse}>
      <div className="absolute top-8 sm:top-12 left-8 sm:left-16 flex items-center gap-6">
        <div className="px-4 sm:px-6 py-1 sm:py-2 bg-gray-900 rounded-full text-[10px] sm:text-xs font-black text-white tracking-[0.3em] uppercase">
          TRIAL {trial + 1} / {totalTrials}
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center w-full">
        {stimulusVisible ? (
          <div
            className="w-[260px] h-[260px] sm:w-[400px] sm:h-[400px] lg:w-[500px] lg:h-[500px] bg-blue-600 rounded-full shadow-[0_0_80px_rgba(37,99,235,0.4)] sm:shadow-[0_0_120px_rgba(37,99,235,0.6)] animate-in zoom-in duration-75 cursor-pointer flex items-center justify-center"
          >
            <span className="text-white/20 font-black text-2xl sm:text-4xl animate-pulse">HIT</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 sm:gap-6 opacity-10">
            <div className="w-4 h-4 sm:w-6 sm:h-6 rounded-full bg-gray-400 animate-ping"></div>
            <div className="text-gray-900 font-black tracking-[0.5em] uppercase text-[10px] sm:text-sm text-center">Waiting...</div>
          </div>
        )}
      </div>

      <div className="mt-8 sm:mt-16 w-full max-w-2xl text-center">
        <p className="mb-4 sm:mb-6 text-gray-300 font-bold uppercase tracking-[0.3em] text-[10px] sm:text-sm">
          <span className="hidden sm:inline">Press <kbd className="bg-gray-100 text-gray-900 px-3 py-1 rounded-lg border border-gray-200 mx-1">SPACE</kbd> or </span>
          tap the screen as soon as the blue circle appears
        </p>
        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 transition-all duration-300"
            style={{ width: `${(trial / totalTrials) * 100}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
}

export default ReactionTimeExperiment;
