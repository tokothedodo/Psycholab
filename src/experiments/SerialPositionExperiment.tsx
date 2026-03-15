import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ExperimentWrapper } from './ExperimentWrapper';
import { useExperiment } from '../hooks/useExperiment';
import { useTimer } from '../hooks/useTimer';
import { fisherYatesShuffle } from '../lib/random';
import type { Experiment } from '../data/experiments';

interface SerialPositionProps {
  experiment: Experiment;
  onComplete: (results: any) => void;
  participantId: string;
  roomId: string;
}

const WORDS = [
  'apple', 'bread', 'chair', 'door', 'earth', 'fire', 'grape', 'house', 'iron', 'juice',
  'kite', 'lemon', 'mouse', 'night', 'ocean', 'paper', 'queen', 'river', 'stone', 'table',
  'umbrella', 'violet', 'water', 'xenon', 'yellow', 'zebra', 'cloud', 'train', 'plant', 'clock'
];

const LIST_LENGTH = 10;
const TOTAL_TRIALS = 3;
const WORD_DURATION_MS = 1000;

export function SerialPositionExperiment({ experiment, onComplete, participantId, roomId }: SerialPositionProps) {
  const { t, language } = useLanguage();

  const [currentList, setCurrentList] = useState<string[]>([]);
  const [showWordIndex, setShowWordIndex] = useState(0);
  const [userInput, setUserInput] = useState('');

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

  const generateList = useCallback((): string[] => {
    return fisherYatesShuffle([...WORDS]).slice(0, LIST_LENGTH);
  }, []);

  const handleStartStudy = useCallback(() => {
    if (trialIndex === 0 && phase === 'instruction') {
      startExperiment('study');
    } else {
      setPhase('study');
    }
    setCurrentList(generateList());
    setShowWordIndex(0);
    setUserInput('');
  }, [trialIndex, phase, startExperiment, setPhase, generateList]);

  // Word presentation timer
  useEffect(() => {
    if (phase === 'study' && currentList.length > 0) {
      const timer = setInterval(() => {
        setShowWordIndex(prev => {
          if (prev < currentList.length - 1) {
            return prev + 1;
          } else {
            clearInterval(timer);
            setPhase('recall');
            startTimer();
            return prev;
          }
        });
      }, WORD_DURATION_MS);
      return () => clearInterval(timer);
    }
  }, [phase, currentList, setPhase, startTimer]);

  const handleSubmit = () => {
    const rt = getResponseTime() || 0;
    clearTimer();

    const recalledWords = userInput.toLowerCase().split(/[,\s]+/).filter(w => w.length > 0);
    const correctWords = currentList.filter(w => recalledWords.includes(w.toLowerCase()));

    const positionScores: Record<string, number> = {
      primacy: 0,
      middle: 0,
      recency: 0
    };

    currentList.forEach((word, index) => {
      const isRecalled = recalledWords.some(w => w.toLowerCase() === word.toLowerCase());
      if (isRecalled) {
        if (index < 3) positionScores.primacy++;
        else if (index >= currentList.length - 3) positionScores.recency++;
        else positionScores.middle++;
      }
    });

    recordTrial({
      trialNumber: trialIndex + 1,
      responseTimeMs: rt,
      answer: userInput,
      correctAnswer: currentList.join(', '),
      stimulus: {
        list: currentList.join(','),
        recalled: correctWords.join(','),
        primacy: positionScores.primacy,
        middle: positionScores.middle,
        recency: positionScores.recency
      },
    });

    if (trialIndex < TOTAL_TRIALS - 1) {
      advanceTrial(false, TOTAL_TRIALS); // Sets phase to 'experiment', which we might want to override or handle start individually
      setPhase('ready'); // Create a ready screen between lists
    } else {
      // Calculate final results manually for finishing
      let totalPrimacy = 0;
      let totalMiddle = 0;
      let totalRecency = 0;
      let totalCorrect = 0;

      // Include all previous trials
      trialData.forEach(t => {
        const stim = t.stimulus as any;
        totalCorrect += stim?.recalled ? (stim.recalled as string).split(',').filter((x: string) => x).length : 0;
        totalPrimacy += (stim?.primacy as number) || 0;
        totalMiddle += (stim?.middle as number) || 0;
        totalRecency += (stim?.recency as number) || 0;
      });
      // Add current trial
      totalCorrect += correctWords.length;
      totalPrimacy += positionScores.primacy;
      totalMiddle += positionScores.middle;
      totalRecency += positionScores.recency;

      const accuracy = (totalCorrect / (TOTAL_TRIALS * LIST_LENGTH)) * 100;

      setPhase('complete');
      finishExperiment(JSON.stringify({
        primacy: totalPrimacy,
        middle: totalMiddle,
        recency: totalRecency
      }), accuracy);
    }
  };

  if (phase === 'instruction') {
    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="bg-white border border-border rounded p-8 max-w-2xl mx-auto">
          <h2 className="mb-6">{t('exp.serialPosition.name')}</h2>
          <div className="experiment-instruction mb-8">
            <p className="mb-4">{t('exp.serialPosition.instruction')}</p>
            <div className="bg-info/10 border border-info/20 p-4 rounded mb-6 text-info-900">
              <p className="font-medium mb-2">{t('exp.serialPosition.instructionDetail')}</p>
              <ul className="list-disc pl-5 space-y-1 text-sm mt-2">
                <li>You will see {TOTAL_TRIALS} different lists of words.</li>
                <li>Each list has {LIST_LENGTH} words.</li>
                <li>Each word is shown for exactly 1 second.</li>
                <li>After the list finishes, type all the words you can remember in any order.</li>
              </ul>
            </div>
            <p className="text-xs italic text-text-muted mt-4 mt-8">{t('citation')}: {experiment.citation}, {experiment.year}</p>
          </div>
          <button onClick={handleStartStudy} className="btn-primary w-full sm:w-auto">
            {t('common.start')}
          </button>
        </div>
      </ExperimentWrapper>
    );
  }

  if (phase === 'ready') {
    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="bg-white border border-border rounded p-8 max-w-xl mx-auto text-center">
          <h3 className="text-2xl font-bold mb-4">List {trialIndex + 1} of {TOTAL_TRIALS}</h3>
          <p className="text-text-secondary mb-8">When you are ready, click below to see the next list of words.</p>
          <button onClick={handleStartStudy} className="btn-primary">
            Show Next List
          </button>
        </div>
      </ExperimentWrapper>
    );
  }

  if (phase === 'complete') {
    // Parse final scores again for display
    let primacyScore = 0, middleScore = 0, recencyScore = 0;
    trialData.forEach(t => {
      const stim = t.stimulus as any;
      primacyScore += (stim?.primacy as number) || 0;
      middleScore += (stim?.middle as number) || 0;
      recencyScore += (stim?.recency as number) || 0;
    });

    const hasRecency = recencyScore > primacyScore && recencyScore > middleScore;
    const hasPrimacy = primacyScore > recencyScore && primacyScore > middleScore;

    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="bg-white border border-border rounded p-8 max-w-2xl mx-auto">
          <h2 className="mb-6">{t('common.debrief.title')}</h2>

          <div className="bg-success/10 border-l-4 border-success p-4 mb-6">
            <p className="text-success-800 font-medium">{t('common.debrief.thankYou')}</p>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-surface p-4 rounded border border-border text-center">
              <p className="text-3xl font-bold text-primary mb-1">{primacyScore}</p>
              <p className="text-sm text-text-secondary">{t('exp.serialPosition.primacy')}</p>
              <p className="text-xs text-text-muted mt-1">(First 3 words)</p>
            </div>
            <div className="bg-surface p-4 rounded border border-border text-center">
              <p className="text-3xl font-bold text-primary mb-1">{middleScore}</p>
              <p className="text-sm text-text-secondary">{t('exp.serialPosition.middle')}</p>
              <p className="text-xs text-text-muted mt-1">(Middle words)</p>
            </div>
            <div className="bg-surface p-4 rounded border border-border text-center">
              <p className="text-3xl font-bold text-primary mb-1">{recencyScore}</p>
              <p className="text-sm text-text-secondary">{t('exp.serialPosition.recency')}</p>
              <p className="text-xs text-text-muted mt-1">(Last 3 words)</p>
            </div>
          </div>

          <div className="bg-info/10 border border-info/20 p-6 rounded mb-8 text-info-900 text-sm">
            <h3 className="font-bold mb-2">{t('exp.serialPosition.interpretation')}</h3>
            <p>
              {hasRecency
                ? t('exp.serialPosition.recencyEffect')
                : hasPrimacy
                  ? t('exp.serialPosition.primacyEffect')
                  : t('exp.serialPosition.both')}
            </p>
          </div>

          <div className="prose prose-sm text-text-secondary">
            <h4 className="text-text-primary">What this experiment measures:</h4>
            <p>{t('exp.serialPosition.debrief')}</p>

            <h4 className="text-text-primary mt-4">Typical Findings:</h4>
            <p>Participants recall the first few items (primacy effect) and last few items (recency effect) of a list significantly better than middle items, producing a characteristic U-shaped recall curve.</p>

            <h4 className="text-text-primary mt-4">Why it occurs:</h4>
            <p>The primacy effect is attributed to greater rehearsal of early items, which allows them to be encoded into long-term memory. The recency effect occurs because the last few items are still active in short-term (working) memory at the time of recall. Middle items receive less rehearsal and have decayed from short-term memory.</p>

            <p className="mt-4 text-xs italic">Murdock, B. B. (1962). The serial position effect of free recall. <em>Journal of Experimental Psychology, 64</em>(5), 482–488.</p>
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
          <div className="flex justify-between items-center mt-2">
            <span className="text-xs text-text-muted font-medium uppercase tracking-wider">
              List {trialIndex + 1} / {TOTAL_TRIALS}
            </span>
            {phase === 'study' && (
              <span className="text-xs text-text-muted font-medium uppercase tracking-wider">
                Word {showWordIndex + 1} / {LIST_LENGTH}
              </span>
            )}
          </div>
        </div>

        {phase === 'study' && currentList.length > 0 && (
          <div className="flex flex-col items-center justify-center min-h-[300px] bg-surface border border-border rounded p-8">
            <div className="text-7xl font-bold text-text-primary capitalize tracking-tight" key={currentList[showWordIndex]}>
              {currentList[showWordIndex]}
            </div>
          </div>
        )}

        {phase === 'recall' && (
          <div className="flex flex-col">
            <h2 className="text-2xl font-bold text-text-primary mb-6 text-center">
              {t('exp.serialPosition.recallInstructions')}
            </h2>

            <textarea
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder={t('exp.serialPosition.placeholder')}
              className="w-full h-48 p-4 bg-white border-2 border-border rounded focus:border-primary focus:ring-0 resize-none text-lg text-text-primary font-medium"
              autoFocus
            />

            <div className="mt-8 flex justify-center">
              <button onClick={handleSubmit} className="btn-primary w-full sm:w-64">
                {t('common.submit')}
              </button>
            </div>
          </div>
        )}
      </div>
    </ExperimentWrapper>
  );
}

export default SerialPositionExperiment;
