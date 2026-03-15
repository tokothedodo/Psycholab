/**
 * FRAMING EFFECT - Decision Making Experiment
 * 
 * Tests decision making with gain/loss frames.
 * Same information framed differently leads to different choices.
 */

import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ExperimentWrapper } from '../components/experiments/ExperimentWrapper';
import type { Experiment } from '../data/experiments';
import type { TrialData, ExperimentResults } from '../components/experiments/ExperimentWrapper';
import { getDefaultConfig } from './config/experimentDefaults';

interface FramingConfig {
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

interface FramingProps {
  experiment: Experiment;
  onComplete: (results: ExperimentResults) => void;
  participantId: string;
  roomId: string;
  config?: Partial<FramingConfig>;
}

interface Scenario {
  id: string;
  gainFrame: string;
  lossFrame: string;
  gainChoice: string;
  lossChoice: string;
}

const SCENARIOS: Scenario[] = [
  { id: 'disease', gainFrame: 'Saves 200 people', lossFrame: 'Loses 400 people', gainChoice: 'A', lossChoice: 'B' },
  { id: 'job', gainFrame: 'Guaranteed job', lossFrame: 'Risk losing job', gainChoice: 'A', lossChoice: 'B' },
  { id: 'investment', gainFrame: 'Gain $1000', lossFrame: 'Lose $500', gainChoice: 'A', lossChoice: 'B' },
  { id: 'product', gainFrame: '80% effective', lossFrame: '20% ineffective', gainChoice: 'A', lossChoice: 'B' },
];

const DEFAULT_CONFIG = {
  ...getDefaultConfig('framing'),
  trials: 6,
} as FramingConfig;

export function FramingExperiment({ experiment, onComplete, participantId, roomId, config = {} }: FramingProps) {
  const { t, language } = useLanguage();
  
  const settings: FramingConfig = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  const [phase, setPhase] = useState<'instruction' | 'experiment' | 'complete'>('instruction');
  const [trialIndex, setTrialIndex] = useState(0);
  const [trialData, setTrialData] = useState<TrialData[]>([]);
  const [experimentStartTime, setExperimentStartTime] = useState(0);
  const [trialStartTime, setTrialStartTime] = useState(0);

  const generateScenarios = (): (Scenario & { frame: 'gain' | 'loss' })[] => {
    let scenarios: (Scenario & { frame: 'gain' | 'loss' })[] = [];
    for (let i = 0; i < settings.trials; i++) {
      const scenario = SCENARIOS[i % SCENARIOS.length];
      const frame = Math.random() > 0.5 ? 'gain' : 'loss';
      scenarios.push({ ...scenario, frame });
    }
    if (settings.randomizeOrder) {
      scenarios = scenarios.sort(() => Math.random() - 0.5);
    }
    return scenarios;
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

  const handleResponse = (choice: string) => {
    const endTime = performance.now();
    const responseTime = Math.round(endTime - trialStartTime);
    
    const currentScenario = allScenarios[trialIndex];
    const correctChoice = currentScenario.frame === 'gain' ? currentScenario.gainChoice : currentScenario.lossChoice;

    const trial: TrialData = {
      trialNumber: trialIndex + 1,
      responseTimeMs: responseTime,
      answer: choice,
      correctAnswer: correctChoice,
      stimulus: { ...currentScenario },
    };

    setTrialData(prev => [...prev, trial]);

    if (trialIndex < allScenarios.length - 1) {
      setTimeout(() => {
        setTrialIndex(prev => prev + 1);
      }, settings.isi > 0 ? settings.isi : 500);
    } else {
      completeExperiment();
    }
  };

  const completeExperiment = () => {
    setPhase('complete');
    const endTime = performance.now();
    const totalTime = Math.round(endTime - experimentStartTime);
    
    const gainTrials = trialData.filter(t => (t.stimulus as Scenario & { frame: string }).frame === 'gain');
    const lossTrials = trialData.filter(t => (t.stimulus as Scenario & { frame: string }).frame === 'loss');
    const gainConsistent = gainTrials.filter(t => t.answer === t.correctAnswer).length;
    const lossConsistent = lossTrials.filter(t => t.answer === t.correctAnswer).length;

    const framingEffect = gainConsistent - lossConsistent;

    const results: ExperimentResults = {
      experimentName: experiment.id,
      participantId,
      roomId,
      language,
      timestamp: new Date().toISOString(),
      totalTrials: trialData.length,
      responseTimeMs: totalTime,
      accuracy: 100 - Math.abs(framingEffect) * 20,
      answer: framingEffect,
      correctAnswer: 'framing_effect_score',
      trialData: trialData,
      debrief: t(experiment.debriefKey),
    };

    onComplete(results);
  };

  if (phase === 'instruction') {
    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="max-w-2xl mx-auto p-6">
          <h2 className="text-2xl font-bold text-navy-900 mb-4">{t('exp.framing.name')}</h2>
          <p className="text-gray-600 mb-4">
            {settings.customInstructions || t('exp.framing.instruction')}
          </p>
          <p className="text-sm text-gray-500 mb-4">
            {t('citation')}: {experiment.citation}, {experiment.year}
          </p>
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
            <p className="text-blue-800">{t('exp.framing.instructionDetail')}</p>
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
    const gainConsistent = trialData.filter(t => (t.stimulus as Scenario & { frame: string }).frame === 'gain' && t.answer === t.correctAnswer).length;
    const lossConsistent = trialData.filter(t => (t.stimulus as Scenario & { frame: string }).frame === 'loss' && t.answer === t.correctAnswer).length;

    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="max-w-2xl mx-auto p-6">
          <h2 className="text-2xl font-bold text-navy-900 mb-4">{t('common.debrief.title')}</h2>
          <div className="bg-teal-50 border-l-4 border-teal-500 p-4 mb-4">
            <p className="text-teal-800 font-medium">{t('common.debrief.thankYou')}</p>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-navy-900">{gainConsistent}/{trialData.filter(t => (t.stimulus as Scenario & { frame: string }).frame === 'gain').length}</p>
              <p className="text-sm text-gray-600">{t('exp.framing.gainFrame')}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-navy-900">{lossConsistent}/{trialData.filter(t => (t.stimulus as Scenario & { frame: string }).frame === 'loss').length}</p>
              <p className="text-sm text-gray-600">{t('exp.framing.lossFrame')}</p>
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg mb-4">
            <p className="text-amber-800 font-medium mb-2">{t('exp.framing.yourPattern')}:</p>
            <p className="text-sm text-amber-700">
              {gainConsistent > lossConsistent 
                ? t('exp.framing.riskAverse') 
                : gainConsistent < lossConsistent 
                  ? t('exp.framing.riskSeeking')
                  : t('exp.framing.consistent')}
            </p>
            <p className="text-sm text-amber-700 mt-2">{t('exp.framing.interpretation')}</p>
          </div>
          <p className="text-gray-600 mb-4">{t('exp.framing.debrief')}</p>
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
            <p className="text-sm text-gray-500 text-center mt-1">
              {trialIndex + 1} / {allScenarios.length}
            </p>
          </div>
        )}

        <div className="bg-gray-50 p-6 rounded-lg mb-6">
          <h3 className="text-lg font-semibold text-navy-900 mb-4">{t('exp.framing.scenario')} {trialIndex + 1}</h3>
          <p className="text-gray-700 mb-4">
            {currentScenario.frame === 'gain' 
              ? t(`exp.framing.gain${currentScenario.id}`) + ': ' + currentScenario.gainFrame
              : t(`exp.framing.loss${currentScenario.id}`) + ': ' + currentScenario.lossFrame}
          </p>
        </div>

        <h2 className="text-xl font-semibold text-navy-900 mb-6 text-center">
          {t('exp.framing.choose')}
        </h2>

        <div className="flex justify-center gap-6">
          <button
            onClick={() => handleResponse('A')}
            className="flex-1 max-w-xs bg-teal-600 hover:bg-teal-700 text-white px-8 py-4 rounded-lg transition-all"
          >
            <span className="text-lg font-semibold">Option A</span>
          </button>
          <button
            onClick={() => handleResponse('B')}
            className="flex-1 max-w-xs bg-gray-200 hover:bg-gray-300 text-navy-900 px-8 py-4 rounded-lg transition-all"
          >
            <span className="text-lg font-semibold">Option B</span>
          </button>
        </div>
      </div>
    </ExperimentWrapper>
  );
}

export default FramingExperiment;
