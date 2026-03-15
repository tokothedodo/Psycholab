/**
 * ANCHORING BIAS - Cognitive Bias Experiment
 * 
 * Tests numerical estimation with random anchor numbers.
 * Participants estimate values after seeing a random "anchor" that influences their judgments.
 */

import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ExperimentWrapper } from './ExperimentWrapper';
import type { Experiment } from '../data/experiments';
import type { TrialData, ExperimentResults } from './ExperimentWrapper';
import { getDefaultConfig } from './config/experimentDefaults';

interface AnchoringConfig {
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
  showAnchor: boolean;
}

interface AnchoringProps {
  experiment: Experiment;
  onComplete: (results: ExperimentResults) => void;
  participantId: string;
  roomId: string;
  config?: Partial<AnchoringConfig>;
}

interface Trial {
  question: string;
  actualValue: number;
  lowAnchor: number;
  highAnchor: number;
}

const DEFAULT_CONFIG = {
  ...getDefaultConfig('anchoring-and-adjustment-heuristic-task'),
  showAnchor: true,
} as AnchoringConfig;

const QUESTIONS: Trial[] = [
  { question: 'population_tbilisi', actualValue: 1100000, lowAnchor: 500000, highAnchor: 2000000 },
  { question: 'height_mtketi', actualValue: 2654, lowAnchor: 1500, highAnchor: 4000 },
  { question: 'year_georgia_un', actualValue: 1992, lowAnchor: 1980, highAnchor: 2000 },
  { question: 'area_georgia', actualValue: 69700, lowAnchor: 50000, highAnchor: 100000 },
  { question: 'wine_production', actualValue: 100, lowAnchor: 50, highAnchor: 200 },
  { question: 'population_baku', actualValue: 2300000, lowAnchor: 1000000, highAnchor: 3000000 },
  { question: 'lake_sevan_area', actualValue: 940, lowAnchor: 500, highAnchor: 1500 },
  { question: 'mount_ararat_height', actualValue: 5165, lowAnchor: 3000, highAnchor: 6000 },
];

export function AnchoringExperiment({ experiment, onComplete, participantId, roomId, config = {} }: AnchoringProps) {
  const { t, language } = useLanguage();

  const settings: AnchoringConfig = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  const [phase, setPhase] = useState<'instruction' | 'practice' | 'experiment' | 'complete'>('instruction');
  const [trialIndex, setTrialIndex] = useState(0);
  const [trialData, setTrialData] = useState<TrialData[]>([]);
  const [experimentStartTime, setExperimentStartTime] = useState(0);
  const [trialStartTime, setTrialStartTime] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [, setLastCorrect] = useState<boolean | null>(null);
  const [currentAnchor, setCurrentAnchor] = useState<number | null>(null);
  const [userEstimate, setUserEstimate] = useState('');

  const generateStimuli = useCallback((): Trial[] => {
    let stimuli = [...QUESTIONS];
    if (settings.randomizeOrder) {
      stimuli = stimuli.sort(() => Math.random() - 0.5);
    }
    return stimuli.slice(0, settings.trials);
  }, [settings.trials, settings.randomizeOrder]);

  const [allStimuli] = useState(generateStimuli);

  const [practiceStimuli] = useState(QUESTIONS.slice(0, 2));

  useEffect(() => {
    if (phase === 'instruction') {
      setExperimentStartTime(performance.now());
    }
  }, [phase]);

  useEffect(() => {
    if ((phase === 'experiment' || phase === 'practice') && currentAnchor !== null) {
      setTrialStartTime(performance.now());
    }
  }, [phase, trialIndex, currentAnchor]);

  useEffect(() => {
    if (settings.responseTimeLimit > 0 && phase === 'experiment' && currentAnchor !== null) {
      const timer = setTimeout(() => {
        if (userEstimate) handleSubmit();
      }, settings.responseTimeLimit);
      return () => clearTimeout(timer);
    }
  }, [phase, currentAnchor, settings.responseTimeLimit, userEstimate]);

  const scheduleNextTrial = () => {
    if (settings.isi > 0) {
      setTimeout(() => {
        advanceTrial();
      }, settings.isi);
    } else {
      advanceTrial();
    }
  };

  const advanceTrial = () => {
    setUserEstimate('');
    setCurrentAnchor(null);

    if (phase === 'practice') {
      if (trialIndex < practiceStimuli.length - 1) {
        setTrialIndex(prev => prev + 1);
      } else {
        setPhase('experiment');
        setTrialIndex(0);
      }
    } else if (phase === 'experiment') {
      if (trialIndex < allStimuli.length - 1) {
        setTrialIndex(prev => prev + 1);
      } else {
        completeExperiment();
      }
    }
  };

  const getAnchor = (trial: Trial): number => {
    return Math.random() > 0.5 ? trial.lowAnchor : trial.highAnchor;
  };

  useEffect(() => {
    if (phase === 'practice' && trialIndex < practiceStimuli.length) {
      setCurrentAnchor(getAnchor(practiceStimuli[trialIndex]));
    } else if (phase === 'experiment' && trialIndex < allStimuli.length) {
      setCurrentAnchor(getAnchor(allStimuli[trialIndex]));
    }
  }, [phase, trialIndex]);

  const handleSubmit = () => {
    if (!userEstimate || !currentAnchor) return;

    const currentTrial = phase === 'practice' ? practiceStimuli[trialIndex] : allStimuli[trialIndex];
    const estimate = parseInt(userEstimate, 10);
    const actualValue = currentTrial.actualValue;

    const endTime = performance.now();
    const responseTime = Math.round(endTime - trialStartTime);

    const error = Math.abs(estimate - actualValue);
    const isCorrect = error < actualValue * 0.2;

    if (phase === 'practice') {
      if (settings.showFeedback) {
        setLastCorrect(isCorrect);
        setShowFeedback(true);
        setTimeout(() => {
          setShowFeedback(false);
          scheduleNextTrial();
        }, 1500);
      } else {
        scheduleNextTrial();
      }
      return;
    }

    const trial: TrialData = {
      trialNumber: trialIndex + 1,
      responseTimeMs: responseTime,
      answer: userEstimate,
      correctAnswer: String(actualValue),
      stimulus: { anchor: currentAnchor, actualValue, question: currentTrial.question },
    };

    setTrialData(prev => [...prev, trial]);

    if (settings.showFeedback) {
      setLastCorrect(isCorrect);
      setShowFeedback(true);
      setTimeout(() => {
        setShowFeedback(false);
        scheduleNextTrial();
      }, 1500);
    } else {
      scheduleNextTrial();
    }
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

    const avgError = finalTrialData.reduce((sum, t) => {
      const stimulus = t.stimulus as { actualValue: number };
      return sum + Math.abs(parseInt(String(t.answer), 10) - stimulus.actualValue);
    }, 0) / finalTrialData.length;

    const results: ExperimentResults = {
      experimentName: experiment.id,
      participantId,
      roomId,
      language,
      timestamp: new Date().toISOString(),
      totalTrials: trialData.length,
      responseTimeMs: totalTime,
      accuracy: 0,
      answer: avgError,
      correctAnswer: 'average_absolute_error',
      trialData: finalTrialData,
      debrief: t(experiment.debriefKey),
    };

    onComplete(results);
  };

  if (phase === 'instruction') {
    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="max-w-2xl mx-auto p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
          <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-emerald-600 mb-6">{t('exp.anchoring.name')}</h2>

          <div className="bg-slate-50 border-l-4 border-teal-500 p-5 rounded-r-lg shadow-sm mb-6">
            <p className="text-slate-700 leading-relaxed text-md">
              {settings.customInstructions || t('exp.anchoring.instruction')}
            </p>
          </div>

          <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-5 mb-8">
            <p className="text-sm font-semibold text-indigo-900 mb-2 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              {t('exp.anchoring.instructionDetail')}
            </p>
          </div>

          <p className="text-sm font-medium text-slate-400 mb-4 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
            {t('citation')}: {experiment.citation}, {experiment.year}
          </p>

          <p className="text-xs font-semibold text-slate-400 mb-8 uppercase tracking-wider flex gap-4">
            <span className="bg-slate-100 px-3 py-1 rounded-md">{settings.trials} {t('common.trials')}</span>
            {settings.practiceTrials > 0 && <span className="bg-slate-100 px-3 py-1 rounded-md">{settings.practiceTrials} {t('common.practice')}</span>}
          </p>

          <button
            onClick={() => {
              if (settings.practiceTrials > 0) {
                setPhase('practice');
                setTrialIndex(0);
              } else {
                setPhase('experiment');
                setTrialIndex(0);
              }
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
    const anchorHighTrials = trialData.filter(t => (t.stimulus as { anchor: number }).anchor > 1000000);
    const anchorLowTrials = trialData.filter(t => (t.stimulus as { anchor: number }).anchor < 1000000);

    const avgHighError = anchorHighTrials.length > 0
      ? anchorHighTrials.reduce((sum, t) => sum + Math.abs(parseInt(String(t.answer), 10) - (t.stimulus as { actualValue: number }).actualValue), 0) / anchorHighTrials.length
      : 0;
    const avgLowError = anchorLowTrials.length > 0
      ? anchorLowTrials.reduce((sum, t) => sum + Math.abs(parseInt(String(t.answer), 10) - (t.stimulus as { actualValue: number }).actualValue), 0) / anchorLowTrials.length
      : 0;

    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="max-w-2xl mx-auto p-6">
          <h2 className="text-2xl font-bold text-navy-900 mb-4">{t('common.debrief.title')}</h2>

          <div className="bg-teal-50 border-l-4 border-teal-500 p-4 mb-4">
            <p className="text-teal-800 font-medium">{t('common.debrief.thankYou')}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-navy-900">{Math.round(trialData.reduce((s, t) => s + t.responseTimeMs, 0) / trialData.length)}ms</p>
              <p className="text-sm text-gray-600">{t('common.avgRT')}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-navy-900">{Math.round(avgHighError + avgLowError) / 2}</p>
              <p className="text-sm text-gray-600">{t('exp.anchoring.avgError')}</p>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg mb-4">
            <p className="text-amber-800 font-medium mb-2">{t('exp.anchoring.anchorEffect')}:</p>
            <p className="text-sm text-amber-700">{t('exp.anchoring.highAnchorError')}: {Math.round(avgHighError)}</p>
            <p className="text-sm text-amber-700">{t('exp.anchoring.lowAnchorError')}: {Math.round(avgLowError)}</p>
            <p className="text-sm text-amber-700 mt-2">{t('exp.anchoring.interpretation')}</p>
          </div>

          <p className="text-gray-600 mb-4">{t('exp.anchoring.debrief')}</p>
        </div>
      </ExperimentWrapper>
    );
  }

  const currentTrial = phase === 'practice' ? practiceStimuli[trialIndex] : allStimuli[trialIndex];
  const totalTrials = phase === 'practice' ? practiceStimuli.length : allStimuli.length;

  return (
    <ExperimentWrapper experiment={experiment}>
      <div className="max-w-3xl mx-auto p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 min-h-[550px] flex flex-col relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-white -z-10"></div>

        {settings.showProgressBar && (
          <div className="mb-8 px-4 pt-2">
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden flex">
              <div
                className={`h-full transition-all duration-500 ease-out ${phase === 'practice' ? 'bg-amber-400' : 'bg-gradient-to-r from-teal-400 to-teal-500'}`}
                style={{ width: `${((trialIndex + 1) / totalTrials) * 100}%` }}
              />
            </div>
            <div className="flex justify-between items-center mt-3">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-md ${phase === 'practice' ? 'text-amber-700 bg-amber-100 uppercase tracking-widest' : 'text-slate-500 bg-slate-100'}`}>
                {phase === 'practice' ? t('common.practice') + ' ' : ''}{trialIndex + 1} / {totalTrials}
              </span>
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col items-center justify-center animate-fade-in w-full max-w-xl mx-auto">

          {showFeedback && currentAnchor && (
            <div className="mb-8 p-5 bg-emerald-50 border border-emerald-100 rounded-2xl w-full text-center shadow-sm animate-fade-in flex flex-col items-center">
              <span className="text-emerald-600 font-bold uppercase tracking-wider text-xs mb-1">Feedback</span>
              <p className="text-emerald-800">
                {t('exp.anchoring.actualWas')}: <span className="text-2xl font-black">{currentTrial.actualValue.toLocaleString()}</span>
              </p>
            </div>
          )}

          {settings.showAnchor && currentAnchor && (
            <div className="w-full bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100 mb-8 text-center relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full bg-indigo-400 transform origin-top group-hover:scale-y-110 transition-transform duration-500"></div>
              <p className="text-indigo-800/70 font-semibold uppercase tracking-wider text-sm mb-2">{t('exp.anchoring.randomNumber')}</p>
              <p className="font-extrabold text-5xl text-transparent bg-clip-text bg-gradient-to-b from-indigo-500 to-indigo-700 inline-block drop-shadow-sm leading-none">
                {currentAnchor.toLocaleString()}
              </p>
            </div>
          )}

          <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight mb-8 text-center leading-tight">
            {t(`exp.anchoring.${currentTrial.question}`)}
          </h2>

          <div className="w-full max-w-sm mx-auto mb-10">
            <label className="block text-slate-500 mb-3 text-center font-medium uppercase tracking-wider text-sm">
              {t('exp.anchoring.enterEstimate')}
            </label>
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-teal-400 to-emerald-400 rounded-xl blur opacity-30 group-hover:opacity-60 transition duration-500"></div>
              <input
                type="number"
                value={userEstimate}
                onChange={(e) => setUserEstimate(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                className="relative w-full px-6 py-5 text-center text-3xl font-bold bg-white border border-slate-200 rounded-xl focus:border-teal-500 focus:ring-4 focus:ring-teal-500/20 focus:outline-none transition-all shadow-sm placeholder-slate-200"
                placeholder="0"
                autoFocus
              />
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!userEstimate}
            className="group relative w-full sm:w-2/3 py-5 bg-gradient-to-r from-teal-500 to-emerald-500 rounded-2xl shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center justify-center focus:outline-none focus:ring-4 focus:ring-teal-500/30 text-white font-bold text-xl uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-md"
          >
            {t('common.submit')}
            <svg className="w-6 h-6 ml-3 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
          </button>
        </div>
      </div>
    </ExperimentWrapper>
  );
}

export default AnchoringExperiment;
