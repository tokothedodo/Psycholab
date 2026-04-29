import { useState, useEffect, useRef, useCallback } from 'react';
import type { Experiment } from '../data/experiments';
import type { ExperimentResults } from './ExperimentWrapper';
import { useLanguage } from '../context/LanguageContext';

interface ReactionTimeProps {
  experiment: Experiment;
  onComplete: (results: ExperimentResults) => void;
  participantId: string;
  roomId: string;
}

interface TrialResult {
  subject_age: number;
  subject_gender: string;
  trial_index: number;
  pedestrian_race: string;
  pedestrian_gender: string;
  doctor_side: string;
  chosen_side: string;
  reaction_time_ms: number;
}

interface TrialConfig {
  type: 'control' | 'experimental';
  pedestrian?: string;
}

const CANVAS_WIDTH = 1280;
const CANVAS_HEIGHT = 720;
const TOTAL_TRIALS = 30;

const PEDESTRIAN_IMAGES = [
  'arab_man1.png',
  'arab_woman1.png',
  'black_man1.png',
  'black_woman1.png',
  'black_constructionwoman.png',
  'indian_man1.png',
  'indian_woman1.png',
  'white_man1.png',
  'white_woman1.png',
];

const REQUIRED_COMBOS = [
  'arab_man1.png',
  'arab_woman1.png',
  'black_man1.png',
  'black_woman1.png',
  'black_constructionwoman.png',
  'indian_man1.png',
  'indian_woman1.png',
  'white_man1.png',
  'white_woman1.png',
];

function parsePedestrianInfo(filename: string): { race: string; gender: string } {
  const name = filename.replace('.png', '');
  if (name === 'black_constructionwoman') {
    return { race: 'black', gender: 'woman' };
  }
  // Handle filenames like "indian_man1", "arab_man1", etc.
  const parts = name.split('_');
  const race = parts[0];
  const genderPart = parts[1]; // e.g., "man1" or "woman1"
  const gender = genderPart.startsWith('man') ? 'man' : 'woman';
  return { race, gender };
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function generateTrials(): TrialConfig[] {
  const trials: TrialConfig[] = [];

  REQUIRED_COMBOS.forEach(pedestrian => {
    trials.push({ type: 'experimental', pedestrian });
  });

  const controlCount = TOTAL_TRIALS - REQUIRED_COMBOS.length;
  for (let i = 0; i < controlCount; i++) {
    trials.push({ type: 'control' });
  }

  return shuffleArray(trials);
}

export function ReactionTimeExperiment({ experiment, onComplete, participantId, roomId }: ReactionTimeProps) {
  const { t, language } = useLanguage();
  const [phase, setPhase] = useState<'instruction' | 'fixation' | 'stimulus' | 'debrief'>('instruction');
  const [trial, setTrial] = useState(0);
  const [trialConfigs, setTrialConfigs] = useState<TrialConfig[]>([]);
  const [results, setResults] = useState<TrialResult[]>([]);
  const [leftPerson, setLeftPerson] = useState('');
  const [rightPerson, setRightPerson] = useState('');
  const [doctorOnLeft, setDoctorOnLeft] = useState(true);
  const [leftSurvival, setLeftSurvival] = useState(0);
  const [rightSurvival, setRightSurvival] = useState(0);
  const [subjectAge, setSubjectAge] = useState(0);
  const [subjectGender, setSubjectGender] = useState('');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const startTimeRef = useRef(0);
  const roadImageRef = useRef<HTMLImageElement | null>(null);
  const doctorImageRef = useRef<HTMLImageElement | null>(null);
  const pedestrianImageRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (phase === 'instruction') return;

    if (!roadImageRef.current) {
      const roadImg = new Image();
      roadImg.src = '/road.png';
      roadImg.onload = () => {
        roadImageRef.current = roadImg;
      };
    }

    if (!doctorImageRef.current) {
      const doctorImg = new Image();
      doctorImg.src = '/doctor.png';
      doctorImg.onload = () => {
        doctorImageRef.current = doctorImg;
      };
    }

    PEDESTRIAN_IMAGES.forEach(imgName => {
      if (!pedestrianImageRef.current.has(imgName)) {
        const img = new Image();
        img.src = `/${imgName}`;
        img.onload = () => {
          pedestrianImageRef.current.set(imgName, img);
        };
      }
    });
  }, [phase]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (phase === 'fixation') {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 120px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('+', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
      return;
    }

    if (phase === 'stimulus' && roadImageRef.current && leftPerson && rightPerson) {
      ctx.drawImage(roadImageRef.current, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      const personScale = 0.2;
      const groundY = CANVAS_HEIGHT;
      const centerX = CANVAS_WIDTH / 2;
      const spacing = CANVAS_WIDTH * 0.25;

      const leftX = centerX - spacing;
      const rightX = centerX + spacing;

      const drawSurvivalLabel = (x: number, y: number, survival: number) => {
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        const text = `${survival}% chance of survival`;
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.strokeText(text, x, y);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(text, x, y);
      };

      if (leftPerson === 'doctor' && doctorImageRef.current) {
        const docWidth = doctorImageRef.current.width * personScale;
        const docHeight = doctorImageRef.current.height * personScale;
        ctx.drawImage(doctorImageRef.current, leftX - docWidth / 2, groundY - docHeight, docWidth, docHeight);
        drawSurvivalLabel(leftX, groundY - docHeight - 20, leftSurvival);
      } else if (leftPerson !== 'doctor') {
        const leftImg = pedestrianImageRef.current.get(leftPerson);
        if (leftImg && leftImg.complete) {
          const imgWidth = leftImg.width * personScale;
          const imgHeight = leftImg.height * personScale;
          ctx.drawImage(leftImg, leftX - imgWidth / 2, groundY - imgHeight, imgWidth, imgHeight);
          drawSurvivalLabel(leftX, groundY - imgHeight - 20, leftSurvival);
        }
      }

      if (rightPerson === 'doctor' && doctorImageRef.current) {
        const docWidth = doctorImageRef.current.width * personScale;
        const docHeight = doctorImageRef.current.height * personScale;
        ctx.drawImage(doctorImageRef.current, rightX - docWidth / 2, groundY - docHeight, docWidth, docHeight);
        drawSurvivalLabel(rightX, groundY - docHeight - 20, rightSurvival);
      } else if (rightPerson !== 'doctor') {
        const rightImg = pedestrianImageRef.current.get(rightPerson);
        if (rightImg && rightImg.complete) {
          const imgWidth = rightImg.width * personScale;
          const imgHeight = rightImg.height * personScale;
          ctx.drawImage(rightImg, rightX - imgWidth / 2, groundY - imgHeight, imgWidth, imgHeight);
          drawSurvivalLabel(rightX, groundY - imgHeight - 20, rightSurvival);
        }
      }
    }
  }, [phase, doctorOnLeft, leftPerson, rightPerson, leftSurvival, rightSurvival, trial, trialConfigs]);

  useEffect(() => {
    draw();
    const interval = setInterval(draw, 16);
    return () => clearInterval(interval);
  }, [draw]);

  const runTrial = useCallback(() => {
    const currentConfig = trialConfigs[trial];
    const isExperimental = currentConfig.type === 'experimental';

    const isDoctorLeft = Math.random() < 0.5;
    setDoctorOnLeft(isDoctorLeft);

    if (isExperimental) {
      const pedestrian = currentConfig.pedestrian || PEDESTRIAN_IMAGES[Math.floor(Math.random() * PEDESTRIAN_IMAGES.length)];
      const survivalRate = Math.floor(Math.random() * 100) + 1;
      if (isDoctorLeft) {
        setLeftPerson('doctor');
        setRightPerson(pedestrian);
        setLeftSurvival(survivalRate);
        setRightSurvival(survivalRate);
      } else {
        setLeftPerson(pedestrian);
        setRightPerson('doctor');
        setLeftSurvival(survivalRate);
        setRightSurvival(survivalRate);
      }
    } else {
      const person1 = PEDESTRIAN_IMAGES[Math.floor(Math.random() * PEDESTRIAN_IMAGES.length)];
      let person2 = PEDESTRIAN_IMAGES[Math.floor(Math.random() * PEDESTRIAN_IMAGES.length)];
      while (person2 === person1) {
        person2 = PEDESTRIAN_IMAGES[Math.floor(Math.random() * PEDESTRIAN_IMAGES.length)];
      }
      const survival1 = Math.floor(Math.random() * 100) + 1;
      const survival2 = Math.floor(Math.random() * 100) + 1;
      if (isDoctorLeft) {
        setLeftPerson(person1);
        setRightPerson(person2);
        setLeftSurvival(survival1);
        setRightSurvival(survival2);
      } else {
        setLeftPerson(person2);
        setRightPerson(person1);
        setLeftSurvival(survival2);
        setRightSurvival(survival1);
      }
    }

    setPhase('fixation');

    timeoutRef.current = window.setTimeout(() => {
      setPhase('stimulus');
      startTimeRef.current = performance.now();
    }, 500);
  }, [trial, trialConfigs]);

  const startFirstTrial = useCallback(() => {
    const configs = generateTrials();
    setTrialConfigs(configs);

    const currentConfig = configs[0];
    const isExperimental = currentConfig.type === 'experimental';

    const isDoctorLeft = Math.random() < 0.5;
    setDoctorOnLeft(isDoctorLeft);

    if (isExperimental) {
      const pedestrian = currentConfig.pedestrian || PEDESTRIAN_IMAGES[Math.floor(Math.random() * PEDESTRIAN_IMAGES.length)];
      const survivalRate = Math.floor(Math.random() * 100) + 1;
      if (isDoctorLeft) {
        setLeftPerson('doctor');
        setRightPerson(pedestrian);
        setLeftSurvival(survivalRate);
        setRightSurvival(survivalRate);
      } else {
        setLeftPerson(pedestrian);
        setRightPerson('doctor');
        setLeftSurvival(survivalRate);
        setRightSurvival(survivalRate);
      }
    } else {
      const person1 = PEDESTRIAN_IMAGES[Math.floor(Math.random() * PEDESTRIAN_IMAGES.length)];
      let person2 = PEDESTRIAN_IMAGES[Math.floor(Math.random() * PEDESTRIAN_IMAGES.length)];
      while (person2 === person1) {
        person2 = PEDESTRIAN_IMAGES[Math.floor(Math.random() * PEDESTRIAN_IMAGES.length)];
      }
      const survival1 = Math.floor(Math.random() * 100) + 1;
      const survival2 = Math.floor(Math.random() * 100) + 1;
      if (isDoctorLeft) {
        setLeftPerson(person1);
        setRightPerson(person2);
        setLeftSurvival(survival1);
        setRightSurvival(survival2);
      } else {
        setLeftPerson(person2);
        setRightPerson(person1);
        setLeftSurvival(survival2);
        setRightSurvival(survival1);
      }
    }

    setPhase('fixation');

    timeoutRef.current = window.setTimeout(() => {
      setPhase('stimulus');
      startTimeRef.current = performance.now();
    }, 500);
  }, []);

  useEffect(() => {
    if (trial > 0 && phase === 'fixation') {
      runTrial();
    }
  }, [trial, phase, runTrial]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleResponse = useCallback((chosenSide: 'left' | 'right') => {
    if (phase !== 'stimulus') return;

    const rt = performance.now() - startTimeRef.current;
    const currentConfig = trialConfigs[trial];

    let pedestrianRace = '';
    let pedestrianGender = '';

    if (currentConfig.type === 'experimental') {
      const pedestrian = doctorOnLeft ? rightPerson : leftPerson;
      if (pedestrian !== 'doctor') {
        const info = parsePedestrianInfo(pedestrian);
        pedestrianRace = info.race;
        pedestrianGender = info.gender;
      }
    }

    const trialResult: TrialResult = {
      subject_age: subjectAge,
      subject_gender: subjectGender,
      trial_index: trial + 1,
      pedestrian_race: pedestrianRace,
      pedestrian_gender: pedestrianGender,
      doctor_side: doctorOnLeft ? 'left' : 'right',
      chosen_side: chosenSide,
      reaction_time_ms: Math.round(rt),
    };

    setResults([...results, trialResult]);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (trial + 1 >= TOTAL_TRIALS) {
      const avgRt = Math.round(results.reduce((acc, r) => acc + r.reaction_time_ms, 0) / results.length);
      onComplete({
        experimentName: experiment.id,
        participantId,
        roomId,
        language,
        timestamp: new Date().toISOString(),
        totalTrials: results.length,
        responseTimeMs: avgRt,
        accuracy: 100,
        answer: avgRt.toString(),
        correctAnswer: 'ms',
        trialData: results.map((r, i) => ({
          trialNumber: i + 1,
          responseTimeMs: r.reaction_time_ms,
          stimulus: r.chosen_side,
          answer: r.chosen_side,
          correctAnswer: r.doctor_side,
        })),
      });
    } else {
      setPhase('fixation');
      setTrial(prev => prev + 1);
    }
    }, [phase, leftPerson, rightPerson, doctorOnLeft, trial, trialConfigs, results, onComplete, experiment, participantId, roomId, language]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) {
        return;
      }

      if (phase === 'instruction') {
        setPhase('fixation');
        return;
      }

      if (phase === 'stimulus') {
        if (e.key.toLowerCase() === 'a') {
          e.preventDefault();
          handleResponse('left');
        } else if (e.key.toLowerCase() === 'l') {
          e.preventDefault();
          handleResponse('right');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, handleResponse]);

  if (phase === 'instruction') {
    const canStart = subjectAge > 0 && subjectGender;
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 w-full max-w-3xl mx-auto">
        <h1 className="text-4xl font-black text-gray-900 mb-6">{t('exp.reactionTime.name')}</h1>
        
        <div className="flex gap-4 mb-6">
          <input
            type="number"
            placeholder={t('login.age') || 'Age'}
            value={subjectAge || ''}
            onChange={e => setSubjectAge(parseInt(e.target.value) || 0)}
            className="w-24 px-4 py-3 text-center text-xl border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
          />
          <select
            value={subjectGender}
            onChange={e => setSubjectGender(e.target.value)}
            className="w-40 px-4 py-3 text-center text-xl border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
          >
            <option value="">{t('signup.gender') || 'Gender'}</option>
            <option value="male">{t('signup.male') || 'Male'}</option>
            <option value="female">{t('signup.female') || 'Female'}</option>
            <option value="other">{t('signup.other') || 'Other'}</option>
          </select>
        </div>

        <p className="text-xl text-gray-500 mb-6">
          {t('exp.reactionTime.instruction1')}
        </p>
        <p className="text-lg text-gray-400 mb-6">
          {t('exp.reactionTime.instruction2')}
        </p>
        <p className="text-sm text-gray-400 mb-8">
          {TOTAL_TRIALS} {t('common.trials')}. {t('exp.reactionTime.instruction3')}
        </p>
        <button
          onClick={startFirstTrial}
          disabled={!canStart}
          className={`px-10 py-4 rounded-2xl font-black text-xl transition-all ${
            canStart 
              ? 'bg-blue-600 text-white hover:bg-blue-700' 
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          START
        </button>
      </div>
    );
  }

  if (phase === 'debrief') {
    const avgRt = Math.round(results.reduce((acc, r) => acc + r.reaction_time_ms, 0) / results.length);
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 w-full max-w-3xl mx-auto">
        <h1 className="text-4xl font-black text-gray-900 mb-6">Complete</h1>
        <p className="text-2xl text-gray-600 mb-4">{t('common.responseTime')}</p>
        <p className="text-6xl font-black text-blue-600 mb-8">{avgRt}ms</p>
        <p className="text-sm text-gray-400">{t('common.resultsSaved')}</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center w-full h-full bg-[#1a1a1a]">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="shadow-2xl"
      />
    </div>
  );
}

export default ReactionTimeExperiment;