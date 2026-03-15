/**
 * PRISONER'S DILEMMA - Game Theory Experiment
 * 
 * Tests cooperation vs defection strategies in repeated games.
 */

import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ExperimentWrapper } from '../components/experiments/ExperimentWrapper';
import type { Experiment } from '../data/experiments';
import type { TrialData, ExperimentResults } from '../components/experiments/ExperimentWrapper';
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
  const [lastRound, setLastRound] = useState<{you: string, them: string} | null>(null);

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
        <div className="max-w-2xl mx-auto p-6">
          <h2 className="text-2xl font-bold text-navy-900 mb-4">{t('exp.prisonersDilemma.name')}</h2>
          <p className="text-gray-600 mb-4">{settings.customInstructions || t('exp.prisonersDilemma.instruction')}</p>
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
            <p className="text-blue-800">{t('exp.prisonersDilemma.instructionDetail')}</p>
          </div>
          <button onClick={() => setPhase('experiment')} className="bg-teal-600 text-white px-6 py-3 rounded-lg">{t('common.start')}</button>
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
      <div className="max-w-2xl mx-auto p-6">
        <div className="mb-6"><div className="h-2 bg-gray-200 rounded"><div className="h-full bg-teal-600" style={{ width: `${((trialIndex + 1) / settings.trials) * 100}%` }} /></div></div>
        {lastRound && (
          <div className="bg-gray-50 p-4 rounded-lg mb-6 text-center">
            <p className="text-gray-600">{t('exp.prisonersDilemma.lastRound')}: {t(`exp.prisonersDilemma.${lastRound.you}`)} vs {t(`exp.prisonersDilemma.${lastRound.them}`)}</p>
          </div>
        )}
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6 text-center">
          <p className="text-2xl font-bold text-blue-900">{score} {t('exp.prisonersDilemma.points')}</p>
        </div>
        <h2 className="text-xl font-semibold text-navy-900 mb-6 text-center">{t('exp.prisonersDilemma.yourChoice')}</h2>
        <div className="flex justify-center gap-6">
          <button onClick={() => handleChoice('cooperate')} className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-4 rounded-lg">
            <span className="text-lg font-semibold">{t('exp.prisonersDilemma.cooperate')}</span>
          </button>
          <button onClick={() => handleChoice('defect')} className="bg-gray-200 hover:bg-gray-300 text-navy-900 px-8 py-4 rounded-lg">
            <span className="text-lg font-semibold">{t('exp.prisonersDilemma.defect')}</span>
          </button>
        </div>
      </div>
    </ExperimentWrapper>
  );
}

export default PrisonersDilemmaExperiment;
