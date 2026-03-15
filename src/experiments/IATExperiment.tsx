/**
 * IMPLICIT ASSOCIATION TEST (IAT) - Social Psychology Experiment
 * 
 * Measures automatic associations via response time.
 */

import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ExperimentWrapper } from './ExperimentWrapper';
import type { Experiment } from '../data/experiments';
import type { TrialData, ExperimentResults } from './ExperimentWrapper';
import { getDefaultConfig } from './config/experimentDefaults';

interface IATConfig {
  trials: number;
  isi: number;
  showFeedback: boolean;
  customInstructions: string;
}

interface IATProps {
  experiment: Experiment;
  onComplete: (results: ExperimentResults) => void;
  participantId: string;
  roomId: string;
  config?: Partial<IATConfig>;
}

const CATEGORY_A = ['apple', 'banana', 'cherry', 'grape'];
const CATEGORY_B = ['car', 'bike', 'train', 'bus'];
const TARGET_LEFT = [...CATEGORY_A, ...CATEGORY_B].sort(() => Math.random() - 0.5);

const DEFAULT_CONFIG = { ...getDefaultConfig('iat'), trials: 80 } as IATConfig;

export function IATExperiment({ experiment, onComplete, participantId, roomId, config = {} }: IATProps) {
  const { t, language } = useLanguage();
  const settings: IATConfig = { ...DEFAULT_CONFIG, ...config };

  const [phase, setPhase] = useState<'instruction' | 'practice' | 'test' | 'complete'>('instruction');
  const [trialIndex, setTrialIndex] = useState(0);
  const [trialData, setTrialData] = useState<TrialData[]>([]);
  const [experimentStartTime, setExperimentStartTime] = useState(0);
  const [trialStartTime, setTrialStartTime] = useState(0);
  const [currentStimulus, setCurrentStimulus] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);

  useEffect(() => { if (phase === 'instruction') setExperimentStartTime(performance.now()); }, [phase]);

  useEffect(() => {
    if (phase === 'test' || phase === 'practice') {
      const idx = phase === 'practice' ? trialIndex % 10 : trialIndex;
      setCurrentStimulus(TARGET_LEFT[idx % TARGET_LEFT.length]);
      setTrialStartTime(performance.now());
    }
  }, [phase, trialIndex]);

  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    if (phase !== 'test' && phase !== 'practice') return;
    
    const isCategoryA = CATEGORY_A.includes(currentStimulus);
    const choice = e.key === 'e' || e.key === 'E' ? 'left' : e.key === 'i' || e.key === 'I' ? 'right' : null;
    if (!choice) return;

    const correct = (choice === 'left' && isCategoryA) || (choice === 'right' && !isCategoryA);
    const responseTime = Math.round(performance.now() - trialStartTime);
    
    const trial: TrialData = {
      trialNumber: trialIndex + 1,
      responseTimeMs: responseTime,
      answer: choice,
      correctAnswer: isCategoryA ? 'left' : 'right',
      stimulus: { stimulus: currentStimulus, correct },
    };
    setTrialData(prev => [...prev, trial]);
    
    if (settings.showFeedback && phase === 'practice') {
      setShowFeedback(true);
      setTimeout(() => {
        setShowFeedback(false);
        advanceTrial();
      }, 300);
    } else {
      advanceTrial();
    }
  }, [phase, currentStimulus, trialStartTime, trialIndex]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  const advanceTrial = () => {
    const maxTrials = phase === 'practice' ? 10 : settings.trials;
    if (trialIndex < maxTrials - 1) {
      setTrialIndex(prev => prev + 1);
    } else if (phase === 'practice') {
      setTrialIndex(0);
      setPhase('test');
    } else {
      completeExperiment();
    }
  };

  const completeExperiment = () => {
    setPhase('complete');
    const avgRT = trialData.reduce((s, t) => s + t.responseTimeMs, 0) / trialData.length;
    const accuracy = trialData.filter(t => t.answer === t.correctAnswer).length / trialData.length * 100;
    const results: ExperimentResults = {
      experimentName: experiment.id,
      participantId,
      roomId,
      language,
      timestamp: new Date().toISOString(),
      totalTrials: trialData.length,
      responseTimeMs: Math.round(performance.now() - experimentStartTime),
      accuracy,
      answer: avgRT,
      correctAnswer: 'avg_rt_ms',
      trialData,
      debrief: t(experiment.debriefKey),
    };
    onComplete(results);
  };

  if (phase === 'instruction') {
    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="max-w-2xl mx-auto p-6">
          <h2 className="text-2xl font-bold text-navy-900 mb-4">{t('exp.iat.name')}</h2>
          <p className="text-gray-600 mb-4">{settings.customInstructions || t('exp.iat.instruction')}</p>
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
            <p className="text-blue-800">{t('exp.iat.instructionDetail')}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <p className="text-sm text-gray-600">{t('exp.iat.keys')}: E = Left, I = Right</p>
          </div>
          <button onClick={() => setPhase('practice')} className="bg-teal-600 text-white px-6 py-3 rounded-lg">{t('common.start')}</button>
        </div>
      </ExperimentWrapper>
    );
  }

  if (phase === 'complete') {
    const avgRT = trialData.reduce((s, t) => s + t.responseTimeMs, 0) / trialData.length;
    const accuracy = trialData.filter(t => t.answer === t.correctAnswer).length / trialData.length * 100;
    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="max-w-2xl mx-auto p-6">
          <h2 className="text-2xl font-bold text-navy-900 mb-4">{t('common.debrief.title')}</h2>
          <div className="bg-teal-50 border-l-4 border-teal-500 p-4 mb-4">
            <p className="text-teal-800 font-medium">{t('common.debrief.thankYou')}</p>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-navy-900">{Math.round(avgRT)}ms</p>
              <p className="text-sm text-gray-600">{t('common.avgRT')}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-navy-900">{Math.round(accuracy)}%</p>
              <p className="text-sm text-gray-600">{t('common.correct')}</p>
            </div>
          </div>
          <p className="text-gray-600 mb-4">{t('exp.iat.debrief')}</p>
        </div>
      </ExperimentWrapper>
    );
  }

  const maxTrials = phase === 'practice' ? 10 : settings.trials;

  return (
    <ExperimentWrapper experiment={experiment}>
      <div className="max-w-2xl mx-auto p-6">
        <div className="mb-6"><div className="h-2 bg-gray-200 rounded"><div className="h-full bg-teal-600" style={{ width: `${((trialIndex + 1) / maxTrials) * 100}%` }} /></div></div>
        <div className="flex justify-between mb-8">
          <div className="text-center"><span className="text-sm text-gray-500">E = Fruits</span></div>
          <div className="text-center"><span className="text-sm text-gray-500">I = Vehicles</span></div>
        </div>
        {showFeedback && (
          <div className="text-center mb-4">
            <span className="text-green-600 font-bold">✓</span>
          </div>
        )}
        <div className="flex justify-center items-center min-h-[100px]">
          <span className="text-4xl font-bold text-navy-900">{currentStimulus}</span>
        </div>
        <p className="text-center text-gray-400 text-sm mt-8">{t('exp.iat.pressKey')}</p>
      </div>
    </ExperimentWrapper>
  );
}

export default IATExperiment;
