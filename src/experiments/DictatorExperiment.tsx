/**
 * DICTATOR GAME - Economic Decision Experiment
 * 
 * Tests altruism and resource allocation behavior.
 * The participant decides how to split a sum of money between themselves and a stranger.
 */

import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ExperimentWrapper } from '../components/experiments/ExperimentWrapper';
import type { Experiment } from '../data/experiments';
import type { TrialData, ExperimentResults } from '../components/experiments/ExperimentWrapper';
import { getDefaultConfig } from './config/experimentDefaults';

interface DictatorConfig {
  trials: number;
  isi: number;
  stimulusDuration: number;
  responseTimeLimit: number;
  showFeedback: boolean;
  showProgressBar: boolean;
  customInstructions: string;
  randomizeOrder: boolean;
  practiceTrials: number;
  outlierRemoval: boolean;
  outlierThreshold: number;
  totalAmount: number;
  showPartnerInfo: boolean;
}

interface DictatorProps {
  experiment: Experiment;
  onComplete: (results: ExperimentResults) => void;
  participantId: string;
  roomId: string;
  config?: Partial<DictatorConfig>;
}

interface Recipient {
  id: string;
  name: string;
  description: string;
  descriptionKey: string;
}

const DEFAULT_CONFIG = {
  ...getDefaultConfig('dictator'),
  totalAmount: 100,
  showPartnerInfo: true,
  trials: 3,
} as DictatorConfig;

const RECIPIENTS: Recipient[] = [
  { id: 'stranger', name: 'Stranger', description: 'A random person from your country', descriptionKey: 'exp.dictator.recipient.stranger' },
  { id: 'charity', name: 'Charity', description: 'A local charity helping children', descriptionKey: 'exp.dictator.recipient.charity' },
  { id: 'friend', name: 'Friend', description: 'A close friend of yours', descriptionKey: 'exp.dictator.recipient.friend' },
];

export function DictatorExperiment({ experiment, onComplete, participantId, roomId, config = {} }: DictatorProps) {
  const { t, language } = useLanguage();
  
  const settings: DictatorConfig = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  const [phase, setPhase] = useState<'instruction' | 'experiment' | 'complete'>('instruction');
  const [trialIndex, setTrialIndex] = useState(0);
  const [trialData, setTrialData] = useState<TrialData[]>([]);
  const [experimentStartTime, setExperimentStartTime] = useState(0);
  const [trialStartTime, setTrialStartTime] = useState(0);
  const [userShare, setUserShare] = useState<number>(50);
  const [showResult, setShowResult] = useState(false);

  const generateStimuli = (): Recipient[] => {
    let stimuli = [...RECIPIENTS];
    if (settings.randomizeOrder) {
      stimuli = stimuli.sort(() => Math.random() - 0.5);
    }
    return stimuli.slice(0, settings.trials);
  };

  const [allRecipients] = useState(generateStimuli);

  useEffect(() => {
    if (phase === 'instruction') {
      setExperimentStartTime(performance.now());
    }
  }, [phase]);

  useEffect(() => {
    if (phase === 'experiment') {
      setTrialStartTime(performance.now());
      setUserShare(50);
      setShowResult(false);
    }
  }, [phase, trialIndex]);

  useEffect(() => {
    if (settings.responseTimeLimit > 0 && phase === 'experiment' && showResult) {
      const timer = setTimeout(() => {
        handleSubmit();
      }, settings.responseTimeLimit);
      return () => clearTimeout(timer);
    }
  }, [phase, trialIndex, settings.responseTimeLimit, showResult]);

  const handleSubmit = () => {
    const recipientShare = settings.totalAmount - userShare;
    const endTime = performance.now();
    const responseTime = Math.round(endTime - trialStartTime);

    const currentRecipient = allRecipients[trialIndex];
    
    const trial: TrialData = {
      trialNumber: trialIndex + 1,
      responseTimeMs: responseTime,
      answer: String(userShare),
      correctAnswer: String(recipientShare),
      stimulus: {
        recipientId: currentRecipient.id,
        recipientName: currentRecipient.name,
        totalAmount: settings.totalAmount,
      },
    };

    setTrialData(prev => [...prev, trial]);

    if (trialIndex < allRecipients.length - 1) {
      setTimeout(() => {
        setTrialIndex(prev => prev + 1);
      }, settings.isi > 0 ? settings.isi : 1000);
    } else {
      setTimeout(() => {
        completeExperiment();
      }, settings.isi > 0 ? settings.isi : 1000);
    }
  };

  const completeExperiment = () => {
    setPhase('complete');
    const endTime = performance.now();
    const totalTime = Math.round(endTime - experimentStartTime);
    
    const avgShare = trialData.reduce((sum, t) => sum + parseInt(String(t.answer), 10), 0) / trialData.length;

    const results: ExperimentResults = {
      experimentName: experiment.id,
      participantId,
      roomId,
      language,
      timestamp: new Date().toISOString(),
      totalTrials: trialData.length,
      responseTimeMs: totalTime,
      accuracy: avgShare,
      answer: avgShare,
      correctAnswer: 'average_offered_percentage',
      trialData: trialData,
      debrief: t(experiment.debriefKey),
    };

    onComplete(results);
  };

  if (phase === 'instruction') {
    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="max-w-2xl mx-auto p-6">
          <h2 className="text-2xl font-bold text-navy-900 mb-4">{t('exp.dictator.name')}</h2>
          <p className="text-gray-600 mb-4">
            {settings.customInstructions || t('exp.dictator.instruction')}
          </p>
          <p className="text-sm text-gray-500 mb-4">
            {t('citation')}: {experiment.citation}, {experiment.year}
          </p>
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
            <p className="text-blue-800 mb-2">{t('exp.dictator.howItWorks')}</p>
            <ul className="text-blue-700 text-sm list-disc list-inside">
              <li>{t('exp.dictator.step1')}</li>
              <li>{t('exp.dictator.step2')}</li>
              <li>{t('exp.dictator.step3')}</li>
            </ul>
          </div>
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg mb-6">
            <p className="text-amber-800">{t('exp.dictator.realMoney')}</p>
          </div>
          <p className="text-xs text-gray-400 mb-4">
            {settings.trials} rounds | {t('exp.dictator.amount')}: ${settings.totalAmount}
          </p>
          <button
            onClick={() => setPhase('experiment')}
            className="bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 transition-colors"
          >
            {t('common.start')}
          </button>
        </div>
      </ExperimentWrapper>
    );
  }

  if (phase === 'complete') {
    const avgGiven = trialData.reduce((sum, t) => sum + (settings.totalAmount - parseInt(String(t.answer), 10)), 0) / trialData.length;
    
    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="max-w-2xl mx-auto p-6">
          <h2 className="text-2xl font-bold text-navy-900 mb-4">{t('common.debrief.title')}</h2>
          
          <div className="bg-teal-50 border-l-4 border-teal-500 p-4 mb-4">
            <p className="text-teal-800 font-medium">{t('common.debrief.thankYou')}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-navy-900">{Math.round(avgGiven)}%</p>
              <p className="text-sm text-gray-600">{t('exp.dictator.avgGiven')}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-navy-900">{Math.round(trialData.reduce((s, t) => s + t.responseTimeMs, 0) / trialData.length)}ms</p>
              <p className="text-sm text-gray-600">{t('common.avgRT')}</p>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            {trialData.map((trial, i) => {
              const stimulus = trial.stimulus as { recipientName: string };
              return (
                <div key={i} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                  <span className="text-gray-600">{stimulus.recipientName}</span>
                  <span className="font-semibold">{trial.answer} / {settings.totalAmount}</span>
                </div>
              );
            })}
          </div>

          <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg mb-4">
            <p className="text-amber-800 font-medium mb-2">{t('exp.dictator.yourBehavior')}:</p>
            <p className="text-sm text-amber-700">
              {avgGiven > 40 
                ? t('exp.dictator.highlyGenerous')
                : avgGiven > 20 
                  ? t('exp.dictator.moderatelyGenerous')
                  : t('exp.dictator.selfInterested')}
            </p>
            <p className="text-sm text-amber-700 mt-2">{t('exp.dictator.interpretation')}</p>
          </div>

          <p className="text-gray-600 mb-4">{t('exp.dictator.debrief')}</p>
        </div>
      </ExperimentWrapper>
    );
  }

  const currentRecipient = allRecipients[trialIndex];

  return (
    <ExperimentWrapper experiment={experiment}>
      <div className="max-w-2xl mx-auto p-6">
        {settings.showProgressBar && (
          <div className="mb-6">
            <div className="h-2 bg-gray-200 rounded overflow-hidden">
              <div 
                className="h-full bg-teal-600 transition-all"
                style={{ width: `${((trialIndex + 1) / allRecipients.length) * 100}%` }}
              />
            </div>
            <p className="text-sm text-gray-500 text-center mt-1">
              {trialIndex + 1} / {allRecipients.length}
            </p>
          </div>
        )}

        <div className="mb-6 text-center">
          <span className="inline-block bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm">
            {t('exp.dictator.round')} {trialIndex + 1}
          </span>
        </div>

        {settings.showPartnerInfo && (
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6 text-center">
            <p className="text-blue-800 font-medium">{t('exp.dictator.youWillSplitWith')}:</p>
            <p className="text-blue-700">{t(currentRecipient.descriptionKey)}</p>
          </div>
        )}

        <div className="bg-gray-100 p-6 rounded-lg mb-6">
          <p className="text-center text-gray-600 mb-4">{t('exp.dictator.totalAmount')}: <span className="font-bold text-2xl text-navy-900">${settings.totalAmount}</span></p>
          
          <div className="mb-4">
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">{t('exp.dictator.youKeep')}:</span>
              <span className="font-bold text-teal-600">${userShare}</span>
            </div>
            <input
              type="range"
              min="0"
              max={settings.totalAmount}
              value={userShare}
              onChange={(e) => setUserShare(parseInt(e.target.value, 10))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between mt-1">
              <span className="text-xs text-gray-400">$0</span>
              <span className="text-xs text-gray-400">${settings.totalAmount}</span>
            </div>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-600">{t('exp.dictator.theyGet')}:</span>
            <span className="font-bold text-amber-600">${settings.totalAmount - userShare}</span>
          </div>
        </div>

        <div className="flex justify-center">
          <button
            onClick={handleSubmit}
            className="bg-teal-600 text-white px-8 py-3 rounded-lg hover:bg-teal-700 transition-colors"
          >
            {t('common.confirm')}
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          {t('exp.dictator.sliderHint')}
        </p>
      </div>
    </ExperimentWrapper>
  );
}

export default DictatorExperiment;
