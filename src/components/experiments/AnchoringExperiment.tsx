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

const CITATION = 'Tversky, A., & Kahneman, D. (1974)';
const CORRECT_ANSWER = 54;

export function AnchoringExperiment({ onComplete }: ExperimentProps) {
  const { t } = useLanguage();
  const [phase, setPhase] = useState<'instruction' | 'experiment' | 'debrief'>('instruction');
  const [anchor, setAnchor] = useState<10 | 65 | null>(null);
  const [userEstimate, setUserEstimate] = useState<string>('');
  const [startTime, setStartTime] = useState<number>(0);

  const handleStart = (selectedAnchor: 10 | 65) => {
    setAnchor(selectedAnchor);
    setPhase('experiment');
    setStartTime(performance.now());
  };

  const handleSubmit = () => {
    const endTime = performance.now();
    const responseTime = Math.round(endTime - startTime);
    const estimate = parseInt(userEstimate, 10);
    
    onComplete({
      experiment_name: 'anchoring',
      response_time_ms: responseTime,
      answer: estimate,
      correct_answer: CORRECT_ANSWER,
    });

    setPhase('debrief');
  };

  if (phase === 'instruction') {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <h2 className="text-2xl font-bold text-navy-900 mb-4">{t('experiment.anchoring.title')}</h2>
        <p className="text-gray-600 mb-6">{t('experiment.anchoring.instruction')}</p>
        <p className="text-sm text-gray-500 mb-6">{t('citation')}: {CITATION}</p>
        
        <div className="space-y-4">
          <button
            onClick={() => handleStart(10)}
            className="w-full bg-gray-50 hover:bg-gray-100 p-4 rounded-lg border border-gray-200 transition-colors text-left"
          >
            <span className="text-2xl font-bold text-navy-900">10%</span>
          </button>
          <button
            onClick={() => handleStart(65)}
            className="w-full bg-gray-50 hover:bg-gray-100 p-4 rounded-lg border border-gray-200 transition-colors text-left"
          >
            <span className="text-2xl font-bold text-navy-900">65%</span>
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'debrief') {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <h2 className="text-2xl font-bold text-navy-900 mb-4">{t('common.debrief.title')}</h2>
        <div className="bg-teal-50 p-4 rounded-lg mb-4">
          <p className="text-lg font-semibold text-teal-800 mb-2">
            {t('experiment.anchoring.estimate')} {userEstimate}%
          </p>
          <p className="text-teal-700">Correct answer: {CORRECT_ANSWER}%</p>
        </div>
        <p className="text-gray-600 mb-6">{t('experiment.anchoring.debrief')}</p>
        <p className="text-sm text-gray-500 mb-4">{t('citation')}: {CITATION}</p>
        <div className="bg-teal-50 border-l-4 border-teal-500 p-4">
          <p className="text-teal-800 font-medium">{t('common.debrief.thankYou')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="text-center mb-8">
        <p className="text-xl text-gray-700 mb-2">
          {anchor === 10 ? t('experiment.anchoring.highAnchor') : t('experiment.anchoring.lowAnchor')}
        </p>
        <p className="text-4xl font-bold text-navy-900">{anchor}%</p>
      </div>

      <div className="mb-6">
        <label className="block text-gray-600 mb-2 text-center">{t('experiment.anchoring.estimate')}</label>
        <div className="flex items-center justify-center gap-2">
          <input
            type="number"
            value={userEstimate}
            onChange={(e) => setUserEstimate(e.target.value)}
            className="w-32 p-3 border-2 border-gray-200 rounded-lg text-center text-xl focus:border-teal-500 focus:outline-none"
            placeholder="0-100"
          />
          <span className="text-xl text-gray-600">%</span>
        </div>
      </div>

      <div className="text-center">
        <button
          onClick={handleSubmit}
          disabled={!userEstimate}
          className="bg-teal-600 text-white px-8 py-3 rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t('common.submit')}
        </button>
      </div>
    </div>
  );
}
