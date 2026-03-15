/**
 * STROOP TEST
 * Refactored for scientific accuracy, using shared hooks and a minimal academic UI.
 */

import { useState, useCallback, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ExperimentWrapper } from './ExperimentWrapper';
import type { Experiment } from '../data/experiments';
import { useExperiment } from '../hooks/useExperiment';
import { useTimer } from '../hooks/useTimer';
import { useResponseCapture } from '../hooks/useResponseCapture';
import { fisherYatesShuffle } from '../lib/random';

interface StroopProps {
  experiment: Experiment;
  onComplete: (results: any) => void;
  participantId: string;
  roomId: string;
  config?: any;
}

const COLOR_MAP: Record<string, { hex: string; letter: string }> = {
  red: { hex: '#dc2626', letter: 'r' },
  blue: { hex: '#2563eb', letter: 'b' },
  green: { hex: '#16a34a', letter: 'g' },
  yellow: { hex: '#ca8a04', letter: 'y' },
};

export function StroopExperiment({ experiment, onComplete, participantId, roomId, config = {} }: StroopProps) {
  const { t, language } = useLanguage();

  // Scientific Defaults for Stroop
  const trialsCount = config.trials || 48; // Standard 48 trials
  const practiceTrialsCount = config.practiceTrials || 12;
  const isi = config.isi ?? 500; // 500ms ISI

  const {
    phase,
    trialIndex,
    trialData,
    recordTrial,
    startExperiment,
    advanceTrial,
    finishExperiment,
  } = useExperiment({ experiment, participantId, roomId, language, onComplete });

  const { startTimer, getResponseTime } = useTimer();

  const [stimuli, setStimuli] = useState<{ word: string; color: string; congruent: boolean }[]>([]);
  const [practiceStimuli, setPracticeStimuli] = useState<{ word: string; color: string; congruent: boolean }[]>([]);
  const [isWaiting, setIsWaiting] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);

  // Pre-calculate stimuli
  useEffect(() => {
    const generate = (count: number) => {
      const colors = Object.keys(COLOR_MAP);
      const items = [];
      const half = Math.floor(count / 2);

      // 50% congruent
      for (let i = 0; i < half; i++) {
        const color = colors[i % colors.length];
        items.push({ word: color, color, congruent: true });
      }

      // 50% incongruent
      for (let i = 0; i < count - half; i++) {
        const word = colors[i % colors.length];
        let color;
        do {
          color = colors[Math.floor(Math.random() * colors.length)];
        } while (color === word);
        items.push({ word, color, congruent: false });
      }
      return fisherYatesShuffle(items);
    };

    setPracticeStimuli(generate(practiceTrialsCount));
    setStimuli(generate(trialsCount));
  }, [trialsCount, practiceTrialsCount]);

  // Start trial timer when we enter an active trial state
  useEffect(() => {
    if ((phase === 'experiment' || phase === 'practice') && !isWaiting) {
      startTimer();
    }
  }, [phase, trialIndex, isWaiting, startTimer]);

  const handleResponseInternal = useCallback((selectedColor: string) => {
    if (isWaiting || (phase !== 'experiment' && phase !== 'practice')) return;

    const rt = getResponseTime() || 0;
    const currentList = phase === 'practice' ? practiceStimuli : stimuli;
    const currentStimulus = currentList[trialIndex];

    if (!currentStimulus) return;

    const isCorrect = selectedColor === currentStimulus.color;

    if (phase === 'experiment') {
      recordTrial({
        trialNumber: trialIndex + 1,
        responseTimeMs: rt,
        answer: selectedColor,
        correctAnswer: currentStimulus.color,
        stimulus: currentStimulus,
      });
    }

    const nextPhasePrep = () => {
      if (phase === 'experiment' && trialIndex === stimuli.length - 1) {
        // Calculate scoring immediately before finishing
        const expTrials = [...trialData, {
          trialNumber: trialIndex + 1,
          responseTimeMs: rt,
          answer: selectedColor,
          correctAnswer: currentStimulus.color,
          stimulus: currentStimulus,
        }];

        const correctOnly = expTrials.filter(t => t.answer === t.correctAnswer);
        const accuracy = (correctOnly.length / expTrials.length) * 100;

        const congruentCorrect = correctOnly.filter(t => (t.stimulus as any).congruent);
        const incongruentCorrect = correctOnly.filter(t => !(t.stimulus as any).congruent);

        const congruentRT = congruentCorrect.length > 0
          ? congruentCorrect.reduce((s, t) => s + t.responseTimeMs, 0) / congruentCorrect.length
          : 0;
        const incongruentRT = incongruentCorrect.length > 0
          ? incongruentCorrect.reduce((s, t) => s + t.responseTimeMs, 0) / incongruentCorrect.length
          : 0;

        const interference = Math.round(incongruentRT - congruentRT);
        finishExperiment(interference, accuracy);
        return;
      }

      if (isi > 0) {
        setIsWaiting(true);
        setTimeout(() => {
          setIsWaiting(false);
          advanceTrial(phase === 'practice', currentList.length);
        }, isi);
      } else {
        advanceTrial(phase === 'practice', currentList.length);
      }
    };

    if (phase === 'practice') {
      setLastCorrect(isCorrect);
      setShowFeedback(true);
      setTimeout(() => {
        setShowFeedback(false);
        nextPhasePrep();
      }, 500);
    } else {
      nextPhasePrep();
    }
  }, [phase, isWaiting, getResponseTime, practiceStimuli, stimuli, trialIndex, recordTrial, trialData, finishExperiment, isi, advanceTrial]);

  // Hook for Keyboard Input
  const validKeys = Object.values(COLOR_MAP).map(c => c.letter);
  useResponseCapture({
    validKeys,
    onResponse: (key: string) => {
      const colorName = Object.entries(COLOR_MAP).find(([_, v]) => v.letter === key)?.[0];
      if (colorName) handleResponseInternal(colorName);
    },
    disabled: isWaiting || (phase !== 'experiment' && phase !== 'practice')
  });

  if (phase === 'instruction') {
    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="bg-white border border-border rounded p-8 max-w-2xl mx-auto">
          <h2 className="mb-6">{t('exp.stroop.name')}</h2>

          <div className="experiment-instruction">
            {config.customInstructions || t('exp.stroop.instruction')}
          </div>

          <div className="bg-surface border border-border rounded p-6 mb-8">
            <h3 className="text-base mb-4">{t('exp.stroop.keys')}</h3>
            <div className="flex flex-wrap gap-6 justify-center">
              {Object.entries(COLOR_MAP).map(([name, data]) => (
                <div key={name} className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 rounded border border-border" style={{ backgroundColor: data.hex }} />
                  <span className="font-mono font-bold text-text-primary uppercase px-2 py-1 bg-white border border-border rounded">
                    {data.letter}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-center text-text-muted text-sm mt-4">
              Press the corresponding key to select the <strong className="text-text-primary">ink color</strong>.
            </p>
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-text-secondary mb-8 bg-surface p-4 rounded border border-border">
            <span><strong>{trialsCount}</strong> trials</span>
            <span>&bull;</span>
            <span><strong>{practiceTrialsCount}</strong> practice</span>
            <span>&bull;</span>
            <span>ISI: <strong>{isi}ms</strong></span>
          </div>

          <button
            onClick={() => startExperiment(practiceTrialsCount > 0 ? 'practice' : 'experiment')}
            className="btn-primary w-full sm:w-auto"
          >
            {t('common.start')}
          </button>
        </div>
      </ExperimentWrapper>
    );
  }

  if (phase === 'complete') {
    const accuracy = trialData.length > 0
      ? (trialData.filter(t => t.answer === t.correctAnswer).length / trialData.length) * 100
      : 0;

    const correctOnly = trialData.filter(t => t.answer === t.correctAnswer);
    const congruentTrials = correctOnly.filter(t => (t.stimulus as any)?.congruent);
    const incongruentTrials = correctOnly.filter(t => !(t.stimulus as any)?.congruent);

    const congruentRT = congruentTrials.length > 0
      ? congruentTrials.reduce((s, t) => s + t.responseTimeMs, 0) / congruentTrials.length
      : 0;
    const incongruentRT = incongruentTrials.length > 0
      ? incongruentTrials.reduce((s, t) => s + t.responseTimeMs, 0) / incongruentTrials.length
      : 0;
    const interference = Math.round(incongruentRT - congruentRT);

    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="bg-white border border-border rounded p-8 max-w-2xl mx-auto">
          <h2 className="mb-6">{t('common.debrief.title')}</h2>

          <div className="bg-success/10 border-l-4 border-success p-4 mb-6">
            <p className="text-success-800 font-medium">{t('common.debrief.thankYou')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-surface p-6 rounded border border-border text-center">
              <p className="text-3xl font-bold text-primary mb-1">{Math.round(accuracy)}%</p>
              <p className="text-sm text-text-secondary">{t('common.correct')}</p>
            </div>
            <div className="bg-surface p-6 rounded border border-border text-center">
              <p className="text-3xl font-bold text-primary mb-1">{Math.round(congruentRT)}ms</p>
              <p className="text-sm text-text-secondary">{t('exp.stroop.congruent')} RT</p>
            </div>
            <div className="bg-surface p-6 rounded border border-border text-center">
              <p className="text-3xl font-bold text-primary mb-1">{Math.round(incongruentRT)}ms</p>
              <p className="text-sm text-text-secondary">{t('exp.stroop.incongruent')} RT</p>
            </div>
          </div>

          <div className="bg-info/10 border border-info/20 p-6 rounded mb-8">
            <h3 className="text-info-800 mb-2">{t('exp.stroop.interference')}: {interference}ms</h3>
            <p className="text-sm text-info-700">{t('exp.stroop.interpretation')}</p>
          </div>

          <div className="prose prose-sm text-text-secondary">
            <h4 className="text-text-primary">What this experiment measures:</h4>
            <p>The Stroop test demonstrates interference in the reaction time of a task. When the name of a color is printed in a color which is not denoted by the name, naming the color of the word takes longer and is more prone to errors than when the color of the ink matches the name of the color.</p>

            <h4 className="text-text-primary mt-4">Typical Findings:</h4>
            <p>Participants are reliably slower to respond to incongruent trials (where word and ink mismatch) compared to congruent trials. This difference in milliseconds is your interference score.</p>

            <h4 className="text-text-primary mt-4">Why it occurs:</h4>
            <p>Reading is a highly automated process that is difficult to suppress. When the word meaning conflicts with the ink color, your brain must resolve the competition between these two sources of information, which takes additional time. This reflects the concept of automaticity in cognitive psychology.</p>

            <p className="mt-4 text-xs italic">Stroop, J. R. (1935). Studies of interference in serial verbal reactions. <em>Journal of Experimental Psychology, 18</em>(6), 643–662.</p>
          </div>
        </div>
      </ExperimentWrapper>
    );
  }

  const currentList = phase === 'practice' ? practiceStimuli : stimuli;
  const currentStimulus = currentList[trialIndex];
  const total = currentList.length;

  return (
    <ExperimentWrapper experiment={experiment}>
      <div className="max-w-2xl mx-auto py-8">

        <div className="mb-12">
          <div className="h-1 bg-surface rounded overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${((trialIndex) / total) * 100}%` }}
            />
          </div>
          <p className="text-xs text-text-muted text-right mt-2 uppercase tracking-wide">
            {phase === 'practice' ? 'Practice' : 'Trial'} {trialIndex + 1} / {total}
          </p>
        </div>

        <div className="flex flex-col items-center justify-center min-h-[300px]">
          {isWaiting ? (
            <span className="text-4xl text-text-muted font-light">+</span>
          ) : (
            <>
              {showFeedback && phase === 'practice' && (
                <div className="absolute top-1/4 text-center">
                  <span className={`text-4xl font-bold ${lastCorrect ? 'text-success' : 'text-error'}`}>
                    {lastCorrect ? '✓' : '✗'}
                  </span>
                </div>
              )}

              {currentStimulus && !showFeedback && (
                <span
                  className="font-bold tracking-tight"
                  style={{
                    color: COLOR_MAP[currentStimulus.color].hex,
                    fontSize: '64px',
                  }}
                >
                  {currentStimulus.word.toUpperCase()}
                </span>
              )}
            </>
          )}
        </div>

        <div className="mt-12">
          <p className="text-center text-text-secondary mb-6 text-sm uppercase tracking-wide">
            {t('exp.stroop.selectColor')}
          </p>
          <div className="flex justify-center gap-4">
            {Object.entries(COLOR_MAP).map(([name, data]) => (
              <button
                key={name}
                onClick={() => handleResponseInternal(name)}
                disabled={isWaiting || showFeedback}
                className="w-24 h-24 rounded border-2 border-border hover:border-primary transition-colors flex flex-col items-center justify-center gap-2 bg-white flex-shrink-0"
              >
                <div className="w-8 h-8 rounded-full" style={{ backgroundColor: data.hex }} />
                <span className="font-mono text-text-muted text-xs uppercase px-2 py-1 bg-surface rounded">
                  {data.letter}
                </span>
              </button>
            ))}
          </div>
        </div>

      </div>
    </ExperimentWrapper>
  );
}

export default StroopExperiment;

