/**
 * RUBIN'S VASE - Figure-Ground Perception Experiment
 * 
 * Tests figure-ground perception and reversible figures.
 * Participants report whether they see faces or a vase.
 */

import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ExperimentWrapper } from './ExperimentWrapper';
import type { Experiment } from '../data/experiments';
import type { TrialData, ExperimentResults } from './ExperimentWrapper';
import { getDefaultConfig } from './config/experimentDefaults';

interface RubinVaseConfig {
  trials: number;
  isi: number;
  showFeedback: boolean;
  showProgressBar: boolean;
  customInstructions: string;
  randomizeOrder: boolean;
}

interface RubinVaseProps {
  experiment: Experiment;
  onComplete: (results: ExperimentResults) => void;
  participantId: string;
  roomId: string;
  config?: Partial<RubinVaseConfig>;
}

const DEFAULT_CONFIG = {
  ...getDefaultConfig('rubin-figure-ground-paradigm'),
  trials: 10,
} as RubinVaseConfig;

export function RubinVaseExperiment({ experiment, onComplete, participantId, roomId, config = {} }: RubinVaseProps) {
  const { t, language } = useLanguage();
  const settings: RubinVaseConfig = { ...DEFAULT_CONFIG, ...config };

  const [phase, setPhase] = useState<'instruction' | 'experiment' | 'complete'>('instruction');
  const [trialIndex, setTrialIndex] = useState(0);
  const [trialData, setTrialData] = useState<TrialData[]>([]);
  const [experimentStartTime, setExperimentStartTime] = useState(0);
  const [trialStartTime, setTrialStartTime] = useState(0);

  useEffect(() => {
    if (phase === 'instruction') setExperimentStartTime(performance.now());
  }, [phase]);

  useEffect(() => {
    if (phase === 'experiment') {
      setTrialStartTime(performance.now());
    }
  }, [phase, trialIndex]);

  const handleResponse = (percept: 'faces' | 'vase') => {
    const endTime = performance.now();
    const responseTime = Math.round(endTime - trialStartTime);
    
    const trial: TrialData = {
      trialNumber: trialIndex + 1,
      responseTimeMs: responseTime,
      answer: percept,
      correctAnswer: percept === 'faces' ? 'faces' : 'vase',
      stimulus: {},
    };

    setTrialData(prev => [...prev, trial]);

    setTimeout(() => {
      if (trialIndex < settings.trials - 1) {
        setTrialIndex(prev => prev + 1);
      } else {
        completeExperiment();
      }
    }, settings.isi > 0 ? settings.isi : 500);
  };

  const completeExperiment = () => {
    setPhase('complete');
    const totalTime = Math.round(performance.now() - experimentStartTime);
    
    const facesCount = trialData.filter(t => t.answer === 'faces').length;
    const vaseCount = trialData.filter(t => t.answer === 'vase').length;

    const results: ExperimentResults = {
      experimentName: experiment.id,
      participantId,
      roomId,
      language,
      timestamp: new Date().toISOString(),
      totalTrials: trialData.length,
      responseTimeMs: totalTime,
      accuracy: 50,
      answer: `${facesCount}:${vaseCount}`,
      correctAnswer: 'faces:vase_counts',
      trialData: trialData,
      debrief: t(experiment.debriefKey),
    };
    onComplete(results);
  };

  if (phase === 'instruction') {
    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="max-w-2xl mx-auto p-6">
          <h2 className="text-2xl font-bold text-navy-900 mb-4">{t('exp.rubinVase.name')}</h2>
          <p className="text-gray-600 mb-4">{settings.customInstructions || t('exp.rubinVase.instruction')}</p>
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
            <p className="text-blue-800">{t('exp.rubinVase.instructionDetail')}</p>
          </div>
          <button onClick={() => setPhase('experiment')} className="bg-teal-600 text-white px-6 py-3 rounded-lg">
            {t('common.start')}
          </button>
        </div>
      </ExperimentWrapper>
    );
  }

  if (phase === 'complete') {
    const faces = trialData.filter(t => t.answer === 'faces').length;
    const vase = trialData.filter(t => t.answer === 'vase').length;
    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="max-w-2xl mx-auto p-6">
          <h2 className="text-2xl font-bold text-navy-900 mb-4">{t('common.debrief.title')}</h2>
          <div className="bg-teal-50 border-l-4 border-teal-500 p-4 mb-4">
            <p className="text-teal-800 font-medium">{t('common.debrief.thankYou')}</p>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-navy-900">{faces}</p>
              <p className="text-sm text-gray-600">{t('exp.rubinVase.faces')}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-navy-900">{vase}</p>
              <p className="text-sm text-gray-600">{t('exp.rubinVase.vase')}</p>
            </div>
          </div>
          <p className="text-gray-600 mb-4">{t('exp.rubinVase.debrief')}</p>
        </div>
      </ExperimentWrapper>
    );
  }

  return (
    <ExperimentWrapper experiment={experiment}>
      <div className="max-w-2xl mx-auto p-6">
        {settings.showProgressBar && (
          <div className="mb-6"><div className="h-2 bg-gray-200 rounded"><div className="h-full bg-teal-600" style={{ width: `${((trialIndex + 1) / settings.trials) * 100}%` }} /></div></div>
        )}
        <h2 className="text-xl font-semibold text-navy-900 mb-6 text-center">{t('exp.rubinVase.whatDoYouSee')}</h2>
        <div className="flex justify-center mb-8">
          <svg width="300" height="200" viewBox="0 0 300 200">
            <path d="M0,0 L100,0 L150,100 L200,0 L300,0 L300,200 L200,200 L150,100 L100,200 L0,200 Z" fill="#1e3a5f" />
          </svg>
        </div>
        <div className="flex justify-center gap-6">
          <button onClick={() => handleResponse('faces')} className="bg-gray-100 hover:bg-teal-50 border-2 border-gray-200 hover:border-teal-500 px-8 py-4 rounded-lg">
            <span className="text-lg font-semibold">{t('exp.rubinVase.faces')}</span>
          </button>
          <button onClick={() => handleResponse('vase')} className="bg-gray-100 hover:bg-teal-50 border-2 border-gray-200 hover:border-teal-500 px-8 py-4 rounded-lg">
            <span className="text-lg font-semibold">{t('exp.rubinVase.vase')}</span>
          </button>
        </div>
      </div>
    </ExperimentWrapper>
  );
}

export default RubinVaseExperiment;
