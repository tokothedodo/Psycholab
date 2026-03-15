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

const CITATION = 'Müller, F. (1889)';

export function MullerLyerExperiment({ onComplete }: ExperimentProps) {
  const { t } = useLanguage();
  const [phase, setPhase] = useState<'instruction' | 'experiment' | 'debrief'>('instruction');
  const [lines, setLines] = useState<{ topLength: number; bottomLength: number; topArrows: 'in' | 'out'; bottomArrows: 'in' | 'out' } | null>(null);
  const [startTime, setStartTime] = useState<number>(0);

  useEffect(() => {
    if (phase === 'experiment') {
      generateTrial();
    }
  }, [phase]);

  const generateTrial = () => {
    const baseLength = 200 + Math.random() * 50;
    const topArrows: 'in' | 'out' = Math.random() > 0.5 ? 'in' : 'out';
    const bottomArrows: 'in' | 'out' = topArrows === 'in' ? 'out' : 'in';
    
    setLines({
      topLength: baseLength,
      bottomLength: baseLength,
      topArrows,
      bottomArrows,
    });
    setStartTime(performance.now());
  };

  const handleChoice = (selectedLine: 'top' | 'bottom') => {
    const endTime = performance.now();
    const responseTime = Math.round(endTime - startTime);
    
    const isTopLonger = lines!.topArrows === 'out';
    const correctAnswer = isTopLonger ? 'top' : 'bottom';
    const answer = selectedLine;
    
    onComplete({
      experiment_name: 'muller-lyer',
      response_time_ms: responseTime,
      answer,
      correct_answer: correctAnswer,
    });

    generateTrial();
  };

  if (phase === 'instruction') {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <h2 className="text-2xl font-bold text-navy-900 mb-4">{t('experiment.mullerLyer.title')}</h2>
        <p className="text-gray-600 mb-6">{t('experiment.mullerLyer.instruction')}</p>
        <p className="text-sm text-gray-500 mb-4">{t('citation')}: {CITATION}</p>
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
        <p className="text-gray-600 mb-6">{t('experiment.mullerLyer.debrief')}</p>
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
        {t('experiment.mullerLyer.question')}
      </h2>
      
      <div className="space-y-16 mb-8">
        <button
          onClick={() => handleChoice('top')}
          className="w-full py-8 hover:bg-gray-50 transition-colors cursor-pointer"
        >
          <div className="flex justify-center items-center">
            <svg width={lines!.topLength + 80} height="40" className="overflow-visible">
              <line
                x1="40"
                y1="20"
                x2={lines!.topLength + 40}
                y2="20"
                stroke="#1e3a5f"
                strokeWidth="3"
              />
              {lines!.topArrows === 'out' ? (
                <>
                  <line x1="40" y1="20" x2="10" y2="0" stroke="#1e3a5f" strokeWidth="3" />
                  <line x1="40" y1="20" x2="10" y2="40" stroke="#1e3a5f" strokeWidth="3" />
                  <line x1={lines!.topLength + 40} y1="20" x2={lines!.topLength + 70} y2="0" stroke="#1e3a5f" strokeWidth="3" />
                  <line x1={lines!.topLength + 40} y1="20" x2={lines!.topLength + 70} y2="40" stroke="#1e3a5f" strokeWidth="3" />
                </>
              ) : (
                <>
                  <line x1="40" y1="20" x2="60" y2="0" stroke="#1e3a5f" strokeWidth="3" />
                  <line x1="40" y1="20" x2="60" y2="40" stroke="#1e3a5f" strokeWidth="3" />
                  <line x1={lines!.topLength + 40} y1="20" x2={lines!.topLength + 20} y2="0" stroke="#1e3a5f" strokeWidth="3" />
                  <line x1={lines!.topLength + 40} y1="20" x2={lines!.topLength + 20} y2="40" stroke="#1e3a5f" strokeWidth="3" />
                </>
              )}
            </svg>
          </div>
        </button>

        <button
          onClick={() => handleChoice('bottom')}
          className="w-full py-8 hover:bg-gray-50 transition-colors cursor-pointer"
        >
          <div className="flex justify-center items-center">
            <svg width={lines!.bottomLength + 80} height="40" className="overflow-visible">
              <line
                x1="40"
                y1="20"
                x2={lines!.bottomLength + 40}
                y2="20"
                stroke="#1e3a5f"
                strokeWidth="3"
              />
              {lines!.bottomArrows === 'out' ? (
                <>
                  <line x1="40" y1="20" x2="10" y2="0" stroke="#1e3a5f" strokeWidth="3" />
                  <line x1="40" y1="20" x2="10" y2="40" stroke="#1e3a5f" strokeWidth="3" />
                  <line x1={lines!.bottomLength + 40} y1="20" x2={lines!.bottomLength + 70} y2="0" stroke="#1e3a5f" strokeWidth="3" />
                  <line x1={lines!.bottomLength + 40} y1="20" x2={lines!.bottomLength + 70} y2="40" stroke="#1e3a5f" strokeWidth="3" />
                </>
              ) : (
                <>
                  <line x1="40" y1="20" x2="60" y2="0" stroke="#1e3a5f" strokeWidth="3" />
                  <line x1="40" y1="20" x2="60" y2="40" stroke="#1e3a5f" strokeWidth="3" />
                  <line x1={lines!.bottomLength + 40} y1="20" x2={lines!.bottomLength + 20} y2="0" stroke="#1e3a5f" strokeWidth="3" />
                  <line x1={lines!.bottomLength + 40} y1="20" x2={lines!.bottomLength + 20} y2="40" stroke="#1e3a5f" strokeWidth="3" />
                </>
              )}
            </svg>
          </div>
        </button>
      </div>

      <div className="text-center">
        <button
          onClick={() => setPhase('debrief')}
          className="text-teal-600 hover:text-teal-700 font-medium"
        >
          {t('common.next')} →
        </button>
      </div>
    </div>
  );
}
