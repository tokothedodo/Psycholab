/**
 * DRM FALSE MEMORY - Memory Experiment
 * 
 * Tests false recognition of semantic lures.
 * Participants study word lists and later recognize words.
 */

import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ExperimentWrapper } from './ExperimentWrapper';
import type { Experiment } from '../data/experiments';
import type { TrialData, ExperimentResults } from './ExperimentWrapper';
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
        <div className="max-w-2xl mx-auto p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
          <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-emerald-600 mb-6">{t('exp.drm.name')}</h2>

          <div className="bg-slate-50 border-l-4 border-teal-500 p-5 rounded-r-lg shadow-sm mb-6">
            <p className="text-slate-700 leading-relaxed text-md">
              {settings.customInstructions || t('exp.drm.instruction')}
            </p>
          </div>

          <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-5 mb-8">
            <p className="text-sm font-semibold text-indigo-900 mb-2 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              {t('exp.drm.instructionDetail')}
            </p>
          </div>

          <p className="text-sm font-medium text-slate-400 mb-8 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
            {t('citation')}: {experiment.citation}, {experiment.year}
          </p>

          <button
            onClick={() => { setPhase('study'); setTrialIndex(0); }}
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
        <div className="max-w-3xl mx-auto p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 min-h-[500px] flex flex-col relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-white -z-10"></div>

          {settings.showProgressBar && (
            <div className="mb-8 px-4 pt-2">
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-teal-400 to-teal-500 transition-all duration-500 ease-out"
                  style={{ width: `${((trialIndex + 1) / allTestTrials.length) * 100}%` }}
                />
              </div>
              <div className="flex justify-between items-center mt-3">
                <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md uppercase tracking-wider">
                  {t('exp.drm.testPhase')}
                </span>
                <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                  {trialIndex + 1} / {allTestTrials.length}
                </span>
              </div>
            </div>
          )}

          <div className="flex-1 flex flex-col items-center justify-center animate-fade-in w-full max-w-xl mx-auto">
            <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight mb-8 text-center">
              {t('exp.drm.wasPresented')}
            </h2>

            <div className="flex justify-center mb-12 w-full">
              <div className="w-full sm:w-2/3 h-32 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center relative overflow-hidden group">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-teal-400 to-emerald-400 opacity-50"></div>
                <span className="text-4xl sm:text-5xl font-black text-slate-800 tracking-tight capitalize group-hover:scale-105 transition-transform duration-300">
                  {currentTrial.word}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-center gap-5 w-full">
              <button
                onClick={() => handleResponse('old')}
                className="group relative flex-1 py-6 px-4 bg-white rounded-2xl shadow-sm border-2 border-transparent hover:border-teal-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col items-center justify-center focus:outline-none focus:ring-4 focus:ring-teal-500/20"
              >
                <span className="absolute inset-0 bg-teal-50/0 group-hover:bg-teal-50/50 rounded-2xl transition-colors"></span>
                <span className="text-xl font-bold text-slate-700 group-hover:text-teal-700 z-10 transition-colors">{t('exp.drm.old')}</span>
              </button>
              <button
                onClick={() => handleResponse('new')}
                className="group relative flex-1 py-6 px-4 bg-white rounded-2xl shadow-sm border-2 border-transparent hover:border-indigo-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col items-center justify-center focus:outline-none focus:ring-4 focus:ring-indigo-500/20"
              >
                <span className="absolute inset-0 bg-indigo-50/0 group-hover:bg-indigo-50/50 rounded-2xl transition-colors"></span>
                <span className="text-xl font-bold text-slate-700 group-hover:text-indigo-700 z-10 transition-colors">{t('exp.drm.new')}</span>
              </button>
            </div>
          </div>
        </div>
      </ExperimentWrapper>
    );
  }

  if (phase === 'study' && allStudyTrials[trialIndex]) {
    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="max-w-4xl mx-auto p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 min-h-[500px] flex flex-col relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-white -z-10"></div>

          {settings.showProgressBar && (
            <div className="mb-8 px-4 pt-2">
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-teal-400 to-teal-500 transition-all duration-500 ease-out"
                  style={{ width: `${((trialIndex + 1) / allStudyTrials.length) * 100}%` }}
                />
              </div>
              <div className="flex justify-between items-center mt-3">
                <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md uppercase tracking-wider">
                  {t('exp.drm.studyPhase')}
                </span>
                <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                  List {trialIndex + 1} / {allStudyTrials.length}
                </span>
              </div>
            </div>
          )}

          <div className="text-center mb-10 mt-4">
            <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">
              {t('exp.drm.memorizeList')}
            </h2>
          </div>

          <div className="flex-1 flex justify-center items-center w-full min-h-[250px] mb-8">
            <div className="relative group w-full sm:w-[500px] h-64 mx-auto max-w-full">
              <div className="absolute inset-0 bg-teal-400 rounded-3xl opacity-20 blur-xl group-hover:opacity-30 transition-opacity duration-300"></div>

              <div className="relative w-full h-full bg-white/70 backdrop-blur-md rounded-3xl shadow-lg border border-teal-100/50 flex flex-col items-center justify-center p-8 overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/40 to-transparent pointer-events-none rounded-t-3xl"></div>

                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
                  Word {wordIndex + 1} of {allStudyTrials[trialIndex].list?.length || 0}
                </span>

                <span
                  key={allStudyTrials[trialIndex].list?.[wordIndex]}
                  className="text-5xl sm:text-6xl font-black text-slate-800 tracking-tight capitalize drop-shadow-sm animate-fade-in"
                >
                  {allStudyTrials[trialIndex].list?.[wordIndex]}
                </span>
              </div>
            </div>
          </div>

          {wordIndex >= (allStudyTrials[trialIndex].list?.length || 0) - 1 && trialIndex < allStudyTrials.length - 1 && (
            <div className="flex justify-center mt-auto pb-4 animate-fade-in">
              <button
                onClick={() => { setTrialIndex(prev => prev + 1); setWordIndex(0); }}
                className="group relative inline-flex px-8 py-4 bg-white rounded-xl shadow-sm border border-slate-200 hover:border-teal-400 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 items-center justify-center gap-2 focus:outline-none focus:ring-4 focus:ring-teal-500/20"
              >
                <span className="text-lg font-bold text-slate-700 group-hover:text-teal-600 transition-colors">Next List</span>
                <svg className="w-5 h-5 text-slate-400 group-hover:text-teal-500 transition-colors group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
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
