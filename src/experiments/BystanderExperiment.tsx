/**
 * BYSTANDER EFFECT - Social Psychology Experiment
 * 
 * Tests intervention likelihood with different numbers of bystanders.
 * Participants read scenarios and decide whether to help.
 */

import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ExperimentWrapper } from './ExperimentWrapper';
import type { Experiment } from '../data/experiments';
import type { TrialData, ExperimentResults } from './ExperimentWrapper';
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
        <div className="max-w-2xl mx-auto p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
          <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-emerald-600 mb-6">{t('exp.bystander.name')}</h2>

          <div className="bg-slate-50 border-l-4 border-teal-500 p-5 rounded-r-lg shadow-sm mb-6">
            <p className="text-slate-700 leading-relaxed text-md">
              {settings.customInstructions || t('exp.bystander.instruction')}
            </p>
          </div>

          <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-5 mb-8">
            <p className="text-sm font-semibold text-indigo-900 mb-2 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              {t('exp.bystander.instructionDetail')}
            </p>
          </div>

          <p className="text-sm font-medium text-slate-400 mb-8 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
            {t('citation')}: {experiment.citation}, {experiment.year}
          </p>

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
      <div className="max-w-3xl mx-auto p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 min-h-[500px] flex flex-col relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-white -z-10"></div>
        {settings.showProgressBar && (
          <div className="mb-8 px-4 pt-2">
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-teal-400 to-teal-500 transition-all duration-500 ease-out"
                style={{ width: `${((trialIndex + 1) / allScenarios.length) * 100}%` }}
              />
            </div>
            <div className="flex justify-between items-center mt-3">
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                {trialIndex + 1} / {allScenarios.length}
              </span>
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col items-center animate-fade-in w-full">
          <div className="w-full bg-white p-8 sm:p-10 rounded-2xl shadow-sm border border-slate-100 mb-10 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-400 transform origin-top group-hover:scale-y-110 transition-transform duration-500"></div>

            <div className="flex items-start gap-4 mb-6">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
              </div>
              <p className="text-slate-700 text-lg leading-relaxed font-medium pt-1">
                {t(`exp.bystander.situation.${currentScenario.situation}`)}
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-500 uppercase tracking-wide">{t('exp.bystander.bystanders')}</span>
              <div className="flex items-center gap-2">
                <div className="flex -space-x-1 mr-2">
                  {[...Array(Math.min(minAmount(currentScenario.bystanders, 5), 5))].map((_, i) => (
                    <div key={i} className="w-6 h-6 rounded-full bg-slate-200 border-2 border-white"></div>
                  ))}
                  {currentScenario.bystanders > 5 && (
                    <div className="w-6 h-6 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-500">
                      +{currentScenario.bystanders - 5}
                    </div>
                  )}
                </div>
                <span className="text-xl font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg">{currentScenario.bystanders}</span>
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight mb-8 text-center">
            {t('exp.bystander.wouldYouHelp')}
          </h2>

          <div className="flex flex-col sm:flex-row justify-center gap-6 w-full max-w-xl">
            <button
              onClick={() => handleResponse(true)}
              className="group relative flex-1 py-6 bg-white rounded-2xl shadow-sm border-2 border-transparent hover:border-teal-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col items-center justify-center focus:outline-none focus:ring-4 focus:ring-teal-500/20"
            >
              <span className="absolute inset-0 bg-teal-50/0 group-hover:bg-teal-50/50 rounded-2xl transition-colors"></span>
              <span className="text-2xl font-bold text-slate-700 group-hover:text-teal-700 z-10 transition-colors uppercase tracking-wide">{t('common.yes')}</span>
            </button>

            <button
              onClick={() => handleResponse(false)}
              className="group relative flex-1 py-6 bg-white rounded-2xl shadow-sm border-2 border-transparent hover:border-slate-300 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col items-center justify-center focus:outline-none focus:ring-4 focus:ring-slate-500/20"
            >
              <span className="absolute inset-0 bg-slate-50/0 group-hover:bg-slate-50/50 rounded-2xl transition-colors"></span>
              <span className="text-2xl font-bold text-slate-700 group-hover:text-slate-800 z-10 transition-colors uppercase tracking-wide">{t('common.no')}</span>
            </button>
          </div>
        </div>
      </div>
    </ExperimentWrapper>
  );
}

// Helper to use in the render above to limit icons
function minAmount(a: number, b: number) {
  return a < b ? a : b;
}

export default BystanderExperiment;
