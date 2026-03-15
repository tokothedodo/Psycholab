/**
 * SERIAL POSITION EFFECT - Memory Experiment
 * 
 * Tests memory for item position in a list.
 * Measures primacy and recency effects in recall.
 */

import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ExperimentWrapper } from '../components/experiments/ExperimentWrapper';
import type { Experiment } from '../data/experiments';
import type { TrialData, ExperimentResults } from '../components/experiments/ExperimentWrapper';
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
        <div className="max-w-2xl mx-auto p-6">
          <h2 className="text-2xl font-bold text-navy-900 mb-4">{t('exp.serialPosition.name')}</h2>
          <p className="text-gray-600 mb-4">
            {settings.customInstructions || t('exp.serialPosition.instruction')}
          </p>
          <p className="text-sm text-gray-500 mb-4">
            {t('citation')}: {experiment.citation}, {experiment.year}
          </p>
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
            <p className="text-blue-800">{t('exp.serialPosition.instructionDetail')}</p>
          </div>
          <button
            onClick={() => setPhase('study')}
            className="bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 transition-colors"
          >
            {t('common.start')}
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
        <div className="max-w-2xl mx-auto p-6">
          {settings.showProgressBar && (
            <div className="mb-6">
              <div className="h-2 bg-gray-200 rounded overflow-hidden">
                <div className="h-full bg-teal-600 transition-all" style={{ width: `${((trialIndex + 1) / settings.trials) * 100}%` }} />
              </div>
            </div>
          )}

          <h2 className="text-xl font-semibold text-navy-900 mb-4 text-center">
            {t('exp.serialPosition.recallInstructions')}
          </h2>
          <p className="text-gray-600 mb-4 text-center">
            {t('exp.serialPosition.separateBy')}: {currentList.join(', ')}
          </p>

          <div className="max-w-md mx-auto">
            <textarea
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder={t('exp.serialPosition.placeholder')}
              className="w-full h-40 px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-center mt-6">
            <button
              onClick={handleSubmit}
              className="bg-teal-600 text-white px-8 py-3 rounded-lg hover:bg-teal-700 transition-colors"
            >
              {t('common.submit')}
            </button>
          </div>
        </div>
      </ExperimentWrapper>
    );
  }

  return (
    <ExperimentWrapper experiment={experiment}>
      <div className="max-w-2xl mx-auto p-6">
        {settings.showProgressBar && (
          <div className="mb-6">
            <div className="h-2 bg-gray-200 rounded overflow-hidden">
              <div className="h-full bg-teal-600 transition-all" style={{ width: `${((trialIndex + 1) / settings.trials) * 100}%` }} />
            </div>
            <p className="text-sm text-gray-500 text-center mt-1">
              List {trialIndex + 1} / {settings.trials} | Word {showWordIndex + 1} / {settings.listLength}
            </p>
          </div>
        )}

        <h2 className="text-xl font-semibold text-navy-900 mb-8 text-center">
          {t('exp.serialPosition.memorize')}
        </h2>

        <div className="flex justify-center items-center min-h-[100px]">
          <span className="text-4xl font-bold text-navy-900">{currentList[showWordIndex]}</span>
        </div>
      </div>
    </ExperimentWrapper>
  );
}

export default SerialPositionExperiment;
