import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ExperimentWrapper } from './ExperimentWrapper';
import { useExperiment } from '../hooks/useExperiment';
import { useTimer } from '../hooks/useTimer';
import { fisherYatesShuffle, randomInt } from '../lib/random';
import type { Experiment } from '../data/experiments';
import { getDefaultConfig } from './config/experimentDefaults';

interface AschConfig {
  trials: number;
  showFeedback: boolean;
  customInstructions: string;
}

interface AschProps {
  experiment: Experiment;
  onComplete: (results: any) => void;
  participantId: string;
  roomId: string;
  config?: Partial<AschConfig>;
}

const DEFAULT_CONFIG = { ...getDefaultConfig('asch-conformity-paradigm'), trials: 18 } as AschConfig;

interface TrialDef {
  standardLen: number;
  lines: { id: number; len: number }[];
  correctId: number;
  confederateAnswer: number;
  isCritical: boolean;
}

export function AschExperiment({ experiment, onComplete, participantId, roomId, config = {} }: AschProps) {
  const { t, language } = useLanguage();
  const settings: AschConfig = { ...DEFAULT_CONFIG, ...config };

  const [trialIndex, setTrialIndex] = useState(0);
  const [showConfederate, setShowConfederate] = useState(false);
  const [trials, setTrials] = useState<TrialDef[]>([]);

  const {
    phase,
    setPhase,
    trialData,
    recordTrial,
    finishExperiment
  } = useExperiment({ experiment, participantId, roomId, language, onComplete });

  const { startTimer, getResponseTime, clearTimer } = useTimer();

  // Generate dynamic trials
  useEffect(() => {
    if (phase === 'instruction') {
      const newTrials: TrialDef[] = [];
      const numTrials = Math.max(3, settings.trials); // Need at least 3

      for (let i = 0; i < numTrials; i++) {
        // First 2 trials are always neutral (confederate is correct) to build trust.
        // After that, ~66% of trials are critical (confederate is wrong).
        const isCritical = i >= 2 && Math.random() < 0.66;

        const baseLen = randomInt(4, 9);
        const diff1 = randomInt(1, 3);
        const diff2 = randomInt(1, 3);

        const options = [
          { id: 1, len: baseLen },
          { id: 2, len: baseLen + diff1 },
          { id: 3, len: Math.max(1, baseLen - diff2) }
        ];

        const shuffled = fisherYatesShuffle([...options]);
        // reassign IDs 1, 2, 3 based on visual order (left to right)
        const lines = shuffled.map((opt, idx) => ({ ...opt, id: idx + 1 }));

        const correctId = lines.find(o => o.len === baseLen)!.id;

        let confAnswer = correctId;
        if (isCritical) {
          const incorrectOpts = lines.filter(o => o.id !== correctId);
          confAnswer = incorrectOpts[randomInt(0, incorrectOpts.length - 1)].id;
        }

        newTrials.push({
          standardLen: baseLen,
          lines,
          correctId,
          confederateAnswer: confAnswer,
          isCritical
        });
      }
      setTrials(newTrials);
    }
  }, [phase, settings.trials]);

  const currentTrial = trials[trialIndex];

  useEffect(() => {
    if (phase === 'test' && currentTrial && !showConfederate) {
      const timer = setTimeout(() => {
        setShowConfederate(true);
      }, 1500 + Math.random() * 1500); // Simulate confederates thinking (1.5s - 3s)
      return () => clearTimeout(timer);
    }
  }, [phase, trialIndex, currentTrial, showConfederate]);

  const handleStart = () => {
    setPhase('test');
    startTimer();
  };

  const handleResponse = useCallback((answerId: number) => {
    if (!showConfederate) return; // Must wait for confederates

    const rt = getResponseTime() || 0;
    const conformed = currentTrial.isCritical && answerId === currentTrial.confederateAnswer;

    recordTrial({
      trialNumber: trialIndex + 1,
      responseTimeMs: rt,
      answer: answerId.toString(),
      correctAnswer: currentTrial.correctId.toString(),
      stimulus: {
        isCritical: currentTrial.isCritical,
        confederateAnswer: currentTrial.confederateAnswer,
        conformed,
        options: currentTrial.lines
      }
    });

    clearTimer();
    setShowConfederate(false);

    // Short delay before next trial
    setTimeout(() => {
      if (trialIndex < trials.length - 1) {
        setTrialIndex(prev => prev + 1);
        startTimer();
      } else {
        setPhase('complete');
        // Calculate total conformities
        const conformityTrials = trialData.filter(t => (t.stimulus as any).conformed === true).length + (conformed ? 1 : 0);
        const criticalTrialsCount = trials.filter(t => t.isCritical).length;

        finishExperiment(
          JSON.stringify({
            conformityCount: conformityTrials,
            criticalCount: criticalTrialsCount,
            conformityRate: criticalTrialsCount > 0 ? (conformityTrials / criticalTrialsCount) * 100 : 0
          }),
          100 // accuracy doesn't truly apply here exactly, standard Asch reporting uses conformity count
        );
      }
    }, 500);
  }, [showConfederate, getResponseTime, currentTrial, recordTrial, trialIndex, clearTimer, trials, trialData, setPhase, finishExperiment, startTimer]);

  if (phase === 'instruction' || phase === 'ready') {
    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="max-w-2xl mx-auto p-8 bg-white border border-border rounded max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-primary mb-6">{t('exp.asch.name')}</h2>

          <div className="bg-surface border border-border p-6 rounded mb-8">
            <p className="text-text-primary leading-relaxed text-md mb-4">
              {settings.customInstructions || t('exp.asch.instruction')}
            </p>
            <p className="text-text-secondary text-sm">
              You will be evaluating line lengths with a group of other participants online. Wait for the others to give their answer, and then provide yours.
            </p>
          </div>

          <p className="text-sm font-medium text-text-muted mb-8 flex items-center gap-2">
            {t('citation')}: {experiment.citation}, {experiment.year}
          </p>

          <button
            onClick={handleStart}
            className="btn-primary w-full"
            disabled={trials.length === 0}
          >
            {t('common.start')}
          </button>
        </div>
      </ExperimentWrapper>
    );
  }

  if (phase === 'complete') {
    const conformityTrials = trialData.filter(t => (t.stimulus as any).conformed === true).length;
    const criticalTrialsCount = trialData.filter(t => (t.stimulus as any).isCritical === true).length;

    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="bg-white border border-border rounded p-8 max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-primary mb-6">{t('common.debrief.title')}</h2>

          <div className="bg-success/10 border-l-4 border-success p-4 mb-8">
            <p className="text-success-800 font-medium">{t('common.debrief.thankYou')}</p>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-8 mt-4">
            <div className="bg-surface p-6 rounded border border-border text-center">
              <p className="text-sm font-bold text-text-muted mb-2 uppercase tracking-wider">Times Conformed</p>
              <p className="text-4xl font-bold text-primary mb-1">
                {conformityTrials} <span className="text-xl text-text-muted font-normal">/ {criticalTrialsCount}</span>
              </p>
              <p className="text-xs text-text-muted">On critical trials</p>
            </div>
            <div className="bg-surface p-6 rounded border border-border text-center">
              <p className="text-sm font-bold text-text-muted mb-2 uppercase tracking-wider">Conformity Rate</p>
              <p className="text-4xl font-bold text-primary mb-1">
                {criticalTrialsCount > 0 ? Math.round((conformityTrials / criticalTrialsCount) * 100) : 0}%
              </p>
            </div>
          </div>

          <div className="prose prose-sm text-text-secondary">
            <h4 className="text-text-primary">About this Experiment</h4>
            <p>
              The Asch conformity experiments, originally conducted by Solomon Asch in the 1950s, demonstrated the degree to which an individual's own opinions are influenced by those of a majority group.
            </p>
            <p>
              In this digital version, the "other participants" you saw answering before you were actually simulated. On the majority of trials (critical trials), they were programmed to unanimously give the wrong answer. Your conformity score reflects how often you went along with their visibly incorrect judgment.
            </p>
            <p className="mt-4 text-xs italic">{t('citation')}: {experiment.citation}, {experiment.year}</p>
          </div>
        </div>
      </ExperimentWrapper>
    );
  }

  if (!currentTrial) return null;

  return (
    <ExperimentWrapper experiment={experiment}>
      <div className="bg-white border border-border rounded p-8 max-w-4xl mx-auto min-h-[500px] flex flex-col relative overflow-hidden">
        <div className="mb-8 px-4 pt-2">
          <div className="h-1.5 bg-surface rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${((trialIndex) / settings.trials) * 100}%` }}
            />
          </div>
          <div className="flex justify-between items-center mt-3">
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
              Trial {trialIndex + 1} of {settings.trials}
            </span>
          </div>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-24 mb-12">
          {/* Reference Line */}
          <div className="flex flex-col items-center">
            <p className="text-text-muted text-sm font-bold tracking-wider uppercase mb-6 bg-surface px-4 py-2 rounded">
              Reference Line
            </p>
            <div className="bg-white p-8 rounded border border-border flex items-center justify-center min-w-[160px] h-64 shadow-sm">
              <div
                className="w-5 bg-text-primary shadow-sm"
                style={{ height: currentTrial.standardLen * 20 }}
              />
            </div>
          </div>

          <div className="hidden lg:block w-px h-48 bg-border"></div>

          {/* Comparison Lines */}
          <div className="flex flex-col items-center">
            <p className="text-text-muted text-sm font-bold tracking-wider uppercase mb-6 bg-surface px-4 py-2 rounded">
              Comparison Lines
            </p>
            <div className="bg-white p-8 rounded border border-border flex items-end justify-center gap-12 min-w-[360px] h-64 shadow-sm">
              {currentTrial.lines.map(line => (
                <div key={line.id} className="flex flex-col items-center gap-4">
                  <div
                    className={`w-5 shadow-sm transition-all duration-300 ${!showConfederate ? 'bg-border cursor-not-allowed opacity-50' : 'bg-primary cursor-pointer hover:bg-primary-hover'}`}
                    style={{ height: line.len * 20 }}
                    onClick={() => handleResponse(line.id)}
                  />
                  <span className="w-8 h-8 rounded-full bg-surface text-text-secondary font-bold flex items-center justify-center text-sm border border-border">
                    {line.id}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-auto flex flex-col items-center">
          <div className="relative w-full max-w-md h-16 flex items-center justify-center mb-6">
            {showConfederate ? (
              <div className="absolute inset-0 bg-info/10 border border-info/20 rounded flex items-center justify-center gap-3 animate-fade-in text-info-900 shadow-sm">
                <div className="flex -space-x-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="w-6 h-6 rounded-full bg-surface border border-border flex items-center justify-center text-[10px] text-text-muted">
                      P{i + 1}
                    </div>
                  ))}
                </div>
                <p className="font-medium">
                  Majority consensus: Option <span className="font-bold text-lg bg-white px-3 py-1 rounded shadow-sm ml-1 text-info-900 border border-info/20">{currentTrial.confederateAnswer}</span>
                </p>
              </div>
            ) : (
              <div className="absolute inset-0 bg-surface border border-border text-text-muted rounded flex items-center justify-center text-sm animate-pulse">
                Waiting for other participants to answer...
              </div>
            )}
          </div>

          <h2 className="text-xl font-bold text-text-primary tracking-tight mb-6">Which line matches the reference?</h2>
          <div className="flex justify-center gap-4 w-full max-w-md">
            {[1, 2, 3].map(num => (
              <button
                key={num}
                onClick={() => handleResponse(num)}
                disabled={!showConfederate}
                className={`flex-1 py-4 bg-white rounded shadow-sm border text-xl font-bold transition-all duration-200
                  ${showConfederate
                    ? 'border-border text-text-secondary hover:border-primary hover:text-primary hover:shadow'
                    : 'border-border/50 text-text-muted/50 cursor-not-allowed bg-surface/50'
                  }`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>
      </div>
    </ExperimentWrapper>
  );
}

export default AschExperiment;
