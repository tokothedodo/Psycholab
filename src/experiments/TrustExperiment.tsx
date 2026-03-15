/**
 * TRUST GAME - Economic Decision Experiment
 * 
 * Tests trust and reciprocity.
 * Player decides how much to send to partner who may reciprocate.
 */

import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ExperimentWrapper } from '../components/experiments/ExperimentWrapper';
import type { Experiment } from '../data/experiments';
import type { TrialData, ExperimentResults } from '../components/experiments/ExperimentWrapper';
import { getDefaultConfig } from './config/experimentDefaults';

interface TrustConfig {
  trials: number;
  isi: number;
  showFeedback: boolean;
  showProgressBar: boolean;
  customInstructions: string;
  randomizeOrder: boolean;
  practiceTrials: number;
  initialAmount: number;
  multiplier: number;
}

interface TrustProps {
  experiment: Experiment;
  onComplete: (results: ExperimentResults) => void;
  participantId: string;
  roomId: string;
  config?: Partial<TrustConfig>;
}

const DEFAULT_CONFIG = {
  ...getDefaultConfig('trust'),
  trials: 10,
  initialAmount: 100,
  multiplier: 3,
} as TrustConfig;

export function TrustExperiment({ experiment, onComplete, participantId, roomId, config = {} }: TrustProps) {
  const { t, language } = useLanguage();
  
  const settings: TrustConfig = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  const [phase, setPhase] = useState<'instruction' | 'experiment' | 'complete'>('instruction');
  const [trialIndex, setTrialIndex] = useState(0);
  const [trialData, setTrialData] = useState<TrialData[]>([]);
  const [experimentStartTime, setExperimentStartTime] = useState(0);
  const [trialStartTime, setTrialStartTime] = useState(0);
  const [sendAmount, setSendAmount] = useState(settings.initialAmount / 2);

  useEffect(() => {
    if (phase === 'instruction') setExperimentStartTime(performance.now());
  }, [phase]);

  useEffect(() => {
    if (phase === 'experiment') {
      setTrialStartTime(performance.now());
      setSendAmount(settings.initialAmount / 2);
    }
  }, [phase, trialIndex]);

  const handleSubmit = () => {
    const endTime = performance.now();
    const responseTime = Math.round(endTime - trialStartTime);
    
    const returnRate = 0.3 + Math.random() * 0.4;
    const returnedAmount = Math.round(sendAmount * settings.multiplier * returnRate);

    const trial: TrialData = {
      trialNumber: trialIndex + 1,
      responseTimeMs: responseTime,
      answer: String(sendAmount),
      correctAnswer: String(returnedAmount),
      stimulus: { sent: sendAmount, returned: returnedAmount, multiplier: settings.multiplier },
    };

    setTrialData(prev => [...prev, trial]);

    if (trialIndex < settings.trials - 1) {
      setTimeout(() => setTrialIndex(prev => prev + 1), settings.isi > 0 ? settings.isi : 500);
    } else {
      completeExperiment();
    }
  };

  const completeExperiment = () => {
    setPhase('complete');
    const endTime = performance.now();
    const totalTime = Math.round(endTime - experimentStartTime);
    
    const avgSent = trialData.reduce((sum, t) => sum + parseInt(String(t.answer), 10), 0) / trialData.length;

    const results: ExperimentResults = {
      experimentName: experiment.id,
      participantId,
      roomId,
      language,
      timestamp: new Date().toISOString(),
      totalTrials: trialData.length,
      responseTimeMs: totalTime,
      accuracy: 50,
      answer: avgSent,
      correctAnswer: 'avg_amount_sent',
      trialData: trialData,
      debrief: t(experiment.debriefKey),
    };

    onComplete(results);
  };

  if (phase === 'instruction') {
    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="max-w-2xl mx-auto p-6">
          <h2 className="text-2xl font-bold text-navy-900 mb-4">{t('exp.trust.name')}</h2>
          <p className="text-gray-600 mb-4">{settings.customInstructions || t('exp.trust.instruction')}</p>
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
            <p className="text-blue-800">{t('exp.trust.instructionDetail')}</p>
          </div>
          <button onClick={() => setPhase('experiment')} className="bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700">
            {t('common.start')}
          </button>
        </div>
      </ExperimentWrapper>
    );
  }

  if (phase === 'complete') {
    const avgSent = trialData.reduce((sum, t) => sum + parseInt(String(t.answer), 10), 0) / trialData.length;
    const trustLevel = avgSent / settings.initialAmount * 100;

    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="max-w-2xl mx-auto p-6">
          <h2 className="text-2xl font-bold text-navy-900 mb-4">{t('common.debrief.title')}</h2>
          <div className="bg-teal-50 border-l-4 border-teal-500 p-4 mb-4">
            <p className="text-teal-800 font-medium">{t('common.debrief.thankYou')}</p>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-navy-900">{Math.round(avgSent)}</p>
              <p className="text-sm text-gray-600">{t('exp.trust.avgSent')}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-navy-900">{Math.round(trustLevel)}%</p>
              <p className="text-sm text-gray-600">{t('exp.trust.trustLevel')}</p>
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg mb-4">
            <p className="text-amber-800 font-medium">{t('exp.trust.interpretation')}</p>
            <p className="text-sm text-amber-700">
              {trustLevel > 50 ? t('exp.trust.highTrust') : trustLevel > 25 ? t('exp.trust.moderateTrust') : t('exp.trust.lowTrust')}
            </p>
          </div>
          <p className="text-gray-600 mb-4">{t('exp.trust.debrief')}</p>
        </div>
      </ExperimentWrapper>
    );
  }

  return (
    <ExperimentWrapper experiment={experiment}>
      <div className="max-w-2xl mx-auto p-6">
        {settings.showProgressBar && (
          <div className="mb-6">
            <div className="h-2 bg-gray-200 rounded"><div className="h-full bg-teal-600" style={{ width: `${((trialIndex + 1) / settings.trials) * 100}%` }} /></div>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6 text-center">
          <p className="text-blue-800">{t('exp.trust.round')} {trialIndex + 1}</p>
          <p className="text-2xl font-bold text-blue-900">${settings.initialAmount}</p>
        </div>

        <h2 className="text-xl font-semibold text-navy-900 mb-6 text-center">{t('exp.trust.howMuchSend')}</h2>

        <div className="bg-gray-100 p-6 rounded-lg mb-6">
          <input
            type="range"
            min="0"
            max={settings.initialAmount}
            value={sendAmount}
            onChange={(e) => setSendAmount(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg"
          />
          <div className="flex justify-between mt-2">
            <span className="text-gray-600">$0</span>
            <span className="text-xl font-bold text-teal-600">${sendAmount}</span>
            <span className="text-gray-600">${settings.initialAmount}</span>
          </div>
        </div>

        <div className="flex justify-center gap-4 mb-4">
          <div className="bg-gray-50 p-3 rounded text-center">
            <p className="text-sm text-gray-600">{t('exp.trust.youKeep')}</p>
            <p className="font-bold">${settings.initialAmount - sendAmount}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded text-center">
            <p className="text-sm text-gray-600">{t('exp.trust.partnerGets')}</p>
            <p className="font-bold text-teal-600">${sendAmount * settings.multiplier}</p>
          </div>
        </div>

        <div className="flex justify-center">
          <button onClick={handleSubmit} className="bg-teal-600 text-white px-8 py-3 rounded-lg hover:bg-teal-700">
            {t('common.confirm')}
          </button>
        </div>
      </div>
    </ExperimentWrapper>
  );
}

export default TrustExperiment;
