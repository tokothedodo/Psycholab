import { useState, useEffect, useCallback, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ExperimentWrapper } from './ExperimentWrapper';
import { useExperiment } from '../hooks/useExperiment';
import { useTimer } from '../hooks/useTimer';
import { useResponseCapture } from '../hooks/useResponseCapture';
import { fisherYatesShuffle } from '../lib/random';
import type { Experiment } from '../data/experiments';

interface SternbergProps {
  experiment: Experiment;
  onComplete: (results: any) => void;
  participantId: string;
  roomId: string;
}

const SET_SIZES = [2, 4, 6, 8];
const TOTAL_TRIALS = 60; // 15 trials per set size

interface TrialConfig {
  memorySet: number[];
  probe: number;
  isPresent: boolean;
  setSize: number;
}

export function SternbergExperiment({ experiment, onComplete, participantId, roomId }: SternbergProps) {
  const { t, language } = useLanguage();

  const [stimuli, setStimuli] = useState<TrialConfig[]>([]);
  const [currentTrial, setCurrentTrial] = useState<TrialConfig | null>(null);

  const {
    phase,
    setPhase,
    trialIndex,
    trialData,
    recordTrial,
    advanceTrial,
    finishExperiment,
  } = useExperiment({ experiment, participantId, roomId, language, onComplete });

  const { startTimer, getResponseTime, clearTimer } = useTimer();
  const sequenceTimeout = useRef<number | null>(null);

  useEffect(() => {
    // Generate stimuli: 60 trials total -> 15 per set size
    const trialsPerSize = Math.floor(TOTAL_TRIALS / SET_SIZES.length);
    let generated: TrialConfig[] = [];

    SET_SIZES.forEach(size => {
      for (let i = 0; i < trialsPerSize; i++) {
        // Generate random digits 1-9 without replacement
        const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9];
        const shuffled = fisherYatesShuffle(digits);
        const memorySet = shuffled.slice(0, size);

        // 50% chance present or absent
        const isPresent = i % 2 === 0;
        let probe: number;

        if (isPresent) {
          probe = memorySet[Math.floor(Math.random() * memorySet.length)];
        } else {
          const remaining = digits.filter(d => !memorySet.includes(d));
          probe = remaining[Math.floor(Math.random() * remaining.length)];
        }

        generated.push({ memorySet, probe, isPresent, setSize: size });
      }
    });

    setStimuli(fisherYatesShuffle(generated));
  }, []);

  const runTrialSequence = useCallback(() => {
    if (trialIndex >= stimuli.length) return;
    const trial = stimuli[trialIndex];
    setCurrentTrial(trial);
    setPhase('fixation');

    // Sequence: Fixation (500ms) -> Memory Set (2000ms) -> ISI (500ms) -> Probe (until response)
    sequenceTimeout.current = window.setTimeout(() => {
      setPhase('memory');

      sequenceTimeout.current = window.setTimeout(() => {
        setPhase('isi');

        sequenceTimeout.current = window.setTimeout(() => {
          setPhase('probe');
          startTimer();
        }, 500); // 500ms ISI

      }, 2000); // 2000ms set presentation

    }, 500); // 500ms fixation
  }, [trialIndex, stimuli, setPhase, startTimer]);

  useEffect(() => {
    if (phase === 'experiment') {
      runTrialSequence();
    }
    return () => {
      if (sequenceTimeout.current) clearTimeout(sequenceTimeout.current);
    };
  }, [phase, trialIndex, runTrialSequence]);

  const handleResponseInternal = useCallback((response: 'yes' | 'no') => {
    if (phase !== 'probe' || !currentTrial) return;

    const rt = getResponseTime() || 0;
    clearTimer();

    recordTrial({
      trialNumber: trialIndex + 1,
      responseTimeMs: rt,
      answer: response,
      correctAnswer: currentTrial.isPresent ? 'yes' : 'no',
      stimulus: {
        memorySet: currentTrial.memorySet.join(','),
        probe: currentTrial.probe,
        setSize: currentTrial.setSize,
        isPresent: currentTrial.isPresent
      },
    });

    if (trialIndex < TOTAL_TRIALS - 1) {
      setPhase('experiment'); // Reset to trigger next sequence
      advanceTrial(false, TOTAL_TRIALS);
    } else {
      // Calculate results
      // Accuracy
      // Adding current response manually because it hasn't propagated to state yet
      const correctTrials = trialData.filter(t => t.answer === t.correctAnswer).length + (response === (currentTrial.isPresent ? 'yes' : 'no') ? 1 : 0);
      const accuracy = (correctTrials / TOTAL_TRIALS) * 100;

      // RT by set size (excluding first <100ms or >3000ms as outliers)
      const allTrials = [...trialData, {
        responseTimeMs: rt,
        answer: response,
        correctAnswer: currentTrial.isPresent ? 'yes' : 'no',
        stimulus: { setSize: currentTrial.setSize }
      } as any];

      // Average RT slope - simple calculation of averages
      let setSizeAverages: Record<number, number> = {};
      SET_SIZES.forEach(size => {
        const sizeTrials = allTrials.filter(t => t.stimulus.setSize === size && t.responseTimeMs >= 100 && t.responseTimeMs <= 3000);
        if (sizeTrials.length > 0) {
          const mean = sizeTrials.reduce((sum, t) => sum + t.responseTimeMs, 0) / sizeTrials.length;
          setSizeAverages[size] = mean;
        } else {
          setSizeAverages[size] = 0;
        }
      });

      // Linear regression slope (approximate items searched per ms)
      // This is a complex stat, we will just return the JSON of the set size averages as the main "answer"
      setPhase('complete');
      finishExperiment(JSON.stringify(setSizeAverages), accuracy);
    }
  }, [phase, currentTrial, getResponseTime, clearTimer, recordTrial, trialIndex, setPhase, advanceTrial, trialData, finishExperiment]);

  useResponseCapture({
    validKeys: ['ArrowLeft', 'ArrowRight'],
    onResponse: (key) => {
      if (key === 'ArrowLeft') handleResponseInternal('yes');
      if (key === 'ArrowRight') handleResponseInternal('no');
    },
    disabled: phase !== 'probe'
  });

  if (phase === 'instruction') {
    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="bg-white border border-border rounded p-8 max-w-2xl mx-auto">
          <h2 className="mb-6">{t('exp.sternberg.name')}</h2>
          <div className="experiment-instruction mb-8">
            <p className="mb-4">{t('exp.sternberg.instruction')}</p>
            <p className="mb-4">1. You will be shown a set of numbers (2, 4, 6, or 8 digits long) for 2 seconds.</p>
            <p className="mb-4">2. The screen will briefly go blank.</p>
            <p className="mb-4">3. A single "probe" number will appear.</p>
            <p className="mb-6">4. Respond as quickly and accurately as possible whether the probe was in the original set.</p>

            <div className="flex justify-around items-center bg-surface p-4 rounded border border-border">
              <div className="text-center">
                <span className="kb-key mb-2">←</span>
                <p className="text-sm font-medium">YES / Present</p>
              </div>
              <div className="text-center">
                <span className="kb-key mb-2">→</span>
                <p className="text-sm font-medium">NO / Absent</p>
              </div>
            </div>
          </div>
          <button onClick={() => setPhase('experiment')} className="btn-primary w-full sm:w-auto">
            {t('common.start')}
          </button>
        </div>
      </ExperimentWrapper>
    );
  }

  if (phase === 'complete') {
    // Parse the JSON string answer back to display it
    const setSizeAverages: Record<number, number> = {};

    // Recalculate just for UI display
    SET_SIZES.forEach(size => {
      const sizeTrials = trialData.filter(t => (t.stimulus as any).setSize === size && t.responseTimeMs >= 100 && t.responseTimeMs <= 3000);
      if (sizeTrials.length > 0) {
        setSizeAverages[size] = sizeTrials.reduce((sum, t) => sum + t.responseTimeMs, 0) / sizeTrials.length;
      }
    });

    const correct = trialData.filter(t => t.answer === t.correctAnswer).length;

    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="bg-white border border-border rounded p-8 max-w-2xl mx-auto">
          <h2 className="mb-6">{t('common.debrief.title')}</h2>

          <div className="bg-success/10 border-l-4 border-success p-4 mb-6">
            <p className="text-success-800 font-medium">{t('common.debrief.thankYou')}</p>
          </div>

          <div className="mb-6">
            <p className="text-lg font-medium mb-4">Average Response Times by Set Size:</p>
            <div className="grid grid-cols-4 gap-4">
              {SET_SIZES.map(size => (
                <div key={size} className="bg-surface p-4 rounded border border-border text-center">
                  <p className="text-2xl font-bold text-primary mb-1">
                    {Math.round(setSizeAverages[size] || 0)}ms
                  </p>
                  <p className="text-sm text-text-secondary">Size: {size}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-info/10 border border-info/20 p-6 rounded mb-8">
            <p className="mb-2"><strong>Accuracy:</strong> {Math.round((correct / TOTAL_TRIALS) * 100)}%</p>
            <h3 className="text-info-800 mb-2">{t('exp.sternberg.interpretation')}</h3>
            <p className="text-sm text-info-700">{t('exp.sternberg.slopeExplanation')}</p>
          </div>

          <div className="prose prose-sm text-text-secondary">
            <h4 className="text-text-primary">What this experiment measures:</h4>
            <p>{t('exp.sternberg.debrief')}</p>

            <h4 className="text-text-primary mt-4">Typical Findings:</h4>
            <p>Reaction time increases linearly with set size, at approximately 35–40ms per additional item. Critically, the slope is the same for items that were in the set (positive probes) and items that were not (negative probes), suggesting an exhaustive serial search.</p>

            <h4 className="text-text-primary mt-4">Why it occurs:</h4>
            <p>Sternberg proposed that when checking if a probe item was in the memorized set, the brain compares the probe against each item in sequence rather than stopping at the first match. This exhaustive serial scanning process explains why response time grows linearly with set size.</p>

            <p className="mt-4 text-xs italic">Sternberg, S. (1966). High-speed scanning in human memory. <em>Science, 153</em>(3736), 652–654.</p>
          </div>
        </div>
      </ExperimentWrapper>
    );
  }

  return (
    <ExperimentWrapper experiment={experiment}>
      <div className="max-w-2xl mx-auto py-8">
        <div className="mb-12">
          <div className="h-1 bg-surface rounded overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${((trialIndex) / TOTAL_TRIALS) * 100}%` }}
            />
          </div>
        </div>

        <div className="flex flex-col items-center justify-center min-h-[300px] border-2 border-dashed border-border rounded bg-surface p-8">

          {phase === 'fixation' && (
            <div className="text-6xl font-light text-text-muted">+</div>
          )}

          {phase === 'memory' && currentTrial && (
            <div className="flex flex-wrap justify-center gap-4 max-w-lg">
              {currentTrial.memorySet.map((num, i) => (
                <div key={i} className="text-5xl font-mono font-bold text-text-primary">
                  {num}
                </div>
              ))}
            </div>
          )}

          {phase === 'isi' && (
            <div></div> // Blank screen
          )}

          {phase === 'probe' && currentTrial && (
            <div className="text-8xl font-mono font-bold text-primary">
              {currentTrial.probe}
            </div>
          )}

        </div>

        {phase === 'probe' && (
          <div className="mt-12 flex justify-center gap-8">
            <button
              onClick={() => handleResponseInternal('yes')}
              className="w-40 border-2 border-border hover:border-primary bg-white py-4 rounded font-bold text-lg transition-colors flex flex-col items-center gap-2"
            >
              <span className="text-text-primary uppercase tracking-wide">{t('common.yes')}</span>
              <span className="kb-key">←</span>
            </button>
            <button
              onClick={() => handleResponseInternal('no')}
              className="w-40 border-2 border-border hover:border-primary bg-white py-4 rounded font-bold text-lg transition-colors flex flex-col items-center gap-2"
            >
              <span className="text-text-primary uppercase tracking-wide">{t('common.no')}</span>
              <span className="kb-key">→</span>
            </button>
          </div>
        )}
      </div>
    </ExperimentWrapper>
  );
}

export default SternbergExperiment;
