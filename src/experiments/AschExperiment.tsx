/**
 * ASCH CONFORMITY - Social Psychology Experiment
 * 
 * Tests social pressure and conformity.
 */

import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ExperimentWrapper } from '../components/experiments/ExperimentWrapper';
import type { Experiment } from '../data/experiments';
import type { TrialData, ExperimentResults } from '../components/experiments/ExperimentWrapper';
import { getDefaultConfig } from './config/experimentDefaults';

interface AschConfig {
  trials: number;
  showFeedback: boolean;
  customInstructions: string;
}

interface AschProps {
  experiment: Experiment;
  onComplete: (results: ExperimentResults) => void;
  participantId: string;
  roomId: string;
  config?: Partial<AschConfig>;
}

const TRIALS = [
  { lines: [{id: 1, len: 3}, {id: 2, len: 5}, {id: 3, len: 2}], correct: 2, standard: 1 },
  { lines: [{id: 1, len: 4}, {id: 2, len: 2}, {id: 3, len: 5}], correct: 3, standard: 1 },
  { lines: [{id: 1, len: 3}, {id: 2, len: 6}, {id: 3, len: 4}], correct: 2, standard: 1 },
];

const DEFAULT_CONFIG = { ...getDefaultConfig('asch'), trials: 6 } as AschConfig;

export function AschExperiment({ experiment, onComplete, participantId, roomId, config = {} }: AschProps) {
  const { t, language } = useLanguage();
  const settings: AschConfig = { ...DEFAULT_CONFIG, ...config };

  const [phase, setPhase] = useState<'instruction' | 'experiment' | 'complete'>('instruction');
  const [trialIndex, setTrialIndex] = useState(0);
  const [trialData, setTrialData] = useState<TrialData[]>([]);
  const [experimentStartTime, setExperimentStartTime] = useState(0);
  const [confederateAnswer, setConfederateAnswer] = useState<number | null>(null);
  const [showConfederate, setShowConfederate] = useState(false);

  useEffect(() => { if (phase === 'instruction') setExperimentStartTime(performance.now()); }, [phase]);

  const currentTrial = TRIALS[trialIndex % TRIALS.length];

  useEffect(() => {
    if (phase === 'experiment' && !showConfederate) {
      const timer = setTimeout(() => {
        setConfederateAnswer(currentTrial.correct === 1 ? 2 : 1);
        setShowConfederate(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [phase, trialIndex]);

  const handleResponse = (answer: number) => {
    const conformed = answer === confederateAnswer;
    const trial: TrialData = {
      trialNumber: trialIndex + 1,
      responseTimeMs: 500,
      answer: String(answer),
      correctAnswer: String(currentTrial.correct),
      stimulus: { conformed, confederateAnswer },
    };
    setTrialData(prev => [...prev, trial]);
    setShowConfederate(false);
    setConfederateAnswer(null);
    setTimeout(() => {
      if (trialIndex < settings.trials - 1) setTrialIndex(prev => prev + 1);
      else completeExperiment();
    }, 1000);
  };

  const completeExperiment = () => {
    setPhase('complete');
    const conformed = trialData.filter(t => (t.stimulus as { conformed: boolean }).conformed).length;
    const results: ExperimentResults = {
      experimentName: experiment.id,
      participantId,
      roomId,
      language,
      timestamp: new Date().toISOString(),
      totalTrials: trialData.length,
      responseTimeMs: Math.round(performance.now() - experimentStartTime),
      accuracy: ((settings.trials - conformed) / settings.trials) * 100,
      answer: conformed,
      correctAnswer: 'conformity_count',
      trialData,
      debrief: t(experiment.debriefKey),
    };
    onComplete(results);
  };

  if (phase === 'instruction') {
    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="max-w-2xl mx-auto p-6">
          <h2 className="text-2xl font-bold text-navy-900 mb-4">{t('exp.asch.name')}</h2>
          <p className="text-gray-600 mb-4">{settings.customInstructions || t('exp.asch.instruction')}</p>
          <button onClick={() => setPhase('experiment')} className="bg-teal-600 text-white px-6 py-3 rounded-lg">{t('common.start')}</button>
        </div>
      </ExperimentWrapper>
    );
  }

  if (phase === 'complete') {
    const conformed = trialData.filter(t => (t.stimulus as { conformed: boolean }).conformed).length;
    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="max-w-2xl mx-auto p-6">
          <h2 className="text-2xl font-bold text-navy-900 mb-4">{t('common.debrief.title')}</h2>
          <div className="bg-teal-50 border-l-4 border-teal-500 p-4 mb-4">
            <p className="text-teal-800 font-medium">{t('common.debrief.thankYou')}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg text-center mb-6">
            <p className="text-2xl font-bold text-navy-900">{conformed}/{trialData.length}</p>
            <p className="text-sm text-gray-600">{t('exp.asch.conformed')}</p>
          </div>
          <p className="text-gray-600 mb-4">{t('exp.asch.debrief')}</p>
        </div>
      </ExperimentWrapper>
    );
  }

  return (
    <ExperimentWrapper experiment={experiment}>
      <div className="max-w-2xl mx-auto p-6">
        <div className="mb-6"><div className="h-2 bg-gray-200 rounded"><div className="h-full bg-teal-600" style={{ width: `${((trialIndex + 1) / settings.trials) * 100}%` }} /></div></div>
        <div className="mb-6">
          <p className="text-gray-500 text-sm mb-2">{t('exp.asch.standard')}</p>
          <div className="flex justify-center gap-4">
            <div className="w-48 border-b-4 border-navy-900"></div>
          </div>
        </div>
        <div className="mb-6">
          <p className="text-gray-500 text-sm mb-2">{t('exp.asch.compare')}</p>
          <div className="flex justify-center gap-8">
            {currentTrial.lines.map(line => (
              <div key={line.id} className="text-center">
                <div className={`w-8 border-b-4 border-navy-900 ${line.id === currentTrial.standard ? 'mb-8' : ''}`} style={{ height: line.len * 20 }}></div>
                <span className="text-gray-500">{line.id}</span>
              </div>
            ))}
          </div>
        </div>
        {showConfederate && confederateAnswer && (
          <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg mb-4 text-center">
            <p className="text-blue-800">{t('exp.asch.othersSay')}: {confederateAnswer}</p>
          </div>
        )}
        <h2 className="text-xl font-semibold text-navy-900 mb-6 text-center">{t('exp.asch.whichLine')}</h2>
        <div className="flex justify-center gap-4">
          {[1, 2, 3].map(num => (
            <button key={num} onClick={() => handleResponse(num)} className="bg-gray-100 hover:bg-teal-50 border-2 border-gray-200 hover:border-teal-500 px-6 py-3 rounded-lg">
              {num}
            </button>
          ))}
        </div>
      </div>
    </ExperimentWrapper>
  );
}

export default AschExperiment;
