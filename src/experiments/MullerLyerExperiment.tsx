import { useState, useEffect, useCallback } from 'react';
import type { Experiment } from '../data/experiments';
import type { ExperimentResults } from './ExperimentWrapper';

interface MullerLyerProps {
  experiment: Experiment;
  onComplete: (results: ExperimentResults) => void;
  participantId: string;
  roomId: string;
}

export function MullerLyerExperiment({ experiment, onComplete, participantId, roomId }: MullerLyerProps) {
  const [phase, setPhase] = useState<'instruction' | 'test' | 'debrief'>('instruction');
  const [trial, setTrial] = useState(0);
  const [adjustableLength, setAdjustableLength] = useState(200);
  const [startTime, setStartTime] = useState(0);
  const [results, setResults] = useState<{ trial: number; error: number; rt: number }[]>([]);
  const totalTrials = 6;

  const referenceLength = 500; // Adjusted for better baseline on all screens

  const startTrial = useCallback(() => {
    // Randomize initial length between 200 and 800
    setAdjustableLength(Math.floor(Math.random() * 500) + 150);
    setStartTime(performance.now());
  }, []);

  useEffect(() => {
    if (phase === 'test') {
      startTrial();
    }
  }, [phase, trial, startTrial]);

  const handleResponse = useCallback(() => {
    const rt = performance.now() - startTime;
    const error = Math.abs(adjustableLength - referenceLength);
    const newResults = [...results, { trial: trial + 1, error, rt }];
    setResults(newResults);

    if (trial + 1 < totalTrials) {
      setTrial(prev => prev + 1);
    } else {
      setPhase('debrief');
      const avgError = newResults.reduce((acc, r) => acc + r.error, 0) / newResults.length;
      onComplete({
        experimentName: experiment.id,
        participantId,
        roomId,
        timestamp: new Date().toISOString(),
        totalTrials: newResults.length,
        responseTimeMs: Math.round(newResults.reduce((acc, r) => acc + r.rt, 0) / newResults.length),
        accuracy: Math.max(0, 100 - (avgError / referenceLength) * 100),
        answer: avgError,
        correctAnswer: referenceLength,
        trialData: newResults.map(r => ({
          trialNumber: r.trial,
          responseTimeMs: Math.round(r.rt),
          stimulus: `ref:${referenceLength}`,
          answer: adjustableLength,
          correctAnswer: referenceLength
        })),
        debrief: 'Task complete. Average adjustment error: ' + Math.round(avgError) + ' pixels.'
      } as any);
    }
  }, [phase, startTime, adjustableLength, results, trial, experiment.id, participantId, roomId, onComplete]);

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (phase === 'instruction' && (e.code === 'Space' || e.key === ' ')) {
        e.preventDefault();
        setPhase('test');
        return;
      }

      if (phase === 'test') {
        if (e.key === 'ArrowLeft') {
          setAdjustableLength(prev => Math.max(50, prev - 4));
        } else if (e.key === 'ArrowRight') {
          setAdjustableLength(prev => Math.min(referenceLength * 2, prev + 4));
        } else if (e.key === 'Enter') {
          handleResponse();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, handleResponse, referenceLength]);

  const renderLine = (length: number, inverted: boolean) => {
    const finSize = 35; // Responsive fin size
    const angle = 45;
    return (
      <div className="relative flex items-center justify-center h-24 sm:h-32" style={{ width: length + 100 }}>
        {/* Main Line */}
        <div className="h-1.5 sm:h-2 bg-gray-900 rounded-full shadow-sm" style={{ width: length }}></div>

        {/* Left Fins */}
        <div className="absolute left-[50px]">
          <div className="h-1.5 sm:h-2 bg-gray-900 rounded-full absolute origin-right"
            style={{ width: finSize, transform: `rotate(${inverted ? -angle : angle}deg)` }}></div>
          <div className="h-1.5 sm:h-2 bg-gray-900 rounded-full absolute origin-right"
            style={{ width: finSize, transform: `rotate(${inverted ? angle : -angle}deg)` }}></div>
        </div>

        {/* Right Fins */}
        <div className="absolute right-[50px]">
          <div className="h-1.5 sm:h-2 bg-gray-900 rounded-full absolute origin-left"
            style={{ width: finSize, transform: `rotate(${inverted ? 180 - angle : 180 + angle}deg)` }}></div>
          <div className="h-1.5 sm:h-2 bg-gray-900 rounded-full absolute origin-left"
            style={{ width: finSize, transform: `rotate(${inverted ? 180 + angle : 180 - angle}deg)` }}></div>
        </div>
      </div>
    );
  };

  if (phase === 'instruction') {
    return (
      <div className="flex flex-col items-center justify-center p-8 sm:p-16 text-center bg-white rounded-[2.5rem] sm:rounded-[3rem] shadow-2xl border border-gray-100 w-full max-w-5xl mx-auto animate-fade-up">
        <div className="w-16 h-16 sm:w-24 sm:h-24 bg-emerald-100 text-emerald-600 rounded-2xl sm:rounded-3xl flex items-center justify-center text-3xl sm:text-5xl mb-6 sm:mb-10 shadow-inner">↔️</div>
        <h1 className="text-3xl sm:text-6xl font-black text-gray-900 mb-6 sm:mb-8 tracking-tighter">Müller-Lyer Illusion</h1>
        <p className="text-lg sm:text-2xl text-gray-500 mb-8 sm:mb-12 max-w-2xl leading-relaxed">
          Adjust the <span className="text-emerald-600 font-black">LOWER LINE</span> until its length perfectly matches the top line.
        </p>
        <button
          onClick={() => setPhase('test')}
          className="w-full sm:w-auto px-10 sm:px-16 py-6 sm:py-8 bg-emerald-600 text-white rounded-[1.5rem] sm:rounded-[2rem] font-black text-xl sm:text-3xl hover:bg-emerald-700 transition-all shadow-[0_20px_50px_rgba(16,185,129,0.3)] hover:scale-105 active:scale-95"
        >
          START EXPERIMENT
        </button>
      </div>
    );
  }

  if (phase === 'debrief') {
    const avgError = Math.round(results.reduce((acc, r) => acc + r.error, 0) / results.length);
    return (
      <div className="flex flex-col items-center justify-center p-8 sm:p-16 text-center bg-white rounded-[2.5rem] sm:rounded-[3rem] shadow-2xl border border-gray-100 w-full max-w-5xl mx-auto animate-fade-up">
        <h1 className="text-4xl sm:text-6xl font-black text-gray-900 mb-8 sm:mb-12 tracking-tighter">Perception Results</h1>
        <div className="bg-emerald-600 p-10 sm:p-16 rounded-[2.5rem] sm:rounded-[4rem] shadow-2xl mb-8 sm:mb-12 w-full max-w-2xl text-white">
          <p className="text-[10px] sm:text-xs font-black uppercase tracking-[0.4em] mb-4 opacity-70">Mean Adjustment Error</p>
          <p className="text-6xl sm:text-9xl font-black tabular-nums leading-none">{avgError}<span className="text-2xl sm:text-3xl ml-2 font-medium opacity-50">px</span></p>
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
    <div className="flex flex-col items-center justify-center min-h-[600px] sm:min-h-[850px] w-full max-w-7xl mx-auto p-6 sm:p-12 bg-white rounded-[2.5rem] sm:rounded-[4rem] shadow-sm border border-gray-50 relative overflow-hidden">
      <div className="absolute top-8 sm:top-12 left-8 sm:left-16 flex items-center gap-6">
        <div className="px-4 sm:px-6 py-1 sm:py-2 bg-gray-900 rounded-full text-[10px] sm:text-xs font-black text-white tracking-[0.3em] uppercase">
          TRIAL {trial + 1} / {totalTrials}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-12 sm:gap-24 w-full mb-12 sm:mb-16 overflow-x-auto">
        <div className="flex flex-col items-center gap-2 sm:gap-4 scale-75 sm:scale-100 min-w-[600px]">
          <span className="text-[10px] sm:text-xs font-black text-gray-300 uppercase tracking-[0.4em]">Reference Protocol</span>
          {renderLine(referenceLength, false)}
        </div>
        <div className="flex flex-col items-center gap-2 sm:gap-4 scale-75 sm:scale-110 min-w-[600px]">
          <span className="text-[10px] sm:text-xs font-black text-emerald-500 uppercase tracking-[0.4em]">Target Configuration</span>
          {renderLine(adjustableLength, true)}
        </div>
      </div>

      <div className="w-full max-w-4xl flex flex-col items-center gap-8 sm:gap-12">
        <div className="w-full flex items-center gap-4 sm:gap-10">
          <button
            onClick={() => setAdjustableLength(prev => Math.max(50, prev - 20))}
            className="w-12 h-12 sm:w-24 sm:h-24 bg-gray-50 rounded-xl sm:rounded-[2rem] flex items-center justify-center text-2xl sm:text-4xl font-black text-gray-300 hover:bg-gray-900 hover:text-white transition-all active:scale-90 shadow-inner border border-gray-100"
          >
            -
          </button>
          <input
            type="range"
            min="50"
            max={referenceLength * 2}
            value={adjustableLength}
            onChange={(e) => setAdjustableLength(parseInt(e.target.value))}
            className="flex-1 h-3 sm:h-6 bg-gray-100 rounded-full appearance-none cursor-pointer accent-emerald-600 sm:scale-y-150"
          />
          <button
            onClick={() => setAdjustableLength(prev => Math.min(referenceLength * 2, prev + 20))}
            className="w-12 h-12 sm:w-24 sm:h-24 bg-gray-50 rounded-xl sm:rounded-[2rem] flex items-center justify-center text-2xl sm:text-4xl font-black text-gray-300 hover:bg-gray-900 hover:text-white transition-all active:scale-90 shadow-inner border border-gray-100"
          >
            +
          </button>
        </div>

        <div className="w-full flex flex-col items-center gap-4 sm:gap-6">
          <button
            onClick={handleResponse}
            className="w-full max-w-xl py-6 sm:py-10 bg-emerald-600 text-white rounded-[1.5rem] sm:rounded-[2.5rem] font-black text-xl sm:text-3xl hover:bg-emerald-700 transition-all shadow-2xl hover:scale-105 active:scale-95"
          >
            CONFIRM MATCH
          </button>
          <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em] sm:tracking-[0.4em] text-center">
            <span className="hidden sm:inline">Use <kbd className="bg-gray-100 text-gray-900 px-3 py-1 rounded-lg mx-1 font-mono uppercase">← →</kbd> and confirm with <kbd className="bg-gray-100 text-gray-900 px-3 py-1 rounded-lg mx-1 font-mono uppercase">ENTER</kbd></span>
            <span className="sm:hidden">Adjust and tap Confirm</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default MullerLyerExperiment;
