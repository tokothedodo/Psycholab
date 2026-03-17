import { useState, useEffect, useCallback } from 'react';
import type { Experiment } from '../data/experiments';
import type { ExperimentResults } from './ExperimentWrapper';

interface StroopProps {
  experiment: Experiment;
  onComplete: (results: ExperimentResults) => void;
  participantId: string;
  roomId: string;
}

const COLORS = [
  { name: 'Red', hex: '#ef4444', key: 'r' },
  { name: 'Green', hex: '#22c55e', key: 'g' },
  { name: 'Blue', hex: '#3b82f6', key: 'b' },
  { name: 'Yellow', hex: '#eab308', key: 'y' },
];

export function StroopExperiment({ experiment, onComplete, participantId, roomId }: StroopProps) {
  const [phase, setPhase] = useState<'instruction' | 'test' | 'debrief'>('instruction');
  const [trial, setTrial] = useState(0);
  const [stimulus, setStimulus] = useState({ word: '', color: '', congruent: false });
  const [startTime, setStartTime] = useState(0);
  const [results, setResults] = useState<{ trial: number; rt: number; correct: boolean; congruent: boolean }[]>([]);
  const totalTrials = 12;

  const startTrial = useCallback(() => {
    const isCongruent = Math.random() > 0.5;
    const wordIndex = Math.floor(Math.random() * COLORS.length);
    let colorIndex;
    if (isCongruent) {
      colorIndex = wordIndex;
    } else {
      do {
        colorIndex = Math.floor(Math.random() * COLORS.length);
      } while (colorIndex === wordIndex);
    }

    setStimulus({
      word: COLORS[wordIndex].name,
      color: COLORS[colorIndex].hex,
      congruent: isCongruent
    });
    setStartTime(performance.now());
  }, []);

  useEffect(() => {
    if (phase === 'test') {
      startTrial();
    }
  }, [phase, trial, startTrial]);

  const handleResponse = useCallback((selectedColorName: string) => {
    if (phase !== 'test') return;

    const rt = performance.now() - startTime;
    const correctColor = COLORS.find(c => c.hex === stimulus.color)?.name;
    const isCorrect = selectedColorName === correctColor;
    const newResults = [...results, { trial: trial + 1, rt, correct: isCorrect, congruent: stimulus.congruent }];
    setResults(newResults);

    if (trial + 1 < totalTrials) {
      setTrial(prev => prev + 1);
    } else {
      setPhase('debrief');
      const avgRt = newResults.reduce((acc, r) => acc + r.rt, 0) / newResults.length;
      const accuracy = (newResults.filter(r => r.correct).length / newResults.length) * 100;

      const congruentResults = newResults.filter(r => r.congruent);
      const incongruentResults = newResults.filter(r => !r.congruent);

      const avgCongruentRt = congruentResults.length > 0
        ? congruentResults.reduce((acc, r) => acc + r.rt, 0) / congruentResults.length
        : 0;
      const avgIncongruentRt = incongruentResults.length > 0
        ? incongruentResults.reduce((acc, r) => acc + r.rt, 0) / incongruentResults.length
        : 0;

      onComplete({
        experimentName: experiment.id,
        participantId,
        roomId,
        timestamp: new Date().toISOString(),
        totalTrials: newResults.length,
        responseTimeMs: Math.round(avgRt),
        accuracy,
        answer: Math.round(avgIncongruentRt - avgCongruentRt),
        correctAnswer: 'stroop_effect_ms',
        trialData: newResults.map(r => ({
          trialNumber: r.trial,
          responseTimeMs: Math.round(r.rt),
          stimulus: stimulus.word,
          answer: isCorrect ? 'correct' : 'incorrect',
          correctAnswer: 'correct'
        })),
        debrief: `Stroop effect: Incongruent RT (${Math.round(avgIncongruentRt)}ms) - Congruent RT (${Math.round(avgCongruentRt)}ms) = ${Math.round(avgIncongruentRt - avgCongruentRt)}ms.`
      } as any);
    }
  }, [phase, startTime, stimulus, results, trial, experiment.id, participantId, roomId, onComplete]);

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (phase === 'instruction' && (e.code === 'Space' || e.key === ' ')) {
        e.preventDefault();
        setPhase('test');
        return;
      }

      if (phase === 'test') {
        const color = COLORS.find(c => c.key === key);
        if (color) {
          handleResponse(color.name);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, handleResponse]);

  if (phase === 'instruction') {
    return (
      <div className="flex flex-col items-center justify-center p-8 sm:p-16 text-center bg-white rounded-[2.5rem] sm:rounded-[3rem] shadow-2xl border border-gray-100 w-full max-w-5xl mx-auto animate-fade-up">
        <div className="w-16 h-16 sm:w-24 sm:h-24 bg-red-100 text-red-600 rounded-2xl sm:rounded-3xl flex items-center justify-center text-3xl sm:text-5xl mb-6 sm:mb-10 shadow-inner">🎨</div>
        <h1 className="text-3xl sm:text-6xl font-black text-gray-900 mb-6 sm:mb-8 tracking-tighter">Stroop Task</h1>
        <p className="text-lg sm:text-2xl text-gray-500 mb-8 sm:mb-12 max-w-2xl leading-relaxed">
          Name the <span className="font-black text-gray-900 bg-yellow-300 px-2 sm:px-3 py-1 rounded-lg">INK COLOR</span> as fast as possible.<br />
          Ignore the written text.
        </p>

        <div className="grid grid-cols-2 gap-4 sm:gap-6 w-full max-w-2xl mb-8 sm:mb-12">
          {COLORS.map(c => (
            <div key={c.name} className="flex items-center gap-4 sm:gap-6 bg-gray-50 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-gray-100">
              <div className="w-6 h-6 sm:w-10 sm:h-10 rounded-full shadow-md" style={{ backgroundColor: c.hex }}></div>
              <span className="font-black text-gray-700 text-sm sm:text-xl">{c.name}</span>
              <kbd className="hidden sm:inline-block ml-auto bg-gray-900 text-white px-3 py-0.5 rounded-lg font-mono text-xs uppercase">{c.key}</kbd>
            </div>
          ))}
        </div>

        <button
          onClick={() => setPhase('test')}
          className="w-full sm:w-auto px-10 sm:px-16 py-6 sm:py-8 bg-black text-white rounded-[1.5rem] sm:rounded-[2rem] font-black text-xl sm:text-3xl hover:bg-gray-800 transition-all shadow-2xl hover:scale-105 active:scale-95"
        >
          START EXPERIMENT
        </button>
      </div>
    );
  }

  if (phase === 'debrief') {
    const accuracy = Math.round((results.filter(r => r.correct).length / results.length) * 100);
    const congruentResults = results.filter(r => r.congruent);
    const incongruentResults = results.filter(r => !r.congruent);
    const avgCongruentRt = Math.round(congruentResults.reduce((acc, r) => acc + r.rt, 0) / congruentResults.length) || 0;
    const avgIncongruentRt = Math.round(incongruentResults.reduce((acc, r) => acc + r.rt, 0) / incongruentResults.length) || 0;

    return (
      <div className="flex flex-col items-center justify-center p-8 sm:p-16 text-center bg-white rounded-[2.5rem] sm:rounded-[3rem] shadow-2xl border border-gray-100 w-full max-w-5xl mx-auto animate-fade-up">
        <h1 className="text-4xl sm:text-6xl font-black text-gray-900 mb-8 sm:mb-12 tracking-tighter">Performance</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 w-full mb-8 sm:mb-12">
          <div className="bg-gray-900 text-white p-8 sm:p-12 rounded-[2.5rem] sm:rounded-[3.5rem] shadow-2xl">
            <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.4em] mb-4">Precision</p>
            <p className="text-5xl sm:text-7xl font-black">{accuracy}%</p>
          </div>
          <div className="bg-red-600 text-white p-8 sm:p-12 rounded-[2.5rem] sm:rounded-[3.5rem] shadow-2xl">
            <p className="text-[10px] text-red-200 font-black uppercase tracking-[0.4em] mb-4">Inhibition Cost</p>
            <p className="text-5xl sm:text-7xl font-black">{avgIncongruentRt - avgCongruentRt}<span className="text-xl sm:text-2xl ml-1 font-medium opacity-50">ms</span></p>
          </div>
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
          TRIAL {trial + 1} / {totalTrials}
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center w-full min-h-[200px] sm:min-h-[300px]">
        <span
          className="text-7xl sm:text-[10rem] lg:text-[16rem] font-black uppercase tracking-tighter animate-in fade-in zoom-in duration-100 leading-none select-none"
          style={{ color: stimulus.color, filter: 'drop-shadow(0 15px 30px rgba(0,0,0,0.15))' }}
        >
          {stimulus.word}
        </span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8 w-full max-w-4xl mt-8 sm:mt-16">
        {COLORS.map(color => (
          <button
            key={color.name}
            onClick={() => handleResponse(color.name)}
            className="group flex flex-col items-center gap-3 sm:gap-6 p-6 sm:p-10 bg-white rounded-[2rem] sm:rounded-[3rem] border-2 border-transparent hover:border-gray-200 hover:shadow-2xl hover:-translate-y-2 transition-all active:scale-95"
          >
            <div className="w-10 h-10 sm:w-16 sm:h-16 rounded-full shadow-lg group-hover:scale-110 transition-transform" style={{ backgroundColor: color.hex }}></div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em] mb-1 sm:mb-3">{color.name}</span>
              <kbd className="hidden sm:inline-block bg-gray-100 text-gray-900 px-6 py-2 rounded-2xl font-mono text-xl font-black group-hover:bg-gray-900 group-hover:text-white transition-all shadow-sm">{color.key.toUpperCase()}</kbd>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default StroopExperiment;
