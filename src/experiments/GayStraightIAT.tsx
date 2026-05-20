import React, { useState, useEffect, useRef, useCallback } from 'react';
import { type Experiment } from '../data/experiments';
import { ExperimentWrapper } from './ExperimentWrapper';

interface GayStraightIATProps {
  experiment: Experiment;
  onComplete: (results: any) => void;
  participantId: string;
  roomId: string;
  isSubmitting?: boolean;
}

interface ParticipantMetadata {
  age: number;
  gender: string;
  explicit_pref: number | null;
  warmth_straight: number | null;
  warmth_gay: number | null;
}

type Category = 'Gay' | 'Straight' | 'Positive' | 'Negative';
type Key = 'e' | 'i';

interface Trial {
  stimulus: string;
  category: Category;
  correctKey: Key;
  block: number;
}

interface TrialResult {
  block: number;
  trial_idx: number;
  stimulus: string;
  category: string;
  latency: number;      // Time to FIRST keypress
  total_time: number;   // Time to CORRECT keypress
  is_correct: boolean;  // True if FIRST keypress was correct
  error_count: number;
  too_fast: boolean;    // latency < 300ms
  too_slow: boolean;    // latency > 10000ms
  congruency: 'Congruent' | 'Incongruent' | 'Practice';
}

const GAY_STIMULI = [
  'ჰომო ადამიანები',
  'ჰომო',
  'გეი',
  '/gaystraightiat/gay.png',
  '/gaystraightiat/lesbian.png'
];

const STRAIGHT_STIMULI = [
  'ჰეტერო',
  'ჰეტერო ადამიანები',
  '/gaystraightiat/hetero_1.png',
  '/gaystraightiat/hetero_2.png'
];

const POSITIVE_WORDS = ['სიხარული', 'ბედნიერება', 'ზეიმი', 'გართობა', 'სიყვარული', 'მოგება', 'სიკეთე', 'წარმატება'];
const NEGATIVE_WORDS = ['ბოროტება', 'მარცხი', 'სირცხვილი', 'შიში', 'სიძულვილი', 'ტკივილი', 'საშინელება', 'უბედურება'];

const shuffle = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

export const GayStraightIAT: React.FC<GayStraightIATProps> = ({
  experiment,
  onComplete,
  participantId,
  roomId,
  isSubmitting = false,
}) => {
  const [block, setBlock] = useState(0); // 0 is initial instruction
  const [trialIndex, setTrialIndex] = useState(0);
  const [trials, setTrials] = useState<Trial[]>([]);
  const [showError, setShowError] = useState(false);
  const [condition, setCondition] = useState<'Group_A' | 'Group_B'>('Group_A');
  const [phase, setPhase] = useState<'age_check' | 'text_explanation' | 'text_reading' | 'survey' | 'instructions' | 'test' | 'complete'>('age_check');
  const [expGroup, setExpGroup] = useState<'experimental' | 'control' | null>(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const [dScore, setDScore] = useState<number>(0);
  const [metadata, setMetadata] = useState<ParticipantMetadata>({
    age: 0,
    gender: '',
    explicit_pref: null,
    warmth_straight: null,
    warmth_gay: null,
  });
  const [ageError, setAgeError] = useState(false);

  const [isInterTrial, setIsInterTrial] = useState(false);

  const resultsRef = useRef<TrialResult[]>([]);
  const startTimeRef = useRef<number>(0);
  const firstKeyPressTimeRef = useRef<number | null>(null);
  const errorCountRef = useRef<number>(0);

  // Initialize condition randomly & preload images
  useEffect(() => {
    const randomGroup = Math.random() < 0.5 ? 'Group_A' : 'Group_B';
    setCondition(randomGroup);

    // Preload trial images to prevent flickering/alt-text on load
    const imagesToPreload = [
      '/gaystraightiat/gay.png',
      '/gaystraightiat/lesbian.png',
      '/gaystraightiat/hetero_1.png',
      '/gaystraightiat/hetero_2.png'
    ];
    imagesToPreload.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  // 30-second reading countdown timer
  useEffect(() => {
    if (phase !== 'text_reading') return;

    setTimeLeft(30);
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [phase]);

  const getBlockMapping = useCallback((blockNum: number) => {
    // Labels (Georgian)
    let leftTargetLabel = "";
    let rightTargetLabel = "";

    // Internal Categories
    let leftTargetCat: Category = 'Straight';
    let rightTargetCat: Category = 'Gay';

    if (condition === 'Group_A') {
      if (blockNum <= 4) {
        leftTargetLabel = "ჰეტერო";
        rightTargetLabel = "ჰომო";
        leftTargetCat = 'Straight';
        rightTargetCat = 'Gay';
      } else {
        leftTargetLabel = "ჰომო";
        rightTargetLabel = "ჰეტერო";
        leftTargetCat = 'Gay';
        rightTargetCat = 'Straight';
      }
    } else { // Group_B
      if (blockNum <= 4) {
        leftTargetLabel = "ჰომო";
        rightTargetLabel = "ჰეტერო";
        leftTargetCat = 'Gay';
        rightTargetCat = 'Straight';
      } else {
        leftTargetLabel = "ჰეტერო";
        rightTargetLabel = "ჰომო";
        leftTargetCat = 'Straight';
        rightTargetCat = 'Gay';
      }
    }

    const leftAttrLabel = "უარყოფითი";
    const rightAttrLabel = "დადებითი";
    const leftAttrCat: Category = 'Negative';
    const rightAttrCat: Category = 'Positive';

    let leftLabel = "";
    let rightLabel = "";

    switch (blockNum) {
      case 1:
      case 5:
        leftLabel = leftTargetLabel;
        rightLabel = rightTargetLabel;
        break;
      case 2:
        leftLabel = leftAttrLabel;
        rightLabel = rightAttrLabel;
        break;
      case 3:
      case 4:
      case 6:
      case 7:
        leftLabel = `${leftTargetLabel} ან ${leftAttrLabel}`;
        rightLabel = `${rightTargetLabel} ან ${rightAttrLabel}`;
        break;
    }

    return {
      leftLabel,
      rightLabel,
      leftTargetLabel,
      rightTargetLabel,
      leftAttrLabel,
      rightAttrLabel,
      leftTargetCat,
      rightTargetCat,
      leftAttrCat,
      rightAttrCat
    };
  }, [condition]);

  const generateBlockTrials = useCallback((blockNum: number): Trial[] => {
    const mapping = getBlockMapping(blockNum);
    let blockTrials: Trial[] = [];

    // Helper to get balanced, shuffled list from two categories
    const getBalancedDeck = (listA: string[], catA: Category, keyA: Key, listB: string[], catB: Category, keyB: Key, count: number) => {
      const deck: Trial[] = [];
      const halfCount = count / 2;

      const poolA = Array.from({ length: halfCount }, (_, i) => listA[i % listA.length]);
      const poolB = Array.from({ length: halfCount }, (_, i) => listB[i % listB.length]);

      poolA.forEach(s => deck.push({ stimulus: s, category: catA, correctKey: keyA, block: blockNum }));
      poolB.forEach(s => deck.push({ stimulus: s, category: catB, correctKey: keyB, block: blockNum }));

      return shuffle(deck);
    };

    switch (blockNum) {
      case 1: // Target Practice
        blockTrials = getBalancedDeck(
          mapping.leftTargetCat === 'Gay' ? GAY_STIMULI : STRAIGHT_STIMULI,
          mapping.leftTargetCat,
          'e',
          mapping.rightTargetCat === 'Gay' ? GAY_STIMULI : STRAIGHT_STIMULI,
          mapping.rightTargetCat,
          'i',
          20
        );
        break;
      case 5: // Reversed Target Practice
        blockTrials = getBalancedDeck(
          mapping.leftTargetCat === 'Gay' ? GAY_STIMULI : STRAIGHT_STIMULI,
          mapping.leftTargetCat,
          'e',
          mapping.rightTargetCat === 'Gay' ? GAY_STIMULI : STRAIGHT_STIMULI,
          mapping.rightTargetCat,
          'i',
          40
        );
        break;
      case 2: // Attribute Practice
        blockTrials = getBalancedDeck(NEGATIVE_WORDS, 'Negative', 'e', POSITIVE_WORDS, 'Positive', 'i', 20);
        break;
      case 3: // Combined Practice
      case 4: // Combined Test
      case 6: // Reversed Combined Practice
      case 7: // Reversed Combined Test
        const count = (blockNum === 3 || blockNum === 6) ? 20 : 40;

        // Strict Alternation: Name/Image -> Word -> Name/Image -> Word
        for (let i = 0; i < count; i++) {
          const isTargetSlot = i % 2 === 0;
          if (isTargetSlot) {
            const isLeft = Math.random() > 0.5;
            const cat = isLeft ? mapping.leftTargetCat : mapping.rightTargetCat;
            const pool = cat === 'Gay' ? GAY_STIMULI : STRAIGHT_STIMULI;
            const stimulus = pool[Math.floor(Math.random() * pool.length)];

            blockTrials.push({
              stimulus,
              category: cat,
              correctKey: isLeft ? 'e' : 'i',
              block: blockNum
            });
          } else {
            const isLeft = Math.random() > 0.5;
            const cat = isLeft ? mapping.leftAttrCat : mapping.rightAttrCat;
            const pool = cat === 'Negative' ? NEGATIVE_WORDS : POSITIVE_WORDS;
            const stimulus = pool[Math.floor(Math.random() * pool.length)];

            blockTrials.push({
              stimulus,
              category: cat,
              correctKey: isLeft ? 'e' : 'i',
              block: blockNum
            });
          }
        }
        break;
    }
    return blockTrials;
  }, [getBlockMapping]);

  const startNextBlock = useCallback(() => {
    const nextBlock = block + 1;
    if (nextBlock > 7) {
      finishExperiment();
      return;
    }
    const newTrials = generateBlockTrials(nextBlock);
    setTrials(newTrials);
    setTrialIndex(0);
    setBlock(nextBlock);
    setPhase('instructions');
  }, [block, generateBlockTrials]);

  const startTest = () => {
    setPhase('test');
  };

  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    if (phase === 'instructions') {
      if (e.code === 'Space') {
        if (block === 0) startNextBlock();
        else startTest();
      }
      return;
    }

    if (phase !== 'test' || isInterTrial) return;

    const key = e.key.toLowerCase();
    if (key !== 'e' && key !== 'i') return;

    const currentTrial = trials[trialIndex];
    const now = performance.now();
    const rt = now - startTimeRef.current;

    // Record the first keypress time if not already recorded
    if (firstKeyPressTimeRef.current === null) {
      firstKeyPressTimeRef.current = rt;
    }

    if (key === currentTrial.correctKey) {
      const latency = firstKeyPressTimeRef.current || rt;

      let congruency: 'Congruent' | 'Incongruent' | 'Practice' = 'Practice';
      if (condition === 'Group_A') {
        if ([3, 4].includes(block)) congruency = 'Incongruent';
        else if ([6, 7].includes(block)) congruency = 'Congruent';
      } else { // Group_B
        if ([3, 4].includes(block)) congruency = 'Congruent';
        else if ([6, 7].includes(block)) congruency = 'Incongruent';
      }

      resultsRef.current.push({
        block,
        trial_idx: trialIndex + 1,
        stimulus: currentTrial.stimulus,
        category: currentTrial.category,
        latency: Math.round(latency),
        total_time: Math.round(rt),
        is_correct: errorCountRef.current === 0,
        error_count: errorCountRef.current,
        too_fast: latency < 300,
        too_slow: latency > 10000,
        congruency,
      });

      setShowError(false);
      setIsInterTrial(true);

      setTimeout(() => {
        if (trialIndex + 1 < trials.length) {
          setTrialIndex(prev => prev + 1);
          setIsInterTrial(false);
        } else {
          setIsInterTrial(false);
          startNextBlock();
        }
      }, 250);

    } else {
      setShowError(true);
      errorCountRef.current += 1;
    }
  }, [phase, trials, trialIndex, block, isInterTrial, startNextBlock]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  // Precise stimulus onset synchronization
  useEffect(() => {
    if (phase === 'test' && !isInterTrial) {
      startTimeRef.current = performance.now();
      firstKeyPressTimeRef.current = null;
      errorCountRef.current = 0;
      setShowError(false);
    }
  }, [phase, isInterTrial, trialIndex, block]);

  const finishExperiment = () => {
    const data = resultsRef.current;

    // Validation Checks
    const tooFastCount = data.filter(r => r.too_fast).length;
    const isInvalid = (tooFastCount / data.length) > 0.10;
    const totalErrors = data.filter(r => !r.is_correct).length;
    const isHighError = (totalErrors / data.length) > 0.25;

    // Filter valid trials for D-score calculation (exclude too_slow > 10000ms)
    const validData = data.filter(r => !r.too_slow && r.total_time <= 10000);

    // 1. Calculate D_practice using practice blocks (3 and 6)
    const practiceBlocks = [3, 6];
    const practiceData = validData.filter(r => practiceBlocks.includes(r.block));

    const congruentPrac = practiceData.filter(r => r.congruency === 'Congruent');
    const incongruentPrac = practiceData.filter(r => r.congruency === 'Incongruent');

    const meanCongPrac = congruentPrac.length > 0 ? congruentPrac.reduce((a, r) => a + r.total_time, 0) / congruentPrac.length : 0;
    const meanIncongPrac = incongruentPrac.length > 0 ? incongruentPrac.reduce((a, r) => a + r.total_time, 0) / incongruentPrac.length : 0;

    const sdPrac = (() => {
      const times = practiceData.map(r => r.total_time);
      if (times.length === 0) return 0;
      const m = times.reduce((a, b) => a + b, 0) / times.length;
      return Math.sqrt(times.reduce((a, b) => a + Math.pow(b - m, 2), 0) / times.length);
    })();

    const dPractice = sdPrac !== 0 ? (meanIncongPrac - meanCongPrac) / sdPrac : 0;

    // 2. Calculate D_test using test blocks (4 and 7)
    const testBlocks = [4, 7];
    const testData = validData.filter(r => testBlocks.includes(r.block));

    const congruentTest = testData.filter(r => r.congruency === 'Congruent');
    const incongruentTest = testData.filter(r => r.congruency === 'Incongruent');

    const meanCongTest = congruentTest.length > 0 ? congruentTest.reduce((a, r) => a + r.total_time, 0) / congruentTest.length : 0;
    const meanIncongTest = incongruentTest.length > 0 ? incongruentTest.reduce((a, r) => a + r.total_time, 0) / incongruentTest.length : 0;

    const sdTest = (() => {
      const times = testData.map(r => r.total_time);
      if (times.length === 0) return 0;
      const m = times.reduce((a, b) => a + b, 0) / times.length;
      return Math.sqrt(times.reduce((a, b) => a + Math.pow(b - m, 2), 0) / times.length);
    })();

    const dTest = sdTest !== 0 ? (meanIncongTest - meanCongTest) / sdTest : 0;

    // 3. Final D Score
    const finalDScore = (dPractice + dTest) / 2;
    setDScore(Number(finalDScore.toFixed(3)));

    // 4. Specific Reaction Time Averages (Blocks 3, 4, 6, 7)
    // Identify block-to-pairing mapping based on condition
    const straightPosBlocks = condition === 'Group_A' ? [6, 7] : [3, 4];
    const straightNegBlocks = condition === 'Group_A' ? [3, 4] : [6, 7];
    const gayPosBlocks = condition === 'Group_A' ? [3, 4] : [6, 7];
    const gayNegBlocks = condition === 'Group_A' ? [6, 7] : [3, 4];

    const getPairingMean = (blocks: number[], targetCat: string, attrCat: string) => {
      const trials = validData.filter(r => blocks.includes(r.block) && (r.category === targetCat || r.category === attrCat));
      return trials.length > 0 ? trials.reduce((a, r) => a + r.total_time, 0) / trials.length : 0;
    };

    const mean_rt_straight_pos = getPairingMean(straightPosBlocks, 'Straight', 'Positive');
    const mean_rt_straight_neg = getPairingMean(straightNegBlocks, 'Straight', 'Negative');
    const mean_rt_gay_pos = getPairingMean(gayPosBlocks, 'Gay', 'Positive');
    const mean_rt_gay_neg = getPairingMean(gayNegBlocks, 'Gay', 'Negative');

    const calculatedDScore = Number(finalDScore.toFixed(3));
    const dExperiment = expGroup === 'experimental' ? calculatedDScore : '';
    const dControl = expGroup === 'control' ? calculatedDScore : '';

    const finalResults = {
      experimentId: experiment.id,
      participantId,
      roomId,
      condition,
      exp_group: expGroup,
      d_experiment: dExperiment,
      d_control: dControl,
      timestamp: new Date().toISOString(),
      d_score: calculatedDScore,
      d1: Number(dPractice.toFixed(3)),
      d2: Number(dTest.toFixed(3)),
      mean_rt_straight_positive: Math.round(mean_rt_straight_pos),
      mean_rt_straight_negative: Math.round(mean_rt_straight_neg),
      mean_rt_gay_positive: Math.round(mean_rt_gay_pos),
      mean_rt_gay_negative: Math.round(mean_rt_gay_neg),
      is_valid: !isInvalid && !isHighError,
      is_high_error: isHighError,
      too_fast_rate: Number((tooFastCount / data.length).toFixed(3)),
      participant_metadata: metadata,
      trial_data: data,
    };

    onComplete(finalResults);
    setPhase('complete');
  };

  const getInstructions = (blockNum: number) => {
    const mapping = getBlockMapping(blockNum);
    return {
      title: blockNum === 0 ? "ექსპერიმენტის დასაწყისი" : `ნაწილი ${blockNum} 7-დან`,
      leftLabel: mapping.leftLabel,
      rightLabel: mapping.rightLabel
    };
  };

  const isTarget = (part: string) => part !== 'დადებითი' && part !== 'უარყოფითი';

  if (phase === 'complete') {
    const data = resultsRef.current;
    const tooFastCount = data.filter(r => r.too_fast).length;
    const isInvalid = (tooFastCount / data.length) > 0.10;
    const totalErrors = data.filter(r => !r.is_correct).length;
    const errorRate = (totalErrors / data.length) * 100;

    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50 p-8 text-center" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
        <h2 className="text-4xl font-bold text-gray-900 mb-8">ექსპერიმენტი დასრულდა</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full mb-12">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-2 font-sans">D-Score</p>
            <p className="text-4xl font-black text-indigo-600">
              {dScore.toFixed(3)}
            </p>
          </div>
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-2 font-sans">Error Rate</p>
            <p className={`text-4xl font-black ${errorRate > 25 ? 'text-red-500' : 'text-green-600'}`}>
              {Math.round(errorRate)}%
            </p>
          </div>
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-2 font-sans">Data Status</p>
            <div className="flex flex-col items-center justify-center">
              {isSubmitting ? (
                <>
                  <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mb-2"></div>
                  <p className="text-sm font-bold text-indigo-600 animate-pulse">გადაგზავნა...</p>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-green-500 text-2xl">✓</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${isInvalid ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                      {isInvalid ? 'Invalid' : 'Valid'}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-green-600">შენახულია</p>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => window.location.href = '/'}
            disabled={isSubmitting}
            className={`px-12 py-4 rounded-xl font-bold transition-all shadow-lg ${isSubmitting
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
          >
            დასრულება
          </button>
        </div>
      </div>
    );
  }

  const currentInstructions = getInstructions(block);

  const isSurveyValid =
    metadata.gender !== '' &&
    metadata.explicit_pref !== null &&
    metadata.warmth_straight !== null &&
    metadata.warmth_gay !== null;

  if (phase === 'age_check') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#F8F9FA] py-12 px-4 overflow-y-auto" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
        <div className="bg-white p-8 md:p-12 border-2 border-blue-100 shadow-sm max-w-3xl w-full">
          <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">ინფორმირებული თანხმობა</h2>

          <div className="space-y-4 text-gray-700 mb-8 text-sm leading-relaxed overflow-y-auto max-h-[45vh] pr-4 border-b pb-4">
            <p><strong>კვლევის მიზანი:</strong> წინამდებარე ექსპერიმენტი მიზნად ისახავს სხვადასხვა სოციალურ ჯგუფებს შორის ასოციაციების სიჩქარის შესწავლას. ტესტი ეფუძნება იმპლიციტური ასოციაციის ტესტის (IAT) მეთოდოლოგიას.</p>

            <p><strong>პროცედურა:</strong> თქვენ მოგეთხოვებათ მოახდინოთ სიტყვებისა და გამოსახულებების კატეგორიზაცია "E" და "I" კლავიშების გამოყენებით. პროცესი დაახლოებით 5-10 წუთს გასტანს.</p>

            <div>
              <p><strong>კონფიდენციალურობა და მონაცემთა დაცვა:</strong></p>
              <ul className="list-disc pl-5 space-y-1">
                <li>თქვენი მონაწილეობა სრულიად ანონიმურია.</li>
                <li>მონაცემები გამოყენებული იქნება მხოლოდ აგრეგირებული (განზოგადებული) სახით სამეცნიერო მიზნებისთვის.</li>
                <li>თქვენ არ მოგეთხოვებათ პერსონალური საიდენტიფიკაციო ინფორმაციის (სახელი, გვარი, მისამართი) მითითება.</li>
              </ul>
            </div>

            <p><strong>ნებაყოფლობითობა:</strong> მონაწილეობა ნებაყოფლობითია. თქვენ გაქვთ უფლება შეწყვიტოთ ტესტირება ნებისმიერ დროს ბრაუზერის ფანჯრის დახურვით, ყოველგვარი ახსნა-განმარტების გარეშე.</p>

            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
              <p className="font-bold mb-2">თანხმობა:</p>
              <p>ექსპერიმენტის გაგრძელებით თქვენ ადასტურებთ, რომ:</p>
              <ul className="list-disc pl-5">
                <li>ხართ 18 წლის ან უფროსი.</li>
                <li>გაეცანით კვლევის პირობებს და თანახმა ხართ მონაწილეობაზე.</li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col items-center">
            <p className="mb-2 text-gray-600 font-bold">მიუთითეთ თქვენი ასაკი:</p>
            <input
              type="number"
              placeholder="ასაკი"
              className="w-24 p-3 border rounded-xl mb-2 text-center text-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              onChange={(e) => {
                const val = parseInt(e.target.value);
                setMetadata(prev => ({ ...prev, age: val }));
                if (val >= 18) setAgeError(false);
              }}
            />
            {ageError && <p className="text-red-500 mb-4 text-xs font-bold text-center">ბოდიში, ექსპერიმენტში მონაწილეობის მისაღებად უნდა იყოთ 18 წლის ან უფროსი.</p>}
            <button
              onClick={() => {
                if (metadata.age >= 18) {
                  setPhase('text_explanation');
                } else {
                  setAgeError(true);
                }
              }}
              className="w-full max-w-xs bg-indigo-600 text-white p-4 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg mt-2 cursor-pointer"
            >
              თანახმა ვარ
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'text_explanation') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#F8F9FA] py-12 px-4 overflow-y-auto" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
        <div className="bg-white p-8 md:p-12 border-2 border-blue-100 shadow-xl max-w-2xl w-full rounded-2xl relative overflow-hidden">
          <div className="flex justify-center mb-8 pb-4 border-b border-gray-100">
            <span className="text-xs uppercase tracking-widest text-black font-bold font-sans text-center">საინფორმაციო მასალა</span>
          </div>

          <div className="text-gray-800 text-lg leading-relaxed mb-10 text-justify font-normal pr-2">
            შემდეგ გვერდზე თქვენ გაგეცნობათ საინფორმაციო ტექსტი. გთხოვთ, ყურადღებით წაიკითხოთ იგი, რადგან ტექსტის წაკითხვამდე შემდეგ ეტაპზე გადასვლას ვერ შეძლებთ.
          </div>

          <div className="flex flex-col items-center border-t border-gray-100 pt-8">
            <button
              onClick={() => {
                const randomGroup = Math.random() < 0.5 ? 'experimental' : 'control';
                setExpGroup(randomGroup);
                setPhase('text_reading');
              }}
              className="w-full max-w-xs p-4 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-indigo-200 hover:shadow-xl transition-all duration-300 cursor-pointer shadow-lg flex items-center justify-center gap-2"
            >
              გასაგებია, გაგრძელება
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'text_reading') {
    const experimentalText = `ბოლო წლებში, საზოგადოების დიდი ნაწილი გამოხატავს შეშფოთებას ჰომო ადამიანების მიმართ. კრიტიკოსების აზრით, ჰომოსექსუალიზმის აქტიური პოპულარიზაცია სოციალურ ქსელებსა და მედიაში ნეგატიურ გავლენას ახდენს ტრადიციულ ოჯახურ ღირებულებებსა და ახალგაზრდების შეხედულებებზე. ზოგიერთი მიიჩნევს, რომ საზოგადოებაში ხელოვნურად იზრდება ზეწოლა განსხვავებული ცხოვრების წესის მიღებაზე, რაც უარყოფითად აისახება თანამედროვე თაობაზე. ასევე არსებობს მოსაზრება, რომ ჰომოსექსუალური თემის საკითხების ზედმეტად აქტიური განხილვა საზოგადოებაში დაპირისპირებასა და გაუცხოებას აძლიერებს. ამის გამო საზოგადოების გარკვეული ნაწილი ფიქრობს, რომ ტრადიციული სოციალური ნორმები თანდათან სუსტდება.`;
    const controlText = `ჰომოსექსუალობა ადამიანის სექსუალური ორიენტაციის ერთ-ერთი ფორმაა. თანამედროვე საზოგადოებაში სექსუალური ორიენტაციის საკითხები სხვადასხვა სოციალურ და კულტურულ კონტექსტში განიხილება. სხვადასხვა ქვეყანაში ჰომოსექსუალიზმთან დაკავშირებული კანონები, სოციალური დამოკიდებულებები და საჯარო პოლიტიკა ერთმანეთისგან განსხვავდება. ბოლო წლებში გაიზარდა კვლევების რაოდენობა, რომლებიც სექსუალური ორიენტაციის, სოციალური ურთიერთობებისა და საზოგადოებრივი დამოკიდებულებების საკითხებს შეისწავლის. მედია და სოციალური ქსელები მნიშვნელოვან როლს ასრულებენ ამ თემებთან დაკავშირებული ინფორმაციის გავრცელებაში.`;

    const textToShow = expGroup === 'experimental' ? experimentalText : controlText;

    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#F8F9FA] py-12 px-4 overflow-y-auto" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
        <div className="bg-white p-8 md:p-12 border-2 border-blue-100 shadow-xl max-w-3xl w-full rounded-2xl relative overflow-hidden">
          <div className="flex justify-center mb-8 pb-4 border-b border-gray-100">
            <span className="text-xs uppercase tracking-widest text-black font-bold font-sans text-center">საკითხავი მასალა</span>
          </div>

          <div className="text-gray-800 text-lg leading-relaxed mb-10 text-justify font-normal pr-2">
            „{textToShow}“
          </div>

          <div className="flex flex-col items-center border-t border-gray-100 pt-8">
            <button
              disabled={timeLeft > 0}
              onClick={() => {
                setPhase('survey');
              }}
              className={`w-full max-w-xs p-4 rounded-xl font-bold transition-all duration-300 shadow-lg flex items-center justify-center gap-2 ${timeLeft > 0
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-indigo-200 hover:shadow-xl cursor-pointer'
                }`}
            >
              {timeLeft > 0 ? (
                <>
                  <span>გავეცანი, გაგრძელება</span>
                  <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full text-xs font-bold font-sans ml-1">
                    {timeLeft}წმ
                  </span>
                </>
              ) : (
                'გავეცანი, გაგრძელება'
              )}
            </button>
            {timeLeft > 0 && (
              <p className="text-xs text-gray-400 mt-3 font-sans">გთხოვთ, ყურადღებით წაიკითხოთ ტექსტი გაგრძელებამდე.</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'survey') {
    return (
      <div className="w-full min-h-screen bg-[#F8F9FA] flex flex-col items-center pt-24 pb-12 px-4" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
        <div className="bg-white p-12 border-2 border-blue-100 shadow-sm max-w-3xl w-full">
          <h2 className="text-2xl font-bold mb-10 text-center text-gray-800">კითხვარი</h2>

          <div className="space-y-10">
            {/* Gender */}
            <div>
              <label className="block text-lg font-bold mb-3">სქესი</label>
              <select
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                value={metadata.gender}
                onChange={(e) => setMetadata(prev => ({ ...prev, gender: e.target.value }))}
              >
                <option value="">აირჩიეთ...</option>
                <option value="Male">მამრობითი</option>
                <option value="Female">მდედრობითი</option>
                <option value="Non-binary">არაბინარული</option>
                <option value="Prefer not to say">არ მსურს პასუხის გაცემა</option>
              </select>
            </div>

            {/* Explicit Preference */}
            <div>
              <label className="block text-lg font-bold mb-4">რამდენად ანიჭებთ უპირატესობას ჰეტეროებს ან ჰომოებს?</label>
              <div className="flex justify-between text-xs text-gray-400 mb-2 font-sans px-2">
                <span>ჰეტეროებს</span>
                <span>ნეიტრალური</span>
                <span>ჰომოებს</span>
              </div>
              <input
                type="range" min="1" max="7" step="1"
                className={`w-full accent-indigo-600 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer ${metadata.explicit_pref === null ? 'opacity-30' : ''}`}
                value={metadata.explicit_pref || 4}
                onChange={(e) => setMetadata(prev => ({ ...prev, explicit_pref: parseInt(e.target.value) }))}
              />
              <div className="flex justify-between px-1 mt-2 text-sm font-bold text-indigo-600">
                {[1, 2, 3, 4, 5, 6, 7].map(n => (
                  <span key={n} className={metadata.explicit_pref === n ? 'scale-125 underline' : 'opacity-40'}>{n}</span>
                ))}
              </div>
            </div>

            {/* Feeling Thermometers */}
            <div className="space-y-8">
              <div>
                <label className="block text-lg font-bold mb-4">რამდენად დადებითად ან უარყოფითად განეწყობით ჰეტეროების მიმართ?</label>
                <div className="flex justify-between text-xs text-gray-400 mb-2 font-sans">
                  <span>0 (უარყოფითად)</span>
                  <span>100 (დადებითად)</span>
                </div>
                <input
                  type="range" min="0" max="100" step="1"
                  className={`w-full accent-indigo-600 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer ${metadata.warmth_straight === null ? 'opacity-30' : ''}`}
                  value={metadata.warmth_straight ?? 50}
                  onChange={(e) => setMetadata(prev => ({ ...prev, warmth_straight: parseInt(e.target.value) }))}
                />
              </div>

              <div>
                <label className="block text-lg font-bold mb-4">რამდენად დადებითად ან უარყოფითად განეწყობით ჰომოების მიმართ?</label>
                <div className="flex justify-between text-xs text-gray-400 mb-2 font-sans">
                  <span>0 (უარყოფითად)</span>
                  <span>100 (დადებითად)</span>
                </div>
                <input
                  type="range" min="0" max="100" step="1"
                  className={`w-full accent-indigo-600 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer ${metadata.warmth_gay === null ? 'opacity-30' : ''}`}
                  value={metadata.warmth_gay ?? 50}
                  onChange={(e) => setMetadata(prev => ({ ...prev, warmth_gay: parseInt(e.target.value) }))}
                />
              </div>
            </div>
          </div>

          <button
            disabled={!isSurveyValid}
            onClick={() => {
              const firstBlockTrials = generateBlockTrials(1);
              setTrials(firstBlockTrials);
              setBlock(1);
              setPhase('instructions');
            }}
            className={`w-full mt-12 p-4 rounded-xl font-bold transition-all ${isSurveyValid ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
          >
            ექსპერიმენტის დაწყება
          </button>
        </div>
      </div>
    );
  }

  const mapping = getBlockMapping(block);

  return (
    <ExperimentWrapper experiment={experiment}>
      <div className="w-full h-screen bg-[#F8F9FA] flex items-center justify-center select-none overflow-hidden" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
        <div className="bg-white w-[95%] max-w-5xl h-[85vh] border-2 border-blue-100 flex flex-col shadow-sm relative p-12">
          {/* Header Labels */}
          <div className="flex justify-between w-full font-bold">
            <div className="text-left">
              <div className="text-[11px] text-gray-400 mb-2 uppercase tracking-tighter">დააჭირეთ 'E' ღილაკს</div>
              <div className="text-3xl">
                {mapping.leftLabel.split(' ან ').map((part, i) => (
                  <div key={i} className="text-center">
                    {i > 0 && <div className="text-gray-300 text-xs uppercase font-normal my-0">ან</div>}
                    <span className={isTarget(part) ? 'text-green-600' : 'text-blue-600'}>{part}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-gray-400 mb-2 uppercase tracking-tighter">დააჭირეთ 'I' ღილაკს</div>
              <div className="text-3xl text-center">
                {mapping.rightLabel.split(' ან ').map((part, i) => (
                  <div key={i}>
                    {i > 0 && <div className="text-gray-300 text-xs uppercase font-normal my-0">ან</div>}
                    <span className={isTarget(part) ? 'text-green-600' : 'text-blue-600'}>{part}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col items-center justify-center relative">
            {phase === 'instructions' ? (
              <div className="max-w-3xl w-full flex flex-col items-center">
                <h2 className="text-xl font-medium underline mb-12">
                  {currentInstructions.title}
                </h2>

                <div className="space-y-6 text-lg text-gray-900 text-left w-full leading-snug">
                  <p>
                    მოათავსეთ მარცხენა ხელის თითი <span className="font-bold">E</span> ღილაკზე იმ ერთეულებისთვის, რომლებიც მიეკუთვნება კატეგორიას {' '}
                    {currentInstructions.leftLabel.split(' ან ').map((part, i) => (
                      <React.Fragment key={i}>
                        {i > 0 && <span className="font-normal text-gray-400"> ან </span>}
                        <span className={`font-bold ${isTarget(part) ? 'text-green-600' : 'text-blue-600'}`}>{part}</span>
                      </React.Fragment>
                    ))}.
                  </p>
                  <p>
                    მოათავსეთ მარჯვენა ხელის თითი <span className="font-bold">I</span> ღილაკზე იმ ერთეულებისთვის, რომლებიც მიეკუთვნება კატეგორიას {' '}
                    {currentInstructions.rightLabel.split(' ან ').map((part, i) => (
                      <React.Fragment key={i}>
                        {i > 0 && <span className="font-normal text-gray-400"> ან </span>}
                        <span className={`font-bold ${isTarget(part) ? 'text-green-600' : 'text-blue-600'}`}>{part}</span>
                      </React.Fragment>
                    ))}.
                  </p>
                  <p>
                    თუ დაუშვებთ შეცდომას, გამოჩნდება წითელი <span className="text-red-600 font-bold">X</span>. გასაგრძელებლად დააჭირეთ მეორე ღილაკს.
                    <br />
                    <span className="underline italic">იმუშავეთ რაც შეიძლება სწრაფად</span> და ზუსტად.
                  </p>
                </div>

                <div className="mt-16 text-xl">
                  დააჭირეთ <span className="font-bold uppercase tracking-widest">'Space' (ჰარის)</span> ღილაკს, როდესაც მზად იქნებით დასაწყებად.
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center relative -translate-y-12">
                {!isInterTrial && (
                  trials[trialIndex]?.stimulus.endsWith('.png') ? (
                    <img
                      src={trials[trialIndex]?.stimulus}
                      alt=""
                      className="w-48 h-48 object-contain bg-white rounded-lg shadow-sm border border-gray-100 p-2"
                    />
                  ) : (
                    <div className={`text-6xl font-medium ${(trials[trialIndex]?.category === 'Gay' || trials[trialIndex]?.category === 'Straight')
                      ? 'text-green-600'
                      : 'text-blue-600'
                      }`}>
                      {trials[trialIndex]?.stimulus}
                    </div>
                  )
                )}

                {/* Error Feedback */}
                <div className={`absolute top-full mt-8 text-8xl font-black text-red-600 ${showError ? 'block' : 'hidden'}`}>
                  X
                </div>
              </div>
            )}
          </div>

          {/* Footer / Keys Hint */}
          {phase === 'test' && (
            <div className="p-4 text-center text-sm font-medium text-gray-400 opacity-60">
              თუ დაუშვებთ შეცდომას, გამოჩნდება წითელი <span className="text-red-600 font-bold">X</span>. გასაგრძელებლად დააჭირეთ მეორე ღილაკს.
            </div>
          )}
        </div>
      </div>

      <style>{`
        body { background: #F8F9FA; }
        .navbar { display: none !important; }
      `}</style>
    </ExperimentWrapper>
  );
};

export default GayStraightIAT;
