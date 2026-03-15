import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import type { Experiment } from '../data/experiments';
import type { TrialData } from '../components/experiments/ExperimentWrapper';

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
      <div className="max-w-2xl mx-auto p-6">
        <h2 className="text-2xl font-bold text-navy-900 mb-4">{t('exp.mullerLyer.name')}</h2>
        <p className="text-gray-600 mb-6">{t('exp.mullerLyer.instruction')}</p>
        <p className="text-sm text-gray-500 mb-4">{t('citation')}: {experiment.citation}, {experiment.year}</p>
        <button
          onClick={() => {
            setPhase('experiment');
            setExperimentStartTime(performance.now());
            setCurrentTrial(allTrials[0]);
          }}
          className="bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 transition-colors"
        >
          {t('common.start')}
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
    <div className="max-w-2xl mx-auto p-6">
      <div className="text-center mb-4 text-gray-500">
        {t('exp.mullerLyer.trial')} {trialIndex + 1} / {TOTAL_TRIALS}
      </div>

      <h3 className="text-xl font-semibold text-navy-900 mb-8 text-center">
        {t('exp.mullerLyer.question')}
      </h3>
      
      <div className="space-y-12 mb-8">
        <button
          onClick={() => handleChoice('top')}
          className="w-full py-8 hover:bg-gray-50 transition-colors cursor-pointer"
        >
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
          className="w-full py-8 hover:bg-gray-50 transition-colors cursor-pointer"
        >
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
