/**
 * AVAILABILITY HEURISTIC - Cognitive Bias Experiment
 * 
 * Tests frequency estimation based on ease of recall.
 */

import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ExperimentWrapper } from '../components/experiments/ExperimentWrapper';
import type { Experiment } from '../data/experiments';
import type { TrialData, ExperimentResults } from '../components/experiments/ExperimentWrapper';
import { getDefaultConfig } from './config/experimentDefaults';

interface AvailabilityConfig {
  trials: number;
  isi: number;
  showFeedback: boolean;
  showProgressBar: boolean;
  customInstructions: string;
}

interface AvailabilityProps {
  experiment: Experiment;
  onComplete: (results: ExperimentResults) => void;
  participantId: string;
  roomId: string;
  config?: Partial<AvailabilityConfig>;
}

const QUESTIONS = [
  { id: 'drowning', question: 'drowning_deaths', actual: 3200, keyword: 'water' },
  { id: 'terrorism', question: 'terrorism_deaths', actual: 200, keyword: 'terror' },
  { id: 'homicide', question: 'homicide_deaths', actual: 15000, keyword: 'murder' },
  { id: 'suicide', question: 'suicide_deaths', actual: 45000, keyword: 'suicide' },
  { id: 'accident', question: 'car_accident_deaths', actual: 38000, keyword: 'car' },
  { id: 'lightning', question: 'lightning_deaths', actual: 50, keyword: 'lightning' },
];

const DEFAULT_CONFIG = { ...getDefaultConfig('availability'), trials: 6 } as AvailabilityConfig;

export function AvailabilityExperiment({ experiment, onComplete, participantId, roomId, config = {} }: AvailabilityProps) {
  const { t, language } = useLanguage();
  const settings: AvailabilityConfig = { ...DEFAULT_CONFIG, ...config };

  const [phase, setPhase] = useState<'instruction' | 'experiment' | 'complete'>('instruction');
  const [trialIndex, setTrialIndex] = useState(0);
  const [trialData, setTrialData] = useState<TrialData[]>([]);
  const [experimentStartTime, setExperimentStartTime] = useState(0);
  const [userEstimate, setUserEstimate] = useState('');

  useEffect(() => { if (phase === 'instruction') setExperimentStartTime(performance.now()); }, [phase]);

  const currentQuestion = QUESTIONS[trialIndex];

  const handleSubmit = () => {
    const actual = currentQuestion.actual;
    const trial: TrialData = {
      trialNumber: trialIndex + 1,
      responseTimeMs: 500,
      answer: userEstimate,
      correctAnswer: String(actual),
      stimulus: { actual, keyword: currentQuestion.keyword },
    };
    setTrialData(prev => [...prev, trial]);
    setUserEstimate('');
    setTimeout(() => {
      if (trialIndex < QUESTIONS.length - 1) setTrialIndex(prev => prev + 1);
      else completeExperiment();
    }, settings.isi);
  };

  const completeExperiment = () => {
    setPhase('complete');
    const results: ExperimentResults = {
      experimentName: experiment.id,
      participantId,
      roomId,
      language,
      timestamp: new Date().toISOString(),
      totalTrials: trialData.length,
      responseTimeMs: Math.round(performance.now() - experimentStartTime),
      accuracy: 50,
      answer: trialData.length,
      correctAnswer: 'completion',
      trialData,
      debrief: t(experiment.debriefKey),
    };
    onComplete(results);
  };

  if (phase === 'instruction') {
    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="max-w-2xl mx-auto p-6">
          <h2 className="text-2xl font-bold text-navy-900 mb-4">{t('exp.availability.name')}</h2>
          <p className="text-gray-600 mb-4">{settings.customInstructions || t('exp.availability.instruction')}</p>
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
            <p className="text-blue-800">{t('exp.availability.instructionDetail')}</p>
          </div>
          <button onClick={() => setPhase('experiment')} className="bg-teal-600 text-white px-6 py-3 rounded-lg">{t('common.start')}</button>
        </div>
      </ExperimentWrapper>
    );
  }

  if (phase === 'complete') {
    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="max-w-2xl mx-auto p-6">
          <h2 className="text-2xl font-bold text-navy-900 mb-4">{t('common.debrief.title')}</h2>
          <div className="bg-teal-50 border-l-4 border-teal-500 p-4 mb-4">
            <p className="text-teal-800 font-medium">{t('common.debrief.thankYou')}</p>
          </div>
          <p className="text-gray-600 mb-4">{t('exp.availability.debrief')}</p>
        </div>
      </ExperimentWrapper>
    );
  }

  return (
    <ExperimentWrapper experiment={experiment}>
      <div className="max-w-2xl mx-auto p-6">
        {settings.showProgressBar && <div className="mb-6"><div className="h-2 bg-gray-200 rounded"><div className="h-full bg-teal-600" style={{ width: `${((trialIndex + 1) / QUESTIONS.length) * 100}%` }} /></div></div>}
        <h2 className="text-xl font-semibold text-navy-900 mb-6 text-center">{t(`exp.availability.${currentQuestion.question}`)}</h2>
        <div className="max-w-xs mx-auto mb-6">
          <input type="number" value={userEstimate} onChange={e => setUserEstimate(e.target.value)} placeholder="0" className="w-full px-4 py-3 text-center text-xl border-2 border-gray-200 rounded-lg" />
        </div>
        <div className="flex justify-center">
          <button onClick={handleSubmit} disabled={!userEstimate} className="bg-teal-600 text-white px-8 py-3 rounded-lg disabled:opacity-50">{t('common.submit')}</button>
        </div>
      </div>
    </ExperimentWrapper>
  );
}

export default AvailabilityExperiment;
