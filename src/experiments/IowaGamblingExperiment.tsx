import { useState, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ExperimentWrapper } from './ExperimentWrapper';
import { useExperiment } from '../hooks/useExperiment';
import { useTimer } from '../hooks/useTimer';
import type { Experiment } from '../data/experiments';

interface IowaGamblingProps {
  experiment: Experiment;
  onComplete: (results: any) => void;
  participantId: string;
  roomId: string;
}

// classic Bechara et al. (1994) probabilities:
// A: 100 reward, 50% chance of 250 penalty -> Expected Value (per card) = -25
// B: 100 reward, 10% chance of 1250 penalty -> Expected Value (per card) = -25
// C: 50 reward, 50% chance of 50 penalty -> Expected Value (per card) = +25
// D: 50 reward, 10% chance of 250 penalty -> Expected Value (per card) = +25
const DECKS = [
  { id: 'A', reward: 100, penaltyFreq: 0.5, penaltyAmount: 250 },
  { id: 'B', reward: 100, penaltyFreq: 0.1, penaltyAmount: 1250 },
  { id: 'C', reward: 50, penaltyFreq: 0.5, penaltyAmount: 50 },
  { id: 'D', reward: 50, penaltyFreq: 0.1, penaltyAmount: 250 },
];

const TOTAL_TRIALS = 100;
const STARTING_BALANCE = 2000;

export function IowaGamblingExperiment({ experiment, onComplete, participantId, roomId }: IowaGamblingProps) {
  const { t, language } = useLanguage();

  const [balance, setBalance] = useState(STARTING_BALANCE);
  const [lastFeedback, setLastFeedback] = useState<{ reward: number, penalty: number } | null>(null);

  const {
    phase,
    setPhase,
    trialIndex,
    trialData,
    recordTrial,
    startExperiment,
    advanceTrial,
    finishExperiment,
  } = useExperiment({ experiment, participantId, roomId, language, onComplete });

  const { startTimer, getResponseTime, clearTimer } = useTimer();

  const handleStart = () => {
    startExperiment('experiment');
    startTimer();
  };

  const handleDeckSelect = useCallback((deckId: string) => {
    const deck = DECKS.find(d => d.id === deckId)!;
    const rt = getResponseTime() || 0;
    clearTimer();

    const penalty = Math.random() < deck.penaltyFreq ? deck.penaltyAmount : 0;
    const gain = deck.reward - penalty;
    const newBalance = balance + gain;

    setBalance(newBalance);
    setLastFeedback({ reward: deck.reward, penalty });

    // An answer is 'correct' if it's statistically advantageous (C or D)
    const isAdvantageous = deckId === 'C' || deckId === 'D';

    recordTrial({
      trialNumber: trialIndex + 1,
      responseTimeMs: rt,
      answer: deckId,
      correctAnswer: isAdvantageous ? 'advantageous' : 'disadvantageous',
      stimulus: { deck: deckId, reward: deck.reward, penalty, netGain: gain, balance: newBalance },
    });

    if (trialIndex < TOTAL_TRIALS - 1) {
      advanceTrial(false, TOTAL_TRIALS);
      startTimer();
    } else {
      // Calculate final accuracy (percentage of advantageous choices)
      // Since current trial is just recorded but not in state yet, we add it manually:
      const totalAdvantageous = trialData.filter(t => t.answer === 'C' || t.answer === 'D').length + (isAdvantageous ? 1 : 0);
      const accuracy = (totalAdvantageous / TOTAL_TRIALS) * 100;

      setPhase('complete');
      finishExperiment(newBalance, accuracy);
    }
  }, [balance, getResponseTime, clearTimer, recordTrial, trialIndex, advanceTrial, startTimer, trialData, setPhase, finishExperiment]);

  if (phase === 'instruction') {
    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="bg-white border border-border rounded p-8 max-w-2xl mx-auto">
          <h2 className="mb-6">{t('exp.iowaGambling.name')}</h2>
          <div className="experiment-instruction">
            <p className="mb-4">{t('exp.iowaGambling.instruction')}</p>
            <div className="bg-info/10 border border-info/20 p-4 rounded mb-6">
              <p className="text-info-800 font-medium mb-2">Instructions:</p>
              <ul className="list-disc pl-5 space-y-2 text-info-900">
                <li>You start with a loan of ${STARTING_BALANCE}.</li>
                <li>Select one card at a time from any of the four decks.</li>
                <li>Each time you select a card, you will win some money.</li>
                <li>However, some cards also carry a penalty.</li>
                <li>Your goal is to maximize your profit. You are free to switch between decks at any time.</li>
              </ul>
            </div>
          </div>
          <button onClick={handleStart} className="btn-primary w-full sm:w-auto mt-4">
            {t('common.start')}
          </button>
        </div>
      </ExperimentWrapper>
    );
  }

  if (phase === 'complete') {
    const totalAdvantageous = trialData.filter(t => t.answer === 'C' || t.answer === 'D').length;
    const advantageousRatio = Math.round((totalAdvantageous / TOTAL_TRIALS) * 100);

    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="bg-white border border-border rounded p-8 max-w-2xl mx-auto">
          <h2 className="mb-6">{t('common.debrief.title')}</h2>

          <div className="bg-success/10 border-l-4 border-success p-4 mb-6">
            <p className="text-success-800 font-medium">{t('common.debrief.thankYou')}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-surface p-6 rounded border border-border text-center">
              <p className="text-3xl font-bold text-primary mb-1">${balance}</p>
              <p className="text-sm text-text-secondary">{t('exp.iowaGambling.finalBalance')}</p>
            </div>
            <div className="bg-surface p-6 rounded border border-border text-center">
              <p className="text-3xl font-bold text-primary mb-1">{advantageousRatio}%</p>
              <p className="text-sm text-text-secondary">Advantageous Choices</p>
            </div>
          </div>

          <div className="prose prose-sm text-text-secondary mt-8">
            <h4 className="text-text-primary">What this experiment measures:</h4>
            <p>{t('exp.iowaGambling.debrief')}</p>
            <h4 className="text-text-primary mt-4">Typical Findings:</h4>
            <p>Healthy participants usually figure out which decks are "good" (C and D) and which are "bad" (A and B) after about 40-50 trials, shifting their preference toward the advantageous decks. Decks A and B offer high immediate rewards but higher long-term penalties, reflecting a classic risk-reward trade-off.</p>
            <h4 className="text-text-primary mt-4">Why it occurs:</h4>
            <p>The somatic marker hypothesis (Damasio, 1994) proposes that emotional signals from the body guide decision-making under uncertainty. Over time, choosing from "bad" decks generates negative somatic markers (gut feelings) that bias future choices toward safer options, even before conscious awareness of the deck contingencies.</p>
            <p className="mt-4 text-xs italic">Bechara, A., Damasio, A. R., Damasio, H., &amp; Anderson, S. W. (1994). Insensitivity to future consequences following damage to human prefrontal cortex. <em>Cognition, 50</em>(1–3), 7–15.</p>
          </div>
        </div>
      </ExperimentWrapper>
    );
  }

  return (
    <ExperimentWrapper experiment={experiment}>
      <div className="max-w-3xl mx-auto py-8">
        <div className="mb-12">
          <div className="h-1 bg-surface rounded overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${((trialIndex) / TOTAL_TRIALS) * 100}%` }}
            />
          </div>
          <p className="text-xs text-text-muted text-right mt-2 uppercase tracking-wide">
            Trial {trialIndex + 1} / {TOTAL_TRIALS}
          </p>
        </div>

        <div className="bg-surface border border-border rounded-xl p-8 mb-12 flex flex-col items-center">
          <p className="text-sm text-text-muted uppercase tracking-wider mb-2">Current Balance</p>
          <p className={`text-5xl font-mono font-bold ${balance >= STARTING_BALANCE ? 'text-success' : 'text-error'}`}>
            ${balance}
          </p>

          <div className="h-20 mt-6 flex flex-col items-center justify-center">
            {lastFeedback && (
              <div className="text-center animate-bounce-short">
                <p className="text-success font-bold text-xl">You won ${lastFeedback.reward}!</p>
                {lastFeedback.penalty > 0 && (
                  <p className="text-error font-bold mt-1">But you lost ${lastFeedback.penalty}!</p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 md:gap-6">
          {DECKS.map((deck) => (
            <button
              key={deck.id}
              onClick={() => handleDeckSelect(deck.id)}
              className="aspect-[2/3] bg-white border-2 border-border hover:border-primary rounded-xl flex flex-col items-center justify-center shadow-sm hover:shadow-md transition-all group"
            >
              <div className="w-12 h-12 rounded-full bg-surface group-hover:bg-primary/10 flex items-center justify-center mb-4 transition-colors">
                <span className="text-2xl font-bold text-text-primary group-hover:text-primary">{deck.id}</span>
              </div>
              <span className="text-sm font-medium text-text-muted group-hover:text-primary transition-colors">Select Deck</span>
            </button>
          ))}
        </div>
      </div>
    </ExperimentWrapper>
  );
}

export default IowaGamblingExperiment;
