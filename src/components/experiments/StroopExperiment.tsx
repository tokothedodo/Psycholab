import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../../context/LanguageContext';

interface ExperimentProps {
  onComplete: (result: {
    experiment_name: string;
    response_time_ms: number;
    answer: string | number;
    correct_answer: string | number;
  }) => void;
}

const CITATION = 'Stroop, J.R. (1935)';

const COLORS = [
  { name: 'red', hex: '#dc2626' },
  { name: 'blue', hex: '#2563eb' },
  { name: 'green', hex: '#16a34a' },
  { name: 'yellow', hex: '#ca8a04' },
];

export function StroopExperiment({ onComplete }: ExperimentProps) {
  const { t } = useLanguage();
  const [phase, setPhase] = useState<'instruction' | 'experiment' | 'debrief'>('instruction');
  const [currentStimulus, setCurrentStimulus] = useState<{ word: string; color: string } | null>(null);
  const [startTime, setStartTime] = useState<number>(0);
  const [trials, setTrials] = useState(0);
  const maxTrials = 24;
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const generateTrial = () => {
    const randomWord = COLORS[Math.floor(Math.random() * COLORS.length)];
    let randomColor: typeof COLORS[0];
    
    do {
      randomColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    } while (randomColor.name === randomWord.name);

    setCurrentStimulus({ word: randomWord.name, color: randomColor.hex });
    setStartTime(performance.now());
    
    timeoutRef.current = window.setTimeout(() => {
      handleResponse(randomColor.name, 'timeout');
    }, 3000);
  };

  const handleResponse = (selectedColor: string, answer?: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const endTime = performance.now();
    const responseTime = Math.round(endTime - startTime);
    const correctColor = currentStimulus!.color;
    const correctColorName = COLORS.find(c => c.hex === correctColor)?.name || '';
    
    onComplete({
      experiment_name: 'stroop',
      response_time_ms: answer === 'timeout' ? 3000 : responseTime,
      answer: answer || selectedColor,
      correct_answer: correctColorName,
    });

    const newTrials = trials + 1;
    setTrials(newTrials);

    if (newTrials >= maxTrials) {
      setPhase('debrief');
    } else {
      generateTrial();
    }
  };

  if (phase === 'instruction') {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <h2 className="text-2xl font-bold text-navy-900 mb-4">{t('experiment.stroop.title')}</h2>
        <p className="text-gray-600 mb-6">{t('experiment.stroop.instruction')}</p>
        <p className="text-sm text-gray-500 mb-4">{t('citation')}: {CITATION}</p>
        <button
          onClick={() => {
            setPhase('experiment');
            setTrials(0);
          }}
          className="bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 transition-colors"
        >
          {t('experiment.stroop.start')}
        </button>
      </div>
    );
  }

  if (phase === 'debrief') {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <h2 className="text-2xl font-bold text-navy-900 mb-4">{t('common.debrief.title')}</h2>
        <p className="text-gray-600 mb-6">{t('experiment.stroop.debrief')}</p>
        <p className="text-sm text-gray-500 mb-4">{t('citation')}: {CITATION}</p>
        <div className="bg-teal-50 border-l-4 border-teal-500 p-4">
          <p className="text-teal-800 font-medium">{t('common.debrief.thankYou')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="text-center mb-4 text-gray-500">
        {trials + 1} / {maxTrials}
      </div>

      <div className="flex justify-center items-center min-h-[200px] mb-8">
        <span
          className="text-6xl font-bold"
          style={{ color: currentStimulus?.color }}
        >
          {currentStimulus?.word.toUpperCase()}
        </span>
      </div>

      <p className="text-center text-gray-600 mb-4">{t('experiment.stroop.selectColor')}</p>
      
      <div className="flex justify-center gap-4">
        {COLORS.map((color) => (
          <button
            key={color.name}
            onClick={() => handleResponse(color.name)}
            className="w-24 h-24 rounded-lg border-2 border-gray-200 hover:border-teal-500 hover:bg-teal-50 transition-colors flex items-center justify-center"
            style={{ backgroundColor: color.hex + '20' }}
          >
            <span className="text-lg font-semibold capitalize" style={{ color: color.hex }}>
              {color.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
