import { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';

interface ExperimentProps {
  onComplete: (result: {
    experiment_name: string;
    response_time_ms: number;
    answer: string | number;
    correct_answer: string | number;
  }) => void;
}

const CITATION = 'Ponzo, M. (1912)';

export function PonzoExperiment({ onComplete }: ExperimentProps) {
  const { t } = useLanguage();
  const [phase, setPhase] = useState<'instruction' | 'experiment' | 'debrief'>('experiment');
  const [startTime, setStartTime] = useState<number>(0);

  useEffect(() => {
    setStartTime(performance.now());
  }, []);

  const handleChoice = (selectedBar: 'top' | 'bottom') => {
    const endTime = performance.now();
    const responseTime = Math.round(endTime - startTime);
    
    const correctAnswer: 'top' | 'bottom' = 'top';
    
    onComplete({
      experiment_name: 'ponzo',
      response_time_ms: responseTime,
      answer: selectedBar,
      correct_answer: correctAnswer,
    });

    setPhase('debrief');
  };

  if (phase === 'instruction') {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <h2 className="text-2xl font-bold text-navy-900 mb-4">{t('experiment.ponzo.title')}</h2>
        <p className="text-gray-600 mb-6">{t('experiment.ponzo.instruction')}</p>
        <p className="text-sm text-gray-500 mb-6">{t('citation')}: {CITATION}</p>
        <button
          onClick={() => setPhase('experiment')}
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
        <p className="text-gray-600 mb-6">{t('experiment.ponzo.debrief')}</p>
        <p className="text-sm text-gray-500 mb-4">{t('citation')}: {CITATION}</p>
        <div className="bg-teal-50 border-l-4 border-teal-500 p-4">
          <p className="text-teal-800 font-medium">{t('common.debrief.thankYou')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-xl font-semibold text-navy-900 mb-8 text-center">
        {t('experiment.ponzo.question')}
      </h2>

      <div className="flex justify-center mb-8">
        <svg width="400" height="300" viewBox="0 0 400 300" className="overflow-visible">
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#1e3a5f" />
            </marker>
          </defs>
          
          <line x1="50" y1="300" x2="200" y2="0" stroke="#1e3a5f" strokeWidth="3" />
          <line x1="350" y1="300" x2="200" y2="0" stroke="#1e3a5f" strokeWidth="3" />
          
          <g transform="translate(0, 60)">
            <line x1="100" y1="80" x2="300" y2="80" stroke="#1e3a5f" strokeWidth="4" />
          </g>
          
          <g transform="translate(0, 60)">
            <line x1="100" y1="180" x2="300" y2="180" stroke="#1e3a5f" strokeWidth="4" />
          </g>
        </svg>
      </div>

      <div className="flex justify-center gap-8">
        <button
          onClick={() => handleChoice('top')}
          className="bg-gray-100 hover:bg-teal-50 border-2 border-gray-200 hover:border-teal-500 px-8 py-4 rounded-lg transition-colors"
        >
          <span className="text-lg font-semibold text-navy-900">Top Bar</span>
        </button>
        <button
          onClick={() => handleChoice('bottom')}
          className="bg-gray-100 hover:bg-teal-50 border-2 border-gray-200 hover:border-teal-500 px-8 py-4 rounded-lg transition-colors"
        >
          <span className="text-lg font-semibold text-navy-900">Bottom Bar</span>
        </button>
      </div>
    </div>
  );
}
