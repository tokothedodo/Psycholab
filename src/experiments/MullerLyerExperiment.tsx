import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import type { Experiment } from '../data/experiments';
import type { TrialData } from './ExperimentWrapper';

interface MullerLyerProps {
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

const TOTAL_TRIALS = 20;

export function MullerLyerExperiment({ experiment, onComplete, participantId, roomId }: MullerLyerProps) {
  const { t, language } = useLanguage();
  const [phase, setPhase] = useState<'instruction' | 'experiment' | 'complete'>('instruction');
  const [trialIndex, setTrialIndex] = useState(0);
  const [currentTrial, setCurrentTrial] = useState<{
    topLength: number;
    bottomLength: number;
    topArrows: 'in' | 'out';
    bottomArrows: 'in' | 'out';
    actualTopLonger: boolean;
  } | null>(null);
  const [startTime, setStartTime] = useState(0);
  const [experimentStartTime, setExperimentStartTime] = useState(0);
  const [trialData, setTrialData] = useState<TrialData[]>([]);

  const generateTrials = useCallback(() => {
    const trials = [];
    for (let i = 0; i < TOTAL_TRIALS; i++) {
      const baseLength = 180 + Math.random() * 60;
      const variation = Math.random() > 0.5 ? 10 + Math.random() * 30 : 0;
      const topArrows: 'in' | 'out' = Math.random() > 0.5 ? 'in' : 'out';
      const bottomArrows: 'in' | 'out' = topArrows === 'in' ? 'out' : 'in';

      trials.push({
        topLength: topArrows === 'out' ? baseLength + variation : baseLength,
        bottomLength: bottomArrows === 'out' ? baseLength + variation : baseLength,
        topArrows,
        bottomArrows,
        actualTopLonger: variation > 0,
      });
    }
    return trials;
  }, []);

  const [allTrials] = useState(generateTrials);

  useEffect(() => {
    if (phase === 'experiment' && currentTrial) {
      setStartTime(performance.now());
    }
  }, [phase, trialIndex, currentTrial]);

  const handleChoice = (selectedLine: 'top' | 'bottom') => {
    if (!currentTrial) return;

    const endTime = performance.now();
    const responseTime = Math.round(endTime - startTime);

    const trial: TrialData = {
      trialNumber: trialIndex + 1,
      responseTimeMs: responseTime,
      answer: selectedLine,
      correctAnswer: currentTrial.actualTopLonger ? 'top' : 'bottom',
      stimulus: currentTrial,
    };

    setTrialData(prev => [...prev, trial]);

    if (trialIndex < TOTAL_TRIALS - 1) {
      setTrialIndex(prev => prev + 1);
      setCurrentTrial(allTrials[trialIndex + 1]);
    } else {
      completeExperiment();
    }
  };

  const completeExperiment = () => {
    setPhase('complete');
    const endTime = performance.now();
    const totalTime = Math.round(endTime - experimentStartTime);

    const correctCount = trialData.filter(t => t.answer === t.correctAnswer).length;
    const outArrowErrors = trialData.filter(t => (t.stimulus as { topArrows: string })?.topArrows === 'out');
    const inArrowErrors = trialData.filter(t => (t.stimulus as { topArrows: string })?.topArrows === 'in');
    const outErrorRate = outArrowErrors.filter(t => t.answer !== t.correctAnswer).length / TOTAL_TRIALS * 2;
    const inErrorRate = inArrowErrors.filter(t => t.answer !== t.correctAnswer).length / TOTAL_TRIALS * 2;

    onComplete({
      experimentName: experiment.id,
      participantId,
      roomId,
      language,
      timestamp: new Date().toISOString(),
      totalTrials: TOTAL_TRIALS,
      responseTimeMs: totalTime,
      accuracy: (correctCount / TOTAL_TRIALS) * 100,
      answer: outErrorRate - inErrorRate,
      correctAnswer: 'illusion_strength',
      trialData,
    });
  };

  if (phase === 'instruction') {
    return (
      <div className="max-w-2xl mx-auto p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
        <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-emerald-600 mb-4">{t('exp.mullerLyer.name')}</h2>
        <div className="bg-slate-50 border-l-4 border-teal-500 p-5 rounded-r-lg mb-6">
          <p className="text-slate-700 leading-relaxed text-lg">{t('exp.mullerLyer.instruction')}</p>
        </div>
        <p className="text-sm font-medium text-slate-400 mb-8 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
          {t('citation')}: {experiment.citation}, {experiment.year}
        </p>
        <button
          onClick={() => {
            setPhase('experiment');
            setExperimentStartTime(performance.now());
            setCurrentTrial(allTrials[0]);
          }}
          className="group relative w-full sm:w-auto bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-semibold flex tracking-wide items-center justify-center gap-3 px-8 py-4 rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
        >
          {t('common.start')}
          <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
        </button>
      </div>
    );
  }

  if (phase === 'complete') {
    const correctCount = trialData.filter(t => t.answer === t.correctAnswer).length;

    return (
      <div className="max-w-2xl mx-auto p-6">
        <h2 className="text-2xl font-bold text-navy-900 mb-4">{t('common.debrief.title')}</h2>

        <div className="bg-teal-50 border-l-4 border-teal-500 p-4 mb-4">
          <p className="text-teal-800 font-medium">{t('common.debrief.thankYou')}</p>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg mb-4">
          <p className="text-lg text-center">
            <span className="font-semibold">{correctCount}</span> / {TOTAL_TRIALS} {t('common.correct')}
          </p>
        </div>

        <p className="text-gray-600 mb-4">{t('exp.mullerLyer.debrief')}</p>
        <p className="text-sm text-gray-500 mb-4">{t('citation')}: {experiment.citation}, {experiment.year}</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center px-4 py-1.5 bg-teal-50 text-teal-700 font-medium rounded-full text-sm mb-6 shadow-sm border border-teal-100">
          {t('exp.mullerLyer.trial')} {trialIndex + 1} / {TOTAL_TRIALS}
        </div>
        <h3 className="text-2xl font-bold text-slate-800 tracking-tight">
          {t('exp.mullerLyer.question')}
        </h3>
      </div>

      <div className="space-y-6">
        <button
          onClick={() => handleChoice('top')}
          className="group w-full py-12 bg-white hover:bg-slate-50 border-2 border-transparent hover:border-teal-100 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-teal-50/20 to-transparent group-hover:translate-x-full duration-1000 -translate-x-full z-0"></div>
          <div className="flex justify-center items-center">
            {currentTrial && (
              <svg width={currentTrial.topLength + 80} height="50" className="overflow-visible">
                <line
                  x1="40"
                  y1="25"
                  x2={currentTrial.topLength + 40}
                  y2="25"
                  stroke="#1e3a5f"
                  strokeWidth="4"
                />
                {currentTrial.topArrows === 'out' ? (
                  <>
                    <line x1="40" y1="25" x2="5" y2="0" stroke="#1e3a5f" strokeWidth="3" />
                    <line x1="40" y1="25" x2="5" y2="50" stroke="#1e3a5f" strokeWidth="3" />
                    <line x1={currentTrial.topLength + 40} y1="25" x2={currentTrial.topLength + 75} y2="0" stroke="#1e3a5f" strokeWidth="3" />
                    <line x1={currentTrial.topLength + 40} y1="25" x2={currentTrial.topLength + 75} y2="50" stroke="#1e3a5f" strokeWidth="3" />
                  </>
                ) : (
                  <>
                    <line x1="40" y1="25" x2="65" y2="0" stroke="#1e3a5f" strokeWidth="3" />
                    <line x1="40" y1="25" x2="65" y2="50" stroke="#1e3a5f" strokeWidth="3" />
                    <line x1={currentTrial.topLength + 40} y1="25" x2={currentTrial.topLength + 15} y2="0" stroke="#1e3a5f" strokeWidth="3" />
                    <line x1={currentTrial.topLength + 40} y1="25" x2={currentTrial.topLength + 15} y2="50" stroke="#1e3a5f" strokeWidth="3" />
                  </>
                )}
              </svg>
            )}
          </div>
        </button>

        <button
          onClick={() => handleChoice('bottom')}
          className="group w-full py-12 bg-white hover:bg-slate-50 border-2 border-transparent hover:border-teal-100 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-teal-50/20 to-transparent group-hover:translate-x-full duration-1000 -translate-x-full z-0"></div>
          <div className="flex justify-center items-center">
            {currentTrial && (
              <svg width={currentTrial.bottomLength + 80} height="50" className="overflow-visible">
                <line
                  x1="40"
                  y1="25"
                  x2={currentTrial.bottomLength + 40}
                  y2="25"
                  stroke="#1e3a5f"
                  strokeWidth="4"
                />
                {currentTrial.bottomArrows === 'out' ? (
                  <>
                    <line x1="40" y1="25" x2="5" y2="0" stroke="#1e3a5f" strokeWidth="3" />
                    <line x1="40" y1="25" x2="5" y2="50" stroke="#1e3a5f" strokeWidth="3" />
                    <line x1={currentTrial.bottomLength + 40} y1="25" x2={currentTrial.bottomLength + 75} y2="0" stroke="#1e3a5f" strokeWidth="3" />
                    <line x1={currentTrial.bottomLength + 40} y1="25" x2={currentTrial.bottomLength + 75} y2="50" stroke="#1e3a5f" strokeWidth="3" />
                  </>
                ) : (
                  <>
                    <line x1="40" y1="25" x2="65" y2="0" stroke="#1e3a5f" strokeWidth="3" />
                    <line x1="40" y1="25" x2="65" y2="50" stroke="#1e3a5f" strokeWidth="3" />
                    <line x1={currentTrial.bottomLength + 40} y1="25" x2={currentTrial.bottomLength + 15} y2="0" stroke="#1e3a5f" strokeWidth="3" />
                    <line x1={currentTrial.bottomLength + 40} y1="25" x2={currentTrial.bottomLength + 15} y2="50" stroke="#1e3a5f" strokeWidth="3" />
                  </>
                )}
              </svg>
            )}
          </div>
        </button>
      </div>
    </div>
  );
}
