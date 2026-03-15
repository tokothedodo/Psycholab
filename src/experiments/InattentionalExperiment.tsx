/**
 * INATTENTIONAL BLINDNESS - Attention Experiment
 * 
 * Tests attention allocation and unexpected stimuli detection.
 * Participants count passes while an unexpected event occurs.
 */

import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ExperimentWrapper } from './ExperimentWrapper';
import type { Experiment } from '../data/experiments';
import type { TrialData, ExperimentResults } from './ExperimentWrapper';
import { getDefaultConfig } from './config/experimentDefaults';

interface InattentionalConfig {
  trials: number;
  stimulusDuration: number;
  showFeedback: boolean;
  showProgressBar: boolean;
  customInstructions: string;
  practiceTrials: number;
}

interface InattentionalProps {
  experiment: Experiment;
  onComplete: (results: ExperimentResults) => void;
  participantId: string;
  roomId: string;
  config?: Partial<InattentionalConfig>;
}

const DEFAULT_CONFIG = {
  ...getDefaultConfig('inattentional'),
  trials: 1,
  stimulusDuration: 20000,
} as InattentionalConfig;

export function InattentionalExperiment({ experiment, onComplete, participantId, roomId, config = {} }: InattentionalProps) {
  const { t, language } = useLanguage();
  
  const settings: InattentionalConfig = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  const [phase, setPhase] = useState<'instruction' | 'counting' | 'question' | 'complete'>('instruction');
  const [passCount, setPassCount] = useState(0);
  const [targetDetected, setTargetDetected] = useState<boolean | null>(null);
  const [experimentStartTime, setExperimentStartTime] = useState(0);
  const [trialStartTime, setTrialStartTime] = useState(0);
  const [showUnexpected, setShowUnexpected] = useState(false);
  const [trialData, setTrialData] = useState<TrialData[]>([]);

  useEffect(() => {
    if (phase === 'instruction') {
      setExperimentStartTime(performance.now());
    }
  }, [phase]);

  const startCounting = () => {
    setPhase('counting');
    setTrialStartTime(performance.now());
    setPassCount(0);
    setShowUnexpected(false);

    setTimeout(() => {
      setShowUnexpected(true);
    }, settings.stimulusDuration * 0.6);

    setTimeout(() => {
      setPhase('question');
    }, settings.stimulusDuration);
  };

  const handleResponse = (detected: boolean) => {
    const endTime = performance.now();
    const responseTime = Math.round(endTime - trialStartTime);
    
    setTargetDetected(detected);

    const trial: TrialData = {
      trialNumber: 1,
      responseTimeMs: responseTime,
      answer: detected ? 'detected' : 'not_detected',
      correctAnswer: 'detected',
      stimulus: { passCount, detected },
    };

    setTrialData([trial]);

    setTimeout(() => {
      completeExperiment();
    }, 1000);
  };

  const completeExperiment = () => {
    setPhase('complete');
    const endTime = performance.now();
    const totalTime = Math.round(endTime - experimentStartTime);

    const results: ExperimentResults = {
      experimentName: experiment.id,
      participantId,
      roomId,
      language,
      timestamp: new Date().toISOString(),
      totalTrials: 1,
      responseTimeMs: totalTime,
      accuracy: targetDetected ? 100 : 0,
      answer: targetDetected ? 'detected' : 'not_detected',
      correctAnswer: 'detection_result',
      trialData: trialData,
      debrief: t(experiment.debriefKey),
    };

    onComplete(results);
  };

  const passColors = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6'];

  if (phase === 'instruction') {
    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="max-w-2xl mx-auto p-6">
          <h2 className="text-2xl font-bold text-navy-900 mb-4">{t('exp.inattentional.name')}</h2>
          <p className="text-gray-600 mb-4">
            {settings.customInstructions || t('exp.inattentional.instruction')}
          </p>
          <p className="text-sm text-gray-500 mb-4">
            {t('citation')}: {experiment.citation}, {experiment.year}
          </p>
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
            <p className="text-blue-800">{t('exp.inattentional.instructionDetail')}</p>
          </div>
          <button
            onClick={startCounting}
            className="bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 transition-colors"
          >
            {t('common.start')}
          </button>
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
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <p className="text-lg text-center">{t('exp.inattentional.youCounted')}: {passCount}</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg mb-4">
            <p className="text-amber-800 font-medium mb-2">{t('exp.inattentional.didYouSee')}</p>
            <p className="text-2xl font-bold text-center">{targetDetected ? t('common.yes') : t('common.no')}</p>
            {targetDetected && (
              <p className="text-sm text-amber-700 mt-2">{t('exp.inattentional.surprised')}</p>
            )}
            {!targetDetected && (
              <p className="text-sm text-amber-700 mt-2">{t('exp.inattentional.explanation')}</p>
            )}
          </div>
          <p className="text-gray-600 mb-4">{t('exp.inattentional.debrief')}</p>
        </div>
      </ExperimentWrapper>
    );
  }

  if (phase === 'question') {
    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="max-w-2xl mx-auto p-6">
          <h2 className="text-xl font-semibold text-navy-900 mb-6 text-center">
            {t('exp.inattentional.howManyPasses')}
          </h2>
          <div className="bg-gray-100 p-8 rounded-lg mb-6 text-center">
            <p className="text-4xl font-bold text-navy-900">{passCount}</p>
          </div>
          <h2 className="text-xl font-semibold text-navy-900 mb-4 text-center">
            {t('exp.inattentional.sawUnexpected')}
          </h2>
          <div className="flex justify-center gap-6">
            <button
              onClick={() => handleResponse(true)}
              className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-4 rounded-lg transition-all"
            >
              <span className="text-lg font-semibold">{t('common.yes')}</span>
            </button>
            <button
              onClick={() => handleResponse(false)}
              className="bg-gray-200 hover:bg-gray-300 text-navy-900 px-8 py-4 rounded-lg transition-all"
            >
              <span className="text-lg font-semibold">{t('common.no')}</span>
            </button>
          </div>
        </div>
      </ExperimentWrapper>
    );
  }

  return (
    <ExperimentWrapper experiment={experiment}>
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6 text-center">
          <p className="text-blue-800 font-medium">{t('exp.inattentional.countPasses')}</p>
        </div>
        
        <div className="relative bg-gray-800 rounded-lg mx-auto" style={{ width: 500, height: 350 }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="absolute transition-all duration-1000 rounded-full flex items-center justify-center text-white font-bold"
              style={{
                width: 40,
                height: 40,
                backgroundColor: passColors[i],
                left: `${20 + (i * 80) % 400}px`,
                top: `${50 + Math.floor(i / 3) * 150}px`,
              }}
            >
              {i + 1}
            </div>
          ))}
          
          {showUnexpected && (
            <div
              className="absolute transition-all duration-500"
              style={{
                width: 60,
                height: 60,
                backgroundColor: '#ffd700',
                borderRadius: '50%',
                left: '45%',
                top: '40%',
                fontSize: 24,
              }}
            >
              🌙
            </div>
          )}
        </div>
        
        <p className="text-center text-gray-500 mt-4">
          {t('exp.inattentional.counting')}...
        </p>
      </div>
    </ExperimentWrapper>
  );
}

export default InattentionalExperiment;
