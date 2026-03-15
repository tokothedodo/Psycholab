import { useState, useEffect, useCallback, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import type { Experiment } from '../data/experiments';
import { ExperimentWrapper } from './ExperimentWrapper';
import { useExperiment } from '../hooks/useExperiment';
import { useTimer } from '../hooks/useTimer';
import { randomInt } from '../lib/random';

interface DigitSpanProps {
  experiment: Experiment;
  onComplete: (results: any) => void;
  participantId: string;
  roomId: string;
}

export function DigitSpanExperiment({ experiment, onComplete, participantId, roomId }: DigitSpanProps) {
  const { t, language } = useLanguage();

  const [currentSpan, setCurrentSpan] = useState(3);
  const [failsAtCurrentSpan, setFailsAtCurrentSpan] = useState(0);
  const [sequence, setSequence] = useState<number[]>([]);
  const [digitIndex, setDigitIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [highestSpan, setHighestSpan] = useState(0);

  const {
    phase,
    setPhase,
    trialIndex,
    trialData,
    recordTrial,
    startExperiment,
    finishExperiment,
  } = useExperiment({ experiment, participantId, roomId, language, onComplete });

  const { startTimer, getResponseTime, clearTimer } = useTimer();
  const digitTimeout = useRef<number | null>(null);

  const generateSequence = useCallback((length: number) => {
    const seq: number[] = [];
    let lastDigit = -1;
    for (let i = 0; i < length; i++) {
      let digit;
      do {
        digit = randomInt(1, 9);
      } while (digit === lastDigit); // Prevent adjacent duplicates
      seq.push(digit);
      lastDigit = digit;
    }
    return seq;
  }, []);

  const showSequence = useCallback(() => {
    const nextSeq = generateSequence(currentSpan);
    setSequence(nextSeq);
    setDigitIndex(0);
    setPhase('showing');
    setUserInput('');
  }, [currentSpan, generateSequence, setPhase]);

  // Handle the digit presentation timing (1000ms on, 500ms off)
  useEffect(() => {
    if (phase === 'showing') {
      if (digitIndex < sequence.length) {
        digitTimeout.current = window.setTimeout(() => {
          setDigitIndex(prev => prev + 1);
        }, 1000);
      } else {
        // Finished showing sequence
        digitTimeout.current = window.setTimeout(() => {
          setPhase('input');
          startTimer();
        }, 500); // Quick pause before input
      }
    }
    return () => {
      if (digitTimeout.current) clearTimeout(digitTimeout.current);
    };
  }, [phase, digitIndex, sequence.length, setPhase, startTimer]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!sequence.length || phase !== 'input') return;

    const rt = getResponseTime() || 0;
    const correctSeq = sequence.join('');
    const isCorrect = userInput === correctSeq;

    recordTrial({
      trialNumber: trialIndex + 1,
      responseTimeMs: rt,
      answer: userInput,
      correctAnswer: correctSeq,
      stimulus: { sequence: correctSeq, span: currentSpan },
    });

    setPhase('feedback');
    clearTimer();

    setTimeout(() => {
      let nextSpan = currentSpan;
      let nextFails = failsAtCurrentSpan;
      let endExp = false;

      if (isCorrect) {
        setHighestSpan(Math.max(highestSpan, currentSpan));
        // Move to next span, reset fails
        nextSpan = currentSpan + 1;
        nextFails = 0;
      } else {
        nextFails += 1;
        if (nextFails >= 2) {
          // Failed twice at current span -> end
          endExp = true;
        }
      }

      if (endExp) {
        // Accuracy here is rough, meaning total successful trials vs total
        const correctTrials = trialData.filter(t => t.answer === t.correctAnswer).length + (isCorrect ? 1 : 0);
        const accuracy = (correctTrials / (trialData.length + 1)) * 100;
        finishExperiment(highestSpan, accuracy);
      } else {
        setCurrentSpan(nextSpan);
        setFailsAtCurrentSpan(nextFails);
        showSequence();
      }
    }, 1000);
  };

  if (phase === 'instruction') {
    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="bg-white border border-border rounded p-8 max-w-2xl mx-auto">
          <h2 className="mb-6">{t('exp.digitSpan.name')}</h2>
          <div className="experiment-instruction">
            <p className="mb-4">{t('exp.digitSpan.instruction')}</p>
            <p>You will see a sequence of numbers flashing on the screen one by one. Afterwards, type the numbers in the exact same order.</p>
            <p className="mt-4"><strong>Adaptive Difficulty:</strong> The sequence will get longer if you answer correctly. The test ends when you make two consecutive mistakes at the same length.</p>
          </div>
          <button onClick={() => { startExperiment('experiment'); showSequence(); }} className="btn-primary w-full sm:w-auto mt-8">
            {t('common.start')}
          </button>
        </div>
      </ExperimentWrapper>
    );
  }

  if (phase === 'complete') {
    const correctTrials = trialData.filter(t => t.answer === t.correctAnswer).length;

    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="bg-white border border-border rounded p-8 max-w-2xl mx-auto">
          <h2 className="mb-6">{t('common.debrief.title')}</h2>

          <div className="bg-success/10 border-l-4 border-success p-4 mb-6">
            <p className="text-success-800 font-medium">{t('common.debrief.thankYou')}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-surface p-6 rounded border border-border text-center">
              <p className="text-3xl font-bold text-primary mb-1">{highestSpan}</p>
              <p className="text-sm text-text-secondary">{t('exp.digitSpan.maxSpan')}</p>
            </div>
            <div className="bg-surface p-6 rounded border border-border text-center">
              <p className="text-3xl font-bold text-primary mb-1">{correctTrials}</p>
              <p className="text-sm text-text-secondary">{t('common.correct')} Trials</p>
            </div>
          </div>

          <div className="prose prose-sm text-text-secondary mt-8">
            <h4 className="text-text-primary">What this experiment measures:</h4>
            <p>{t('exp.digitSpan.debrief')}</p>
            <h4 className="text-text-primary mt-4">Typical Findings:</h4>
            <p>According to George Miller's famous 1956 paper, the capacity of short-term memory is generally "seven, plus or minus two" items for most healthy adults. However, more recent research suggests the true capacity without chunking is closer to 4 items.</p>
            <h4 className="text-text-primary mt-4">Why it occurs:</h4>
            <p>Short-term memory capacity is constrained by the phonological loop — a component of working memory that briefly holds verbal information through subvocal rehearsal. As the number of items exceeds this limited buffer, earlier items decay before they can be rehearsed.</p>
            <p className="mt-4 text-xs italic">Miller, G. A. (1956). The magical number seven, plus or minus two. <em>Psychological Review, 63</em>(2), 81–97.</p>
          </div>
        </div>
      </ExperimentWrapper>
    );
  }

  return (
    <ExperimentWrapper experiment={experiment}>
      <div className="max-w-2xl mx-auto py-8">

        <div className="mb-12 flex justify-between text-sm text-text-muted uppercase tracking-wide">
          <span>{t('exp.digitSpan.trial')} {trialData.length + 1}</span>
          <span>Current Span: <strong>{currentSpan}</strong></span>
          <span>Fails at Span: <strong>{failsAtCurrentSpan}/2</strong></span>
        </div>

        <div className="flex flex-col items-center justify-center min-h-[300px] border border-border rounded bg-surface p-8">

          {phase === 'showing' && (
            <div className="text-[6rem] leading-none text-text-primary font-mono tracking-widest font-light transition-all">
              {digitIndex < sequence.length ? sequence[digitIndex] : ''}
            </div>
          )}

          {phase === 'input' && (
            <form onSubmit={handleSubmit} className="w-full flex flex-col items-center">
              <p className="text-text-muted mb-8">{t('exp.digitSpan.enter')}</p>
              <input
                type="text"
                pattern="[0-9]*"
                inputMode="numeric"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-full max-w-sm p-4 bg-white border border-border rounded text-center text-3xl font-mono tracking-[0.5em] focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                placeholder="---"
                autoFocus
              />
              <button
                type="submit"
                disabled={!userInput}
                className="btn-primary mt-8 px-12 disabled:opacity-50"
              >
                {t('common.submit')}
              </button>
            </form>
          )}

          {phase === 'feedback' && (
            <div className="text-center">
              <div className={`text-6xl font-bold mb-4 ${userInput === sequence.join('') ? 'text-success' : 'text-error'}`}>
                {userInput === sequence.join('') ? '✓' : '✗'}
              </div>
              {userInput !== sequence.join('') && (
                <p className="text-lg text-text-secondary">
                  {t('exp.digitSpan.was')}: <span className="font-mono text-text-primary font-bold ml-2 tracking-widest">{sequence.join('')}</span>
                </p>
              )}
            </div>
          )}

        </div>
      </div>
    </ExperimentWrapper>
  );
}

export default DigitSpanExperiment;
