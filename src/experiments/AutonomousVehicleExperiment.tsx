import React, { useState, useEffect, useRef, useCallback } from 'react';
import { type Experiment } from '../data/experiments';

interface AutonomousVehicleExperimentProps {
  experiment: Experiment;
  onComplete: (results: any) => void;
  participantId: string;
  roomId: string;
}

type Choice = 'left' | 'right';
type TrialGroup = 'white_male' | 'white_female' | 'black_male' | 'black_female' | 'diversion';

interface Trial {
  id: string;
  isPractice: boolean;
  type: 'experimental' | 'diversion';
  group: TrialGroup;
  doctorPosition: Choice | 'none';
  leftLabel: string;
  rightLabel: string;
  leftImageKey: string;
  rightImageKey: string;
  correctChoice: Choice;
}

interface TrialResult {
  trialId: string;
  group: TrialGroup;
  isPractice: boolean;
  type: 'experimental' | 'diversion';
  choice: Choice;
  isCorrect: boolean;
  reactionTime: number;
}

type Step = 'loading' | 'demographics' | 'practice' | 'transition' | 'main' | 'complete';

const IMAGES_MAP: Record<string, string> = {
  doctor: '/doctor.png',
  white_male: '/white_man1.png', // 'file:///home/tornikekarchava/.gemini/antigravity/brain/9177e81f-bc91-4d71-ae35-954ec98103b9/white_male_white_shirt_1777876817942.png'
  white_female: '/white_woman1.png', // 'file:///home/tornikekarchava/.gemini/antigravity/brain/9177e81f-bc91-4d71-ae35-954ec98103b9/white_female_white_shirt_1777876901648.png'
  black_male: '/black_man1.png', // 'file:///home/tornikekarchava/.gemini/antigravity/brain/9177e81f-bc91-4d71-ae35-954ec98103b9/black_male_white_shirt_1777877216166.png'
  black_female: '/black_woman1.png', // 'file:///home/tornikekarchava/.gemini/antigravity/brain/9177e81f-bc91-4d71-ae35-954ec98103b9/black_female_white_shirt_1777877282786.png'
  arab_male: '/arab_man1.png', // 'file:///home/tornikekarchava/.gemini/antigravity/brain/9177e81f-bc91-4d71-ae35-954ec98103b9/arab_male_white_shirt_1777877342225.png'
  arab_female: '/arab_woman1.png',
  indian_male: '/indian_man1.png',
  indian_female: '/indian_woman1.png',
  construction_worker: '/black_constructionwoman.png',
  road: '/road.png',
};

// --- Helper Functions ---
const calculateMedian = (arr: number[]): number | null => {
  if (arr.length === 0) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

const shuffleArray = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

const getRandomPerc = (min = 40, max = 95) => Math.floor(Math.random() * (max - min + 1)) + min;

const generateTrials = () => {
  const groups: TrialGroup[] = ['white_male', 'white_female', 'black_male', 'black_female'];
  const practiceTrials: Trial[] = [];
  const mainTrials: Trial[] = [];

  // 1. Practice Phase (5 trials, balanced position)
  for (let i = 0; i < 5; i++) {
    const group = groups[i % groups.length];
    const isDocLeft = i % 2 === 0;
    practiceTrials.push({
      id: `prac-${i}`,
      isPractice: true,
      type: 'experimental',
      group,
      doctorPosition: isDocLeft ? 'left' : 'right',
      leftLabel: '',
      rightLabel: '',
      leftImageKey: isDocLeft ? 'doctor' : group,
      rightImageKey: isDocLeft ? group : 'doctor',
      correctChoice: isDocLeft ? 'left' : 'right',
    });
  }

  // 2. Main Phase (40 trials: 10 per group, 5 Left/5 Right each)
  const trialPool: Trial[] = [];
  groups.forEach(group => {
    for (let i = 0; i < 10; i++) {
      const isDocLeft = i < 5;
      trialPool.push({
        id: `main-${group}-${i}`,
        isPractice: false,
        type: 'experimental',
        group,
        doctorPosition: isDocLeft ? 'left' : 'right',
        leftLabel: '',
        rightLabel: '',
        leftImageKey: isDocLeft ? 'doctor' : group,
        rightImageKey: isDocLeft ? group : 'doctor',
        correctChoice: isDocLeft ? 'left' : 'right',
      });
    }
  });

  return { practiceTrials, mainTrials: shuffleArray(trialPool) };
};

export const AutonomousVehicleExperiment: React.FC<AutonomousVehicleExperimentProps> = ({
  onComplete,
  participantId,
  roomId
}) => {
  const [step, setStep] = useState<Step>('loading');
  const [age, setAge] = useState<string>('');
  const [gender, setGender] = useState<string>('');
  const [finalData, setFinalData] = useState<any>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const loadedImages = useRef<Record<string, HTMLImageElement>>({});
  const trialStartTime = useRef<number>(0);
  const fixationStartTime = useRef<number>(0);
  const resultsRef = useRef<TrialResult[]>([]);
  const trialsRef = useRef<Trial[]>([]);
  const hasCompletedRef = useRef<boolean>(false);

  // The persistent "Engine State" (bypasses React for drawing)
  const engineState = useRef({
    step: 'loading' as Step,
    currentTrialIndex: 0,
    isFixation: true,
  });

  // Sync React step changes to Engine
  useEffect(() => { engineState.current.step = step; }, [step]);

  // 1. Initial Loading & Decoding
  useEffect(() => {
    const loadAll = async () => {
      const promises = Object.entries(IMAGES_MAP).map(([key, src]) => {
        return new Promise<void>((resolve) => {
          const img = new Image();
          img.src = src;
          img.onload = () => {
            loadedImages.current[key] = img;
            if ('decode' in img) {
              (img as any).decode().then(() => resolve()).catch(() => resolve());
            } else {
              resolve();
            }
          };
          img.onerror = () => resolve();
        });
      });
      await Promise.all(promises);
      const { practiceTrials, mainTrials } = generateTrials();
      trialsRef.current = [...practiceTrials, ...mainTrials];
      fixationStartTime.current = performance.now();
      setStep('demographics');
    };
    loadAll();
  }, []);

  // 2. High-Precision Animation Loop
  useEffect(() => {
    let rafId: number;
    const loop = () => {
      const canvas = canvasRef.current;
      const now = performance.now();
      if (!canvas) {
        rafId = requestAnimationFrame(loop);
        return;
      }
      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) return;

      const { step: curStep, isFixation: curFix, currentTrialIndex: curIdx } = engineState.current;

      // Handle High-Precision Fixation Timing
      if (curFix && (curStep === 'practice' || curStep === 'main')) {
        if (now - fixationStartTime.current >= 500) {
          engineState.current.isFixation = false;
          trialStartTime.current = 0; // Reset trial start for stimulus onset
        }
      }

      const trials = trialsRef.current;
      const currentTrial = trials[curIdx];

      // Reset
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (curStep === 'practice' || curStep === 'main') {
        if (engineState.current.isFixation) {
          ctx.fillStyle = 'white';
          ctx.font = 'thin 120px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('+', canvas.width / 2, canvas.height / 2);
        } else if (currentTrial) {
          const road = loadedImages.current['road'];
          if (road) {
            ctx.drawImage(road, 0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }

          const leftImg = loadedImages.current[currentTrial.leftImageKey];
          const rightImg = loadedImages.current[currentTrial.rightImageKey];

          ctx.textAlign = 'center';
          ctx.fillStyle = 'white';
          ctx.font = '300 100px sans-serif';
          ctx.shadowBlur = 20;
          ctx.shadowColor = 'black';

          const leftX = canvas.width * 0.25;
          const rightX = canvas.width * 0.75;
          const charY = canvas.height * 0.8;

          if (leftImg) {
            const targetH = canvas.height * 0.6;
            const scale = targetH / leftImg.height;
            const w = leftImg.width * scale;
            const h = leftImg.height * scale;
            ctx.drawImage(leftImg, leftX - w / 2, charY - h, w, h);

            if (rightImg) {
              const targetH = canvas.height * 0.6;
              const scale = targetH / rightImg.height;
              const w = rightImg.width * scale;
              const h = rightImg.height * scale;
              ctx.drawImage(rightImg, rightX - w / 2, charY - h, w, h);
            }
            ctx.shadowBlur = 0;

            if (trialStartTime.current === 0) {
              trialStartTime.current = now;
            }
          }
        }
      }
      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // 4. Instant Input Handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const curStep = engineState.current.step;
      const curFix = engineState.current.isFixation;

      if ((curStep === 'practice' || curStep === 'main') && !curFix) {
        if (key === 'a') recordChoice('left');
        else if (key === 'l') recordChoice('right');
      } else if (curStep === 'transition') {
        engineState.current.currentTrialIndex = 5;
        engineState.current.isFixation = true;
        fixationStartTime.current = performance.now();
        setStep('main');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const recordChoice = (choice: Choice) => {
    const now = performance.now();
    const rt = now - trialStartTime.current;
    const curIdx = engineState.current.currentTrialIndex;
    const trials = trialsRef.current;

    engineState.current.isFixation = true;
    fixationStartTime.current = now;

    const result: TrialResult = {
      trialId: trials[curIdx].id,
      group: trials[curIdx].group,
      isPractice: trials[curIdx].isPractice,
      type: trials[curIdx].type,
      choice,
      isCorrect: choice === trials[curIdx].correctChoice,
      reactionTime: rt,
    };
    resultsRef.current.push(result);

    const nextIndex = curIdx + 1;
    if (engineState.current.step === 'practice' && nextIndex === 5) {
      setStep('transition');
    } else if (engineState.current.step === 'main' && nextIndex === trials.length) {
      finalizeResults([...resultsRef.current]);
    } else {
      engineState.current.currentTrialIndex = nextIndex;
      setStep(prev => prev);
    }
  };

  const finalizeResults = (allResults: TrialResult[]) => {
    if (hasCompletedRef.current) return;
    hasCompletedRef.current = true;

    const experimental = allResults.filter(r => r.type === 'experimental');
    const correctExp = experimental.filter(r => r.isCorrect);

    const accuracyPercent = (correctExp.length / experimental.length) * 100;

    const calculateMedian = (arr: number[]) => {
      if (arr.length === 0) return null;
      const sorted = [...arr].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    };

    const getGroupMedian = (group: TrialGroup | 'overall') => {
      const data = group === 'overall'
        ? correctExp.map(r => r.reactionTime)
        : correctExp.filter(r => r.group === group).map(r => r.reactionTime);
      return calculateMedian(data);
    };

    const overallMedian = getGroupMedian('overall');
    const wmMed = getGroupMedian('white_male');
    const wfMed = getGroupMedian('white_female');
    const bmMed = getGroupMedian('black_male');
    const bfMed = getGroupMedian('black_female');

    const calcBias = (groupMed: number | null, overallMed: number | null) => {
      if (groupMed === null || overallMed === null) return null;
      return groupMed - overallMed;
    };

    const payload = {
      experiment_name: "Moral_Machine_Implicit_Bias",
      subject_age: parseInt(age, 10) || 0,
      subject_gender: gender,
      total_trials: 40,
      accuracy_percent: accuracyPercent,
      overall_median_rt: overallMedian,
      white_male_median: wmMed,
      white_female_median: wfMed,
      black_male_median: bmMed,
      black_female_median: bfMed,
      wm_bias: calcBias(wmMed, overallMedian),
      wf_bias: calcBias(wfMed, overallMedian),
      bm_bias: calcBias(bmMed, overallMedian),
      bf_bias: calcBias(bfMed, overallMedian),
      participantId,
      roomId
    };

    setFinalData(payload);
    onComplete(payload);
    setStep('complete');
  };

  return (
    <div className="w-full h-screen bg-black overflow-hidden flex items-center justify-center relative font-sans">
      <style>{`
        .navbar { display: none !important; } 
        body { cursor: ${(step === 'practice' || step === 'main') ? 'none' : 'default'}; }
      `}</style>

      <canvas
        ref={canvasRef}
        width={1920}
        height={1080}
        className="w-full h-full object-contain"
      />

      {step === 'loading' && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black text-white">
          <div className="text-2xl animate-pulse tracking-widest uppercase">Initializing precision engine...</div>
        </div>
      )}

      {step === 'demographics' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-gray-100/10 backdrop-blur-sm overflow-y-auto py-10">
          <div className="bg-white p-10 rounded-2xl shadow-2xl max-w-2xl w-full border border-gray-200 text-gray-800 my-auto">
            <h1 className="text-2xl font-black mb-6 tracking-tighter uppercase text-center">ექსპერიმენტის ინსტრუქცია მონაწილეებისთვის</h1>

            <div className="space-y-4 text-sm leading-relaxed mb-8 text-gray-700">
              <p>მოგესალმებით და მადლობას გიხდით კვლევაში მონაწილეობისთვის!</p>
              <p>ეს ექსპერიმენტი იკვლევს ადამიანის რეაქციის სისწრაფესა და გადაწყვეტილების მიღების პროცესს კრიტიკულ სიტუაციებში. მონაცემები სრულიად ანონიმურია.</p>

              <div>
                <p className="font-bold mb-2">თქვენი დავალება:</p>
                <p>თქვენ მოგიწევთ სწრაფი არჩევანის გაკეთება გარდაუვალი ავარიის სიმულაციის დროს. ეკრანზე გამოჩნდება ორი ქვეითი.</p>
              </div>

              <div>
                <p className="font-bold mb-2">არჩევანის წესები:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>თქვენი მიზანია ყოველთვის გადაარჩინოთ ექიმი.</strong></li>
                </ul>
              </div>

              <div>
                <p className="font-bold mb-2">მართვა:</p>
                <p>არჩევანის გასაკეთებლად გამოიყენეთ კლავიატურა:</p>
                <ul className="list-disc pl-5">
                  <li>მარცხენა პერსონაჟის ასარჩევად დააჭირეთ კლავიშს <strong>"A"</strong>.</li>
                  <li>მარჯვენა პერსონაჟის ასარჩევად დააჭირეთ კლავიშს <strong>"L"</strong>.</li>
                </ul>
              </div>

              <p className="font-bold text-gray-900 border-y border-gray-100 py-2">მნიშვნელოვანია: იმოქმედეთ რაც შეიძლება სწრაფად, მაგრამ ყურადღებით, რომ არ დაუშვათ შეცდომა.</p>

              <div>
                <p className="font-bold mb-1">ექსპერიმენტის ეტაპები:</p>
                <p>1. სავარჯიშო ფაზა: 5 სავარჯიშო ტესტი. <br /> 2. ძირითადი ფაზა: 40 დავალება.</p>
              </div>

              <p className="text-xs italic text-gray-500">დასაწყებად, გთხოვთ, მიუთითოთ თქვენი ასაკი და სქესი.</p>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); setStep('practice'); }} className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold mb-1 uppercase tracking-widest text-gray-400">ასაკი</label>
                <input
                  type="number" required min="18" max="100"
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-blue-500 outline-none transition-all font-bold"
                  value={age} onChange={(e) => setAge(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold mb-1 uppercase tracking-widest text-gray-400">სქესი</label>
                <select
                  required
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-blue-500 outline-none transition-all font-bold"
                  value={gender} onChange={(e) => setGender(e.target.value)}
                >
                  <option value="">აირჩიეთ...</option>
                  <option value="Male">მამრობითი</option>
                  <option value="Female">მდედრობითი</option>
                  <option value="Other">სხვა</option>
                </select>
              </div>
              <button type="submit" className="col-span-2 mt-4 bg-black text-white font-black py-4 rounded-xl hover:bg-gray-800 transition-all uppercase tracking-widest text-xs shadow-xl">
                წავიკითხე და მზად ვარ დასაწყებად.
              </button>
            </form>
          </div>
        </div>
      )}

      {step === 'transition' && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-lg text-white text-center px-10">
          <h2 className="text-4xl font-light mb-8 tracking-widest uppercase">Practice Complete</h2>
          <p className="text-xl opacity-70 mb-12 max-w-2xl font-light leading-relaxed">
            Press any key to begin
          </p>
          <div className="text-sm font-bold tracking-[0.3em] text-blue-400 animate-pulse uppercase">
            Commencing Main Experiment
          </div>
        </div>
      )}

      {step === 'complete' && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black text-white text-center">
          <div className="mb-12">
            <div className="text-6xl mb-6">✓</div>
            <h2 className="text-4xl font-light tracking-widest uppercase">Session Concluded</h2>
            <p className="opacity-50 mt-4">Research data has been synchronized.</p>
          </div>
          <button
            onClick={() => {
              const blob = new Blob([JSON.stringify(finalData, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `AV_Moral_Machine_${participantId}.json`;
              a.click();
            }}
            className="px-10 py-4 border border-white/20 hover:bg-white/10 transition-colors uppercase tracking-[0.3em] text-xs font-bold"
          >
            Export Raw Dataset
          </button>
        </div>
      )}
    </div>
  );
};

export default AutonomousVehicleExperiment;
