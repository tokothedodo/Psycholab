import React, { useState, useEffect, useRef, useCallback } from 'react';
import { type Experiment } from '../data/experiments';
import { ExperimentWrapper } from './ExperimentWrapper';
import { useLanguage } from '../context/LanguageContext';

interface ArabGeorgianIATProps {
  experiment: Experiment;
  onComplete: (results: any) => void;
  participantId: string;
  roomId: string;
}

interface ParticipantMetadata {
  age: number;
  gender: string;
  explicit_pref: number;
  warmth_georgian: number;
  warmth_arab: number;
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
}

const ARAB_NAMES = ['მუჰამედი', 'აჰმედი', 'ალი', 'ომარი', 'ფატიმა', 'აიშა', 'ზეინაბი', 'ლეილა'];
const GEORGIAN_NAMES = ['გიორგი', 'დავითი', 'ლუკა', 'ნიკოლოზი', 'ნინო', 'მარიამი', 'ანა', 'ელენე'];
const POSITIVE_WORDS = ['ბედნიერება', 'სიყვარული', 'სიხარული', 'მშვიდობა', 'დიდება', 'მეგობრობა', 'მოგება', 'სიამოვნება'];
const NEGATIVE_WORDS = ['ბოროტება', 'ტკივილი', 'მარცხი', 'საშინელება', 'სიძულვილი', 'უბედურება', 'შიში', 'განრისხება'];

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
  const { t } = useLanguage();
  const [block, setBlock] = useState(0); // 0 is initial instruction
  const [trialIndex, setTrialIndex] = useState(0);
  const [trials, setTrials] = useState<Trial[]>([]);
  const [showError, setShowError] = useState(false);
  const [phase, setPhase] = useState<'age_check' | 'survey' | 'instructions' | 'test' | 'complete'>('age_check');
  const [dScore, setDScore] = useState<number>(0);
  const [metadata, setMetadata] = useState<ParticipantMetadata>({
    age: 0,
    gender: '',
    explicit_pref: 4,
    warmth_georgian: 5,
    warmth_arab: 5,
  });
  const [ageError, setAgeError] = useState(false);
  
  const [isInterTrial, setIsInterTrial] = useState(false);
  
  const resultsRef = useRef<TrialResult[]>([]);
  const startTimeRef = useRef<number>(0);
  const firstKeyPressTimeRef = useRef<number | null>(null);
  const errorCountRef = useRef<number>(0);

  const generateBlockTrials = useCallback((blockNum: number): Trial[] => {
    let blockTrials: Trial[] = [];
    
    // Helper to get balanced, shuffled list from two categories
    const getBalancedDeck = (listA: string[], catA: Category, listB: string[], catB: Category, count: number) => {
      const deck: Trial[] = [];
      const halfCount = count / 2;
      
      // Create pools of 8, repeated as needed to reach halfCount
      const poolA = Array.from({ length: halfCount }, (_, i) => listA[i % listA.length]);
      const poolB = Array.from({ length: halfCount }, (_, i) => listB[i % listB.length]);
      
      poolA.forEach(s => deck.push({ stimulus: s, category: catA, correctKey: 'e', block: blockNum }));
      poolB.forEach(s => deck.push({ stimulus: s, category: catB, correctKey: 'i', block: blockNum }));
      
      return shuffle(deck);
    };

    switch (blockNum) {
      case 1: // Target Practice
        blockTrials = getBalancedDeck(ARAB_NAMES, 'Arab Names', GEORGIAN_NAMES, 'Georgian Names', 20);
        break;
      case 2: // Attribute Practice
        // Bad (Left/E), Good (Right/I)
        blockTrials = getBalancedDeck(NEGATIVE_WORDS, 'Negative', POSITIVE_WORDS, 'Positive', 20);
        break;
      case 3: // Combined Practice
      case 4: // Combined Test
      case 6: // Reversed Combined Practice
      case 7: // Reversed Combined Test
        const count = (blockNum === 3 || blockNum === 6) ? 20 : 40;
        const namePoolA = ARAB_NAMES;
        const namePoolB = GEORGIAN_NAMES;
        const wordPoolA = NEGATIVE_WORDS;
        const wordPoolB = POSITIVE_WORDS;
        
        // Strict Alternation: Name -> Word -> Name -> Word
        for (let i = 0; i < count; i++) {
          const isNameSlot = i % 2 === 0;
          if (isNameSlot) {
            const isArab = Math.random() > 0.5;
            const stimulus = isArab ? namePoolA[Math.floor(Math.random() * namePoolA.length)] : namePoolB[Math.floor(Math.random() * namePoolB.length)];
            let correctKey: Key = isArab ? 'e' : 'i';
            if (blockNum >= 5) correctKey = (correctKey === 'e' ? 'i' : 'e'); // Reverse for 5, 6, 7
            blockTrials.push({ 
              stimulus, 
              category: isArab ? 'Arab Names' : 'Georgian Names', 
              correctKey, 
              block: blockNum 
            });
          } else {
            const isNegative = Math.random() > 0.5;
            const stimulus = isNegative ? wordPoolA[Math.floor(Math.random() * wordPoolA.length)] : wordPoolB[Math.floor(Math.random() * wordPoolB.length)];
            const correctKey: Key = isNegative ? 'e' : 'i';
            blockTrials.push({ 
              stimulus, 
              category: isNegative ? 'Negative' : 'Positive', 
              correctKey, 
              block: blockNum 
            });
          }
        }
        break;
      case 5: // Reversed Target Practice
        blockTrials = getBalancedDeck(GEORGIAN_NAMES, 'Georgian Names', ARAB_NAMES, 'Arab Names', 20);
        // Note: getBalancedDeck handles the key reversal for block 5
        break;
    }
    return blockTrials;
  }, []);

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
    
    let dScore = 0;
    if (criticalTrials.length > 0) {
      const compatibleTrials = criticalTrials.filter(r => [3, 4].includes(r.block));
      const incompatibleTrials = criticalTrials.filter(r => [6, 7].includes(r.block));
      
      const meanComp = compatibleTrials.reduce((acc, r) => acc + r.total_time, 0) / compatibleTrials.length;
      const meanIncomp = incompatibleTrials.reduce((acc, r) => acc + r.total_time, 0) / incompatibleTrials.length;
      
      // Pooled Standard Deviation
      const allTimes = criticalTrials.map(r => r.total_time);
      const n = allTimes.length;
      const meanAll = allTimes.reduce((acc, val) => acc + val, 0) / n;
      const variance = allTimes.reduce((acc, val) => acc + Math.pow(val - meanAll, 2), 0) / n;
      const pooledSD = Math.sqrt(variance);
      
      dScore = pooledSD !== 0 ? (meanIncomp - meanComp) / pooledSD : 0;
    }

    setDScore(Number(dScore.toFixed(3)));

    const finalResults = {
      experimentId: experiment.id,
      participantId,
      roomId,
      timestamp: new Date().toISOString(),
      d_score: Number(dScore.toFixed(3)),
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
    switch (blockNum) {
      case 0:
      case 1:
        return {
          title: "ნაწილი 1 7-დან",
          leftLabel: "არაბული სახელები",
          rightLabel: "ქართული სახელები"
        };
      case 2:
        return {
          title: "ნაწილი 2 7-დან",
          leftLabel: "უარყოფითი",
          rightLabel: "დადებითი"
        };
      case 3:
      case 4:
        return {
          title: `ნაწილი ${blockNum} 7-დან`,
          leftLabel: "არაბული სახელები ან უარყოფითი",
          rightLabel: "ქართული სახელები ან დადებითი"
        };
      case 5:
        return {
          title: "ნაწილი 5 7-დან",
          leftLabel: "ქართული სახელები",
          rightLabel: "არაბული სახელები"
        };
      case 6:
      case 7:
        return {
          title: `ნაწილი ${blockNum} 7-დან`,
          leftLabel: "ქართული სახელები ან უარყოფითი",
          rightLabel: "არაბული სახელები ან დადებითი"
        };
      default:
        return { title: "", leftLabel: "", rightLabel: "" };
    }
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

  const isSurveyValid = metadata.gender !== '';

  if (phase === 'age_check') {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#F8F9FA] p-8" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
        <div className="bg-white p-12 border-2 border-blue-100 shadow-sm max-w-md w-full text-center">
          <h2 className="text-2xl font-bold mb-8 text-gray-800">ასაკის შემოწმება</h2>
          <p className="mb-6 text-gray-600">გთხოვთ მიუთითოთ თქვენი ასაკი ექსპერიმენტის გასაგრძელებლად</p>
          <input 
            type="number" 
            placeholder="ასაკი"
            className="w-full p-4 border rounded-xl mb-4 text-center text-xl focus:ring-2 focus:ring-indigo-500 outline-none"
            onChange={(e) => setMetadata(prev => ({ ...prev, age: parseInt(e.target.value) }))}
          />
          {ageError && <p className="text-red-500 mb-4 text-sm font-bold">ბოდიში, ექსპერიმენტში მონაწილეობის მისაღებად უნდა იყოთ 18 წლის ან უფროსი.</p>}
          <button 
            onClick={() => {
              if (metadata.age >= 18) setPhase('survey');
              else setAgeError(true);
            }}
            className="w-full bg-indigo-600 text-white p-4 rounded-xl font-bold hover:bg-indigo-700 transition-colors"
          >
            გაგრძელება
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'survey') {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#F8F9FA] p-8 overflow-y-auto" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
        <div className="bg-white p-12 border-2 border-blue-100 shadow-sm max-w-2xl w-full">
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
              <label className="block text-lg font-bold mb-4">რამდენად ანიჭებთ უპირატესობას ქართველებს ან არაბ-მუსლიმებს?</label>
              <div className="flex justify-between text-xs text-gray-400 mb-2 font-sans px-2">
                <span>ქართველებს</span>
                <span>ნეიტრალური</span>
                <span>არაბ-მუსლიმებს</span>
              </div>
              <input 
                type="range" min="1" max="7" step="1"
                className="w-full accent-indigo-600 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                value={metadata.explicit_pref}
                onChange={(e) => setMetadata(prev => ({ ...prev, explicit_pref: parseInt(e.target.value) }))}
              />
              <div className="flex justify-between px-1 mt-2 text-sm font-bold text-indigo-600">
                {[1,2,3,4,5,6,7].map(n => <span key={n}>{n}</span>)}
              </div>
            </div>

            {/* Feeling Thermometers */}
            <div className="space-y-8">
              <div>
                <label className="block text-lg font-bold mb-4">რამდენად თბილად განეწყობით ქართველების მიმართ?</label>
                <div className="flex justify-between text-xs text-gray-400 mb-2 font-sans">
                  <span>0 (ცივი)</span>
                  <span>10 (თბილი)</span>
                </div>
                <input 
                  type="range" min="0" max="10" step="1"
                  className="w-full accent-indigo-600 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  value={metadata.warmth_georgian}
                  onChange={(e) => setMetadata(prev => ({ ...prev, warmth_georgian: parseInt(e.target.value) }))}
                />
                <div className="text-center mt-2 font-bold text-indigo-600 text-xl">{metadata.warmth_georgian}</div>
              </div>

              <div>
                <label className="block text-lg font-bold mb-4">რამდენად თბილად განეწყობით არაბი მუსლიმების მიმართ?</label>
                <div className="flex justify-between text-xs text-gray-400 mb-2 font-sans">
                  <span>0 (ცივი)</span>
                  <span>10 (თბილი)</span>
                </div>
                <input 
                  type="range" min="0" max="10" step="1"
                  className="w-full accent-indigo-600 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  value={metadata.warmth_arab}
                  onChange={(e) => setMetadata(prev => ({ ...prev, warmth_arab: parseInt(e.target.value) }))}
                />
                <div className="text-center mt-2 font-bold text-indigo-600 text-xl">{metadata.warmth_arab}</div>
              </div>
            </div>
          </div>

          <button 
            disabled={!isSurveyValid}
            onClick={() => setPhase('instructions')}
            className={`w-full mt-12 p-4 rounded-xl font-bold transition-all ${isSurveyValid ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
          >
            ექსპერიმენტის დაწყება
          </button>
        </div>
      </div>
    );
  }

  return (
    <ExperimentWrapper experiment={experiment}>
      <div className="w-full h-screen bg-[#F8F9FA] flex items-center justify-center select-none overflow-hidden" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
        <div className="bg-white w-[95%] max-w-5xl h-[85vh] border-2 border-blue-100 flex flex-col shadow-sm relative p-12">
          {/* Header Labels */}
          {phase === 'test' ? (
            <div className="flex justify-between w-full font-bold">
              <div className="text-left">
                <div className="text-[11px] text-gray-400 mb-2 uppercase tracking-tighter">დააჭირეთ 'E' ღილაკს</div>
                <div className="text-3xl">
                  {block === 1 && <div className="text-green-600">არაბული სახელები</div>}
                  {block === 2 && <div className="text-blue-600">უარყოფითი</div>}
                  {(block === 3 || block === 4) && (
                    <div className="space-y-0 text-center">
                      <div className="text-green-600">არაბული სახელები</div>
                      <div className="text-gray-300 text-xs uppercase font-normal my-0">ან</div>
                      <div className="text-blue-600">უარყოფითი</div>
                    </div>
                  )}
                  {block === 5 && <div className="text-green-600">ქართული სახელები</div>}
                  {(block === 6 || block === 7) && (
                    <div className="space-y-0 text-center">
                      <div className="text-green-600">ქართული სახელები</div>
                      <div className="text-gray-300 text-xs uppercase font-normal my-0">ან</div>
                      <div className="text-blue-600">უარყოფითი</div>
                    </div>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11px] text-gray-400 mb-2 uppercase tracking-tighter">დააჭირეთ 'I' ღილაკს</div>
                <div className="text-3xl">
                  {block === 1 && <div className="text-green-600">ქართული სახელები</div>}
                  {block === 2 && <div className="text-blue-600">დადებითი</div>}
                  {(block === 3 || block === 4) && (
                    <div className="space-y-0 text-center">
                      <div className="text-green-600">ქართული სახელები</div>
                      <div className="text-gray-300 text-xs uppercase font-normal my-0">ან</div>
                      <div className="text-blue-600">დადებითი</div>
                    </div>
                  )}
                  {block === 5 && <div className="text-green-600">არაბული სახელები</div>}
                  {(block === 6 || block === 7) && (
                    <div className="space-y-0 text-center">
                      <div className="text-green-600">არაბული სახელები</div>
                      <div className="text-gray-300 text-xs uppercase font-normal my-0">ან</div>
                      <div className="text-blue-600">დადებითი</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Same layout but for instructions */
            <div className="flex justify-between w-full font-bold">
              <div className="text-left">
                <div className="text-[11px] text-gray-400 mb-2 uppercase tracking-tighter">დააჭირეთ 'E' ღილაკს</div>
                <div className="text-3xl">
                  {currentInstructions.leftLabel.split(' ან ').map((part, i) => (
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
                  {currentInstructions.rightLabel.split(' ან ').map((part, i) => (
                    <div key={i}>
                      {i > 0 && <div className="text-gray-300 text-xs uppercase font-normal my-0">ან</div>}
                      <span className={part.includes('სახელები') ? 'text-green-600' : 'text-blue-600'}>{part}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

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
                  <div className={`text-6xl font-medium ${
                    (trials[trialIndex]?.category === 'Arab Names' || trials[trialIndex]?.category === 'Georgian Names') 
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
