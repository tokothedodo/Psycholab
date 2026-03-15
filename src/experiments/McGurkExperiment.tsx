/**
 * MCGURK EFFECT - Audiovisual Perception Experiment
 * 
 * Tests audiovisual speech perception integration.
 */

import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ExperimentWrapper } from './ExperimentWrapper';
import type { Experiment } from '../data/experiments';
import type { TrialData, ExperimentResults } from './ExperimentWrapper';
import { getDefaultConfig } from './config/experimentDefaults';

interface McGurkConfig {
  trials: number;
  isi: number;
  showFeedback: boolean;
  customInstructions: string;
}

interface McGurkProps {
  experiment: Experiment;
  onComplete: (results: ExperimentResults) => void;
  participantId: string;
  roomId: string;
  config?: Partial<McGurkConfig>;
}

const STIMULI = [
  { audio: 'ga', visual: 'ba', fused: 'da', congruent: false },
  { audio: 'ba', visual: 'ga', fused: 'da', congruent: false },
  { audio: 'pa', visual: 'ka', fused: 'ta', congruent: false },
  { audio: 'ga', visual: 'ga', fused: 'ga', congruent: true },
  { audio: 'ba', visual: 'ba', fused: 'ba', congruent: true },
];

const DEFAULT_CONFIG = { ...getDefaultConfig('mcgurk-effect'), trials: 20 } as McGurkConfig;

export function McGurkExperiment({ experiment, onComplete, participantId, roomId, config = {} }: McGurkProps) {
  const { t, language } = useLanguage();
  const settings: McGurkConfig = { ...DEFAULT_CONFIG, ...config };

  const [phase, setPhase] = useState<'instruction' | 'experiment' | 'complete'>('instruction');
  const [trialIndex, setTrialIndex] = useState(0);
  const [trialData, setTrialData] = useState<TrialData[]>([]);
  const [experimentStartTime, setExperimentStartTime] = useState(0);
  const [currentStimulus, setCurrentStimulus] = useState<typeof STIMULI[0] | null>(null);
  const [showStimulus, setShowStimulus] = useState(false);

  useEffect(() => { if (phase === 'instruction') setExperimentStartTime(performance.now()); }, [phase]);

  useEffect(() => {
    if (phase === 'experiment') {
      const idx = trialIndex % STIMULI.length;
      setCurrentStimulus(STIMULI[idx]);
      setShowStimulus(false);
      const timer = setTimeout(() => setShowStimulus(true), 500);
      return () => clearTimeout(timer);
    }
  }, [phase, trialIndex]);

  const handleResponse = (percept: string) => {
    if (!currentStimulus) return;
    const trial: TrialData = {
      trialNumber: trialIndex + 1,
      responseTimeMs: 500,
      answer: percept,
      correctAnswer: currentStimulus.fused,
      stimulus: { audio: currentStimulus.audio, visual: currentStimulus.visual },
    };
    setTrialData(prev => [...prev, trial]);
    setShowStimulus(false);
    setTimeout(() => {
      if (trialIndex < settings.trials - 1) setTrialIndex(prev => prev + 1);
      else completeExperiment();
    }, settings.isi);
  };

  const completeExperiment = () => {
    setPhase('complete');
    const mcgurkEffect = trialData.filter(t => t.answer !== (t.stimulus as { audio: string }).audio).length;
    const results: ExperimentResults = {
      experimentName: experiment.id,
      participantId,
      roomId,
      language,
      timestamp: new Date().toISOString(),
      totalTrials: trialData.length,
      responseTimeMs: Math.round(performance.now() - experimentStartTime),
      accuracy: (mcgurkEffect / trialData.length) * 100,
      answer: mcgurkEffect,
      correctAnswer: 'mcgurk_effect_count',
      trialData,
      debrief: t(experiment.debriefKey),
    };
    onComplete(results);
  };

  if (phase === 'instruction') {
    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="max-w-2xl mx-auto p-6">
          <h2 className="text-2xl font-bold text-navy-900 mb-4">{t('exp.mcgurk.name')}</h2>
          <p className="text-gray-600 mb-4">{settings.customInstructions || t('exp.mcgurk.instruction')}</p>
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
            <p className="text-blue-800">{t('exp.mcgurk.instructionDetail')}</p>
          </div>
          <button onClick={() => setPhase('experiment')} className="bg-teal-600 text-white px-6 py-3 rounded-lg">{t('common.start')}</button>
        </div>
      </ExperimentWrapper>
    );
  }

  if (phase === 'complete') {
    const mcgurkEffect = trialData.filter(t => t.answer !== (t.stimulus as { audio: string }).audio).length;
    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="max-w-2xl mx-auto p-6">
          <h2 className="text-2xl font-bold text-navy-900 mb-4">{t('common.debrief.title')}</h2>
          <div className="bg-teal-50 border-l-4 border-teal-500 p-4 mb-4">
            <p className="text-teal-800 font-medium">{t('common.debrief.thankYou')}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg text-center mb-6">
            <p className="text-2xl font-bold text-navy-900">{mcgurkEffect}/{trialData.length}</p>
            <p className="text-sm text-gray-600">{t('exp.mcgurk.effectInstances')}</p>
          </div>
          <p className="text-gray-600 mb-4">{t('exp.mcgurk.debrief')}</p>
        </div>
      </ExperimentWrapper>
    );
  }

  return (
    <ExperimentWrapper experiment={experiment}>
      <div className="max-w-2xl mx-auto p-6">
        <div className="mb-6"><div className="h-2 bg-gray-200 rounded"><div className="h-full bg-teal-600" style={{ width: `${((trialIndex + 1) / settings.trials) * 100}%` }} /></div></div>
        <div className="flex justify-center items-center min-h-[150px] mb-8">
          {showStimulus && currentStimulus && (
            <div className="bg-gray-100 p-8 rounded-full">
              <span className="text-3xl font-bold">{currentStimulus.visual}</span>
            </div>
          )}
        </div>
        <h2 className="text-xl font-semibold text-navy-900 mb-6 text-center">{t('exp.mcgurk.whatDidYouHear')}</h2>
        <div className="flex justify-center gap-4">
          {['ba', 'da', 'ga', 'pa'].map(phoneme => (
            <button key={phoneme} onClick={() => handleResponse(phoneme)} className="bg-gray-100 hover:bg-teal-50 border-2 border-gray-200 hover:border-teal-500 px-6 py-3 rounded-lg">
              {phoneme}
            </button>
          ))}
        </div>
      </div>
    </ExperimentWrapper>
  );
}

export default McGurkExperiment;
