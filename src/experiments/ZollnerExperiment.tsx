/**
 * ZÖLLNER ILLUSION - Visual Perception Experiment
 * 
 * Tests line parallelism perception.
 * Horizontal lines appear misaligned due to diagonal distractors.
 */

import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ExperimentWrapper } from './ExperimentWrapper';
import type { Experiment } from '../data/experiments';
import type { TrialData, ExperimentResults } from './ExperimentWrapper';
import { getDefaultConfig } from './config/experimentDefaults';

interface ZollnerConfig {
  trials: number;
  isi: number;
  showFeedback: boolean;
  showProgressBar: boolean;
  customInstructions: string;
}

interface ZollnerProps {
  experiment: Experiment;
  onComplete: (results: ExperimentResults) => void;
  participantId: string;
  roomId: string;
  config?: Partial<ZollnerConfig>;
}

const DEFAULT_CONFIG = { ...getDefaultConfig('zollner'), trials: 12 } as ZollnerConfig;

export function ZollnerExperiment({ experiment, onComplete, participantId, roomId, config = {} }: ZollnerProps) {
  const { t, language } = useLanguage();
  const settings: ZollnerConfig = { ...DEFAULT_CONFIG, ...config };

  const [phase, setPhase] = useState<'instruction' | 'experiment' | 'complete'>('instruction');
  const [trialIndex, setTrialIndex] = useState(0);
  const [trialData, setTrialData] = useState<TrialData[]>([]);
  const [experimentStartTime, setExperimentStartTime] = useState(0);

  useEffect(() => {
    if (phase === 'instruction') setExperimentStartTime(performance.now());
  }, [phase]);

  const handleResponse = (direction: 'left' | 'right' | 'parallel') => {
    const trial: TrialData = {
      trialNumber: trialIndex + 1,
      responseTimeMs: 500,
      answer: direction,
      correctAnswer: 'parallel',
      stimulus: { direction },
    };
    setTrialData(prev => [...prev, trial]);
    setTimeout(() => {
      if (trialIndex < settings.trials - 1) setTrialIndex(prev => prev + 1);
      else completeExperiment();
    }, settings.isi);
  };

  const completeExperiment = () => {
    const correct = trialData.filter(t => t.answer === 'parallel').length;
    const results: ExperimentResults = {
      experimentName: experiment.id,
      participantId,
      roomId,
      language,
      timestamp: new Date().toISOString(),
      totalTrials: trialData.length,
      responseTimeMs: Math.round(performance.now() - experimentStartTime),
      accuracy: (correct / trialData.length) * 100,
      answer: correct,
      correctAnswer: 'parallel_count',
      trialData,
      debrief: t(experiment.debriefKey),
    };
    onComplete(results);
  };

  if (phase === 'instruction') {
    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="max-w-2xl mx-auto p-6">
          <h2 className="text-2xl font-bold text-navy-900 mb-4">{t('exp.zollner.name')}</h2>
          <p className="text-gray-600 mb-4">{settings.customInstructions || t('exp.zollner.instruction')}</p>
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
            <p className="text-blue-800">{t('exp.zollner.instructionDetail')}</p>
          </div>
          <button onClick={() => setPhase('experiment')} className="bg-teal-600 text-white px-6 py-3 rounded-lg">{t('common.start')}</button>
        </div>
      </ExperimentWrapper>
    );
  }

  if (phase === 'complete') {
    const correct = trialData.filter(t => t.answer === 'parallel').length;
    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="max-w-2xl mx-auto p-6">
          <h2 className="text-2xl font-bold text-navy-900 mb-4">{t('common.debrief.title')}</h2>
          <div className="bg-teal-50 border-l-4 border-teal-500 p-4 mb-4">
            <p className="text-teal-800 font-medium">{t('common.debrief.thankYou')}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg text-center mb-6">
            <p className="text-2xl font-bold text-navy-900">{correct}/{trialData.length}</p>
            <p className="text-sm text-gray-600">{t('common.correct')}</p>
          </div>
          <p className="text-gray-600 mb-4">{t('exp.zollner.debrief')}</p>
        </div>
      </ExperimentWrapper>
    );
  }

  return (
    <ExperimentWrapper experiment={experiment}>
      <div className="max-w-2xl mx-auto p-6">
        {settings.showProgressBar && <div className="mb-6"><div className="h-2 bg-gray-200 rounded"><div className="h-full bg-teal-600" style={{ width: `${((trialIndex + 1) / settings.trials) * 100}%` }} /></div></div>}
        <h2 className="text-xl font-semibold text-navy-900 mb-6 text-center">{t('exp.zollner.areLines')}</h2>
        <div className="flex justify-center mb-8">
          <svg width="400" height="200">
            {[0, 1, 2].map(i => (
              <g key={i}>
                <line x1="50" y1={50 + i * 50} x2="350" y2={50 + i * 50} stroke="#1e3a5f" strokeWidth="3" />
                {[-30, 30].map(offset => (
                  <line key={offset} x1={200 + offset * (i === 1 ? 1.5 : 1)} y1={30 + i * 50} x2={200 + offset * (i === 1 ? 1.5 : 1) + (offset > 0 ? 20 : -20)} y2={70 + i * 50} stroke="#1e3a5f" strokeWidth="1" />
                ))}
              </g>
            ))}
          </svg>
        </div>
        <div className="flex justify-center gap-4">
          <button onClick={() => handleResponse('left')} className="bg-gray-100 px-6 py-3 rounded-lg">{t('exp.zollner.left')}</button>
          <button onClick={() => handleResponse('parallel')} className="bg-teal-600 text-white px-6 py-3 rounded-lg">{t('exp.zollner.parallel')}</button>
          <button onClick={() => handleResponse('right')} className="bg-gray-100 px-6 py-3 rounded-lg">{t('exp.zollner.right')}</button>
        </div>
      </div>
    </ExperimentWrapper>
  );
}

export default ZollnerExperiment;
