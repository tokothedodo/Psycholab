/**
 * TROLLEY PROBLEM - Moral Psychology Experiment
 * 
 * Tests utilitarian vs deontological moral judgments.
 * Participants choose between sacrificing one person to save five, or doing nothing.
 */

import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ExperimentWrapper } from './ExperimentWrapper';
import type { Experiment } from '../data/experiments';
import type { TrialData, ExperimentResults } from './ExperimentWrapper';
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
        <div className="max-w-2xl mx-auto p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
          <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-emerald-600 mb-6">{t('exp.trolley.name')}</h2>

          <div className="bg-slate-50 border-l-4 border-teal-500 p-5 rounded-r-lg shadow-sm mb-6">
            <p className="text-slate-700 leading-relaxed text-md">
              {settings.customInstructions || t('exp.trolley.instruction')}
            </p>
          </div>

          <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-5 mb-8">
            <p className="text-sm font-semibold text-indigo-900 mb-2 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              {t('exp.trolley.instructionDetail')}
            </p>
          </div>

          <div className="flex justify-between items-center mb-8">
            <p className="text-sm font-medium text-slate-400 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
              {t('citation')}: {experiment.citation}, {experiment.year}
            </p>
            <span className="bg-slate-100 text-slate-500 font-semibold px-3 py-1 rounded-md text-xs uppercase tracking-wider">{settings.trials} {t('common.trials')}</span>
          </div>

          <button
            onClick={() => setPhase('experiment')}
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
      <div className="max-w-3xl mx-auto p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 min-h-[550px] flex flex-col relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-white -z-10"></div>

        {settings.showProgressBar && (
          <div className="mb-8 px-4 pt-2">
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-teal-400 to-teal-500 transition-all duration-500 ease-out"
                style={{ width: `${((trialIndex + 1) / allStimuli.length) * 100}%` }}
              />
            </div>
            <div className="flex justify-between items-center mt-3">
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                {trialIndex + 1} / {allStimuli.length}
              </span>
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col items-center justify-center animate-fade-in w-full max-w-xl mx-auto">

          <div className="w-full bg-slate-50 p-6 sm:p-8 rounded-2xl border border-slate-100 mb-10 text-center relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-400 transform origin-top group-hover:scale-y-110 transition-transform duration-500"></div>

            <div className="flex items-center justify-center mb-4">
              <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest">
                {t('exp.trolley.scenario')} {trialIndex + 1}
              </span>
            </div>

            <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-4">
              {t(currentScenario.scenarioKey)}
            </h2>

            <p className="text-lg text-slate-600 leading-relaxed font-medium">
              {t(currentScenario.descriptionKey)}
            </p>
          </div>

          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 text-center">{t('exp.trolley.whatDoYouDo')}</p>

          <div className="flex flex-col sm:flex-row justify-center gap-5 w-full mb-4">
            <button
              onClick={() => handleResponse('switch')}
              disabled={responseRecorded}
              className="group relative flex-1 py-6 px-4 bg-white rounded-2xl shadow-sm border-2 border-transparent hover:border-teal-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col items-center justify-center focus:outline-none focus:ring-4 focus:ring-teal-500/20 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-sm disabled:cursor-not-allowed"
            >
              <span className="absolute inset-0 bg-teal-50/0 group-hover:bg-teal-50/50 rounded-2xl transition-colors"></span>
              <span className="text-xl font-bold text-slate-700 group-hover:text-teal-700 z-10 transition-colors mb-1">{t('exp.trolley.pullLever')}</span>
              <span className="text-sm font-semibold text-teal-600/70 group-hover:text-teal-600 z-10">{t('exp.trolley.saveFive')}</span>
            </button>
            <button
              onClick={() => handleResponse('dont_switch')}
              disabled={responseRecorded}
              className="group relative flex-1 py-6 px-4 bg-white rounded-2xl shadow-sm border-2 border-transparent hover:border-indigo-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col items-center justify-center focus:outline-none focus:ring-4 focus:ring-indigo-500/20 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-sm disabled:cursor-not-allowed"
            >
              <span className="absolute inset-0 bg-indigo-50/0 group-hover:bg-indigo-50/50 rounded-2xl transition-colors"></span>
              <span className="text-xl font-bold text-slate-700 group-hover:text-indigo-700 z-10 transition-colors mb-1">{t('exp.trolley.doNothing')}</span>
              <span className="text-sm font-semibold text-indigo-500/60 group-hover:text-indigo-500 z-10">{t('exp.trolley.noAction')}</span>
            </button>
          </div>
        </div>
      </div>
    </ExperimentWrapper>
  );
}

export default TrolleyExperiment;
