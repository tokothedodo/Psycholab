/**
 * CHANGE BLINDNESS - Attention and Memory Experiment
 * 
 * Tests visual attention and change detection.
 * Participants view scenes with changes and must detect what changed.
 */

import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ExperimentWrapper } from './ExperimentWrapper';
import type { Experiment } from '../data/experiments';
import type { TrialData, ExperimentResults } from './ExperimentWrapper';
import { getDefaultConfig } from './config/experimentDefaults';

interface ChangeBlindnessConfig {
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
  blankDuration: number;
}

interface ChangeBlindnessProps {
  experiment: Experiment;
  onComplete: (results: ExperimentResults) => void;
  participantId: string;
  roomId: string;
  config?: Partial<ChangeBlindnessConfig>;
}

interface Scene {
  id: string;
  name: string;
  nameKey: string;
  elements: SceneElement[];
  change: ChangeDescription;
}

interface SceneElement {
  id: string;
  type: 'person' | 'object' | 'building' | 'vehicle';
  x: number;
  y: number;
  color: string;
  size: number;
}

interface ChangeDescription {
  elementId: string;
  changeType: 'position' | 'color' | 'size' | 'present' | 'absent';
  description: string;
  descriptionKey: string;
}

const DEFAULT_CONFIG = {
  ...getDefaultConfig('change-blindness'),
  blankDuration: 500,
  trials: 4,
  stimulusDuration: 3000,
} as ChangeBlindnessConfig;

const SCENES: Scene[] = [
  {
    id: 'street',
    name: 'Street Scene',
    nameKey: 'exp.changeBlindness.scene.street',
    elements: [
      { id: 'person1', type: 'person', x: 100, y: 150, color: '#e74c3c', size: 40 },
      { id: 'person2', type: 'person', x: 250, y: 180, color: '#3498db', size: 35 },
      { id: 'car', type: 'vehicle', x: 350, y: 220, color: '#2ecc71', size: 50 },
      { id: 'tree1', type: 'object', x: 50, y: 100, color: '#27ae60', size: 30 },
      { id: 'tree2', type: 'object', x: 400, y: 120, color: '#27ae60', size: 25 },
    ],
    change: { elementId: 'person2', changeType: 'color', description: 'Person changed color', descriptionKey: 'exp.changeBlindness.change.personColor' },
  },
  {
    id: 'office',
    name: 'Office Scene',
    nameKey: 'exp.changeBlindness.scene.office',
    elements: [
      { id: 'desk', type: 'object', x: 150, y: 200, color: '#8b4513', size: 60 },
      { id: 'computer', type: 'object', x: 170, y: 180, color: '#34495e', size: 30 },
      { id: 'chair', type: 'object', x: 100, y: 220, color: '#e67e22', size: 35 },
      { id: 'plant', type: 'object', x: 350, y: 180, color: '#27ae60', size: 25 },
      { id: 'lamp', type: 'object', x: 300, y: 150, color: '#f1c40f', size: 20 },
    ],
    change: { elementId: 'plant', changeType: 'present', description: 'Plant appeared', descriptionKey: 'exp.changeBlindness.change.plantAppeared' },
  },
  {
    id: 'park',
    name: 'Park Scene',
    nameKey: 'exp.changeBlindness.scene.park',
    elements: [
      { id: 'bench', type: 'object', x: 100, y: 200, color: '#795548', size: 45 },
      { id: 'dog', type: 'person', x: 200, y: 220, color: '#d35400', size: 30 },
      { id: 'ball', type: 'object', x: 320, y: 230, color: '#e74c3c', size: 15 },
      { id: 'person', type: 'person', x: 250, y: 150, color: '#9b59b6', size: 40 },
      { id: 'cloud1', type: 'object', x: 80, y: 50, color: '#ecf0f1', size: 35 },
    ],
    change: { elementId: 'ball', changeType: 'absent', description: 'Ball disappeared', descriptionKey: 'exp.changeBlindness.change.ballDisappeared' },
  },
  {
    id: 'cafe',
    name: 'Cafe Scene',
    nameKey: 'exp.changeBlindness.scene.cafe',
    elements: [
      { id: 'table', type: 'object', x: 200, y: 180, color: '#a0522d', size: 50 },
      { id: 'cup1', type: 'object', x: 180, y: 165, color: '#ffffff', size: 15 },
      { id: 'cup2', type: 'object', x: 230, y: 170, color: '#e74c3c', size: 15 },
      { id: 'person1', type: 'person', x: 120, y: 140, color: '#3498db', size: 35 },
      { id: 'person2', type: 'person', x: 300, y: 150, color: '#1abc9c', size: 35 },
    ],
    change: { elementId: 'person2', changeType: 'position', description: 'Person moved', descriptionKey: 'exp.changeBlindness.change.personMoved' },
  },
];

export function ChangeBlindnessExperiment({ experiment, onComplete, participantId, roomId, config = {} }: ChangeBlindnessProps) {
  const { t, language } = useLanguage();

  const settings: ChangeBlindnessConfig = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  type Phase = 'instruction' | 'firstView' | 'blank' | 'secondView' | 'response' | 'complete';
  const [phase, setPhase] = useState<Phase>('instruction');
  const [trialIndex, setTrialIndex] = useState(0);
  const [trialData, setTrialData] = useState<TrialData[]>([]);
  const [experimentStartTime, setExperimentStartTime] = useState(0);
  const [trialStartTime, setTrialStartTime] = useState(0);
  const [, setDetected] = useState<boolean | null>(null);
  const [, setShowSecondView] = useState(false);

  const generateStimuli = useCallback((): Scene[] => {
    let stimuli = [...SCENES];
    if (settings.randomizeOrder) {
      stimuli = stimuli.sort(() => Math.random() - 0.5);
    }
    return stimuli.slice(0, settings.trials);
  }, [settings.trials, settings.randomizeOrder]);

  const [allScenes] = useState(generateStimuli);

  useEffect(() => {
    if (phase === 'instruction') {
      setExperimentStartTime(performance.now());
    }
  }, [phase]);

  const startTrial = () => {
    setTrialStartTime(performance.now());
    setPhase('firstView');
    setDetected(null);
    setShowSecondView(false);

    setTimeout(() => {
      setPhase('blank');

      setTimeout(() => {
        setShowSecondView(true);
        setPhase('secondView');

        setTimeout(() => {
          setPhase('response');
        }, settings.stimulusDuration);
      }, settings.blankDuration);
    }, settings.stimulusDuration);
  };

  const handleResponse = (detection: boolean) => {
    const endTime = performance.now();
    const responseTime = Math.round(endTime - trialStartTime);

    const currentScene = allScenes[trialIndex];

    const trial: TrialData = {
      trialNumber: trialIndex + 1,
      responseTimeMs: responseTime,
      answer: detection ? 'detected' : 'not_detected',
      correctAnswer: currentScene.change.changeType === 'absent' ? 'not_detected' : 'detected',
      stimulus: { sceneId: currentScene.id, changeType: currentScene.change.changeType },
    };

    setTrialData(prev => [...prev, trial]);
    setDetected(detection);

    setTimeout(() => {
      if (trialIndex < allScenes.length - 1) {
        setTrialIndex(prev => prev + 1);
        startTrial();
      } else {
        completeExperiment();
      }
    }, settings.isi > 0 ? settings.isi : 1500);
  };

  const removeOutliers = (data: TrialData[]): TrialData[] => {
    if (data.length < 3) return data;
    const times = data.map(t => t.responseTimeMs).sort((a, b) => a - b);
    const q1 = times[Math.floor(times.length * 0.25)];
    const q3 = times[Math.floor(times.length * 0.75)];
    const iqr = q3 - q1;
    const lower = q1 - settings.outlierThreshold * iqr;
    const upper = q3 + settings.outlierThreshold * iqr;
    return data.filter(t => t.responseTimeMs >= lower && t.responseTimeMs <= upper);
  };

  const completeExperiment = () => {
    setPhase('complete');
    const endTime = performance.now();
    const totalTime = Math.round(endTime - experimentStartTime);

    let finalTrialData = trialData;
    if (settings.outlierRemoval) {
      finalTrialData = removeOutliers(trialData);
    }

    const detectionCount = trialData.filter(t => t.answer === 'detected').length;
    const detectionRate = (detectionCount / trialData.length) * 100;

    const results: ExperimentResults = {
      experimentName: experiment.id,
      participantId,
      roomId,
      language,
      timestamp: new Date().toISOString(),
      totalTrials: trialData.length,
      responseTimeMs: totalTime,
      accuracy: detectionRate,
      answer: detectionRate,
      correctAnswer: 'detection_rate_percentage',
      trialData: finalTrialData,
      debrief: t(experiment.debriefKey),
    };

    onComplete(results);
  };

  const renderElement = (element: SceneElement, isSecondView: boolean) => {
    const currentScene = allScenes[trialIndex];
    const changedElement = isSecondView && currentScene.change.elementId === element.id;

    let displayElement = { ...element };
    if (changedElement) {
      switch (currentScene.change.changeType) {
        case 'color':
          displayElement.color = element.color === '#3498db' ? '#e74c3c' : '#3498db';
          break;
        case 'position':
          displayElement.x = element.x + 50;
          break;
        case 'size':
          displayElement.size = element.size * 1.5;
          break;
      }
    }

    return (
      <div
        key={element.id}
        className="absolute rounded-full"
        style={{
          left: displayElement.x,
          top: displayElement.y,
          width: displayElement.size,
          height: displayElement.size,
          backgroundColor: displayElement.color,
        }}
      />
    );
  };

  if (phase === 'instruction') {
    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="max-w-2xl mx-auto p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
          <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-emerald-600 mb-6">{t('exp.changeBlindness.name')}</h2>

          <div className="bg-slate-50 border-l-4 border-teal-500 p-5 rounded-r-lg shadow-sm mb-6">
            <p className="text-slate-700 leading-relaxed text-md">
              {settings.customInstructions || t('exp.changeBlindness.instruction')}
            </p>
          </div>

          <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-5 mb-8">
            <p className="text-sm font-semibold text-indigo-900 mb-2 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              {t('exp.changeBlindness.instructionDetail')}
            </p>
            <p className="text-xs font-medium text-indigo-700 mt-2 bg-indigo-100/50 inline-block px-3 py-1 rounded-full">
              {settings.trials} scenes
            </p>
          </div>

          <p className="text-sm font-medium text-slate-400 mb-8 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
            {t('citation')}: {experiment.citation}, {experiment.year}
          </p>

          <button
            onClick={() => {
              setPhase('firstView');
              startTrial();
            }}
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
    const detectionCount = trialData.filter(t => t.answer === 'detected').length;
    const absentTrials = trialData.filter(t => (t.stimulus as { changeType: string }).changeType === 'absent');
    const presentTrials = trialData.filter(t => (t.stimulus as { changeType: string }).changeType !== 'absent');

    const absentDetected = absentTrials.filter(t => t.answer === 'detected').length;
    const presentDetected = presentTrials.filter(t => t.answer === 'detected').length;

    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="max-w-2xl mx-auto p-6">
          <h2 className="text-2xl font-bold text-navy-900 mb-4">{t('common.debrief.title')}</h2>

          <div className="bg-teal-50 border-l-4 border-teal-500 p-4 mb-4">
            <p className="text-teal-800 font-medium">{t('common.debrief.thankYou')}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-navy-900">{detectionCount}/{trialData.length}</p>
              <p className="text-sm text-gray-600">{t('exp.changeBlindness.changesDetected')}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-navy-900">{Math.round(trialData.reduce((s, t) => s + t.responseTimeMs, 0) / trialData.length)}ms</p>
              <p className="text-sm text-gray-600">{t('common.avgRT')}</p>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg mb-4">
            <p className="text-amber-800 font-medium mb-2">{t('exp.changeBlindness.performance')}:</p>
            <p className="text-sm text-amber-700">{t('exp.changeBlindness.addedChanges')}: {presentDetected}/{presentTrials.length}</p>
            <p className="text-sm text-amber-700">{t('exp.changeBlindness.removedChanges')}: {absentDetected}/{absentTrials.length}</p>
            <p className="text-sm text-amber-700 mt-2">{t('exp.changeBlindness.interpretation')}</p>
          </div>

          <p className="text-gray-600 mb-4">{t('exp.changeBlindness.debrief')}</p>
        </div>
      </ExperimentWrapper>
    );
  }

  const currentScene = allScenes[trialIndex];

  if (phase === 'blank') {
    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="max-w-4xl mx-auto p-8 bg-slate-50/80 backdrop-blur-md rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 min-h-[500px] flex flex-col relative overflow-hidden">
          <div className="absolute inset-0 bg-white -z-10 transition-colors duration-150"></div>
          {settings.showProgressBar && (
            <div className="mb-6 px-4 pt-2 opacity-50">
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-slate-300 transition-all"
                  style={{ width: `${((trialIndex + 1) / allScenes.length) * 100}%` }}
                />
              </div>
            </div>
          )}
          <div className="flex-1 flex items-center justify-center min-h-[300px]">
            <div className="text-slate-300 text-4xl animate-pulse">+</div>
          </div>
        </div>
      </ExperimentWrapper>
    );
  }

  if (phase === 'response') {
    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="max-w-3xl mx-auto p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 min-h-[500px] flex flex-col relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-white -z-10"></div>
          {settings.showProgressBar && (
            <div className="mb-8 px-4 pt-2">
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-teal-400 to-teal-500 transition-all duration-500 ease-out"
                  style={{ width: `${((trialIndex + 1) / allScenes.length) * 100}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex-1 flex flex-col justify-center items-center">
            <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight mb-12 text-center">
              {t('exp.changeBlindness.didYouSeeChange')}
            </h2>

            <div className="flex flex-col sm:flex-row justify-center gap-6 w-full max-w-xl">
              <button
                onClick={() => handleResponse(true)}
                className="group relative flex-1 py-6 bg-white rounded-2xl shadow-sm border-2 border-transparent hover:border-teal-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col items-center justify-center disabled:opacity-50 disabled:hover:translate-y-0"
              >
                <span className="absolute inset-0 bg-teal-50/0 group-hover:bg-teal-50/50 rounded-2xl transition-colors"></span>
                <span className="text-2xl font-bold text-slate-700 group-hover:text-teal-700 z-10 transition-colors uppercase tracking-wide mb-2">{t('common.yes')}</span>
                <p className="text-sm font-medium text-slate-400 z-10 group-hover:text-teal-600/70 transition-colors">{t('exp.changeBlindness.somethingChanged')}</p>
              </button>

              <button
                onClick={() => handleResponse(false)}
                className="group relative flex-1 py-6 bg-white rounded-2xl shadow-sm border-2 border-transparent hover:border-slate-300 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col items-center justify-center disabled:opacity-50 disabled:hover:translate-y-0"
              >
                <span className="absolute inset-0 bg-slate-50/0 group-hover:bg-slate-50/50 rounded-2xl transition-colors"></span>
                <span className="text-2xl font-bold text-slate-700 group-hover:text-slate-800 z-10 transition-colors uppercase tracking-wide mb-2">{t('common.no')}</span>
                <p className="text-sm font-medium text-slate-400 z-10 group-hover:text-slate-500/70 transition-colors">{t('exp.changeBlindness.sameScene')}</p>
              </button>
            </div>
          </div>
        </div>
      </ExperimentWrapper>
    );
  }

  const isSecondView = phase === 'secondView';

  return (
    <ExperimentWrapper experiment={experiment}>
      <div className="max-w-4xl mx-auto p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 min-h-[500px] flex flex-col relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-white -z-10"></div>
        {settings.showProgressBar && (
          <div className="mb-8 px-4 pt-2">
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-teal-400 to-teal-500 transition-all duration-500 ease-out"
                style={{ width: `${((trialIndex + 1) / allScenes.length) * 100}%` }}
              />
            </div>
            <div className="flex justify-between items-center mt-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-100 px-3 py-1 rounded-full">{isSecondView ? t('exp.changeBlindness.view2') : t('exp.changeBlindness.view1')}</span>
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                {trialIndex + 1} / {allScenes.length}
              </span>
            </div>
          </div>
        )}

        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
            {t('exp.changeBlindness.lookCarefully')}
          </h2>
        </div>

        <div className="flex-1 flex items-center justify-center mb-6">
          <div className="relative bg-slate-100 rounded-2xl shadow-inner border border-slate-200 overflow-hidden" style={{ width: 450, height: 300 }}>
            {/* The scene background to make it look like a solid 'canvas' */}
            <div className="absolute inset-0 bg-slate-50/50 z-0"></div>

            {/* Render items */}
            <div className="absolute inset-0 z-10">
              {currentScene.elements.map(element => renderElement(element, isSecondView))}
            </div>
          </div>
        </div>
      </div>
    </ExperimentWrapper>
  );
}

export default ChangeBlindnessExperiment;
