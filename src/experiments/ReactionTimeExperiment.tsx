import { useState, useEffect, useCallback, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import type { Experiment } from '../data/experiments';
import { ExperimentWrapper } from './ExperimentWrapper';
import { useExperiment } from '../hooks/useExperiment';
import { useTimer } from '../hooks/useTimer';
import { useResponseCapture } from '../hooks/useResponseCapture';
import { randomInt } from '../lib/random';

interface ReactionTimeProps {
  experiment: Experiment;
  onComplete: (results: any) => void;
  participantId: string;
  roomId: string;
}

type TestType = 'simple' | 'choice';

const SIMPLE_TRIALS = 40;
const CHOICE_TRIALS = 40;
const STIMULI = ['▲', '●', '■'];
const KEYS = ['1', '2', '3'];

export function ReactionTimeExperiment({ experiment, onComplete, participantId, roomId }: ReactionTimeProps) {
  const { t, language } = useLanguage();
  const [currentTest, setCurrentTest] = useState<TestType>('simple');
  const [stimulus, setStimulus] = useState<string | null>(null);
  const [showStimulus, setShowStimulus] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [resultsRaw, setResultsRaw] = useState<{ simple: number[]; choice: number[] }>({ simple: [], choice: [] });
  const timeoutRef = useRef<number | null>(null);

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

  const getRandomDelay = () => randomInt(500, 2000); // 500-2000ms foreperiod

  const startNextTrial = useCallback(() => {
    setWaiting(true);
    const delay = getRandomDelay();

    timeoutRef.current = window.setTimeout(() => {
      setWaiting(false);
      setShowStimulus(true);
      startTimer();

      if (currentTest === 'simple') {
        setStimulus('●');
      } else {
        setStimulus(STIMULI[randomInt(0, STIMULI.length - 1)]);
      }
    }, delay);
  }, [currentTest, startTimer]);

  useEffect(() => {
    if (phase === 'experiment') {
      startNextTrial();
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [phase, trialIndex, currentTest, startNextTrial]);

  const handleResponseInternal = useCallback((response: string) => {
    if (!showStimulus || !stimulus || phase !== 'experiment') return;

    const rt = getResponseTime() || 0;

    recordTrial({
      trialNumber: trialIndex + 1,
      responseTimeMs: rt,
      answer: response,
      correctAnswer: stimulus,
      stimulus,
      // store the test type inside stimulus field as well
      condition: currentTest
    } as any);

    setResultsRaw(prev => ({
      ...prev,
      [currentTest]: [...prev[currentTest], rt]
    }));

    setShowStimulus(false);
    setStimulus(null);
    clearTimer();

    const totalTrials = currentTest === 'simple' ? SIMPLE_TRIALS : CHOICE_TRIALS;

    if (trialIndex < totalTrials - 1) {
      advanceTrial(false, totalTrials);
    } else if (currentTest === 'simple') {
      setCurrentTest('choice');
      setPhase('instruction'); // Brief pause between phases
    } else {
      // Calculate results and finish
      const removeOutliers = (arr: number[]) => {
        const valid = arr.filter(rt => rt >= 100);
        if (valid.length === 0) return [];
        const mean = valid.reduce((a, b) => a + b, 0) / valid.length;
        const sd = Math.sqrt(valid.reduce((sq, val) => sq + Math.pow(val - mean, 2), 0) / valid.length);
        return valid.filter(rt => rt <= mean + 2 * sd);
      };

      const finalSimpleRaw = [...resultsRaw.simple];
      const finalChoiceRaw = [...resultsRaw.choice];

      // Since we just recorded the last choice trial, it's not in resultsRaw yet
      finalChoiceRaw.push(rt);

      const cleanSimple = removeOutliers(finalSimpleRaw);
      const cleanChoice = removeOutliers(finalChoiceRaw);

      const simpleMean = cleanSimple.length > 0 ? cleanSimple.reduce((a, b) => a + b, 0) / cleanSimple.length : 0;
      const choiceMean = cleanChoice.length > 0 ? cleanChoice.reduce((a, b) => a + b, 0) / cleanChoice.length : 0;

      // Calculate full accuracy (only choice trials matter for accuracy)
      const choiceTrials = trialData.filter((t: any) => t.condition === 'choice');
      // Adding current
      choiceTrials.push({ answer: response, correctAnswer: stimulus } as any);

      const correctChoice = choiceTrials.filter(t => {
        const mapped = STIMULI[KEYS.indexOf(t.answer as string)];
        return mapped === t.correctAnswer;
      }).length;

      const accuracy = choiceTrials.length > 0 ? (correctChoice / choiceTrials.length) * 100 : 100;

      finishExperiment(Math.round(choiceMean - simpleMean), accuracy);
    }
  }, [
    showStimulus, stimulus, phase, getResponseTime, recordTrial, trialIndex, currentTest,
    resultsRaw, clearTimer, advanceTrial, setPhase, trialData, finishExperiment
  ]);

  useResponseCapture({
    validKeys: currentTest === 'simple' ? [' ', 'enter'] : KEYS,
    onResponse: (key) => handleResponseInternal(key),
    disabled: !showStimulus || phase !== 'experiment'
  });

  if (phase === 'instruction' && currentTest === 'simple') {
    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="bg-white border border-border rounded p-8 max-w-2xl mx-auto">
          <h2 className="mb-6">{t('exp.reactionTime.name')}</h2>
          <div className="experiment-instruction">
            <p className="mb-4"><strong>{t('exp.reactionTime.simple')}</strong> ({SIMPLE_TRIALS} trials)</p>
            <p>{t('exp.reactionTime.simpleDesc')}</p>
            <p className="mt-4 text-sm text-text-muted">Press <strong>SPACEBAR</strong> as quickly as possible when the shape appears.</p>
          </div>
          <button onClick={() => startExperiment('experiment')} className="btn-primary w-full sm:w-auto mt-8">
            {t('common.start')}
          </button>
        </div>
      </ExperimentWrapper>
    );
  }

  if (phase === 'instruction' && currentTest === 'choice') {
    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="bg-white border border-border rounded p-8 max-w-2xl mx-auto text-center">
          <h2 className="mb-6">Phase 2: {t('exp.reactionTime.choice')}</h2>
          <div className="experiment-instruction text-left mb-8">
            <p>{t('exp.reactionTime.choiceDesc')}</p>
            <div className="flex justify-around items-center mt-6">
              <div className="flex flex-col items-center"><span className="text-4xl mb-2">▲</span><span className="kb-key">1</span></div>
              <div className="flex flex-col items-center"><span className="text-4xl mb-2">●</span><span className="kb-key">2</span></div>
              <div className="flex flex-col items-center"><span className="text-4xl mb-2">■</span><span className="kb-key">3</span></div>
            </div>
          </div>
          <button onClick={() => startExperiment('experiment')} className="btn-primary w-full sm:w-auto">
            {t('common.start')} Phase 2
          </button>
        </div>
      </ExperimentWrapper>
    );
  }

  if (phase === 'complete') {
    const removeOutliers = (arr: number[]) => {
      const valid = arr.filter(rt => rt >= 100);
      if (valid.length === 0) return [];
      const mean = valid.reduce((a, b) => a + b, 0) / valid.length;
      const sd = Math.sqrt(valid.reduce((sq, val) => sq + Math.pow(val - mean, 2), 0) / valid.length);
      return valid.filter(rt => rt <= mean + 2 * sd);
    };

    const cleanSimple = removeOutliers(resultsRaw.simple);
    const cleanChoice = removeOutliers(resultsRaw.choice);

    const simpleMean = cleanSimple.length > 0 ? cleanSimple.reduce((a, b) => a + b, 0) / cleanSimple.length : 0;
    const choiceMean = cleanChoice.length > 0 ? cleanChoice.reduce((a, b) => a + b, 0) / cleanChoice.length : 0;

    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="bg-white border border-border rounded p-8 max-w-2xl mx-auto">
          <h2 className="mb-6">{t('common.debrief.title')}</h2>

          <div className="bg-success/10 border-l-4 border-success p-4 mb-6">
            <p className="text-success-800 font-medium">{t('common.debrief.thankYou')}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-surface p-6 rounded border border-border text-center">
              <p className="text-3xl font-bold text-primary mb-1">{Math.round(simpleMean)}ms</p>
              <p className="text-sm text-text-secondary">{t('exp.reactionTime.simple')} RT</p>
            </div>
            <div className="bg-surface p-6 rounded border border-border text-center">
              <p className="text-3xl font-bold text-primary mb-1">{Math.round(choiceMean)}ms</p>
              <p className="text-sm text-text-secondary">{t('exp.reactionTime.choice')} RT</p>
            </div>
          </div>

          <div className="bg-info/10 border border-info/20 p-6 rounded mb-8">
            <h3 className="text-info-800 mb-2">{t('exp.reactionTime.decision')}: {Math.round(choiceMean - simpleMean)}ms</h3>
            <p className="text-sm text-info-700">This represents the time taken specifically to identify the stimulus and select the correct response, isolated from basic motor and visual processing time.</p>
          </div>

          <div className="prose prose-sm text-text-secondary">
            <h4 className="text-text-primary">What this experiment measures:</h4>
            <p>{t('exp.reactionTime.debrief')}</p>

            <h4 className="text-text-primary mt-4">Typical Findings:</h4>
            <p>Choice reaction time is systematically longer than simple reaction time, a principle known as Donders' subtraction method. Each additional stage of mental processing (e.g., choice, discrimination) adds measurable time to the response.</p>

            <h4 className="text-text-primary mt-4">Why it occurs:</h4>
            <p>Simple RT requires only detection of a stimulus, while choice RT adds a discrimination stage (identifying which stimulus appeared) and a response selection stage (mapping the stimulus to the correct key). Each additional processing stage contributes to the overall response latency.</p>

            <p className="mt-4 text-xs italic">Donders, F. C. (1868/1969). On the speed of mental processes. <em>Acta Psychologica, 30</em>, 412–431.</p>
          </div>
        </div>
      </ExperimentWrapper>
    );
  }

  const totalTrials = currentTest === 'simple' ? SIMPLE_TRIALS : CHOICE_TRIALS;

  return (
    <ExperimentWrapper experiment={experiment}>
      <div className="max-w-2xl mx-auto py-8">

        <div className="mb-12">
          <div className="h-1 bg-surface rounded overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${((trialIndex) / totalTrials) * 100}%` }}
            />
          </div>
          <p className="text-xs text-text-muted text-right mt-2 uppercase tracking-wide">
            {currentTest === 'simple' ? 'Phase 1' : 'Phase 2'} &bull; Trial {trialIndex + 1} / {totalTrials}
          </p>
        </div>

        <div className="flex flex-col items-center justify-center min-h-[300px] border-2 border-dashed border-border rounded bg-surface">
          {waiting && (
            <p className="text-text-muted text-xl">{t('exp.reactionTime.wait')}</p>
          )}
          {showStimulus && stimulus && (
            <span className="text-[8rem] leading-none text-text-primary">
              {stimulus}
            </span>
          )}
        </div>

        {currentTest === 'choice' && (
          <div className="mt-12">
            <div className="flex justify-center gap-6">
              {STIMULI.map((s, index) => (
                <button
                  key={s}
                  onClick={() => handleResponseInternal(KEYS[index])}
                  disabled={!showStimulus}
                  className="w-24 h-24 rounded border-2 border-border hover:border-primary transition-colors flex flex-col items-center justify-center gap-2 bg-white flex-shrink-0 disabled:opacity-50"
                >
                  <span className="text-4xl text-text-primary mb-1">{s}</span>
                  <span className="font-mono text-text-muted text-xs uppercase px-2 py-1 bg-surface rounded">
                    {KEYS[index]}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </ExperimentWrapper>
  );
}

export default ReactionTimeExperiment;
