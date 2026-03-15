/**
 * ULTIMATUM GAME - Economic Decision Experiment
 * 
 * Tests fairness preferences in bargaining.
 * Proposer suggests a split, responder can accept or reject.
 */

import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ExperimentWrapper } from '../components/experiments/ExperimentWrapper';
import type { Experiment } from '../data/experiments';
import type { TrialData, ExperimentResults } from '../components/experiments/ExperimentWrapper';
import { getDefaultConfig } from './config/experimentDefaults';

interface UltimatumConfig {
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
  minOffer: number;
}

interface UltimatumProps {
  experiment: Experiment;
  onComplete: (results: ExperimentResults) => void;
  participantId: string;
  roomId: string;
  config?: Partial<UltimatumConfig>;
}

const DEFAULT_CONFIG = {
  ...getDefaultConfig('ultimatum'),
  totalAmount: 100,
  minOffer: 5,
  trials: 10,
} as UltimatumConfig;

export function UltimatumExperiment({ experiment, onComplete, participantId, roomId, config = {} }: UltimatumProps) {
  const { t, language } = useLanguage();
  
  const settings: UltimatumConfig = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  const [phase, setPhase] = useState<'instruction' | 'experiment' | 'complete'>('instruction');
  const [trialIndex, setTrialIndex] = useState(0);
  const [trialData, setTrialData] = useState<TrialData[]>([]);
  const [experimentStartTime, setExperimentStartTime] = useState(0);
  const [trialStartTime, setTrialStartTime] = useState(0);
  const [currentOffer, setCurrentOffer] = useState(0);
  const [playerRole, setPlayerRole] = useState<'proposer' | 'responder'>('responder');

  const generateOffers = (): number[] => {
    const offers: number[] = [];
    for (let i = settings.minOffer; i <= settings.totalAmount; i += 10) {
      offers.push(i);
    }
    return offers.sort(() => Math.random() - 0.5).slice(0, settings.trials);
  };

  const [allOffers] = useState(generateOffers);

  useEffect(() => {
    if (phase === 'instruction') {
      setExperimentStartTime(performance.now());
    }
  }, [phase]);

  useEffect(() => {
    if (phase === 'experiment') {
      setTrialStartTime(performance.now());
      setCurrentOffer(allOffers[trialIndex]);
      setPlayerRole(trialIndex % 2 === 0 ? 'responder' : 'proposer');
    }
  }, [phase, trialIndex]);

  const handleResponse = (response: 'accept' | 'reject' | 'offer') => {
    const endTime = performance.now();
    const responseTime = Math.round(endTime - trialStartTime);
    
    const fairnessThreshold = settings.totalAmount * 0.4;
    const isFair = currentOffer >= fairnessThreshold;

    const trial: TrialData = {
      trialNumber: trialIndex + 1,
      responseTimeMs: responseTime,
      answer: response,
      correctAnswer: isFair ? 'accept' : 'reject',
      stimulus: { offer: currentOffer, role: playerRole, amount: settings.totalAmount },
    };

    setTrialData(prev => [...prev, trial]);

    setTimeout(() => {
      if (trialIndex < allOffers.length - 1) {
        setTrialIndex(prev => prev + 1);
      } else {
        completeExperiment();
      }
    }, settings.isi > 0 ? settings.isi : 500);
  };

  const completeExperiment = () => {
    setPhase('complete');
    const endTime = performance.now();
    const totalTime = Math.round(endTime - experimentStartTime);
    
    const acceptedOffers = trialData.filter(t => t.answer === 'accept').length;
    const rejectionRate = ((trialData.length - acceptedOffers) / trialData.length) * 100;

    const results: ExperimentResults = {
      experimentName: experiment.id,
      participantId,
      roomId,
      language,
      timestamp: new Date().toISOString(),
      totalTrials: trialData.length,
      responseTimeMs: totalTime,
      accuracy: 100 - rejectionRate,
      answer: rejectionRate,
      correctAnswer: 'rejection_rate',
      trialData: trialData,
      debrief: t(experiment.debriefKey),
    };

    onComplete(results);
  };

  if (phase === 'instruction') {
    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="max-w-2xl mx-auto p-6">
          <h2 className="text-2xl font-bold text-navy-900 mb-4">{t('exp.ultimatum.name')}</h2>
          <p className="text-gray-600 mb-4">
            {settings.customInstructions || t('exp.ultimatum.instruction')}
          </p>
          <p className="text-sm text-gray-500 mb-4">
            {t('citation')}: {experiment.citation}, {experiment.year}
          </p>
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
            <p className="text-blue-800">{t('exp.ultimatum.instructionDetail')}</p>
          </div>
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
    const accepted = trialData.filter(t => t.answer === 'accept').length;
    const rejected = trialData.filter(t => t.answer === 'reject').length;

    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="max-w-2xl mx-auto p-6">
          <h2 className="text-2xl font-bold text-navy-900 mb-4">{t('common.debrief.title')}</h2>
          <div className="bg-teal-50 border-l-4 border-teal-500 p-4 mb-4">
            <p className="text-teal-800 font-medium">{t('common.debrief.thankYou')}</p>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-navy-900">{accepted}</p>
              <p className="text-sm text-gray-600">{t('exp.ultimatum.accepted')}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-navy-900">{rejected}</p>
              <p className="text-sm text-gray-600">{t('exp.ultimatum.rejected')}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-navy-900">{Math.round(trialData.reduce((s, t) => s + t.responseTimeMs, 0) / trialData.length)}ms</p>
              <p className="text-sm text-gray-600">{t('common.avgRT')}</p>
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg mb-4">
            <p className="text-amber-800 font-medium mb-2">{t('exp.ultimatum.yourBehavior')}:</p>
            <p className="text-sm text-amber-700">
              {rejected > accepted / 2 
                ? t('exp.ultimatum.strict') 
                : rejected > accepted / 4 
                  ? t('exp.ultimatum.moderate')
                  : t('exp.ultimatum.flexible')}
            </p>
            <p className="text-sm text-amber-700 mt-2">{t('exp.ultimatum.interpretation')}</p>
          </div>
          <p className="text-gray-600 mb-4">{t('exp.ultimatum.debrief')}</p>
        </div>
      </ExperimentWrapper>
    );
  }

  return (
    <ExperimentWrapper experiment={experiment}>
      <div className="max-w-2xl mx-auto p-6">
        {settings.showProgressBar && (
          <div className="mb-6">
            <div className="h-2 bg-gray-200 rounded overflow-hidden">
              <div className="h-full bg-teal-600 transition-all" style={{ width: `${((trialIndex + 1) / allOffers.length) * 100}%` }} />
            </div>
            <p className="text-sm text-gray-500 text-center mt-1">
              {trialIndex + 1} / {allOffers.length}
            </p>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6 text-center">
          <p className="text-blue-800 font-medium">{t('exp.ultimatum.offer')}: <span className="text-2xl">${currentOffer}</span> / ${settings.totalAmount}</p>
        </div>

        <h2 className="text-xl font-semibold text-navy-900 mb-6 text-center">
          {playerRole === 'responder' ? t('exp.ultimatum.acceptOffer') : t('exp.ultimatum.makeOffer')}
        </h2>

        {playerRole === 'responder' ? (
          <div className="flex justify-center gap-6">
            <button
              onClick={() => handleResponse('accept')}
              className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-4 rounded-lg transition-all"
            >
              <span className="text-lg font-semibold">{t('exp.ultimatum.accept')}</span>
              <p className="text-sm mt-1 opacity-80">${settings.totalAmount - currentOffer} for you</p>
            </button>
            <button
              onClick={() => handleResponse('reject')}
              className="bg-gray-200 hover:bg-gray-300 text-navy-900 px-8 py-4 rounded-lg transition-all"
            >
              <span className="text-lg font-semibold">{t('exp.ultimatum.reject')}</span>
              <p className="text-sm mt-1 opacity-80">{t('exp.ultimatum.bothGetNothing')}</p>
            </button>
          </div>
        ) : (
          <div className="flex justify-center gap-6">
            <button
              onClick={() => handleResponse('offer')}
              className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-4 rounded-lg transition-all"
            >
              <span className="text-lg font-semibold">{t('exp.ultimatum.propose')}</span>
              <p className="text-sm mt-1 opacity-80">${currentOffer} / ${settings.totalAmount}</p>
            </button>
          </div>
        )}
      </div>
    </ExperimentWrapper>
  );
}

export default UltimatumExperiment;
