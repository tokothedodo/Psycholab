import { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';

interface ExperimentProps {
  onComplete: (result: {
    experiment_name: string;
    response_time_ms: number;
    answer: string | number;
    correct_answer: string | number;
  }) => void;
}

const CITATION = 'Güth, W., et al. (1982)';

const OFFERS = [5, 10, 15, 20, 25, 30, 35, 40];

export function UltimatumExperiment({ onComplete }: ExperimentProps) {
  const { t } = useLanguage();
  const [phase, setPhase] = useState<'instruction' | 'experiment' | 'debrief'>('instruction');
  const [currentOffer, setCurrentOffer] = useState<number | null>(null);
  const [startTime, setStartTime] = useState<number>(0);
  const [trial, setTrial] = useState(0);

  const maxTrials = 8;

  const handleStart = () => {
    setPhase('experiment');
    setTrial(0);
    setCurrentOffer(OFFERS[0]);
    setStartTime(performance.now());
  };

  const handleDecision = (decision: 'accept' | 'reject') => {
    const endTime = performance.now();
    const responseTime = Math.round(endTime - startTime);

    onComplete({
      experiment_name: 'ultimatum',
      response_time_ms: responseTime,
      answer: decision,
      correct_answer: currentOffer! >= 20 ? 'accept' : 'reject',
    });

    const newTrial = trial + 1;
    setTrial(newTrial);

    if (newTrial >= maxTrials) {
      setPhase('debrief');
    } else {
      setCurrentOffer(OFFERS[newTrial]);
      setStartTime(performance.now());
    }
  };

  if (phase === 'instruction') {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <h2 className="text-2xl font-bold text-navy-900 mb-4">{t('experiment.ultimatum.title')}</h2>
        <p className="text-gray-600 mb-6">{t('experiment.ultimatum.instruction')}</p>
        <p className="text-sm text-gray-500 mb-6">{t('citation')}: {CITATION}</p>
        <button
          onClick={handleStart}
          className="bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 transition-colors"
        >
          {t('common.start')}
        </button>
      </div>
    );
  }

  if (phase === 'debrief') {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <h2 className="text-2xl font-bold text-navy-900 mb-4">{t('common.debrief.title')}</h2>
        <p className="text-gray-600 mb-6">{t('experiment.ultimatum.debrief')}</p>
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
        {trial + 1} / {maxTrials}
      </div>

      <div className="bg-gray-50 rounded-lg p-8 mb-8 text-center">
        <p className="text-xl text-gray-700 mb-4">{t('experiment.ultimatum.offer')}</p>
        <p className="text-5xl font-bold text-navy-900">${currentOffer}</p>
        <p className="text-gray-500 mt-2">out of $100</p>
      </div>

      <div className="flex justify-center gap-4">
        <button
          onClick={() => handleDecision('accept')}
          className="bg-teal-600 text-white px-8 py-4 rounded-lg hover:bg-teal-700 transition-colors text-lg font-semibold"
        >
          {t('experiment.ultimatum.accept')}
        </button>
        <button
          onClick={() => handleDecision('reject')}
          className="bg-red-600 text-white px-8 py-4 rounded-lg hover:bg-red-700 transition-colors text-lg font-semibold"
        >
          {t('experiment.ultimatum.reject')}
        </button>
      </div>
    </div>
  );
}
