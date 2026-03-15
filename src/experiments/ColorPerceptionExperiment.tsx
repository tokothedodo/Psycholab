/**
 * COLOR PERCEPTION - Cross-Linguistic Perception Experiment
 * 
 * Tests color category boundaries across languages.
 */

import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ExperimentWrapper } from './ExperimentWrapper';
import type { Experiment } from '../data/experiments';
import type { TrialData, ExperimentResults } from './ExperimentWrapper';
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
        <div className="max-w-2xl mx-auto p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
          <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-emerald-600 mb-6">{t('exp.colorPerception.name')}</h2>

          <div className="bg-slate-50 border-l-4 border-teal-500 p-5 rounded-r-lg shadow-sm mb-6">
            <p className="text-slate-700 leading-relaxed text-md">
              {settings.customInstructions || t('exp.colorPerception.instruction')}
            </p>
          </div>

          <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-5 mb-8">
            <p className="text-sm font-semibold text-indigo-900 mb-2 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              {t('exp.colorPerception.instructionDetail')}
            </p>
          </div>

          <button
            onClick={() => setPhase('experiment')}
            className="group relative w-full sm:w-auto bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-semibold flex tracking-wide items-center justify-center gap-3 px-8 py-4 rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
          >
            {t('common.start')}
            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
          </button>
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
      <div className="max-w-3xl mx-auto p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 min-h-[500px] flex flex-col relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-white -z-10"></div>

        <div className="mb-8 px-4 pt-2">
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-teal-400 to-teal-500 transition-all duration-500 ease-out"
              style={{ width: `${((trialIndex + 1) / settings.trials) * 100}%` }}
            />
          </div>
          <div className="flex justify-between items-center mt-3">
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
              {trialIndex + 1} / {settings.trials}
            </span>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center animate-fade-in w-full max-w-xl mx-auto">

          <div className="relative group mb-10 w-full flex justify-center">
            <div className="absolute inset-0 bg-slate-50 opacity-0 group-hover:opacity-100 rounded-3xl transition-opacity duration-500 scale-110"></div>
            <div
              className="w-40 h-40 sm:w-48 sm:h-48 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.1)] transition-colors duration-200 relative z-10 border-4 border-white"
              style={{ backgroundColor: currentColor }}
            />
          </div>

          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight mb-8 text-center uppercase">
            {t('exp.colorPerception.whichCategory')}
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full">
            {['red', 'orange', 'yellow', 'green', 'blue', 'purple'].map(cat => (
              <button
                key={cat}
                onClick={() => handleResponse(cat)}
                className="group relative flex-1 py-4 px-2 bg-white rounded-xl shadow-sm border-2 border-transparent hover:border-teal-200 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center focus:outline-none focus:ring-4 focus:ring-teal-500/20"
              >
                <span className="absolute inset-0 bg-teal-50/0 group-hover:bg-teal-50/50 rounded-xl transition-colors"></span>
                <span className="text-lg font-bold text-slate-700 group-hover:text-teal-700 capitalize z-10 transition-colors">
                  {cat}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </ExperimentWrapper>
  );
}

export default ColorPerceptionExperiment;
