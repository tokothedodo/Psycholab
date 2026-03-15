/**
 * DRM FALSE MEMORY - Memory Experiment
 * 
 * Tests false recognition of semantic lures.
 * Participants study word lists and later recognize words.
 */

import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ExperimentWrapper } from '../components/experiments/ExperimentWrapper';
import type { Experiment } from '../data/experiments';
import type { TrialData, ExperimentResults } from '../components/experiments/ExperimentWrapper';
import { getDefaultConfig } from './config/experimentDefaults';

interface DRMConfig {
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
}

interface DRMProps {
  experiment: Experiment;
  onComplete: (results: ExperimentResults) => void;
  participantId: string;
  roomId: string;
  config?: Partial<DRMConfig>;
}

interface Trial {
  type: 'studied' | 'lure' | 'new';
  word: string;
  list?: string[];
}

const LISTS = [
  { lure: 'sleep', words: ['bed', 'rest', 'awake', 'tired', 'dream', 'wake', 'snooze', 'blanket', 'pillow', 'night'] },
  { lure: 'cold', words: ['winter', 'snow', 'ice', 'chill', 'frost', 'freezing', 'hot', 'warm', 'jacket', 'freezer'] },
  { lure: 'needle', words: ['thread', 'pin', 'sharp', 'sew', 'prick', 'point', 'eye', 'pain', 'cloth', 'hurt'] },
  { lure: 'window', words: ['glass', 'frame', 'pane', 'sill', 'curtain', 'view', 'door', 'house', 'light', 'open'] },
];

const DEFAULT_CONFIG = {
  ...getDefaultConfig('drm'),
  trials: 12,
  stimulusDuration: 2000,
} as DRMConfig;

export function DRMExperiment({ experiment, onComplete, participantId, roomId, config = {} }: DRMProps) {
  const { t, language } = useLanguage();
  
  const settings: DRMConfig = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  const [phase, setPhase] = useState<'instruction' | 'study' | 'break' | 'test' | 'complete'>('instruction');
  const [trialIndex, setTrialIndex] = useState(0);
  const [trialData, setTrialData] = useState<TrialData[]>([]);
  const [experimentStartTime, setExperimentStartTime] = useState(0);
  const [trialStartTime, setTrialStartTime] = useState(0);
  const [currentTrial, setCurrentTrial] = useState<Trial | null>(null);
  const [wordIndex, setWordIndex] = useState(0);

  const generateStimuli = useCallback((): { study: Trial[]; test: Trial[] } => {
    const studyList = LISTS.slice(0, settings.trials / 3).map(list => ({
      type: 'studied' as const,
      word: list.words[Math.floor(Math.random() * 5)],
      list: list.words,
    }));
    
    const testList: Trial[] = [];
    LISTS.slice(0, settings.trials / 3).forEach(list => {
      testList.push({ type: 'studied', word: list.words[Math.floor(Math.random() * 5)], list: list.words });
      testList.push({ type: 'lure', word: list.lure, list: list.words });
      testList.push({ type: 'new', word: list.words[8 + Math.floor(Math.random() * 2)], list: list.words });
    });
    
    if (settings.randomizeOrder) {
      return { study: studyList.sort(() => Math.random() - 0.5), test: testList.sort(() => Math.random() - 0.5) };
    }
    return { study: studyList, test: testList };
  }, [settings.trials, settings.randomizeOrder]);

  const { study: studyData, test: testData } = generateStimuli();
  const [allStudyTrials] = useState(studyData);
  const [allTestTrials] = useState(testData);

  useEffect(() => {
    if (phase === 'instruction') {
      setExperimentStartTime(performance.now());
    }
  }, [phase]);

  useEffect(() => {
    if (phase === 'study' && allStudyTrials[trialIndex]) {
      setWordIndex(0);
      const timer = setInterval(() => {
        setWordIndex(prev => {
          if (prev < allStudyTrials[trialIndex].list!.length - 1) return prev + 1;
          clearInterval(timer);
          return prev;
        });
      }, settings.stimulusDuration);
      return () => clearInterval(timer);
    }
  }, [phase, trialIndex]);

  const handleResponse = (response: 'old' | 'new') => {
    if (!currentTrial) return;

    const endTime = performance.now();
    const responseTime = Math.round(endTime - trialStartTime);
    
    const trial: TrialData = {
      trialNumber: trialIndex + 1,
      responseTimeMs: responseTime,
      answer: response,
      correctAnswer: currentTrial.type === 'new' ? 'new' : 'old',
      stimulus: { ...currentTrial },
    };

    setTrialData(prev => [...prev, trial]);

    if (trialIndex < allTestTrials.length - 1) {
      setTrialIndex(prev => prev + 1);
      setCurrentTrial(allTestTrials[trialIndex + 1]);
      setTrialStartTime(performance.now());
    } else {
      completeExperiment();
    }
  };

  const completeExperiment = () => {
    setPhase('complete');
    const endTime = performance.now();
    const totalTime = Math.round(endTime - experimentStartTime);

    const lureHits = trialData.filter(t => t.answer === 'old' && (t.stimulus as Trial).type === 'lure').length;

    const results: ExperimentResults = {
      experimentName: experiment.id,
      participantId,
      roomId,
      language,
      timestamp: new Date().toISOString(),
      totalTrials: trialData.length,
      responseTimeMs: totalTime,
      accuracy: (trialData.filter(t => t.answer === t.correctAnswer).length / trialData.length) * 100,
      answer: lureHits,
      correctAnswer: 'lure_false_alarm',
      trialData: trialData,
      debrief: t(experiment.debriefKey),
    };

    onComplete(results);
  };

  if (phase === 'instruction') {
    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="max-w-2xl mx-auto p-6">
          <h2 className="text-2xl font-bold text-navy-900 mb-4">{t('exp.drm.name')}</h2>
          <p className="text-gray-600 mb-4">
            {settings.customInstructions || t('exp.drm.instruction')}
          </p>
          <p className="text-sm text-gray-500 mb-4">
            {t('citation')}: {experiment.citation}, {experiment.year}
          </p>
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
            <p className="text-blue-800">{t('exp.drm.instructionDetail')}</p>
          </div>
          <button
            onClick={() => { setPhase('study'); setTrialIndex(0); }}
            className="bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 transition-colors"
          >
            {t('common.start')}
          </button>
        </div>
      </ExperimentWrapper>
    );
  }

  if (phase === 'complete') {
    const lureFA = trialData.filter(t => (t.stimulus as Trial).type === 'lure' && t.answer === 'old').length;
    const studiedHits = trialData.filter(t => (t.stimulus as Trial).type === 'studied' && t.answer === 'old').length;
    const correctRejections = trialData.filter(t => (t.stimulus as Trial).type === 'new' && t.answer === 'new').length;

    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="max-w-2xl mx-auto p-6">
          <h2 className="text-2xl font-bold text-navy-900 mb-4">{t('common.debrief.title')}</h2>
          <div className="bg-teal-50 border-l-4 border-teal-500 p-4 mb-4">
            <p className="text-teal-800 font-medium">{t('common.debrief.thankYou')}</p>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-navy-900">{studiedHits}/{trialData.filter(t => (t.stimulus as Trial).type === 'studied').length}</p>
              <p className="text-sm text-gray-600">{t('exp.drm.studied')}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-navy-900">{lureFA}/{trialData.filter(t => (t.stimulus as Trial).type === 'lure').length}</p>
              <p className="text-sm text-gray-600">{t('exp.drm.lureFalseAlarm')}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-navy-900">{correctRejections}/{trialData.filter(t => (t.stimulus as Trial).type === 'new').length}</p>
              <p className="text-sm text-gray-600">{t('exp.drm.correctRejection')}</p>
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg mb-4">
            <p className="text-amber-800 font-medium mb-2">{t('exp.drm.interpretation')}</p>
            <p className="text-sm text-amber-700">{t('exp.drm.explanation')}</p>
          </div>
          <p className="text-gray-600 mb-4">{t('exp.drm.debrief')}</p>
        </div>
      </ExperimentWrapper>
    );
  }

  if (phase === 'test' && currentTrial) {
    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="max-w-2xl mx-auto p-6">
          {settings.showProgressBar && (
            <div className="mb-6">
              <div className="h-2 bg-gray-200 rounded overflow-hidden">
                <div className="h-full bg-teal-600 transition-all" style={{ width: `${((trialIndex + 1) / allTestTrials.length) * 100}%` }} />
              </div>
            </div>
          )}

          <h2 className="text-xl font-semibold text-navy-900 mb-8 text-center">
            {t('exp.drm.wasPresented')}
          </h2>

          <div className="flex justify-center mb-8">
            <div className="w-32 h-16 bg-gray-100 rounded-lg flex items-center justify-center text-2xl font-bold">
              {currentTrial.word}
            </div>
          </div>

          <div className="flex justify-center gap-6">
            <button
              onClick={() => handleResponse('old')}
              className="bg-gray-100 hover:bg-teal-50 border-2 border-gray-200 hover:border-teal-500 px-8 py-4 rounded-lg transition-all"
            >
              <span className="text-lg font-semibold text-navy-900">{t('exp.drm.old')}</span>
            </button>
            <button
              onClick={() => handleResponse('new')}
              className="bg-gray-100 hover:bg-teal-50 border-2 border-gray-200 hover:border-teal-500 px-8 py-4 rounded-lg transition-all"
            >
              <span className="text-lg font-semibold text-navy-900">{t('exp.drm.new')}</span>
            </button>
          </div>
        </div>
      </ExperimentWrapper>
    );
  }

  if (phase === 'study' && allStudyTrials[trialIndex]) {
    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="max-w-2xl mx-auto p-6">
          {settings.showProgressBar && (
            <div className="mb-6">
              <div className="h-2 bg-gray-200 rounded overflow-hidden">
                <div className="h-full bg-teal-600 transition-all" style={{ width: `${((trialIndex + 1) / allStudyTrials.length) * 100}%` }} />
              </div>
            </div>
          )}

          <h2 className="text-xl font-semibold text-navy-900 mb-8 text-center">
            {t('exp.drm.memorizeList')}
          </h2>

          <div className="flex justify-center mb-8">
            <span className="text-4xl font-bold text-navy-900">{allStudyTrials[trialIndex].list?.[wordIndex]}</span>
          </div>

          {wordIndex >= 9 && trialIndex < allStudyTrials.length - 1 && (
            <div className="flex justify-center mt-8">
              <button
                onClick={() => { setTrialIndex(prev => prev + 1); setWordIndex(0); }}
                className="bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 transition-colors"
              >
                Next List
              </button>
            </div>
          )}
        </div>
      </ExperimentWrapper>
    );
  }

  return null;
}

export default DRMExperiment;
