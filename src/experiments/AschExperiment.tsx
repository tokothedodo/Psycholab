/**
 * ASCH CONFORMITY - Social Psychology Experiment
 * 
 * Tests social pressure and conformity.
 */

import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ExperimentWrapper } from './ExperimentWrapper';
import type { Experiment } from '../data/experiments';
import type { TrialData, ExperimentResults } from './ExperimentWrapper';
import { getDefaultConfig } from './config/experimentDefaults';

interface AschConfig {
  trials: number;
  showFeedback: boolean;
  customInstructions: string;
}

interface AschProps {
  experiment: Experiment;
  onComplete: (results: ExperimentResults) => void;
  participantId: string;
  roomId: string;
  config?: Partial<AschConfig>;
}

const TRIALS = [
  { lines: [{ id: 1, len: 3 }, { id: 2, len: 5 }, { id: 3, len: 2 }], correct: 2, standard: 1 },
  { lines: [{ id: 1, len: 4 }, { id: 2, len: 2 }, { id: 3, len: 5 }], correct: 3, standard: 1 },
  { lines: [{ id: 1, len: 3 }, { id: 2, len: 6 }, { id: 3, len: 4 }], correct: 2, standard: 1 },
];

const DEFAULT_CONFIG = { ...getDefaultConfig('asch'), trials: 6 } as AschConfig;

export function AschExperiment({ experiment, onComplete, participantId, roomId, config = {} }: AschProps) {
  const { t, language } = useLanguage();
  const settings: AschConfig = { ...DEFAULT_CONFIG, ...config };

  const [phase, setPhase] = useState<'instruction' | 'experiment' | 'complete'>('instruction');
  const [trialIndex, setTrialIndex] = useState(0);
  const [trialData, setTrialData] = useState<TrialData[]>([]);
  const [experimentStartTime, setExperimentStartTime] = useState(0);
  const [confederateAnswer, setConfederateAnswer] = useState<number | null>(null);
  const [showConfederate, setShowConfederate] = useState(false);

  useEffect(() => { if (phase === 'instruction') setExperimentStartTime(performance.now()); }, [phase]);

  const currentTrial = TRIALS[trialIndex % TRIALS.length];

  useEffect(() => {
    if (phase === 'experiment' && !showConfederate) {
      const timer = setTimeout(() => {
        setConfederateAnswer(currentTrial.correct === 1 ? 2 : 1);
        setShowConfederate(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [phase, trialIndex]);

  const handleResponse = (answer: number) => {
    const conformed = answer === confederateAnswer;
    const trial: TrialData = {
      trialNumber: trialIndex + 1,
      responseTimeMs: 500,
      answer: String(answer),
      correctAnswer: String(currentTrial.correct),
      stimulus: { conformed, confederateAnswer },
    };
    setTrialData(prev => [...prev, trial]);
    setShowConfederate(false);
    setConfederateAnswer(null);
    setTimeout(() => {
      if (trialIndex < settings.trials - 1) setTrialIndex(prev => prev + 1);
      else completeExperiment();
    }, 1000);
  };

  const completeExperiment = () => {
    setPhase('complete');
    const conformed = trialData.filter(t => (t.stimulus as { conformed: boolean }).conformed).length;
    const results: ExperimentResults = {
      experimentName: experiment.id,
      participantId,
      roomId,
      language,
      timestamp: new Date().toISOString(),
      totalTrials: trialData.length,
      responseTimeMs: Math.round(performance.now() - experimentStartTime),
      accuracy: ((settings.trials - conformed) / settings.trials) * 100,
      answer: conformed,
      correctAnswer: 'conformity_count',
      trialData,
      debrief: t(experiment.debriefKey),
    };
    onComplete(results);
  };

  if (phase === 'instruction') {
    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="max-w-2xl mx-auto p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
          <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-emerald-600 mb-6">{t('exp.asch.name')}</h2>

          <div className="bg-slate-50 border-l-4 border-teal-500 p-5 rounded-r-lg shadow-sm mb-6">
            <p className="text-slate-700 leading-relaxed text-md">
              {settings.customInstructions || t('exp.asch.instruction')}
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
    const conformed = trialData.filter(t => (t.stimulus as { conformed: boolean }).conformed).length;
    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="max-w-2xl mx-auto p-6">
          <h2 className="text-2xl font-bold text-navy-900 mb-4">{t('common.debrief.title')}</h2>
          <div className="bg-teal-50 border-l-4 border-teal-500 p-4 mb-4">
            <p className="text-teal-800 font-medium">{t('common.debrief.thankYou')}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg text-center mb-6">
            <p className="text-2xl font-bold text-navy-900">{conformed}/{trialData.length}</p>
            <p className="text-sm text-gray-600">{t('exp.asch.conformed')}</p>
          </div>
          <p className="text-gray-600 mb-4">{t('exp.asch.debrief')}</p>
        </div>
      </ExperimentWrapper>
    );
  }

  return (
    <ExperimentWrapper experiment={experiment}>
      <div className="max-w-4xl mx-auto p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 min-h-[500px] flex flex-col relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-white -z-10"></div>
        <div className="mb-8 px-4 pt-2">
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-teal-400 to-teal-500 transition-all duration-500 ease-out"
              style={{ width: `${((trialIndex + 1) / settings.trials) * 100}%` }}
            />
          </div>
          <div className="flex justify-between items-center mt-3">
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
              {trialIndex + 1} / {settings.trials}
            </span>
          </div>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-24 mb-12">
          <div className="flex flex-col items-center">
            <p className="text-slate-500 text-sm font-semibold tracking-wider uppercase mb-6 bg-slate-100 px-4 py-1.5 rounded-full">{t('exp.asch.standard')}</p>
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center min-w-[160px] h-64">
              <div className="w-5 bg-gradient-to-b from-slate-700 to-slate-900 rounded-full shadow-sm" style={{ height: (currentTrial.lines.find(l => l.id === currentTrial.standard)?.len || 0) * 20 }}></div>
            </div>
          </div>

          <div className="hidden lg:block w-px h-48 bg-slate-200"></div>

          <div className="flex flex-col items-center">
            <p className="text-slate-500 text-sm font-semibold tracking-wider uppercase mb-6 bg-slate-100 px-4 py-1.5 rounded-full">{t('exp.asch.compare')}</p>
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex items-end justify-center gap-10 min-w-[320px] h-64">
              {currentTrial.lines.map(line => (
                <div key={line.id} className="flex flex-col items-center gap-4">
                  <div className="w-5 bg-gradient-to-b from-slate-400 to-slate-600 rounded-full shadow-sm transition-all duration-300 hover:from-teal-400 hover:to-teal-600 cursor-pointer" style={{ height: line.len * 20 }} onClick={() => handleResponse(line.id)}></div>
                  <span className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center text-sm">{line.id}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-auto flex flex-col items-center">
          <div className="relative w-full max-w-md h-16 flex items-center justify-center mb-6">
            {showConfederate ? (
              <div className="absolute inset-0 bg-blue-50/80 backdrop-blur-sm border border-blue-200 rounded-xl flex items-center justify-center gap-3 animate-fade-in shadow-sm transform transition-all duration-500 scale-100 opacity-100">
                <div className="flex -space-x-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="w-6 h-6 rounded-full bg-blue-200 border-2 border-white flex items-center justify-center">
                      <svg className="w-3 h-3 text-blue-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"></path></svg>
                    </div>
                  ))}
                </div>
                <p className="text-blue-800 font-medium">
                  {t('exp.asch.othersSay')} <span className="font-bold text-lg bg-white px-2 py-0.5 rounded shadow-sm ml-1 text-blue-900">{confederateAnswer}</span>
                </p>
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center transition-all duration-300 transform scale-95 opacity-0"></div>
            )}
          </div>

          <h2 className="text-xl font-bold text-slate-800 tracking-tight mb-6">{t('exp.asch.whichLine')}</h2>
          <div className="flex justify-center gap-4 w-full max-w-md">
            {[1, 2, 3].map(num => (
              <button
                key={num}
                onClick={() => handleResponse(num)}
                className="group relative flex-1 py-4 bg-white rounded-xl shadow-sm border-2 border-transparent hover:border-teal-200 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-teal-500/20"
              >
                <span className="absolute inset-0 bg-teal-50/0 group-hover:bg-teal-50/50 rounded-xl transition-colors"></span>
                <span className="text-xl font-bold text-slate-600 group-hover:text-teal-700 z-10 transition-colors">{num}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </ExperimentWrapper>
  );
}

export default AschExperiment;
