/**
 * IOWA GAMBLING TASK - Decision Making Experiment
 * 
 * Tests reward/punishment learning and deck selection.
 */

import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ExperimentWrapper } from './ExperimentWrapper';
import type { Experiment } from '../data/experiments';
import type { TrialData, ExperimentResults } from './ExperimentWrapper';
import { getDefaultConfig } from './config/experimentDefaults';

interface IowaGamblingConfig {
  trials: number;
  showFeedback: boolean;
  customInstructions: string;
}

interface IowaGamblingProps {
  experiment: Experiment;
  onComplete: (results: ExperimentResults) => void;
  participantId: string;
  roomId: string;
  config?: Partial<IowaGamblingConfig>;
}

const DECKS = [
  { id: 'A', reward: 100, penaltyFreq: 0.1, penaltyAmount: 150 },
  { id: 'B', reward: 100, penaltyFreq: 0.1, penaltyAmount: 1250 },
  { id: 'C', reward: 50, penaltyFreq: 0.05, penaltyAmount: 50 },
  { id: 'D', reward: 50, penaltyFreq: 0.05, penaltyAmount: 100 },
];

const DEFAULT_CONFIG = { ...getDefaultConfig('iowa-gambling'), trials: 100 } as IowaGamblingConfig;

export function IowaGamblingExperiment({ experiment, onComplete, participantId, roomId, config = {} }: IowaGamblingProps) {
  const { t, language } = useLanguage();
  const settings: IowaGamblingConfig = { ...DEFAULT_CONFIG, ...config };

  const [phase, setPhase] = useState<'instruction' | 'experiment' | 'complete'>('instruction');
  const [trialIndex, setTrialIndex] = useState(0);
  const [trialData, setTrialData] = useState<TrialData[]>([]);
  const [balance, setBalance] = useState(2000);
  const [experimentStartTime, setExperimentStartTime] = useState(0);

  useEffect(() => { if (phase === 'instruction') setExperimentStartTime(performance.now()); }, [phase]);

  const handleDeckSelect = (deckId: string) => {
    const deck = DECKS.find(d => d.id === deckId)!;
    let gain = deck.reward;
    if (Math.random() < deck.penaltyFreq) {
      gain -= deck.penaltyAmount;
    }
    const newBalance = balance + gain;
    setBalance(newBalance);
    
    const trial: TrialData = {
      trialNumber: trialIndex + 1,
      responseTimeMs: 500,
      answer: deckId,
      correctAnswer: newBalance > balance ? 'good' : 'bad',
      stimulus: { deck: deckId, gain, balance: newBalance },
    };
    setTrialData(prev => [...prev, trial]);
    
    if (trialIndex < settings.trials - 1) {
      setTrialIndex(prev => prev + 1);
    } else {
      completeExperiment();
    }
  };

  const completeExperiment = () => {
    setPhase('complete');
    const deckSelections: Record<string, number> = {};
    trialData.forEach(t => {
      const key = String(t.answer);
      deckSelections[key] = (deckSelections[key] || 0) + 1;
    });
    const results: ExperimentResults = {
      experimentName: experiment.id,
      participantId,
      roomId,
      language,
      timestamp: new Date().toISOString(),
      totalTrials: trialData.length,
      responseTimeMs: Math.round(performance.now() - experimentStartTime),
      accuracy: ((deckSelections.C || 0) + (deckSelections.D || 0)) / trialData.length * 100,
      answer: JSON.stringify(deckSelections),
      correctAnswer: 'deck_selections',
      trialData,
      debrief: t(experiment.debriefKey),
    };
    onComplete(results);
  };

  if (phase === 'instruction') {
    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="max-w-2xl mx-auto p-6">
          <h2 className="text-2xl font-bold text-navy-900 mb-4">{t('exp.iowaGambling.name')}</h2>
          <p className="text-gray-600 mb-4">{settings.customInstructions || t('exp.iowaGambling.instruction')}</p>
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
            <p className="text-blue-800">{t('exp.iowaGambling.instructionDetail')}</p>
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
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg mb-4">
            <p className="text-amber-800 font-medium">{t('exp.iowaGambling.finalBalance')}: ${balance}</p>
          </div>
          <p className="text-gray-600 mb-4">{t('exp.iowaGambling.debrief')}</p>
        </div>
      </ExperimentWrapper>
    );
  }

  return (
    <ExperimentWrapper experiment={experiment}>
      <div className="max-w-2xl mx-auto p-6">
        <div className="mb-6"><div className="h-2 bg-gray-200 rounded"><div className="h-full bg-teal-600" style={{ width: `${((trialIndex + 1) / settings.trials) * 100}%` }} /></div></div>
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6 text-center">
          <p className="text-2xl font-bold text-blue-900">${balance}</p>
        </div>
        <p className="text-center text-gray-600 mb-6">{t('exp.iowaGambling.chooseDeck')}</p>
        <div className="grid grid-cols-4 gap-4">
          {DECKS.map(deck => (
            <button key={deck.id} onClick={() => handleDeckSelect(deck.id)} className="bg-gray-100 hover:bg-teal-50 border-2 border-gray-200 hover:border-teal-500 p-4 rounded-lg transition-all">
              <span className="text-xl font-bold">Deck {deck.id}</span>
            </button>
          ))}
        </div>
      </div>
    </ExperimentWrapper>
  );
}

export default IowaGamblingExperiment;
