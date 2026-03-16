import { useState, useEffect, useCallback } from 'react';
import type { Experiment } from '../data/experiments';
import type { ExperimentResults } from './ExperimentWrapper';

interface UltimatumProps {
  experiment: Experiment;
  onComplete: (results: ExperimentResults) => void;
  participantId: string;
  roomId: string;
}

export function UltimatumExperiment({ experiment, onComplete, participantId, roomId }: UltimatumProps) {
  const [phase, setPhase] = useState<'instruction' | 'test' | 'debrief'>('instruction');
  const [trial, setTrial] = useState(0);
  const [offer, setOffer] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [results, setResults] = useState<{ trial: number; rt: number; offer: number; decision: string }[]>([]);
  const totalTrials = 10;
  const totalCoins = 100;

  const startTrial = useCallback(() => {
    // Generate a semi-random offer (some fair, some unfair)
    const possibleOffers = [10, 15, 20, 25, 30, 40, 50];
    const newOffer = possibleOffers[Math.floor(Math.random() * possibleOffers.length)];
    setOffer(newOffer);
    setStartTime(performance.now());
  }, []);

  useEffect(() => {
    if (phase === 'test') {
      startTrial();
    }
  }, [phase, trial, startTrial]);

  const handleResponse = useCallback((decision: 'accept' | 'reject') => {
    if (phase !== 'test') return;

    const rt = performance.now() - startTime;
    const newResults = [...results, { trial: trial + 1, rt, offer, decision }];
    setResults(newResults);

    if (trial + 1 < totalTrials) {
      setTrial(prev => prev + 1);
    } else {
      setPhase('debrief');
      const avgRt = newResults.reduce((acc, r) => acc + r.rt, 0) / newResults.length;
      const rejectionRate = (newResults.filter(r => r.decision === 'reject').length / newResults.length) * 100;

      onComplete({
        experimentName: experiment.id,
        participantId,
        roomId,
        timestamp: new Date().toISOString(),
        totalTrials: newResults.length,
        responseTimeMs: Math.round(avgRt),
        accuracy: 100 - rejectionRate,
        answer: rejectionRate,
        correctAnswer: 'rejection_rate',
        trialData: newResults.map(r => ({
          trialNumber: r.trial,
          responseTimeMs: Math.round(r.rt),
          stimulus: `offer:${r.offer}`,
          answer: r.decision,
          correctAnswer: 'fairness_judgment'
        })),
        debrief: 'Task complete. You rejected ' + Math.round(rejectionRate) + '% of offers.'
      } as any);
    }
  }, [phase, startTime, offer, results, trial, experiment.id, participantId, roomId, onComplete]);

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (phase === 'instruction' && (e.code === 'Space' || e.key === ' ')) {
        e.preventDefault();
        setPhase('test');
        return;
      }

      if (phase === 'test') {
        const key = e.key.toLowerCase();
        if (key === 'a') {
          handleResponse('accept');
        } else if (key === 'r') {
          handleResponse('reject');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, handleResponse]);

  if (phase === 'instruction') {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-center bg-white rounded-[3rem] shadow-2xl border border-gray-100 w-full max-w-5xl mx-auto animate-fade-up">
        <div className="w-24 h-24 bg-orange-100 text-orange-600 rounded-3xl flex items-center justify-center text-5xl mb-10 shadow-inner">💰</div>
        <h1 className="text-6xl font-black text-gray-900 mb-8 tracking-tighter">Ultimatum Game</h1>
        <p className="text-2xl text-gray-500 mb-12 max-w-2xl leading-relaxed">
          Another player proposes a split of <b className="text-orange-600 px-2">{totalCoins} coins</b>.<br />
          If you <b>REJECT</b>, both of you leave with <span className="text-rose-600 font-black">ZERO</span>.
        </p>
        <button
          onClick={() => setPhase('test')}
          className="px-16 py-8 bg-orange-600 text-white rounded-[2rem] font-black text-3xl hover:bg-orange-700 transition-all shadow-2xl hover:scale-105 active:scale-95"
        >
          ENTER MISSION
        </button>
      </div>
    );
  }

  if (phase === 'debrief') {
    const rejectedCount = results.filter(r => r.decision === 'reject').length;
    const acceptCount = results.length - rejectedCount;
    return (
      <div className="flex flex-col items-center justify-center p-16 text-center bg-white rounded-[3rem] shadow-2xl border border-gray-100 w-full max-w-5xl mx-auto animate-fade-up">
        <h1 className="text-6xl font-black text-gray-900 mb-12 tracking-tighter">Economic Profile</h1>
        <div className="grid grid-cols-2 gap-8 w-full mb-12">
          <div className="bg-emerald-600 text-white p-12 rounded-[4rem] shadow-2xl">
            <p className="text-xs font-black uppercase tracking-[0.4em] mb-4 opacity-70">Accepted Offers</p>
            <p className="text-8xl font-black">{acceptCount}</p>
          </div>
          <div className="bg-rose-600 text-white p-12 rounded-[4rem] shadow-2xl">
            <p className="text-xs font-black uppercase tracking-[0.4em] mb-4 opacity-70">Rejected Offers</p>
            <p className="text-8xl font-black">{rejectedCount}</p>
          </div>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="px-12 py-6 border-4 border-gray-100 text-gray-400 rounded-[2.5rem] font-black text-xl hover:bg-gray-900 hover:text-white hover:border-black transition-all"
        >
          RESET PARADIGM
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[750px] w-full max-w-6xl mx-auto p-12 bg-white rounded-[4rem] shadow-sm border border-gray-50 relative overflow-hidden">
      <div className="absolute top-12 left-16 flex items-center gap-6">
        <div className="px-6 py-2 bg-gray-900 rounded-full text-xs font-black text-white tracking-[0.3em] uppercase">
          TRIAL {trial + 1} / {totalTrials}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center w-full mt-12 animate-fade-in">
        <div className="relative group">
          <div className="absolute -inset-10 bg-orange-100/50 rounded-[5rem] blur-3xl scale-95 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
          <div className="relative bg-white p-24 rounded-[4rem] shadow-2xl border border-orange-50 text-center scale-110">
            <p className="text-orange-400 text-xs font-black uppercase tracking-[0.5em] mb-8">The Proposer Offers</p>
            <p className="text-[14rem] font-black text-orange-600 tabular-nums leading-none tracking-tighter select-none">
              {offer}
            </p>
            <p className="text-orange-200 text-lg font-black mt-10 uppercase tracking-[0.3em]">Coins from {totalCoins}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-10 w-full max-w-4xl mt-24">
        <button
          onClick={() => handleResponse('accept')}
          className="relative group bg-emerald-600 text-white p-12 rounded-[3.5rem] shadow-2xl hover:bg-emerald-700 hover:-translate-y-3 transition-all active:scale-95 overflow-hidden"
        >
          <div className="absolute top-6 right-8 text-emerald-400 font-black opacity-20 uppercase tracking-[0.3em] text-xs">Press A</div>
          <span className="text-5xl font-black tracking-tighter">ACCEPT</span>
          <p className="text-emerald-100 text-sm mt-3 font-bold uppercase tracking-widest">Keep your share</p>
        </button>
        <button
          onClick={() => handleResponse('reject')}
          className="relative group bg-white text-rose-600 border-4 border-rose-50 p-12 rounded-[3.5rem] shadow-sm hover:border-rose-200 hover:shadow-2xl hover:-translate-y-3 transition-all active:scale-95 overflow-hidden"
        >
          <div className="absolute top-6 right-8 text-rose-200 font-black opacity-40 uppercase tracking-[0.3em] text-xs">Press R</div>
          <span className="text-5xl font-black tracking-tighter">REJECT</span>
          <p className="text-rose-400 text-sm mt-3 font-bold uppercase tracking-widest">Both get nothing</p>
        </button>
      </div>

      <p className="mt-16 text-xs font-black text-gray-200 uppercase tracking-[0.6em]">Choose based on fairness norms</p>
    </div>
  );
}

export default UltimatumExperiment;
