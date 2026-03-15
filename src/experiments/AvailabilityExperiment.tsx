/**
 * AVAILABILITY HEURISTIC - Cognitive Bias Experiment
 * 
 * Tests frequency estimation based on ease of recall.
 */

import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ExperimentWrapper } from './ExperimentWrapper';
import type { Experiment } from '../data/experiments';
import type { TrialData, ExperimentResults } from './ExperimentWrapper';
import { getDefaultConfig } from './config/experimentDefaults';

interface AvailabilityConfig {
  trials: number;
  isi: number;
  showFeedback: boolean;
  showProgressBar: boolean;
  customInstructions: string;
}

interface AvailabilityProps {
  experiment: Experiment;
  onComplete: (results: ExperimentResults) => void;
  participantId: string;
  roomId: string;
  config?: Partial<AvailabilityConfig>;
}

const QUESTIONS = [
  { id: 'drowning', question: 'drowning_deaths', actual: 3200, keyword: 'water' },
  { id: 'terrorism', question: 'terrorism_deaths', actual: 200, keyword: 'terror' },
  { id: 'homicide', question: 'homicide_deaths', actual: 15000, keyword: 'murder' },
  { id: 'suicide', question: 'suicide_deaths', actual: 45000, keyword: 'suicide' },
  { id: 'accident', question: 'car_accident_deaths', actual: 38000, keyword: 'car' },
  { id: 'lightning', question: 'lightning_deaths', actual: 50, keyword: 'lightning' },
];

const DEFAULT_CONFIG = { ...getDefaultConfig('availability'), trials: 6 } as AvailabilityConfig;

export function AvailabilityExperiment({ experiment, onComplete, participantId, roomId, config = {} }: AvailabilityProps) {
  const { t, language } = useLanguage();
  const settings: AvailabilityConfig = { ...DEFAULT_CONFIG, ...config };

  const [phase, setPhase] = useState<'instruction' | 'experiment' | 'complete'>('instruction');
  const [trialIndex, setTrialIndex] = useState(0);
  const [trialData, setTrialData] = useState<TrialData[]>([]);
  const [experimentStartTime, setExperimentStartTime] = useState(0);
  const [userEstimate, setUserEstimate] = useState('');

  useEffect(() => { if (phase === 'instruction') setExperimentStartTime(performance.now()); }, [phase]);

  const currentQuestion = QUESTIONS[trialIndex];

  const handleSubmit = () => {
    const actual = currentQuestion.actual;
    const trial: TrialData = {
      trialNumber: trialIndex + 1,
      responseTimeMs: 500,
      answer: userEstimate,
      correctAnswer: String(actual),
      stimulus: { actual, keyword: currentQuestion.keyword },
    };
    setTrialData(prev => [...prev, trial]);
    setUserEstimate('');
    setTimeout(() => {
      if (trialIndex < QUESTIONS.length - 1) setTrialIndex(prev => prev + 1);
      else completeExperiment();
    }, settings.isi);
  };

  const completeExperiment = () => {
    setPhase('complete');
    const results: ExperimentResults = {
      experimentName: experiment.id,
      participantId,
      roomId,
      language,
      timestamp: new Date().toISOString(),
      totalTrials: trialData.length,
      responseTimeMs: Math.round(performance.now() - experimentStartTime),
      accuracy: 50,
      answer: trialData.length,
      correctAnswer: 'completion',
      trialData,
      debrief: t(experiment.debriefKey),
    };
    onComplete(results);
  };

  if (phase === 'instruction') {
    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="max-w-2xl mx-auto p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
          <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-emerald-600 mb-6">{t('exp.availability.name')}</h2>

          <div className="bg-slate-50 border-l-4 border-teal-500 p-5 rounded-r-lg shadow-sm mb-6">
            <p className="text-slate-700 leading-relaxed text-md">
              {settings.customInstructions || t('exp.availability.instruction')}
            </p>
          </div>

          <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-5 mb-8">
            <p className="text-sm font-semibold text-indigo-900 mb-2 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              {t('exp.availability.instructionDetail')}
            </p>
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
    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="max-w-2xl mx-auto p-6">
          <h2 className="text-2xl font-bold text-navy-900 mb-4">{t('common.debrief.title')}</h2>
          <div className="bg-teal-50 border-l-4 border-teal-500 p-4 mb-4">
            <p className="text-teal-800 font-medium">{t('common.debrief.thankYou')}</p>
          </div>
          <p className="text-gray-600 mb-4">{t('exp.availability.debrief')}</p>
        </div>
      </ExperimentWrapper>
    );
  }

  return (
    <ExperimentWrapper experiment={experiment}>
      <div className="max-w-3xl mx-auto p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 min-h-[450px] flex flex-col relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-white -z-10"></div>
        {settings.showProgressBar && (
          <div className="mb-8 px-4 pt-2">
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden flex">
              <div
                className="h-full bg-gradient-to-r from-teal-400 to-teal-500 transition-all duration-500 ease-out"
                style={{ width: `${((trialIndex + 1) / QUESTIONS.length) * 100}%` }}
              />
            </div>
            <div className="flex justify-between items-center mt-3">
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                {trialIndex + 1} / {QUESTIONS.length}
              </span>
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col items-center justify-center animate-fade-in w-full max-w-xl mx-auto">
          <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight mb-10 text-center leading-tight">
            {t(`exp.availability.${currentQuestion.question}`)}
          </h2>

          <div className="w-full max-w-sm mx-auto mb-10">
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-teal-400 to-emerald-400 rounded-xl blur opacity-30 group-hover:opacity-60 transition duration-500"></div>
              <input
                type="number"
                value={userEstimate}
                onChange={e => setUserEstimate(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && userEstimate && handleSubmit()}
                placeholder="0"
                className="relative w-full px-6 py-5 text-center text-3xl font-bold bg-white border border-slate-200 rounded-xl focus:border-teal-500 focus:ring-4 focus:ring-teal-500/20 focus:outline-none transition-all shadow-sm placeholder-slate-200"
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

export default AvailabilityExperiment;
