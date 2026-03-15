/**
 * COLOR PERCEPTION - Cross-Linguistic Perception Experiment
 * 
 * Tests color category boundaries across languages.
 */

import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ExperimentWrapper } from '../components/experiments/ExperimentWrapper';
import type { Experiment } from '../data/experiments';
import type { TrialData, ExperimentResults } from '../components/experiments/ExperimentWrapper';
import { getDefaultConfig } from './config/experimentDefaults';

interface ColorPerceptionConfig {
  trials: number;
  showFeedback: boolean;
  customInstructions: string;
}

interface ColorPerceptionProps {
  experiment: Experiment;
  onComplete: (results: ExperimentResults) => void;
  participantId: string;
  roomId: string;
  config?: Partial<ColorPerceptionConfig>;
}

const COLOR_BANDS = [
  { hue: 0, colors: ['#ff0000', '#ff3333', '#ff6666', '#ff9999', '#ffcccc', '#ffcccc', '#ff9999', '#ff6666', '#ff3333', '#ff0000'] },
  { hue: 30, colors: ['#ff8800', '#ffaa33', '#ffcc66', '#ffee99', '#ffffff', '#ffffff', '#ffee99', '#ffcc66', '#ffaa33', '#ff8800'] },
  { hue: 60, colors: ['#ffff00', '#ffff33', '#ffff66', '#ffff99', '#ffffcc', '#ffffcc', '#ffff99', '#ffff66', '#ffff33', '#ffff00'] },
  { hue: 120, colors: ['#00ff00', '#33ff33', '#66ff66', '#99ff99', '#ccffcc', '#ccffcc', '#99ff99', '#66ff66', '#33ff33', '#00ff00'] },
  { hue: 180, colors: ['#00ffff', '#33ffff', '#66ffff', '#99ffff', '#ccffff', '#ccffff', '#99ffff', '#66ffff', '#33ffff', '#00ffff'] },
  { hue: 240, colors: ['#0000ff', '#3333ff', '#6666ff', '#9999ff', '#ccccff', '#ccccff', '#9999ff', '#6666ff', '#3333ff', '#0000ff'] },
];

const DEFAULT_CONFIG = { ...getDefaultConfig('color-perception'), trials: 60 } as ColorPerceptionConfig;

export function ColorPerceptionExperiment({ experiment, onComplete, participantId, roomId, config = {} }: ColorPerceptionProps) {
  const { t, language } = useLanguage();
  const settings: ColorPerceptionConfig = { ...DEFAULT_CONFIG, ...config };

  const [phase, setPhase] = useState<'instruction' | 'experiment' | 'complete'>('instruction');
  const [trialIndex, setTrialIndex] = useState(0);
  const [trialData, setTrialData] = useState<TrialData[]>([]);
  const [experimentStartTime, setExperimentStartTime] = useState(0);
  const [currentColor, setCurrentColor] = useState('#ff0000');

  useEffect(() => { if (phase === 'instruction') setExperimentStartTime(performance.now()); }, [phase]);

  useEffect(() => {
    if (phase === 'experiment') {
      const bandIdx = Math.floor(trialIndex / 10) % COLOR_BANDS.length;
      const colorIdx = trialIndex % 10;
      setCurrentColor(COLOR_BANDS[bandIdx].colors[colorIdx]);
    }
  }, [phase, trialIndex]);

  const handleResponse = (category: string) => {
    const bandIdx = Math.floor(trialIndex / 10) % COLOR_BANDS.length;
    const categoryMap = ['red', 'orange', 'yellow', 'green', 'blue', 'purple'];
    const correctCategory = categoryMap[bandIdx];
    
    const trial: TrialData = {
      trialNumber: trialIndex + 1,
      responseTimeMs: 500,
      answer: category,
      correctAnswer: correctCategory,
      stimulus: { color: currentColor, category: correctCategory },
    };
    setTrialData(prev => [...prev, trial]);
    
    if (trialIndex < settings.trials - 1) {
      setTrialIndex(prev => prev + 1);
    } else {
      completeExperiment();
    }
  };

  const completeExperiment = () => {
    setPhase('complete');
    const accuracy = trialData.filter(t => t.answer === t.correctAnswer).length / trialData.length * 100;
    const results: ExperimentResults = {
      experimentName: experiment.id,
      participantId,
      roomId,
      language,
      timestamp: new Date().toISOString(),
      totalTrials: trialData.length,
      responseTimeMs: Math.round(performance.now() - experimentStartTime),
      accuracy,
      answer: accuracy,
      correctAnswer: 'accuracy_percentage',
      trialData,
      debrief: t(experiment.debriefKey),
    };
    onComplete(results);
  };

  if (phase === 'instruction') {
    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="max-w-2xl mx-auto p-6">
          <h2 className="text-2xl font-bold text-navy-900 mb-4">{t('exp.colorPerception.name')}</h2>
          <p className="text-gray-600 mb-4">{settings.customInstructions || t('exp.colorPerception.instruction')}</p>
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
            <p className="text-blue-800">{t('exp.colorPerception.instructionDetail')}</p>
          </div>
          <button onClick={() => setPhase('experiment')} className="bg-teal-600 text-white px-6 py-3 rounded-lg">{t('common.start')}</button>
        </div>
      </ExperimentWrapper>
    );
  }

  if (phase === 'complete') {
    const accuracy = trialData.filter(t => t.answer === t.correctAnswer).length / trialData.length * 100;
    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="max-w-2xl mx-auto p-6">
          <h2 className="text-2xl font-bold text-navy-900 mb-4">{t('common.debrief.title')}</h2>
          <div className="bg-teal-50 border-l-4 border-teal-500 p-4 mb-4">
            <p className="text-teal-800 font-medium">{t('common.debrief.thankYou')}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg text-center mb-6">
            <p className="text-2xl font-bold text-navy-900">{Math.round(accuracy)}%</p>
            <p className="text-sm text-gray-600">{t('common.correct')}</p>
          </div>
          <p className="text-gray-600 mb-4">{t('exp.colorPerception.debrief')}</p>
        </div>
      </ExperimentWrapper>
    );
  }

  return (
    <ExperimentWrapper experiment={experiment}>
      <div className="max-w-2xl mx-auto p-6">
        <div className="mb-6"><div className="h-2 bg-gray-200 rounded"><div className="h-full bg-teal-600" style={{ width: `${((trialIndex + 1) / settings.trials) * 100}%` }} /></div></div>
        <div className="flex justify-center mb-8">
          <div className="w-32 h-32 rounded-full shadow-lg" style={{ backgroundColor: currentColor }}></div>
        </div>
        <h2 className="text-xl font-semibold text-navy-900 mb-6 text-center">{t('exp.colorPerception.whichCategory')}</h2>
        <div className="flex justify-center gap-3 flex-wrap">
          {['red', 'orange', 'yellow', 'green', 'blue', 'purple'].map(cat => (
            <button key={cat} onClick={() => handleResponse(cat)} className="bg-gray-100 hover:bg-teal-50 border-2 border-gray-200 hover:border-teal-500 px-4 py-2 rounded-lg capitalize">
              {cat}
            </button>
          ))}
        </div>
      </div>
    </ExperimentWrapper>
  );
}

export default ColorPerceptionExperiment;
