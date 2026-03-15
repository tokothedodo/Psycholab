import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ExperimentWrapper } from './ExperimentWrapper';
import { useExperiment } from '../hooks/useExperiment';
import { useTimer } from '../hooks/useTimer';
import { useResponseCapture } from '../hooks/useResponseCapture';
import { fisherYatesShuffle } from '../lib/random';
import type { Experiment } from '../data/experiments';

interface DRMProps {
  experiment: Experiment;
  onComplete: (results: any) => void;
  participantId: string;
  roomId: string;
}

// Classic Roediger & McDermott (1995) DRM Lists
const DRM_LISTS = [
  { lure: 'sleep', words: ['bed', 'rest', 'awake', 'tired', 'dream', 'wake', 'snooze', 'blanket', 'doze', 'slumber', 'snore', 'nap', 'peace', 'yawn', 'drowsy'] },
  { lure: 'cold', words: ['winter', 'ice', 'snow', 'freeze', 'chill', 'shiver', 'arctic', 'weather', 'hot', 'frigid', 'frost', 'polar', 'draft', 'cool', 'numb'] },
  { lure: 'needle', words: ['thread', 'pin', 'eye', 'sewing', 'sharp', 'point', 'prick', 'thimble', 'haystack', 'thorn', 'hurt', 'injection', 'syringe', 'cloth', 'knitting'] },
  { lure: 'window', words: ['door', 'glass', 'pane', 'shade', 'ledge', 'sill', 'house', 'open', 'curtain', 'frame', 'view', 'breeze', 'sash', 'screen', 'shutter'] },
  { lure: 'sweet', words: ['sour', 'candy', 'sugar', 'bitter', 'good', 'taste', 'tooth', 'nice', 'honey', 'soda', 'chocolate', 'heart', 'cake', 'tart', 'pie'] },
  { lure: 'chair', words: ['table', 'sit', 'legs', 'seat', 'couch', 'desk', 'recliner', 'sofa', 'wood', 'cushion', 'swivel', 'stool', 'sitting', 'rocking', 'bench'] }
];

const NUM_STUDY_LISTS = 3;
const WORD_DURATION_MS = 1500;

interface TestWord {
  word: string;
  type: 'studied' | 'studied_lure' | 'unstudied' | 'unstudied_lure';
}

export function DRMExperiment({ experiment, onComplete, participantId, roomId }: DRMProps) {
  const { t, language } = useLanguage();

  const [studyWords, setStudyWords] = useState<string[]>([]);
  const [testWords, setTestWords] = useState<TestWord[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);

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

  const generateStimuli = useCallback(() => {
    // 1. Shuffle lists and pick 3 for study, 3 for unstudied
    const shuffledLists = fisherYatesShuffle(DRM_LISTS);
    const studiedLists = shuffledLists.slice(0, NUM_STUDY_LISTS);
    const unstudiedLists = shuffledLists.slice(NUM_STUDY_LISTS);

    // 2. Generate study sequence (all words from studied lists, one list after another)
    let studySequence: string[] = [];
    studiedLists.forEach(list => {
      studySequence = studySequence.concat(list.words);
    });
    setStudyWords(studySequence);

    // 3. Generate test sequence
    // - 9 studied words (positions 1, 8, 15 from each studied list)
    // - 3 studied lures
    // - 9 unstudied words (positions 1, 8, 15 from each unstudied list)
    // - 3 unstudied lures
    let testSequence: TestWord[] = [];

    studiedLists.forEach(list => {
      testSequence.push({ word: list.words[0], type: 'studied' });
      testSequence.push({ word: list.words[7], type: 'studied' });
      testSequence.push({ word: list.words[14], type: 'studied' });
      testSequence.push({ word: list.lure, type: 'studied_lure' });
    });

    unstudiedLists.forEach(list => {
      testSequence.push({ word: list.words[0], type: 'unstudied' });
      testSequence.push({ word: list.words[7], type: 'unstudied' });
      testSequence.push({ word: list.words[14], type: 'unstudied' });
      testSequence.push({ word: list.lure, type: 'unstudied_lure' });
    });

    setTestWords(fisherYatesShuffle(testSequence));
  }, []);

  const handleStartStudy = () => {
    generateStimuli();
    startExperiment('study');
    setCurrentWordIndex(0);
  };

  const handleStartTest = () => {
    setPhase('test');
    setCurrentWordIndex(0); // We use trialIndex for test words via useExperiment, but let's reset this just in case
    startTimer();
  };

  // Study Phase Presentation Timer
  useEffect(() => {
    if (phase === 'study' && studyWords.length > 0) {
      if (currentWordIndex >= studyWords.length) {
        setPhase('break');
        return;
      }

      const timer = setTimeout(() => {
        setCurrentWordIndex(prev => prev + 1);
      }, WORD_DURATION_MS);

      return () => clearTimeout(timer);
    }
  }, [phase, currentWordIndex, studyWords, setPhase]);

  const handleResponseInternal = useCallback((response: 'old' | 'new') => {
    if (phase !== 'test') return;

    const rt = getResponseTime() || 0;
    clearTimer();

    const testWord = testWords[trialIndex];
    const isActuallyOld = testWord.type === 'studied';

    recordTrial({
      trialNumber: trialIndex + 1,
      responseTimeMs: rt,
      answer: response,
      correctAnswer: isActuallyOld ? 'old' : 'new',
      stimulus: testWord,
    });

    if (trialIndex < testWords.length - 1) {
      advanceTrial(false, testWords.length);
      startTimer();
    } else {
      // Calculate final results
      // Accuracy logic for DRM often looks at hit rate vs false alarm rate
      // Since states are not updated yet with the current trial, we do it carefully:
      const allResponses = [...trialData, {
        answer: response,
        stimulus: testWord
      }];

      const falseAlarmsToLures = allResponses.filter(t => t.answer === 'old' && (t.stimulus as TestWord).type === 'studied_lure').length;
      const trueHits = allResponses.filter(t => t.answer === 'old' && (t.stimulus as TestWord).type === 'studied').length;
      const falseAlarmsToUnstudied = allResponses.filter(t => t.answer === 'old' && (t.stimulus as TestWord).type === 'unstudied').length;

      const accuracy = (allResponses.filter(t => {
        const isOld = (t.stimulus as TestWord).type === 'studied';
        return (t.answer === 'old' && isOld) || (t.answer === 'new' && !isOld);
      }).length / allResponses.length) * 100;

      setPhase('complete');
      finishExperiment(JSON.stringify({
        studiedHits: trueHits,
        studiedLureFalseAlarms: falseAlarmsToLures,
        unstudiedFalseAlarms: falseAlarmsToUnstudied
      }), accuracy);
    }
  }, [phase, getResponseTime, clearTimer, testWords, trialIndex, recordTrial, advanceTrial, startTimer, trialData, setPhase, finishExperiment]);

  useResponseCapture({
    validKeys: ['ArrowLeft', 'ArrowRight'],
    onResponse: (key) => {
      if (key === 'ArrowLeft') handleResponseInternal('old');
      if (key === 'ArrowRight') handleResponseInternal('new');
    },
    disabled: phase !== 'test'
  });

  if (phase === 'instruction') {
    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="bg-white border border-border rounded p-8 max-w-2xl mx-auto">
          <h2 className="mb-6">{t('exp.drm.name')}</h2>
          <div className="experiment-instruction mb-8">
            <p className="mb-4">{t('exp.drm.instruction')}</p>
            <div className="bg-info/10 border border-info/20 p-4 rounded mb-6 text-info-900 text-sm">
              <p className="font-medium mb-2">{t('exp.drm.instructionDetail')}</p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>You will see several lists of words.</li>
                <li>Words will appear quickly, one at a time. Pay close attention.</li>
                <li>After all lists are shown, there will be a memory test.</li>
              </ul>
            </div>
            <p className="text-xs italic text-text-muted mt-4">{t('citation')}: {experiment.citation}, {experiment.year}</p>
          </div>
          <button onClick={handleStartStudy} className="btn-primary w-full sm:w-auto">
            {t('common.start')}
          </button>
        </div>
      </ExperimentWrapper>
    );
  }

  if (phase === 'study') {
    const isFixation = currentWordIndex % 15 === 0 && currentWordIndex > 0 && currentWordIndex < studyWords.length;

    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="max-w-2xl mx-auto py-8">
          <div className="mb-12">
            <div className="h-1 bg-surface rounded overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${(currentWordIndex / studyWords.length) * 100}%` }}
              />
            </div>
            <p className="text-xs text-text-muted font-medium uppercase tracking-wider mt-2 text-right">
              Study Phase
            </p>
          </div>

          <div className="flex flex-col items-center justify-center min-h-[300px] bg-surface border border-border rounded p-8">
            {isFixation ? (
              <div className="text-6xl font-light text-text-muted">+</div>
            ) : (
              <div className="text-7xl font-bold text-text-primary capitalize tracking-tight animate-fade-in" key={studyWords[currentWordIndex]}>
                {studyWords[currentWordIndex]}
              </div>
            )}
          </div>
        </div>
      </ExperimentWrapper>
    );
  }

  if (phase === 'break') {
    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="bg-white border border-border rounded p-8 max-w-xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">Study Phase Complete</h2>
          <p className="text-text-secondary mb-8">
            You will now be shown a series of single words. For each word, decide if it was on the lists you just studied (OLD) or if it is a completely new word (NEW).
          </p>

          <div className="flex justify-around items-center bg-surface p-4 rounded border border-border mb-8">
            <div className="text-center">
              <span className="kb-key mb-2">←</span>
              <p className="text-sm font-medium">{t('exp.drm.old')} (Studied)</p>
            </div>
            <div className="text-center">
              <span className="kb-key mb-2">→</span>
              <p className="text-sm font-medium">{t('exp.drm.new')} (Unstudied)</p>
            </div>
          </div>

          <button onClick={handleStartTest} className="btn-primary">
            Start Memory Test
          </button>
        </div>
      </ExperimentWrapper>
    );
  }

  if (phase === 'test') {
    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="max-w-2xl mx-auto py-8">
          <div className="mb-12">
            <div className="h-1 bg-surface rounded overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${(trialIndex / testWords.length) * 100}%` }}
              />
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs text-text-muted font-medium uppercase tracking-wider">
                Memory Test
              </span>
              <span className="text-xs text-text-muted font-medium uppercase tracking-wider">
                Test {trialIndex + 1} / {testWords.length}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center min-h-[300px] border-2 border-dashed border-border rounded bg-surface p-8">
            <h2 className="text-2xl font-bold text-text-muted tracking-tight mb-8">
              {t('exp.drm.wasPresented')}
            </h2>

            <div className="text-6xl font-extrabold text-primary capitalize drop-shadow-sm">
              {testWords[trialIndex]?.word}
            </div>
          </div>

          <div className="mt-12 flex justify-center gap-8">
            <button
              onClick={() => handleResponseInternal('old')}
              className="w-40 border-2 border-border hover:border-primary bg-white py-4 rounded font-bold text-lg transition-colors flex flex-col items-center gap-2"
            >
              <span className="text-text-primary uppercase tracking-wide">{t('exp.drm.old')}</span>
              <span className="kb-key">←</span>
            </button>
            <button
              onClick={() => handleResponseInternal('new')}
              className="w-40 border-2 border-border hover:border-primary bg-white py-4 rounded font-bold text-lg transition-colors flex flex-col items-center gap-2"
            >
              <span className="text-text-primary uppercase tracking-wide">{t('exp.drm.new')}</span>
              <span className="kb-key">→</span>
            </button>
          </div>
        </div>
      </ExperimentWrapper>
    );
  }

  if (phase === 'complete') {
    const falseAlarmsToLures = trialData.filter(t => t.answer === 'old' && (t.stimulus as TestWord).type === 'studied_lure').length;
    const trueHits = trialData.filter(t => t.answer === 'old' && (t.stimulus as TestWord).type === 'studied').length;
    const falseAlarmsToUnstudied = trialData.filter(t => t.answer === 'old' && (t.stimulus as TestWord).type === 'unstudied').length;

    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="bg-white border border-border rounded p-8 max-w-2xl mx-auto">
          <h2 className="mb-6">{t('common.debrief.title')}</h2>

          <div className="bg-success/10 border-l-4 border-success p-4 mb-6">
            <p className="text-success-800 font-medium">{t('common.debrief.thankYou')}</p>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-surface p-4 rounded border border-border text-center flex flex-col items-center justify-center">
              <p className="text-3xl font-bold text-primary mb-1">{Math.round((trueHits / 9) * 100)}%</p>
              <p className="text-sm text-text-secondary">{t('exp.drm.studied')}</p>
              <p className="text-xs text-text-muted mt-1">(Hit Rate)</p>
            </div>
            <div className="bg-surface p-4 rounded border border-border text-center flex flex-col items-center justify-center">
              <p className="text-3xl font-bold text-error mb-1">{Math.round((falseAlarmsToLures / 3) * 100)}%</p>
              <p className="text-sm text-text-secondary">{t('exp.drm.lureFalseAlarm')}</p>
              <p className="text-xs text-text-muted mt-1">(False Memory)</p>
            </div>
            <div className="bg-surface p-4 rounded border border-border text-center flex flex-col items-center justify-center">
              <p className="text-3xl font-bold text-primary mb-1">{Math.round((falseAlarmsToUnstudied / 9) * 100)}%</p>
              <p className="text-sm text-text-secondary">Unrelated False Alarms</p>
              <p className="text-xs text-text-muted mt-1">(Baseline Error)</p>
            </div>
          </div>

          <div className="bg-info/10 border border-info/20 p-6 rounded mb-8 text-info-900 text-sm">
            <h3 className="font-bold mb-2">{t('exp.drm.interpretation')}</h3>
            <p>{t('exp.drm.explanation')}</p>
            {falseAlarmsToLures > falseAlarmsToUnstudied && (
              <p className="mt-2 font-medium">You showed a classic false memory effect, identifying critical lures as "old" more often than unrelated new words.</p>
            )}
          </div>

          <div className="prose prose-sm text-text-secondary">
            <h4 className="text-text-primary">What this experiment measures:</h4>
            <p>{t('exp.drm.debrief')}</p>

            <h4 className="text-text-primary mt-4">Typical Findings:</h4>
            <p>Participants typically recognize critical lure words (the unstudied theme word) at rates comparable to actually studied words — often around 50–80% — while correctly rejecting unrelated new words. This demonstrates a robust false memory effect.</p>

            <h4 className="text-text-primary mt-4">Why it occurs:</h4>
            <p>Studying a list of semantically related words (e.g., bed, rest, awake...) activates the shared associative network, including the unstudied critical lure ("sleep"). During recognition, this residual activation makes the lure feel familiar, creating a compelling but false sense of having seen it before.</p>

            <p className="mt-4 text-xs italic">Roediger, H. L., &amp; McDermott, K. B. (1995). Creating false memories. <em>Journal of Experimental Psychology: Learning, Memory, and Cognition, 21</em>(4), 803–814.</p>
          </div>
        </div>
      </ExperimentWrapper>
    );
  }

  return null;
}

export default DRMExperiment;
