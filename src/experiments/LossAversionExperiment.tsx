/**
 * LOSS AVERSION - Decision Making Experiment
 * 
 * Tests asymmetric weighting of gains vs losses.
 * Participants make choices between sure gains/losses and probabilistic options.
 */

import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ExperimentWrapper } from '../components/experiments/ExperimentWrapper';
import type { Experiment } from '../data/experiments';
import type { TrialData, ExperimentResults } from '../components/experiments/ExperimentWrapper';
import { getDefaultConfig } from './config/experimentDefaults';

interface LossAversionConfig {
  trials: number;
  isi: number;
  showFeedback: boolean;
  showProgressBar: boolean;
  customInstructions: string;
  randomizeOrder: boolean;
  practiceTrials: number;
}

interface LossAversionProps {
  experiment: Experiment;
  onComplete: (results: ExperimentResults) => void;
  participantId: string;
  roomId: string;
  config?: Partial<LossAversionConfig>;
}

interface Trial {
  type: 'gain' | 'loss';
  sureAmount: number;
  gambleWin: number;
  gambleLose: number;
  gambleProb: number;
}

const TRIALS: Trial[] = [
  { type: 'gain', sureAmount: 30, gambleWin: 45, gambleLose: 0, gambleProb: 0.5 },
  { type: 'gain', sureAmount: 20, gambleWin: 40, gambleLose: 0, gambleProb: 0.5 },
  { type: 'gain', sureAmount: 10, gambleWin: 30, gambleLose: 0, gambleProb: 0.5 },
  { type: 'loss', sureAmount: -30, gambleWin: -45, gambleLose: 0, gambleProb: 0.5 },
  { type: 'loss', sureAmount: -20, gambleWin: -40, gambleLose: 0, gambleProb: 0.5 },
  { type: 'loss', sureAmount: -10, gambleWin: -30, gambleLose: 0, gambleProb: 0.5 },
];

const DEFAULT_CONFIG = {
  ...getDefaultConfig('loss-aversion'),
  trials: 20,
} as LossAversionConfig;

export function LossAversionExperiment({ experiment, onComplete, participantId, roomId, config = {} }: LossAversionProps) {
  const { t, language } = useLanguage();
  
  const settings: LossAversionConfig = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  const [phase, setPhase] = useState<'instruction' | 'experiment' | 'complete'>('instruction');
  const [trialIndex, setTrialIndex] = useState(0);
  const [trialData, setTrialData] = useState<TrialData[]>([]);
  const [experimentStartTime, setExperimentStartTime] = useState(0);
  const [trialStartTime, setTrialStartTime] = useState(0);

  const generateTrials = (): Trial[] => {
    let trials: Trial[] = [];
    while (trials.length < settings.trials) {
      trials = [...trials, ...TRIALS];
    }
    trials = trials.slice(0, settings.trials);
    if (settings.randomizeOrder) {
      trials = trials.sort(() => Math.random() - 0.5);
    }
    return trials;
  };

  const [allTrials] = useState(generateTrials);

  useEffect(() => {
    if (phase === 'instruction') setExperimentStartTime(performance.now());
  }, [phase]);

  useEffect(() => {
    if (phase === 'experiment') setTrialStartTime(performance.now());
  }, [phase, trialIndex]);

  const handleResponse = (choice: 'sure' | 'gamble') => {
    const endTime = performance.now();
    const responseTime = Math.round(endTime - trialStartTime);
    const currentTrial = allTrials[trialIndex];
    
    const trial: TrialData = {
      trialNumber: trialIndex + 1,
      responseTimeMs: responseTime,
      answer: choice,
      correctAnswer: currentTrial.type === 'gain' ? 'sure' : 'gamble',
      stimulus: { ...currentTrial },
    };

    setTrialData(prev => [...prev, trial]);

    if (trialIndex < allTrials.length - 1) {
      setTimeout(() => setTrialIndex(prev => prev + 1), settings.isi > 0 ? settings.isi : 300);
    } else {
      completeExperiment();
    }
  };

  const completeExperiment = () => {
    setPhase('complete');
    const endTime = performance.now();
    const totalTime = Math.round(endTime - experimentStartTime);
    
    const gainTrials = trialData.filter(t => (t.stimulus as Trial).type === 'gain');
    const lossTrials = trialData.filter(t => (t.stimulus as Trial).type === 'loss');
    const gainSure = gainTrials.filter(t => t.answer === 'sure').length;
    const lossGamble = lossTrials.filter(t => t.answer === 'gamble').length;
    const lossAversion = (lossGamble / lossTrials.length) / (gainSure / gainTrials.length);

    const results: ExperimentResults = {
      experimentName: experiment.id,
      participantId,
      roomId,
      language,
      timestamp: new Date().toISOString(),
      totalTrials: trialData.length,
      responseTimeMs: totalTime,
      accuracy: 50,
      answer: lossAversion,
      correctAnswer: 'loss_aversion_coefficient',
      trialData: trialData,
      debrief: t(experiment.debriefKey),
    };

    onComplete(results);
  };

  if (phase === 'instruction') {
    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="max-w-2xl mx-auto p-6">
          <h2 className="text-2xl font-bold text-navy-900 mb-4">{t('exp.lossAversion.name')}</h2>
          <p className="text-gray-600 mb-4">{settings.customInstructions || t('exp.lossAversion.instruction')}</p>
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
            <p className="text-blue-800">{t('exp.lossAversion.instructionDetail')}</p>
          </div>
          <button onClick={() => setPhase('experiment')} className="bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700">
            {t('common.start')}
          </button>
        </div>
      </ExperimentWrapper>
    );
  }

  if (phase === 'complete') {
    const gainSure = trialData.filter(t => (t.stimulus as Trial).type === 'gain' && t.answer === 'sure').length;
    const lossGamble = trialData.filter(t => (t.stimulus as Trial).type === 'loss' && t.answer === 'gamble').length;
    const gainTrials = trialData.filter(t => (t.stimulus as Trial).type === 'gain').length;
    const lossTrials = trialData.filter(t => (t.stimulus as Trial).type === 'loss').length;

    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="max-w-2xl mx-auto p-6">
          <h2 className="text-2xl font-bold text-navy-900 mb-4">{t('common.debrief.title')}</h2>
          <div className="bg-teal-50 border-l-4 border-teal-500 p-4 mb-4">
            <p className="text-teal-800 font-medium">{t('common.debrief.thankYou')}</p>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-navy-900">{gainSure}/{gainTrials}</p>
              <p className="text-sm text-gray-600">{t('exp.lossAversion.preferSureGains')}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-navy-900">{lossGamble}/{lossTrials}</p>
              <p className="text-sm text-gray-600">{t('exp.lossAversion.riskSeekLosses')}</p>
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg mb-4">
            <p className="text-amber-800 font-medium">{t('exp.lossAversion.interpretation')}</p>
            <p className="text-sm text-amber-700">{t('exp.lossAversion.explanation')}</p>
          </div>
          <p className="text-gray-600 mb-4">{t('exp.lossAversion.debrief')}</p>
        </div>
      </ExperimentWrapper>
    );
  }

  const currentTrial = allTrials[trialIndex];
  const isGain = currentTrial.type === 'gain';

  return (
    <ExperimentWrapper experiment={experiment}>
      <div className="max-w-2xl mx-auto p-6">
        {settings.showProgressBar && (
          <div className="mb-6">
            <div className="h-2 bg-gray-200 rounded"><div className="h-full bg-teal-600" style={{ width: `${((trialIndex + 1) / allTrials.length) * 100}%` }} /></div>
          </div>
        )}

        <div className="bg-gray-50 p-6 rounded-lg mb-6 text-center">
          <p className="text-blue-600 font-medium mb-2">{isGain ? t('exp.lossAversion.gain') : t('exp.lossAversion.loss')}</p>
        </div>

        <h2 className="text-xl font-semibold text-navy-900 mb-6 text-center">{t('exp.lossAversion.choose')}</h2>

        <div className="flex justify-center gap-6">
          <button onClick={() => handleResponse('sure')} className="flex-1 max-w-xs bg-teal-600 hover:bg-teal-700 text-white px-8 py-4 rounded-lg">
            <span className="text-lg font-semibold">{isGain ? `$${currentTrial.sureAmount}` : `Lose $${Math.abs(currentTrial.sureAmount)}`}</span>
            <p className="text-sm opacity-80">{t('exp.lossAversion.sure')}</p>
          </button>
          <button onClick={() => handleResponse('gamble')} className="flex-1 max-w-xs bg-gray-200 hover:bg-gray-300 text-navy-900 px-8 py-4 rounded-lg">
            <span className="text-lg font-semibold">{isGain ? `$${currentTrial.gambleWin} (${currentTrial.gambleProb * 100}%)` : `Lose $${Math.abs(currentTrial.gambleLose)} (${currentTrial.gambleProb * 100}%)`}</span>
            <p className="text-sm opacity-80">{t('exp.lossAversion.gamble')}</p>
          </button>
        </div>
      </div>
    </ExperimentWrapper>
  );
}

export default LossAversionExperiment;
