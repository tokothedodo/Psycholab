/**
 * SERIAL POSITION EFFECT - Memory Experiment
 * 
 * Tests memory for item position in a list.
 * Measures primacy and recency effects in recall.
 */

import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ExperimentWrapper } from './ExperimentWrapper';
import type { Experiment } from '../data/experiments';
import type { TrialData, ExperimentResults } from './ExperimentWrapper';
import { getDefaultConfig } from './config/experimentDefaults';

interface SerialPositionConfig {
  trials: number;
  isi: number;
  stimulusDuration: number;
  responseTimeLimit: number;
  showFeedback: boolean;
  showProgressBar: boolean;
  customInstructions: string;
  randomizeOrder: boolean;
  practiceTrials: number;
  outlierRemoval: boolean;
  outlierThreshold: number;
  listLength: number;
}

interface SerialPositionProps {
  experiment: Experiment;
  onComplete: (results: ExperimentResults) => void;
  participantId: string;
  roomId: string;
  config?: Partial<SerialPositionConfig>;
}

const WORDS = ['apple', 'bread', 'chair', 'door', 'earth', 'fire', 'grape', 'house', 'iron', 'juice',
  'kite', 'lemon', 'mouse', 'night', 'ocean', 'paper', 'queen', 'river', 'stone', 'table',
  'umbrella', 'violet', 'water', 'xenon', 'yellow', 'zebra'];

const DEFAULT_CONFIG = {
  ...getDefaultConfig('serial-position'),
  listLength: 10,
  trials: 3,
} as SerialPositionConfig;

export function SerialPositionExperiment({ experiment, onComplete, participantId, roomId, config = {} }: SerialPositionProps) {
  const { t, language } = useLanguage();

  const settings: SerialPositionConfig = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  const [phase, setPhase] = useState<'instruction' | 'study' | 'recall' | 'complete'>('instruction');
  const [trialIndex, setTrialIndex] = useState(0);
  const [trialData, setTrialData] = useState<TrialData[]>([]);
  const [experimentStartTime, setExperimentStartTime] = useState(0);
  const [trialStartTime, setTrialStartTime] = useState(0);
  const [currentList, setCurrentList] = useState<string[]>([]);
  const [userInput, setUserInput] = useState('');
  const [showWordIndex, setShowWordIndex] = useState(0);

  const generateList = useCallback((): string[] => {
    const shuffled = [...WORDS].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, settings.listLength);
  }, [settings.listLength]);

  useEffect(() => {
    if (phase === 'instruction') {
      setExperimentStartTime(performance.now());
    }
  }, [phase]);

  useEffect(() => {
    if (phase === 'study') {
      setCurrentList(generateList());
      setShowWordIndex(0);
    }
  }, [phase, trialIndex]);

  useEffect(() => {
    if (phase === 'study' && currentList.length > 0) {
      const timer = setInterval(() => {
        setShowWordIndex(prev => {
          if (prev < currentList.length - 1) {
            return prev + 1;
          } else {
            clearInterval(timer);
            setPhase('recall');
            setTrialStartTime(performance.now());
            return prev;
          }
        });
      }, settings.stimulusDuration > 0 ? settings.stimulusDuration : 1500);
      return () => clearInterval(timer);
    }
  }, [phase, currentList, settings.stimulusDuration]);

  const handleSubmit = () => {
    const endTime = performance.now();
    const responseTime = Math.round(endTime - trialStartTime);

    const recalledWords = userInput.toLowerCase().split(/[,\s]+/).filter(w => w.length > 0);
    const correctWords = currentList.filter(w => recalledWords.includes(w.toLowerCase()));

    const positionScores: Record<string, number> = {};
    currentList.forEach((word, index) => {
      const recalledIndex = recalledWords.findIndex(w => w.toLowerCase() === word.toLowerCase());
      if (recalledIndex !== -1) {
        const positionCategory = index < 3 ? 'primacy' : index >= currentList.length - 3 ? 'recency' : 'middle';
        positionScores[positionCategory] = (positionScores[positionCategory] || 0) + 1;
      }
    });

    const trial: TrialData = {
      trialNumber: trialIndex + 1,
      responseTimeMs: responseTime,
      answer: userInput,
      correctAnswer: currentList.join(', '),
      stimulus: { list: currentList, recalled: correctWords, positionScores },
    };

    setTrialData(prev => [...prev, trial]);

    if (trialIndex < settings.trials - 1) {
      setTimeout(() => {
        setTrialIndex(prev => prev + 1);
        setPhase('study');
        setUserInput('');
      }, settings.isi > 0 ? settings.isi : 1000);
    } else {
      completeExperiment();
    }
  };

  const completeExperiment = () => {
    setPhase('complete');
    const endTime = performance.now();
    const totalTime = Math.round(endTime - experimentStartTime);

    let totalCorrect = 0;
    let primacyCorrect = 0;
    let recencyCorrect = 0;
    let middleCorrect = 0;

    trialData.forEach(t => {
      const stim = t.stimulus as { recalled: string[]; positionScores: Record<string, number> };
      totalCorrect += stim.recalled.length;
      primacyCorrect += stim.positionScores.primacy || 0;
      recencyCorrect += stim.positionScores.recency || 0;
      middleCorrect += stim.positionScores.middle || 0;
    });

    const totalWords = settings.trials * settings.listLength;
    const accuracy = (totalCorrect / totalWords) * 100;

    const results: ExperimentResults = {
      experimentName: experiment.id,
      participantId,
      roomId,
      language,
      timestamp: new Date().toISOString(),
      totalTrials: trialData.length,
      responseTimeMs: totalTime,
      accuracy,
      answer: `${primacyCorrect}:${recencyCorrect}:${middleCorrect}`,
      correctAnswer: 'primacy:recency:middle_scores',
      trialData: trialData,
      debrief: t(experiment.debriefKey),
    };

    onComplete(results);
  };

  if (phase === 'instruction') {
    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="max-w-2xl mx-auto p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
          <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-emerald-600 mb-6">{t('exp.serialPosition.name')}</h2>

          <div className="bg-slate-50 border-l-4 border-teal-500 p-5 rounded-r-lg shadow-sm mb-6">
            <p className="text-slate-700 leading-relaxed text-md">
              {settings.customInstructions || t('exp.serialPosition.instruction')}
            </p>
          </div>

          <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-5 mb-8">
            <p className="text-sm font-semibold text-indigo-900 mb-2 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              {t('exp.serialPosition.instructionDetail')}
            </p>
          </div>

          <p className="text-sm font-medium text-slate-400 mb-8 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
            {t('citation')}: {experiment.citation}, {experiment.year}
          </p>

          <button
            onClick={() => setPhase('study')}
            className="group relative w-full sm:w-auto bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-semibold flex tracking-wide items-center justify-center gap-3 px-8 py-4 rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
          >
            {t('common.start')}
            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
          </button>
        </div>
      </ExperimentWrapper>
    );
  }

  if (phase === 'complete') {
    let primacyScore = 0, recencyScore = 0, middleScore = 0;
    trialData.forEach(t => {
      const stim = t.stimulus as { positionScores: Record<string, number> };
      primacyScore += stim.positionScores.primacy || 0;
      recencyScore += stim.positionScores.recency || 0;
      middleScore += stim.positionScores.middle || 0;
    });

    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="max-w-2xl mx-auto p-6">
          <h2 className="text-2xl font-bold text-navy-900 mb-4">{t('common.debrief.title')}</h2>
          <div className="bg-teal-50 border-l-4 border-teal-500 p-4 mb-4">
            <p className="text-teal-800 font-medium">{t('common.debrief.thankYou')}</p>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-navy-900">{primacyScore}</p>
              <p className="text-sm text-gray-600">{t('exp.serialPosition.primacy')}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-navy-900">{middleScore}</p>
              <p className="text-sm text-gray-600">{t('exp.serialPosition.middle')}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-navy-900">{recencyScore}</p>
              <p className="text-sm text-gray-600">{t('exp.serialPosition.recency')}</p>
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg mb-4">
            <p className="text-amber-800 font-medium mb-2">{t('exp.serialPosition.interpretation')}</p>
            <p className="text-sm text-amber-700">
              {recencyScore > primacyScore && recencyScore > middleScore
                ? t('exp.serialPosition.recencyEffect')
                : primacyScore > recencyScore && primacyScore > middleScore
                  ? t('exp.serialPosition.primacyEffect')
                  : t('exp.serialPosition.both')}
            </p>
          </div>
          <p className="text-gray-600 mb-4">{t('exp.serialPosition.debrief')}</p>
        </div>
      </ExperimentWrapper>
    );
  }

  if (phase === 'recall') {
    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="max-w-3xl mx-auto p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 min-h-[500px] flex flex-col relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-white -z-10"></div>
          {settings.showProgressBar && (
            <div className="mb-8 px-4 pt-2">
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-teal-400 to-teal-500 transition-all duration-500 ease-out"
                  style={{ width: `${((trialIndex + 1) / settings.trials) * 100}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex-1 flex flex-col justify-center animate-fade-in w-full max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight mb-4 text-center">
              {t('exp.serialPosition.recallInstructions')}
            </h2>
            <div className="inline-block mx-auto mb-8 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-2 rounded-lg text-sm font-medium shadow-sm">
              <span className="font-bold uppercase tracking-wider text-xs mr-2">{t('exp.serialPosition.separateBy')}:</span>
              {currentList.join(', ')}
            </div>

            <div className="w-full relative shadow-sm hover:shadow-md transition-shadow duration-300 rounded-xl overflow-hidden group">
              <textarea
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder={t('exp.serialPosition.placeholder')}
                className="w-full h-48 px-6 py-5 border-2 border-slate-200 rounded-xl focus:border-teal-400 focus:ring focus:ring-teal-400/20 bg-white/70 backdrop-blur-md outline-none transition-all resize-none shadow-inner text-slate-700 font-medium tracking-wide placeholder:text-slate-300 placeholder:font-normal text-lg"
              />
              <div className="absolute top-0 left-0 w-1 h-full bg-teal-400 transform origin-top scale-y-0 group-focus-within:scale-y-100 transition-transform duration-300"></div>
            </div>

            <div className="flex justify-center mt-10">
              <button
                onClick={handleSubmit}
                className="group relative w-full sm:w-auto bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-semibold flex tracking-wide items-center justify-center gap-3 px-10 py-4 rounded-xl shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 focus:ring-4 focus:ring-teal-500/30"
              >
                {t('common.submit')}
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
              </button>
            </div>
          </div>
        </div>
      </ExperimentWrapper>
    );
  }

  return (
    <ExperimentWrapper experiment={experiment}>
      <div className="max-w-4xl mx-auto p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 min-h-[500px] flex flex-col relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-white -z-10"></div>
        {settings.showProgressBar && (
          <div className="mb-8 px-4 pt-2">
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-teal-400 to-teal-500 transition-all duration-500 ease-out"
                style={{ width: `${((trialIndex + 1) / settings.trials) * 100}%` }}
              />
            </div>
            <div className="flex justify-between items-center mt-3">
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                List {trialIndex + 1} / {settings.trials}
              </span>
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                Word {showWordIndex + 1} / {settings.listLength}
              </span>
            </div>
          </div>
        )}

        <div className="text-center mb-10">
          <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">
            {t('exp.serialPosition.memorize')}
          </h2>
        </div>

        <div className="flex-1 flex justify-center items-center w-full min-h-[300px] mb-8 pb-10">
          <div className="relative group w-[500px] h-64 mx-auto max-w-full">
            {/* Soft backdrop glow effect around the card */}
            <div className="absolute inset-0 bg-teal-400 rounded-3xl opacity-20 blur-xl group-hover:opacity-30 transition-opacity duration-300"></div>

            <div className="relative w-full h-full bg-white/70 backdrop-blur-md rounded-3xl shadow-lg border border-teal-100/50 flex items-center justify-center p-8 overflow-hidden">
              {/* Subtle top glare for 3D effect */}
              <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/40 to-transparent pointer-events-none rounded-t-3xl"></div>

              <span
                key={currentList[showWordIndex]} // Key ensures re-animation when word changes
                className="text-6xl sm:text-7xl font-extrabold text-slate-800 tracking-tight capitalize drop-shadow-sm animate-fade-in"
              >
                {currentList[showWordIndex]}
              </span>
            </div>
          </div>
        </div>
      </div>
    </ExperimentWrapper>
  );
}

export default SerialPositionExperiment;
