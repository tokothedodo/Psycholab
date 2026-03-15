/**
 * TROLLEY PROBLEM - Moral Psychology Experiment
 * 
 * Tests utilitarian vs deontological moral judgments.
 * Participants choose between sacrificing one person to save five, or doing nothing.
 */

import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ExperimentWrapper } from '../components/experiments/ExperimentWrapper';
import type { Experiment } from '../data/experiments';
import type { TrialData, ExperimentResults } from '../components/experiments/ExperimentWrapper';
import { getDefaultConfig } from './config/experimentDefaults';

interface TrolleyConfig {
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

interface TrolleyProps {
  experiment: Experiment;
  onComplete: (results: ExperimentResults) => void;
  participantId: string;
  roomId: string;
  config?: Partial<TrolleyConfig>;
}

interface TrolleyScenario {
  id: string;
  scenario: string;
  scenarioKey: string;
  description: string;
  descriptionKey: string;
  utilitarianChoice: 'switch' | 'dont_switch';
}

const DEFAULT_CONFIG = {
  ...getDefaultConfig('trolley'),
  trials: 4,
} as TrolleyConfig;

const SCENARIOS: TrolleyScenario[] = [
  {
    id: 'standard',
    scenario: 'standard',
    scenarioKey: 'exp.trolley.scenario.standard',
    description: 'A runaway trolley is heading toward five people tied to the track. You can pull a lever to divert it to a side track where there is only one person tied.',
    descriptionKey: 'exp.trolley.desc.standard',
    utilitarianChoice: 'switch',
  },
  {
    id: 'footbridge',
    scenario: 'footbridge',
    scenarioKey: 'exp.trolley.scenario.footbridge',
    description: 'A runaway trolley is heading toward five people. You are standing on a footbridge above the track. A large man is next to you. Pushing him would stop the trolley and save the five.',
    descriptionKey: 'exp.trolley.desc.footbridge',
    utilitarianChoice: 'dont_switch',
  },
  {
    id: 'loop',
    scenario: 'loop',
    scenarioKey: 'exp.trolley.scenario.loop',
    description: 'A trolley is heading toward five people. You can pull a lever to send it down a loop track. There is one person on the loop, but if the trolley goes fast enough, it will circle back and hit all five.',
    descriptionKey: 'exp.trolley.desc.loop',
    utilitarianChoice: 'switch',
  },
  {
    id: 'fatman',
    scenario: 'fatman',
    scenarioKey: 'exp.trolley.scenario.fatman',
    description: 'You are on a footbridge. The trolley is heading toward five people. You are next to a very fat person. Pushing him off would stop the trolley, but he would die.',
    descriptionKey: 'exp.trolley.desc.fatman',
    utilitarianChoice: 'dont_switch',
  },
];

export function TrolleyExperiment({ experiment, onComplete, participantId, roomId, config = {} }: TrolleyProps) {
  const { t, language } = useLanguage();
  
  const settings: TrolleyConfig = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  const [phase, setPhase] = useState<'instruction' | 'experiment' | 'complete'>('instruction');
  const [trialIndex, setTrialIndex] = useState(0);
  const [trialData, setTrialData] = useState<TrialData[]>([]);
  const [experimentStartTime, setExperimentStartTime] = useState(0);
  const [trialStartTime, setTrialStartTime] = useState(0);
  const [responseRecorded, setResponseRecorded] = useState(false);

  const generateStimuli = useCallback((): TrolleyScenario[] => {
    let stimuli = [...SCENARIOS];
    if (settings.randomizeOrder) {
      stimuli = stimuli.sort(() => Math.random() - 0.5);
    }
    return stimuli.slice(0, settings.trials);
  }, [settings.trials, settings.randomizeOrder]);

  const [allStimuli] = useState(generateStimuli);

  useEffect(() => {
    if (phase === 'instruction') {
      setExperimentStartTime(performance.now());
    }
  }, [phase]);

  useEffect(() => {
    if (phase === 'experiment' && trialIndex < allStimuli.length) {
      setTrialStartTime(performance.now());
      setResponseRecorded(false);
    }
  }, [phase, trialIndex]);

  useEffect(() => {
    if (settings.responseTimeLimit > 0 && phase === 'experiment' && !responseRecorded) {
      const timer = setTimeout(() => {
        handleResponse('timeout');
      }, settings.responseTimeLimit);
      return () => clearTimeout(timer);
    }
  }, [phase, trialIndex, settings.responseTimeLimit, responseRecorded]);

  const handleResponse = (choice: string) => {
    if (responseRecorded || !allStimuli[trialIndex]) return;
    
    setResponseRecorded(true);
    
    const endTime = performance.now();
    const responseTime = Math.round(endTime - trialStartTime);
    
    const currentScenario = allStimuli[trialIndex];

    const trial: TrialData = {
      trialNumber: trialIndex + 1,
      responseTimeMs: responseTime === 0 && choice === 'timeout' ? settings.responseTimeLimit : responseTime,
      answer: choice,
      correctAnswer: currentScenario.utilitarianChoice,
      stimulus: { 
        scenarioId: currentScenario.id,
        scenarioKey: currentScenario.scenarioKey,
      },
    };

    setTrialData(prev => [...prev, trial]);

    setTimeout(() => {
      if (trialIndex < allStimuli.length - 1) {
        setTrialIndex(prev => prev + 1);
      } else {
        completeExperiment();
      }
    }, settings.isi > 0 ? settings.isi : 500);
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
    
    const utilitarianCount = finalTrialData.filter(t => t.answer === t.correctAnswer).length;
    const utilitarianRatio = finalTrialData.length > 0 ? (utilitarianCount / finalTrialData.length) * 100 : 0;

    const results: ExperimentResults = {
      experimentName: experiment.id,
      participantId,
      roomId,
      language,
      timestamp: new Date().toISOString(),
      totalTrials: trialData.length,
      responseTimeMs: totalTime,
      accuracy: utilitarianRatio,
      answer: utilitarianRatio,
      correctAnswer: 'utilitarian_percentage',
      trialData: finalTrialData,
      debrief: t(experiment.debriefKey),
    };

    onComplete(results);
  };

  if (phase === 'instruction') {
    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="max-w-2xl mx-auto p-6">
          <h2 className="text-2xl font-bold text-navy-900 mb-4">{t('exp.trolley.name')}</h2>
          <p className="text-gray-600 mb-4">
            {settings.customInstructions || t('exp.trolley.instruction')}
          </p>
          <p className="text-sm text-gray-500 mb-4">
            {t('citation')}: {experiment.citation}, {experiment.year}
          </p>
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
            <p className="text-blue-800">{t('exp.trolley.instructionDetail')}</p>
          </div>
          <p className="text-xs text-gray-400 mb-4">
            {settings.trials} scenarios
          </p>
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
    const switchCount = trialData.filter(t => t.answer === 'switch').length;
    const dontSwitchCount = trialData.filter(t => t.answer === 'dont_switch').length;

    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="max-w-2xl mx-auto p-6">
          <h2 className="text-2xl font-bold text-navy-900 mb-4">{t('common.debrief.title')}</h2>
          
          <div className="bg-teal-50 border-l-4 border-teal-500 p-4 mb-4">
            <p className="text-teal-800 font-medium">{t('common.debrief.thankYou')}</p>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-navy-900">{switchCount}</p>
              <p className="text-sm text-gray-600">{t('exp.trolley.switch')}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-navy-900">{dontSwitchCount}</p>
              <p className="text-sm text-gray-600">{t('exp.trolley.dontSwitch')}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-navy-900">{Math.round(trialData.reduce((s, t) => s + t.responseTimeMs, 0) / trialData.length)}ms</p>
              <p className="text-sm text-gray-600">{t('common.avgRT')}</p>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg mb-4">
            <p className="text-amber-800 font-medium mb-2">{t('exp.trolley.yourMoralProfile')}:</p>
            <p className="text-sm text-amber-700">
              {switchCount >= 3 
                ? t('exp.trolley.utilitarian') 
                : switchCount <= 1 
                  ? t('exp.trolley.deontological')
                  : t('exp.trolley.contextual')}
            </p>
            <p className="text-sm text-amber-700 mt-2">{t('exp.trolley.interpretation')}</p>
          </div>

          <p className="text-gray-600 mb-4">{t('exp.trolley.debrief')}</p>
        </div>
      </ExperimentWrapper>
    );
  }

  const currentScenario = allStimuli[trialIndex];

  return (
    <ExperimentWrapper experiment={experiment}>
      <div className="max-w-2xl mx-auto p-6">
        {settings.showProgressBar && (
          <div className="mb-6">
            <div className="h-2 bg-gray-200 rounded overflow-hidden">
              <div 
                className="h-full bg-teal-600 transition-all"
                style={{ width: `${((trialIndex + 1) / allStimuli.length) * 100}%` }}
              />
            </div>
            <p className="text-sm text-gray-500 text-center mt-1">
              {trialIndex + 1} / {allStimuli.length}
            </p>
          </div>
        )}

        <div className="mb-6">
          <span className="inline-block bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm mb-4">
            {t('exp.trolley.scenario')} {trialIndex + 1}
          </span>
          <h2 className="text-xl font-semibold text-navy-900 mb-4 text-center">
            {t(currentScenario.scenarioKey)}
          </h2>
          <div className="bg-gray-50 p-6 rounded-lg mb-6">
            <p className="text-gray-700 text-lg leading-relaxed">
              {t(currentScenario.descriptionKey)}
            </p>
          </div>
        </div>

        <p className="text-center text-gray-600 mb-6">{t('exp.trolley.whatDoYouDo')}</p>
        
        <div className="flex justify-center gap-6">
          <button
            onClick={() => handleResponse('switch')}
            disabled={responseRecorded}
            className="flex-1 max-w-xs bg-teal-600 hover:bg-teal-700 text-white px-8 py-4 rounded-lg transition-all disabled:opacity-50"
          >
            <span className="text-lg font-semibold">{t('exp.trolley.pullLever')}</span>
            <p className="text-sm mt-1 opacity-80">{t('exp.trolley.saveFive')}</p>
          </button>
          <button
            onClick={() => handleResponse('dont_switch')}
            disabled={responseRecorded}
            className="flex-1 max-w-xs bg-gray-200 hover:bg-gray-300 text-navy-900 px-8 py-4 rounded-lg transition-all disabled:opacity-50"
          >
            <span className="text-lg font-semibold">{t('exp.trolley.doNothing')}</span>
            <p className="text-sm mt-1 opacity-80">{t('exp.trolley.noAction')}</p>
          </button>
        </div>
      </div>
    </ExperimentWrapper>
  );
}

export default TrolleyExperiment;
