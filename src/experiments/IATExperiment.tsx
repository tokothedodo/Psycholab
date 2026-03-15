import { useState, useCallback, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ExperimentWrapper } from './ExperimentWrapper';
import { useExperiment } from '../hooks/useExperiment';
import { useTimer } from '../hooks/useTimer';
import { fisherYatesShuffle } from '../lib/random';
import type { Experiment } from '../data/experiments';

interface IATProps {
  experiment: Experiment;
  onComplete: (results: any) => void;
  participantId: string;
  roomId: string;
}

// Word Categories
const WORDS = {
  Flowers: ['Rose', 'Daisy', 'Tulip', 'Lily', 'Orchid', 'Sunflower', 'Lotus', 'Violet'],
  Insects: ['Bug', 'Ant', 'Spider', 'Fly', 'Wasp', 'Mosquito', 'Beetle', 'Roach'],
  Good: ['Joy', 'Love', 'Peace', 'Happy', 'Smile', 'Friend', 'Pleasure', 'Laugh'],
  Bad: ['Evil', 'Hate', 'Hurt', 'Angry', 'Death', 'Poison', 'Grief', 'Tears']
};

interface BlockDef {
  left: ('Flowers' | 'Insects' | 'Good' | 'Bad')[];
  right: ('Flowers' | 'Insects' | 'Good' | 'Bad')[];
  trials: number;
  isPractice: boolean;
}

const BLOCKS: BlockDef[] = [
  { left: ['Flowers'], right: ['Insects'], trials: 20, isPractice: true },
  { left: ['Good'], right: ['Bad'], trials: 20, isPractice: true },
  { left: ['Flowers', 'Good'], right: ['Insects', 'Bad'], trials: 20, isPractice: true },
  { left: ['Flowers', 'Good'], right: ['Insects', 'Bad'], trials: 40, isPractice: false },
  { left: ['Insects'], right: ['Flowers'], trials: 40, isPractice: true },
  { left: ['Insects', 'Good'], right: ['Flowers', 'Bad'], trials: 20, isPractice: true },
  { left: ['Insects', 'Good'], right: ['Flowers', 'Bad'], trials: 40, isPractice: false }
];

export function IATExperiment({ experiment, onComplete, participantId, roomId }: IATProps) {
  const { t, language } = useLanguage();

  const [blockIndex, setBlockIndex] = useState(0);
  const [trialInBlock, setTrialInBlock] = useState(0);
  const [stimulusSequence, setStimulusSequence] = useState<{ word: string, category: string }[]>([]);
  const [showError, setShowError] = useState(false);
  const [initialRtMs, setInitialRtMs] = useState<number | null>(null);

  const {
    phase,
    setPhase,
    trialData,
    recordTrial,
    finishExperiment
  } = useExperiment({ experiment, participantId, roomId, language, onComplete });

  const { startTimer, getResponseTime, clearTimer } = useTimer();

  const generateBlockStimuli = useCallback((block: BlockDef) => {
    let pool: { word: string, category: string }[] = [];
    const categoriesToUse = [...block.left, ...block.right];

    categoriesToUse.forEach(cat => {
      WORDS[cat].forEach(word => {
        pool.push({ word, category: cat });
      });
    });

    let sequence: { word: string, category: string }[] = [];
    while (sequence.length < block.trials) {
      sequence = sequence.concat(fisherYatesShuffle([...pool]));
    }
    setStimulusSequence(sequence.slice(0, block.trials));
  }, []);

  const handleStartBlock = () => {
    generateBlockStimuli(BLOCKS[blockIndex]);
    setTrialInBlock(0);
    setShowError(false);
    setInitialRtMs(null);
    setPhase('test');
    startTimer();
  };

  const currentBlock = BLOCKS[blockIndex];
  const currentStimulus = stimulusSequence[trialInBlock];

  const handleKeyPress = useCallback((e: globalThis.KeyboardEvent) => {
    if (phase !== 'test' || !currentStimulus) return;

    const isE = e.key.toLowerCase() === 'e';
    const isI = e.key.toLowerCase() === 'i';

    if (!isE && !isI) return;

    const rt = getResponseTime() || 0;

    const isLeftTarget = currentBlock.left.includes(currentStimulus.category as any);
    const isRightTarget = currentBlock.right.includes(currentStimulus.category as any);

    const isCorrect = (isE && isLeftTarget) || (isI && isRightTarget);

    if (!isCorrect) {
      if (!showError) {
        setInitialRtMs(rt);
        setShowError(true);
      }
      return; // Must correct the error before advancing
    }

    // Correct response given
    const finalRt = initialRtMs !== null ? initialRtMs : rt; // Record latency of first response according to Greenwald 2003

    recordTrial({
      trialNumber: trialData.length + 1,
      responseTimeMs: finalRt,
      answer: isE ? 'left' : 'right',
      correctAnswer: isLeftTarget ? 'left' : 'right',
      stimulus: {
        block: blockIndex + 1,
        isPractice: currentBlock.isPractice,
        word: currentStimulus.word,
        category: currentStimulus.category,
        madeError: showError
      }
    });

    clearTimer();
    setShowError(false);
    setInitialRtMs(null);

    if (trialInBlock < currentBlock.trials - 1) {
      setTrialInBlock(prev => prev + 1);
      startTimer();
    } else {
      if (blockIndex < BLOCKS.length - 1) {
        setBlockIndex(prev => prev + 1);
        setPhase('instruction');
      } else {
        // Calculate standard D-score approximation if needed
        const testBlock1 = trialData.filter(t => (t.stimulus as any).block === 4);
        const testBlock2 = trialData.filter(t => (t.stimulus as any).block === 7);
        const avgB1 = testBlock1.reduce((sum, t) => sum + t.responseTimeMs, 0) / Math.max(testBlock1.length, 1);
        const avgB2 = testBlock2.reduce((sum, t) => sum + t.responseTimeMs, 0) / Math.max(testBlock2.length, 1);

        // Positive score typically means faster on block 3/4 (Flowers+Good) vs block 6/7 (Insects+Good)
        // Which means implicit preference for Flowers over Insects
        const diff = avgB2 - avgB1;

        setPhase('complete');
        finishExperiment(JSON.stringify({ diff_ms: diff, avgB1, avgB2 }), 100);
      }
    }
  }, [phase, currentStimulus, currentBlock, getResponseTime, initialRtMs, showError, trialData, blockIndex, trialInBlock, recordTrial, clearTimer, startTimer, setPhase, finishExperiment]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  if (phase === 'instruction' || phase === 'ready') {
    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="bg-white border border-border rounded p-8 max-w-2xl mx-auto">
          <h2 className="mb-6">{t('exp.iat.name')} - Block {blockIndex + 1} of 7</h2>

          <div className="experiment-instruction mb-8">
            <p className="mb-4">
              In this block, you will categorize words as quickly as possible.
            </p>

            <div className="bg-surface border border-border p-6 rounded mb-6 mt-8 flex justify-between text-center items-center">
              <div className="flex flex-col gap-2">
                <span className="kb-key mx-auto w-12 h-12 flex items-center justify-center text-xl">E</span>
                <div className="font-bold text-lg text-primary">
                  {BLOCKS[blockIndex].left.map(cat => (
                    <div key={cat} className={cat === 'Good' || cat === 'Bad' ? 'text-success-600' : ''}>{cat}</div>
                  ))}
                </div>
              </div>
              <div className="text-text-muted font-bold text-xl">VS</div>
              <div className="flex flex-col gap-2">
                <span className="kb-key mx-auto w-12 h-12 flex items-center justify-center text-xl">I</span>
                <div className="font-bold text-lg text-primary">
                  {BLOCKS[blockIndex].right.map(cat => (
                    <div key={cat} className={cat === 'Good' || cat === 'Bad' ? 'text-success-600' : ''}>{cat}</div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-info/10 border border-info/20 p-4 rounded text-info-900 text-sm">
              <ul className="list-disc pl-5 space-y-2 font-medium">
                <li>Put your left index finger on the <strong>E</strong> key and right index finger on the <strong>I</strong> key.</li>
                <li>Words will appear in the center. Press the key corresponding to the correct category.</li>
                <li>Go as fast as you can while being accurate.</li>
                <li>If you make a mistake, a red <span className="text-error font-bold">X</span> will appear. You must press the correct key to continue.</li>
              </ul>
            </div>
          </div>

          <button onClick={handleStartBlock} className="btn-primary w-full">
            Start Block {blockIndex + 1}
          </button>
        </div>
      </ExperimentWrapper>
    );
  }

  if (phase === 'complete') {
    // Quick parse for debrief feedback
    const block4Avg = trialData.filter(t => (t.stimulus as any).block === 4).reduce((s, t) => s + t.responseTimeMs, 0) / 40;
    const block7Avg = trialData.filter(t => (t.stimulus as any).block === 7).reduce((s, t) => s + t.responseTimeMs, 0) / 40;
    const diff = block7Avg - block4Avg;
    const preference = diff > 100 ? "Flowers" : diff < -100 ? "Insects" : "No strong preference";

    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="bg-white border border-border rounded p-8 max-w-2xl mx-auto">
          <h2 className="mb-6">{t('common.debrief.title')}</h2>

          <div className="bg-success/10 border-l-4 border-success p-4 mb-6">
            <p className="text-success-800 font-medium">{t('common.debrief.thankYou')}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-surface p-4 rounded border border-border text-center">
              <p className="text-sm font-bold text-text-muted mb-2">Flowers+Good / Insects+Bad</p>
              <p className="text-3xl font-bold text-primary mb-1">{Math.round(block4Avg || 0)}ms</p>
              <p className="text-xs text-text-muted">Average Response Time</p>
            </div>
            <div className="bg-surface p-4 rounded border border-border text-center">
              <p className="text-sm font-bold text-text-muted mb-2">Insects+Good / Flowers+Bad</p>
              <p className="text-3xl font-bold text-primary mb-1">{Math.round(block7Avg || 0)}ms</p>
              <p className="text-xs text-text-muted">Average Response Time</p>
            </div>
          </div>

          <div className="bg-info/10 border border-info/20 p-6 rounded mb-8 text-info-900 text-sm">
            <h3 className="font-bold mb-2">Your Results</h3>
            <p>
              You were faster when pairing <strong>Flowers with Good</strong> than Insects with Good by {Math.abs(Math.round(diff || 0))}ms.
              This suggests an automatic implicit preference for: <strong>{preference}</strong>.
            </p>
          </div>

          <div className="prose prose-sm text-text-secondary">
            <h4 className="text-text-primary">What this experiment measures:</h4>
            <p>
              The IAT measures the strength of associations between concepts (e.g., Flowers/Insects) and evaluations (e.g., Good/Bad).
              The main idea is that making a response is easier and faster when closely related items share the same response key.
            </p>
            <p className="mt-4 text-xs italic">{t('citation')}: Greenwald, McGhee, & Schwartz (1998); Greenwald et al. (2003)</p>
          </div>
        </div>
      </ExperimentWrapper>
    );
  }

  // TEST PHASE
  const catLeft = currentBlock?.left || [];
  const catRight = currentBlock?.right || [];

  return (
    <ExperimentWrapper experiment={experiment}>
      <div className="max-w-4xl mx-auto py-8">
        <div className="mb-2">
          <div className="h-1 bg-surface rounded overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${((trialInBlock) / currentBlock?.trials) * 100}%` }}
            />
          </div>
          <div className="flex justify-between items-center mt-2">
            <span className="text-xs text-text-muted font-medium uppercase tracking-wider">
              Block {blockIndex + 1} / 7
            </span>
            <span className="text-xs text-text-muted font-medium uppercase tracking-wider">
              Trial {trialInBlock + 1} / {currentBlock?.trials}
            </span>
          </div>
        </div>

        {/* Labels Map */}
        <div className="flex justify-between items-start mt-8 mb-16 px-8">
          <div className="flex flex-col items-start gap-1">
            <div className="text-sm font-bold text-text-muted mb-2">Press E</div>
            {catLeft.map(cat => (
              <div key={cat} className={`text-2xl font-black ${cat === 'Good' || cat === 'Bad' ? 'text-success-600' : 'text-primary'}`}>
                {cat}
              </div>
            ))}
          </div>

          <div className="flex flex-col items-end gap-1">
            <div className="text-sm font-bold text-text-muted mb-2">Press I</div>
            {catRight.map(cat => (
              <div key={cat} className={`text-2xl font-black ${cat === 'Good' || cat === 'Bad' ? 'text-success-600' : 'text-primary'}`}>
                {cat}
              </div>
            ))}
          </div>
        </div>

        {/* Stimulus */}
        <div className="flex flex-col items-center justify-center min-h-[300px] relative">
          {showError && (
            <div className="absolute top-10 text-6xl font-bold text-error">X</div>
          )}
          <div className={`text-6xl font-bold tracking-tight ${currentStimulus?.category === 'Good' || currentStimulus?.category === 'Bad' ? 'text-success-600' : 'text-text-primary'}`}>
            {currentStimulus?.word}
          </div>
        </div>
      </div>
    </ExperimentWrapper>
  );
}

export default IATExperiment;
