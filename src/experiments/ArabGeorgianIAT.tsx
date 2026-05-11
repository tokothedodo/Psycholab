import React, { useState, useEffect, useRef, useCallback } from 'react';
import { type Experiment } from '../data/experiments';
import { ExperimentWrapper } from './ExperimentWrapper';

interface ArabGeorgianIATProps {
  experiment: Experiment;
  onComplete: (results: any) => void;
  participantId: string;
  roomId: string;
}

interface ParticipantMetadata {
  age: number;
  gender: string;
  explicit_pref: number | null;
  warmth_georgian: number | null;
  warmth_arab: number | null;
}

type Category = 'Arab Names' | 'Georgian Names' | 'Positive' | 'Negative';
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

const ARAB_NAMES = ['ამირ', 'ასან', 'ზეინ', 'ზაიდ', 'ესრა', 'აიშა', 'სარა', 'ალია'];
const GEORGIAN_NAMES = ['ლუკა', 'ნიკა', 'ვაჟა', 'ლაშა', 'ნინო', 'მარი', 'ნანა', 'დალი'];
const POSITIVE_WORDS = ['სიხარული', 'დიდება', 'მშვიდობა', 'იმედი', 'სიყვარული', 'მოგება', 'სიკეთე', 'ბედნიერი'];
const NEGATIVE_WORDS = ['ბოროტება', 'მარცხი', 'ომი', 'შიში', 'სიძულვილი', 'ტკივილი', 'საშინელი', 'უბედური'];
const shuffle = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

export const ArabGeorgianIAT: React.FC<ArabGeorgianIATProps> = ({
  experiment,
  onComplete,
  participantId,
  roomId,
}) => {
  const [block, setBlock] = useState(0); // 0 is initial instruction
  const [trialIndex, setTrialIndex] = useState(0);
  const [trials, setTrials] = useState<Trial[]>([]);
  const [showError, setShowError] = useState(false);
  const [condition, setCondition] = useState<'Group_A' | 'Group_B'>('Group_A');
  const [phase, setPhase] = useState<'age_check' | 'survey' | 'instructions' | 'test' | 'complete'>('age_check');
  const [dScore, setDScore] = useState<number>(0);
  const [metadata, setMetadata] = useState<ParticipantMetadata>({
    age: 0,
    gender: '',
    explicit_pref: null,
    warmth_georgian: null,
    warmth_arab: null,
  });
  const [ageError, setAgeError] = useState(false);

  const [isInterTrial, setIsInterTrial] = useState(false);

  const resultsRef = useRef<TrialResult[]>([]);
  const startTimeRef = useRef<number>(0);
  const firstKeyPressTimeRef = useRef<number | null>(null);
  const errorCountRef = useRef<number>(0);

  // Initialize condition randomly
  useEffect(() => {
    const randomGroup = Math.random() < 0.5 ? 'Group_A' : 'Group_B';
    setCondition(randomGroup);
  }, []);

  const getBlockMapping = useCallback((blockNum: number) => {
    // Labels (Georgian)
    let leftTargetLabel = "";
    let rightTargetLabel = "";

    // Internal Categories
    let leftTargetCat: Category = 'Georgian Names';
    let rightTargetCat: Category = 'Arab Names';

    if (condition === 'Group_A') {
      if (blockNum <= 4) {
        leftTargetLabel = "ქართული სახელები";
        rightTargetLabel = "არაბული სახელები";
        leftTargetCat = 'Georgian Names';
        rightTargetCat = 'Arab Names';
      } else {
        leftTargetLabel = "არაბული სახელები";
        rightTargetLabel = "ქართული სახელები";
        leftTargetCat = 'Arab Names';
        rightTargetCat = 'Georgian Names';
      }
    } else { // Group_B
      if (blockNum <= 4) {
        leftTargetLabel = "არაბული სახელები";
        rightTargetLabel = "ქართული სახელები";
        leftTargetCat = 'Arab Names';
        rightTargetCat = 'Georgian Names';
      } else {
        leftTargetLabel = "ქართული სახელები";
        rightTargetLabel = "არაბული სახელები";
        leftTargetCat = 'Georgian Names';
        rightTargetCat = 'Arab Names';
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
      case 5: // Reversed Target Practice
        blockTrials = getBalancedDeck(
          mapping.leftTargetCat === 'Arab Names' ? ARAB_NAMES : GEORGIAN_NAMES,
          mapping.leftTargetCat,
          'e',
          mapping.rightTargetCat === 'Arab Names' ? ARAB_NAMES : GEORGIAN_NAMES,
          mapping.rightTargetCat,
          'i',
          20
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

        // Strict Alternation: Name -> Word -> Name -> Word
        for (let i = 0; i < count; i++) {
          const isNameSlot = i % 2 === 0;
          if (isNameSlot) {
            const isLeft = Math.random() > 0.5;
            const cat = isLeft ? mapping.leftTargetCat : mapping.rightTargetCat;
            const pool = cat === 'Arab Names' ? ARAB_NAMES : GEORGIAN_NAMES;
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
    startTimeRef.current = performance.now();
    errorCountRef.current = 0;
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
        if ([3, 4].includes(block)) congruency = 'Congruent';
        else if ([6, 7].includes(block)) congruency = 'Incongruent';
      } else {
        if ([3, 4].includes(block)) congruency = 'Incongruent';
        else if ([6, 7].includes(block)) congruency = 'Congruent';
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
          startTimeRef.current = performance.now();
          firstKeyPressTimeRef.current = null;
          errorCountRef.current = 0;
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

  const finishExperiment = () => {
    const data = resultsRef.current;

    // Validation Checks
    const tooFastCount = data.filter(r => r.too_fast).length;
    const isInvalid = (tooFastCount / data.length) > 0.10;
    const totalErrors = data.filter(r => !r.is_correct).length;
    const isHighError = (totalErrors / data.length) > 0.25;

    // Filter valid trials for D-score calculation (exclude too_slow)
    const validData = data.filter(r => !r.too_slow);

    // D-score Calculation (Blocks 3, 4, 6, 7)
    const criticalBlocks = [3, 4, 6, 7];
    const criticalTrials = validData.filter(r => criticalBlocks.includes(r.block));

    let dScoreValue = 0;
    if (criticalTrials.length > 0) {
      const congruentTrials = criticalTrials.filter(r => r.congruency === 'Congruent');
      const incongruentTrials = criticalTrials.filter(r => r.congruency === 'Incongruent');

      const meanCong = congruentTrials.length > 0
        ? congruentTrials.reduce((acc, r) => acc + r.total_time, 0) / congruentTrials.length
        : 0;
      const meanIncong = incongruentTrials.length > 0
        ? incongruentTrials.reduce((acc, r) => acc + r.total_time, 0) / incongruentTrials.length
        : 0;

      // Pooled Standard Deviation
      const allTimes = criticalTrials.map(r => r.total_time);
      const n = allTimes.length;
      const meanAll = allTimes.reduce((acc, val) => acc + val, 0) / n;
      const variance = allTimes.reduce((acc, val) => acc + Math.pow(val - meanAll, 2), 0) / n;
      const pooledSD = Math.sqrt(variance);

      dScoreValue = pooledSD !== 0 ? (meanIncong - meanCong) / pooledSD : 0;
    }

    setDScore(Number(dScoreValue.toFixed(3)));

    const finalResults = {
      experimentId: experiment.id,
      participantId,
      roomId,
      condition, // Group_A or Group_B
      timestamp: new Date().toISOString(),
      d_score: Number(dScoreValue.toFixed(3)),
      is_valid: !isInvalid,
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
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-2 font-sans">Status</p>
            <p className={`text-xl font-bold ${isInvalid ? 'text-red-500' : 'text-green-600'}`}>
              {isInvalid ? 'Invalid Session' : 'Valid Session'}
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => window.location.reload()}
            className="bg-indigo-600 text-white px-12 py-4 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg"
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
    metadata.warmth_georgian !== null &&
    metadata.warmth_arab !== null;

  if (phase === 'age_check') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#F8F9FA] py-12 px-4 overflow-y-auto" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
        <div className="bg-white p-8 md:p-12 border-2 border-blue-100 shadow-sm max-w-3xl w-full">
          <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">ინფორმირებული თანხმობა</h2>

          <div className="space-y-4 text-gray-700 mb-8 text-sm leading-relaxed overflow-y-auto max-h-[45vh] pr-4 border-b pb-4">
            <p><strong>პროექტის დასახელება:</strong> სოციალური დამოკიდებულებების კვლევა.</p>

            <p><strong>კვლევის მიზანი:</strong> წინამდებარე ექსპერიმენტი მიზნად ისახავს სხვადასხვა სოციალურ ჯგუფებს შორის ასოციაციების სიჩქარის შესწავლას. ტესტი ეფუძნება იმპლიციტური ასოციაციის ტესტის (IAT) მეთოდოლოგიას.</p>

            <p><strong>პროცედურა:</strong> თქვენ მოგეთხოვებათ მოახდინოთ სიტყვებისა და სახელების კატეგორიზაცია "E" და "I" კლავიშების გამოყენებით. პროცესი დაახლოებით 5-10 წუთს გასტანს.</p>

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
                if (metadata.age >= 18) setPhase('survey');
                else setAgeError(true);
              }}
              className="w-full max-w-xs bg-indigo-600 text-white p-4 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg mt-2"
            >
              თანახმა ვარ
            </button>
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
              <label className="block text-lg font-bold mb-4">რამდენად ანიჭებთ უპირატესობას ქართველებს ან არაბებს?</label>
              <div className="flex justify-between text-xs text-gray-400 mb-2 font-sans px-2">
                <span>ქართველებს</span>
                <span>ნეიტრალური</span>
                <span>არაბებს</span>
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
                <label className="block text-lg font-bold mb-4">რამდენად თბილად ან ცივად განეწყობით ქართველების მიმართ?</label>
                <div className="flex justify-between text-xs text-gray-400 mb-2 font-sans">
                  <span>0 (ცივი)</span>
                  <span>10 (თბილი)</span>
                </div>
                <input
                  type="range" min="0" max="10" step="1"
                  className={`w-full accent-indigo-600 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer ${metadata.warmth_georgian === null ? 'opacity-30' : ''}`}
                  value={metadata.warmth_georgian ?? 5}
                  onChange={(e) => setMetadata(prev => ({ ...prev, warmth_georgian: parseInt(e.target.value) }))}
                />
                <div className="text-center mt-2 font-bold text-indigo-600 text-xl">
                  {metadata.warmth_georgian === null ? '---' : metadata.warmth_georgian}
                </div>
              </div>

              <div>
                <label className="block text-lg font-bold mb-4">რამდენად თბილად ან ცივად განეწყობით არაბების მიმართ?</label>
                <div className="flex justify-between text-xs text-gray-400 mb-2 font-sans">
                  <span>0 (ცივი)</span>
                  <span>10 (თბილი)</span>
                </div>
                <input
                  type="range" min="0" max="10" step="1"
                  className={`w-full accent-indigo-600 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer ${metadata.warmth_arab === null ? 'opacity-30' : ''}`}
                  value={metadata.warmth_arab ?? 5}
                  onChange={(e) => setMetadata(prev => ({ ...prev, warmth_arab: parseInt(e.target.value) }))}
                />
                <div className="text-center mt-2 font-bold text-indigo-600 text-xl">
                  {metadata.warmth_arab === null ? '---' : metadata.warmth_arab}
                </div>
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
                    <span className={part.includes('სახელები') ? 'text-green-600' : 'text-blue-600'}>{part}</span>
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
                    <span className={part.includes('სახელები') ? 'text-green-600' : 'text-blue-600'}>{part}</span>
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
                        <span className={`font-bold ${part.includes('სახელები') ? 'text-green-600' : 'text-blue-600'}`}>{part}</span>
                      </React.Fragment>
                    ))}.
                  </p>
                  <p>
                    მოათავსეთ მარჯვენა ხელის თითი <span className="font-bold">I</span> ღილაკზე იმ ერთეულებისთვის, რომლებიც მიეკუთვნება კატეგორიას {' '}
                    {currentInstructions.rightLabel.split(' ან ').map((part, i) => (
                      <React.Fragment key={i}>
                        {i > 0 && <span className="font-normal text-gray-400"> ან </span>}
                        <span className={`font-bold ${part.includes('სახელები') ? 'text-green-600' : 'text-blue-600'}`}>{part}</span>
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
                  <div className={`text-6xl font-medium ${(trials[trialIndex]?.category === 'Arab Names' || trials[trialIndex]?.category === 'Georgian Names')
                    ? 'text-green-600'
                    : 'text-blue-600'
                    }`}>
                    {trials[trialIndex]?.stimulus}
                  </div>
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

export default ArabGeorgianIAT;
