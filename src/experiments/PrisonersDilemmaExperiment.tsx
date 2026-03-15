/**
 * PRISONER'S DILEMMA - Game Theory Experiment
 * 
 * Tests cooperation vs defection strategies in repeated games.
 */

import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ExperimentWrapper } from './ExperimentWrapper';
import type { Experiment } from '../data/experiments';
import type { TrialData, ExperimentResults } from './ExperimentWrapper';
import { getDefaultConfig } from './config/experimentDefaults';

interface PrisonersDilemmaConfig {
  trials: number;
  isi: number;
  showFeedback: boolean;
  customInstructions: string;
}

interface PrisonersDilemmaProps {
  experiment: Experiment;
  onComplete: (results: ExperimentResults) => void;
  participantId: string;
  roomId: string;
  config?: Partial<PrisonersDilemmaConfig>;
}

const DEFAULT_CONFIG = { ...getDefaultConfig('prisoners-dilemma'), trials: 20 } as PrisonersDilemmaConfig;

export function PrisonersDilemmaExperiment({ experiment, onComplete, participantId, roomId, config = {} }: PrisonersDilemmaProps) {
  const { t, language } = useLanguage();
  const settings: PrisonersDilemmaConfig = { ...DEFAULT_CONFIG, ...config };

  const [phase, setPhase] = useState<'instruction' | 'experiment' | 'complete'>('instruction');
  const [trialIndex, setTrialIndex] = useState(0);
  const [trialData, setTrialData] = useState<TrialData[]>([]);
  const [experimentStartTime, setExperimentStartTime] = useState(0);
  const [score, setScore] = useState(0);
  const [lastRound, setLastRound] = useState<{ you: string, them: string } | null>(null);

  useEffect(() => { if (phase === 'instruction') setExperimentStartTime(performance.now()); }, [phase]);

  const opponentStrategy = () => {
    const rand = Math.random();
    if (trialIndex < 3) return 'cooperate';
    if (lastRound?.you === 'cooperate' && lastRound?.them === 'cooperate') return rand > 0.3 ? 'cooperate' : 'defect';
    if (lastRound?.you === 'cooperate') return rand > 0.1 ? 'defect' : 'cooperate';
    return rand > 0.5 ? 'defect' : 'cooperate';
  };

  const handleChoice = (choice: 'cooperate' | 'defect') => {
    const opponentChoice = opponentStrategy();
    let points = 0;
    let outcome = '';

    if (choice === 'cooperate' && opponentChoice === 'cooperate') { points = 3; outcome = 'coop_coop'; }
    else if (choice === 'cooperate' && opponentChoice === 'defect') { points = 0; outcome = 'coop_defect'; }
    else if (choice === 'defect' && opponentChoice === 'cooperate') { points = 5; outcome = 'defect_coop'; }
    else { points = 1; outcome = 'defect_defect'; }

    const newScore = score + points;
    setScore(newScore);
    setLastRound({ you: choice, them: opponentChoice });

    const trial: TrialData = {
      trialNumber: trialIndex + 1,
      responseTimeMs: 500,
      answer: choice,
      correctAnswer: opponentChoice,
      stimulus: { choice, opponentChoice, points, outcome },
    };
    setTrialData(prev => [...prev, trial]);

    setTimeout(() => {
      if (trialIndex < settings.trials - 1) setTrialIndex(prev => prev + 1);
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
      answer: score,
      correctAnswer: 'total_points',
      trialData,
      debrief: t(experiment.debriefKey),
    };
    onComplete(results);
  };

  if (phase === 'instruction') {
    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="max-w-2xl mx-auto p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
          <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-emerald-600 mb-6">{t('exp.prisonersDilemma.name')}</h2>

          <div className="bg-slate-50 border-l-4 border-teal-500 p-5 rounded-r-lg shadow-sm mb-6">
            <p className="text-slate-700 leading-relaxed text-md">
              {settings.customInstructions || t('exp.prisonersDilemma.instruction')}
            </p>
          </div>

          <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-5 mb-8">
            <p className="text-sm font-semibold text-indigo-900 mb-2 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              {t('exp.prisonersDilemma.instructionDetail')}
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
    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="max-w-2xl mx-auto p-6">
          <h2 className="text-2xl font-bold text-navy-900 mb-4">{t('common.debrief.title')}</h2>
          <div className="bg-teal-50 border-l-4 border-teal-500 p-4 mb-4">
            <p className="text-teal-800 font-medium">{t('common.debrief.thankYou')}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg text-center mb-6">
            <p className="text-2xl font-bold text-navy-900">{score}/{settings.trials * 5}</p>
            <p className="text-sm text-gray-600">{t('exp.prisonersDilemma.points')}</p>
          </div>
          <p className="text-gray-600 mb-4">{t('exp.prisonersDilemma.debrief')}</p>
        </div>
      </ExperimentWrapper>
    );
  }

  return (
    <ExperimentWrapper experiment={experiment}>
      <div className="max-w-3xl mx-auto p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 min-h-[500px] flex flex-col relative overflow-hidden">
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

        <div className="flex-1 flex flex-col items-center justify-center animate-fade-in w-full max-w-lg mx-auto">
          {lastRound && (
            <div className="w-full bg-slate-50 border border-slate-100 p-4 rounded-xl mb-6 flex flex-col sm:flex-row justify-center items-center gap-4 text-center">
              <span className="text-slate-500 text-sm font-semibold uppercase tracking-wide">{t('exp.prisonersDilemma.lastRound')}:</span>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-lg text-sm font-bold ${lastRound.you === 'cooperate' ? 'bg-teal-100 text-teal-700' : 'bg-rose-100 text-rose-700'}`}>{t(`exp.prisonersDilemma.${lastRound.you}`)}</span>
                <span className="text-slate-400 font-medium tracking-widest text-xs">VS</span>
                <span className={`px-3 py-1 rounded-lg text-sm font-bold ${lastRound.them === 'cooperate' ? 'bg-teal-100 text-teal-700' : 'bg-rose-100 text-rose-700'}`}>{t(`exp.prisonersDilemma.${lastRound.them}`)}</span>
              </div>
            </div>
          )}

          <div className="w-full bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-100 mb-10 text-center relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-400 transform origin-top group-hover:scale-y-110 transition-transform duration-500"></div>
            <p className="text-slate-500 font-medium uppercase tracking-wider text-sm mb-2">{t('exp.prisonersDilemma.points')}</p>
            <p className="font-extrabold text-5xl text-transparent bg-clip-text bg-gradient-to-b from-indigo-500 to-indigo-700 inline-block drop-shadow-sm">{score}</p>
          </div>

          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight mb-8 text-center">
            {t('exp.prisonersDilemma.yourChoice')}
          </h2>

          <div className="flex flex-col sm:flex-row justify-center gap-5 w-full">
            <button
              onClick={() => handleChoice('cooperate')}
              className="group relative flex-1 py-5 bg-white rounded-2xl shadow-sm border-2 border-transparent hover:border-teal-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col items-center justify-center focus:outline-none focus:ring-4 focus:ring-teal-500/20"
            >
              <span className="absolute inset-0 bg-teal-50/0 group-hover:bg-teal-50/50 rounded-2xl transition-colors"></span>
              <span className="text-xl font-bold text-slate-700 group-hover:text-teal-700 z-10 transition-colors uppercase tracking-wide">{t('exp.prisonersDilemma.cooperate')}</span>
            </button>

            <button
              onClick={() => handleChoice('defect')}
              className="group relative flex-1 py-5 bg-white rounded-2xl shadow-sm border-2 border-transparent hover:border-rose-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col items-center justify-center focus:outline-none focus:ring-4 focus:ring-rose-500/20"
            >
              <span className="absolute inset-0 bg-slate-50/0 group-hover:bg-rose-50/50 rounded-2xl transition-colors"></span>
              <span className="text-xl font-bold text-slate-700 group-hover:text-rose-700 z-10 transition-colors uppercase tracking-wide">{t('exp.prisonersDilemma.defect')}</span>
            </button>
          </div>
        </div>
      </div>
    </ExperimentWrapper>
  );
}

export default PrisonersDilemmaExperiment;
