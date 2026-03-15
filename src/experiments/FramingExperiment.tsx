/**
 * FRAMING EFFECT - Decision Making Experiment
 * 
 * Tests decision making with gain/loss frames.
 * Same information framed differently leads to different choices.
 */

import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ExperimentWrapper } from './ExperimentWrapper';
import type { Experiment } from '../data/experiments';
import type { TrialData, ExperimentResults } from './ExperimentWrapper';
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
  ...getDefaultConfig('attribute-framing-effect-paradigm'),
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
        <div className="max-w-2xl mx-auto p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
          <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-emerald-600 mb-6">{t('exp.framing.name')}</h2>

          <div className="bg-slate-50 border-l-4 border-teal-500 p-5 rounded-r-lg shadow-sm mb-6">
            <p className="text-slate-700 leading-relaxed text-md">
              {settings.customInstructions || t('exp.framing.instruction')}
            </p>
          </div>

          <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-5 mb-8">
            <p className="text-sm font-semibold text-indigo-900 mb-2 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              {t('exp.framing.instructionDetail')}
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
      <div className="max-w-3xl mx-auto p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 min-h-[550px] flex flex-col relative overflow-hidden">
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

        <div className="flex-1 flex flex-col items-center justify-center animate-fade-in w-full max-w-xl mx-auto">

          <div className="w-full bg-slate-50 p-6 sm:p-8 rounded-2xl border border-slate-100 mb-10 text-center relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-400 transform origin-top group-hover:scale-y-110 transition-transform duration-500"></div>
            <h3 className="text-sm font-semibold text-indigo-500 uppercase tracking-widest mb-4">
              {t('exp.framing.scenario')} {trialIndex + 1}
            </h3>
            <p className="text-xl sm:text-2xl font-bold text-slate-700 leading-relaxed">
              {currentScenario.frame === 'gain'
                ? t(`exp.framing.gain${currentScenario.id}`) + ': ' + currentScenario.gainFrame
                : t(`exp.framing.loss${currentScenario.id}`) + ': ' + currentScenario.lossFrame}
            </p>
          </div>

          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight mb-8 text-center">
            {t('exp.framing.choose')}
          </h2>

          <div className="flex flex-col sm:flex-row justify-center gap-5 w-full">
            <button
              onClick={() => handleResponse('A')}
              className="group relative flex-1 py-8 bg-white rounded-2xl shadow-sm border-2 border-transparent hover:border-teal-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col items-center justify-center focus:outline-none focus:ring-4 focus:ring-teal-500/20"
            >
              <span className="absolute inset-0 bg-teal-50/0 group-hover:bg-teal-50/50 rounded-2xl transition-colors"></span>
              <span className="text-2xl font-bold text-slate-700 group-hover:text-teal-700 z-10 transition-colors uppercase tracking-wide">Option A</span>
            </button>
            <button
              onClick={() => handleResponse('B')}
              className="group relative flex-1 py-8 bg-white rounded-2xl shadow-sm border-2 border-transparent hover:border-indigo-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col items-center justify-center focus:outline-none focus:ring-4 focus:ring-indigo-500/20"
            >
              <span className="absolute inset-0 bg-indigo-50/0 group-hover:bg-indigo-50/50 rounded-2xl transition-colors"></span>
              <span className="text-2xl font-bold text-slate-700 group-hover:text-indigo-700 z-10 transition-colors uppercase tracking-wide">Option B</span>
            </button>
          </div>
        </div>
      </div>
    </ExperimentWrapper>
  );
}

export default FramingExperiment;
