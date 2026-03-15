/**
 * BYSTANDER EFFECT - Social Psychology Experiment
 * 
 * Tests intervention likelihood with different numbers of bystanders.
 * Participants read scenarios and decide whether to help.
 */

import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ExperimentWrapper } from '../components/experiments/ExperimentWrapper';
import type { Experiment } from '../data/experiments';
import type { TrialData, ExperimentResults } from '../components/experiments/ExperimentWrapper';
import { getDefaultConfig } from './config/experimentDefaults';

interface BystanderConfig {
  trials: number;
  isi: number;
  responseTimeLimit: number;
  showFeedback: boolean;
  showProgressBar: boolean;
  customInstructions: string;
  randomizeOrder: boolean;
  practiceTrials: number;
}

interface BystanderProps {
  experiment: Experiment;
  onComplete: (results: ExperimentResults) => void;
  participantId: string;
  roomId: string;
  config?: Partial<BystanderConfig>;
}

interface Scenario {
  id: string;
  situation: string;
  bystanders: number;
  shouldHelp: boolean;
}

const SCENARIOS: Scenario[] = [
  { id: 'emergency', situation: 'person_fainting', bystanders: 1, shouldHelp: true },
  { id: 'emergency', situation: 'person_fainting', bystanders: 5, shouldHelp: true },
  { id: 'theft', situation: 'someone_stealing', bystanders: 1, shouldHelp: true },
  { id: 'theft', situation: 'someone_stealing', bystanders: 10, shouldHelp: false },
  { id: 'accident', situation: 'car_accident', bystanders: 2, shouldHelp: true },
  { id: 'accident', situation: 'car_accident', bystanders: 8, shouldHelp: false },
];

const DEFAULT_CONFIG = {
  ...getDefaultConfig('bystander'),
  trials: 6,
} as BystanderConfig;

export function BystanderExperiment({ experiment, onComplete, participantId, roomId, config = {} }: BystanderProps) {
  const { t, language } = useLanguage();
  
  const settings: BystanderConfig = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  const [phase, setPhase] = useState<'instruction' | 'experiment' | 'complete'>('instruction');
  const [trialIndex, setTrialIndex] = useState(0);
  const [trialData, setTrialData] = useState<TrialData[]>([]);
  const [experimentStartTime, setExperimentStartTime] = useState(0);
  const [trialStartTime, setTrialStartTime] = useState(0);

  const generateScenarios = (): Scenario[] => {
    let scenarios = [...SCENARIOS];
    if (settings.randomizeOrder) {
      scenarios = scenarios.sort(() => Math.random() - 0.5);
    }
    return scenarios.slice(0, settings.trials);
  };

  const [allScenarios] = useState(generateScenarios);

  useEffect(() => {
    if (phase === 'instruction') {
      setExperimentStartTime(performance.now());
    }
  }, [phase]);

  useEffect(() => {
    if (phase === 'experiment') {
      setTrialStartTime(performance.now());
    }
  }, [phase, trialIndex]);

  const handleResponse = (helped: boolean) => {
    const endTime = performance.now();
    const responseTime = Math.round(endTime - trialStartTime);
    
    const currentScenario = allScenarios[trialIndex];

    const trial: TrialData = {
      trialNumber: trialIndex + 1,
      responseTimeMs: responseTime,
      answer: helped ? 'helped' : 'not_helped',
      correctAnswer: currentScenario.shouldHelp ? 'helped' : 'not_helped',
      stimulus: { ...currentScenario },
    };

    setTrialData(prev => [...prev, trial]);

    if (trialIndex < allScenarios.length - 1) {
      setTimeout(() => setTrialIndex(prev => prev + 1), settings.isi > 0 ? settings.isi : 500);
    } else {
      completeExperiment();
    }
  };

  const completeExperiment = () => {
    setPhase('complete');
    const endTime = performance.now();
    const totalTime = Math.round(endTime - experimentStartTime);
    
    const lowBystander = trialData.filter(t => (t.stimulus as Scenario).bystanders <= 2);
    const highBystander = trialData.filter(t => (t.stimulus as Scenario).bystanders > 2);
    const lowHelpRate = (lowBystander.filter(t => t.answer === 'helped').length / lowBystander.length) * 100;
    const highHelpRate = (highBystander.filter(t => t.answer === 'helped').length / highBystander.length) * 100;

    const results: ExperimentResults = {
      experimentName: experiment.id,
      participantId,
      roomId,
      language,
      timestamp: new Date().toISOString(),
      totalTrials: trialData.length,
      responseTimeMs: totalTime,
      accuracy: (trialData.filter(t => t.answer === t.correctAnswer).length / trialData.length) * 100,
      answer: `${lowHelpRate}:${highHelpRate}`,
      correctAnswer: 'low:high_bystander_help_rate',
      trialData: trialData,
      debrief: t(experiment.debriefKey),
    };

    onComplete(results);
  };

  if (phase === 'instruction') {
    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="max-w-2xl mx-auto p-6">
          <h2 className="text-2xl font-bold text-navy-900 mb-4">{t('exp.bystander.name')}</h2>
          <p className="text-gray-600 mb-4">
            {settings.customInstructions || t('exp.bystander.instruction')}
          </p>
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
            <p className="text-blue-800">{t('exp.bystander.instructionDetail')}</p>
          </div>
          <button
            onClick={() => setPhase('experiment')}
            className="bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 transition-colors"
          >
            {t('common.start')}
          </button>
        </div>
      </ExperimentWrapper>
    );
  }

  if (phase === 'complete') {
    const lowBystander = trialData.filter(t => (t.stimulus as Scenario).bystanders <= 2);
    const highBystander = trialData.filter(t => (t.stimulus as Scenario).bystanders > 2);
    const lowHelpRate = Math.round((lowBystander.filter(t => t.answer === 'helped').length / lowBystander.length) * 100);
    const highHelpRate = Math.round((highBystander.filter(t => t.answer === 'helped').length / highBystander.length) * 100);

    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="max-w-2xl mx-auto p-6">
          <h2 className="text-2xl font-bold text-navy-900 mb-4">{t('common.debrief.title')}</h2>
          <div className="bg-teal-50 border-l-4 border-teal-500 p-4 mb-4">
            <p className="text-teal-800 font-medium">{t('common.debrief.thankYou')}</p>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-navy-900">{lowHelpRate}%</p>
              <p className="text-sm text-gray-600">{t('exp.bystander.lowBystander')}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-navy-900">{highHelpRate}%</p>
              <p className="text-sm text-gray-600">{t('exp.bystander.highBystander')}</p>
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg mb-4">
            <p className="text-amber-800 font-medium mb-2">{t('exp.bystander.interpretation')}</p>
            <p className="text-sm text-amber-700">
              {lowHelpRate > highHelpRate 
                ? t('exp.bystander.diffusionObserved')
                : t('exp.bystander.noDiffusion')}
            </p>
          </div>
          <p className="text-gray-600 mb-4">{t('exp.bystander.debrief')}</p>
        </div>
      </ExperimentWrapper>
    );
  }

  const currentScenario = allScenarios[trialIndex];

  return (
    <ExperimentWrapper experiment={experiment}>
      <div className="max-w-2xl mx-auto p-6">
        {settings.showProgressBar && (
          <div className="mb-6">
            <div className="h-2 bg-gray-200 rounded overflow-hidden">
              <div className="h-full bg-teal-600 transition-all" style={{ width: `${((trialIndex + 1) / allScenarios.length) * 100}%` }} />
            </div>
            <p className="text-sm text-gray-500 text-center mt-1">{trialIndex + 1} / {allScenarios.length}</p>
          </div>
        )}

        <div className="bg-gray-50 p-6 rounded-lg mb-6">
          <p className="text-gray-700 mb-4">{t(`exp.bystander.situation.${currentScenario.situation}`)}</p>
          <p className="text-blue-600 font-medium">{t('exp.bystander.bystanders')}: {currentScenario.bystanders}</p>
        </div>

        <h2 className="text-xl font-semibold text-navy-900 mb-6 text-center">
          {t('exp.bystander.wouldYouHelp')}
        </h2>

        <div className="flex justify-center gap-6">
          <button
            onClick={() => handleResponse(true)}
            className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-4 rounded-lg transition-all"
          >
            <span className="text-lg font-semibold">{t('common.yes')}</span>
          </button>
          <button
            onClick={() => handleResponse(false)}
            className="bg-gray-200 hover:bg-gray-300 text-navy-900 px-8 py-4 rounded-lg transition-all"
          >
            <span className="text-lg font-semibold">{t('common.no')}</span>
          </button>
        </div>
      </div>
    </ExperimentWrapper>
  );
}

export default BystanderExperiment;
