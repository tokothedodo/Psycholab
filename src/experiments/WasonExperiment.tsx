/**
 * WASON SELECTION TASK - Logical Reasoning Experiment
 * 
 * Tests logical reasoning and confirmation bias.
 */

import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ExperimentWrapper } from '../components/experiments/ExperimentWrapper';
import type { Experiment } from '../data/experiments';
import type { TrialData, ExperimentResults } from '../components/experiments/ExperimentWrapper';
import { getDefaultConfig } from './config/experimentDefaults';

interface WasonConfig {
  trials: number;
  isi: number;
  showFeedback: boolean;
  showProgressBar: boolean;
  customInstructions: string;
}

interface WasonProps {
  experiment: Experiment;
  onComplete: (results: ExperimentResults) => void;
  participantId: string;
  roomId: string;
  config?: Partial<WasonConfig>;
}

const SCENARIOS = [
  { rule: 'if vowel then even', cards: ['A', 'K', '4', '7'], correct: ['A', '4'] },
  { rule: 'if consonant then odd', cards: ['B', '2', '5', '9'], correct: ['B', '5', '9'] },
];

const DEFAULT_CONFIG = { ...getDefaultConfig('wason'), trials: 4 } as WasonConfig;

export function WasonExperiment({ experiment, onComplete, participantId, roomId, config = {} }: WasonProps) {
  const { t, language } = useLanguage();
  const settings: WasonConfig = { ...DEFAULT_CONFIG, ...config };

  const [phase, setPhase] = useState<'instruction' | 'experiment' | 'complete'>('instruction');
  const [trialIndex, setTrialIndex] = useState(0);
  const [trialData, setTrialData] = useState<TrialData[]>([]);
  const [experimentStartTime, setExperimentStartTime] = useState(0);
  const [selectedCards, setSelectedCards] = useState<string[]>([]);

  useEffect(() => { if (phase === 'instruction') setExperimentStartTime(performance.now()); }, [phase]);

  const currentScenario = SCENARIOS[trialIndex % SCENARIOS.length];

  const handleCardToggle = (card: string) => {
    setSelectedCards(prev => prev.includes(card) ? prev.filter(c => c !== card) : [...prev, card]);
  };

  const handleSubmit = () => {
    const trial: TrialData = {
      trialNumber: trialIndex + 1,
      responseTimeMs: 500,
      answer: selectedCards.join(','),
      correctAnswer: currentScenario.correct.join(','),
      stimulus: { rule: currentScenario.rule },
    };
    setTrialData(prev => [...prev, trial]);
    setSelectedCards([]);
    setTimeout(() => {
      if (trialIndex < settings.trials - 1) setTrialIndex(prev => prev + 1);
      else completeExperiment();
    }, settings.isi);
  };

  const completeExperiment = () => {
    setPhase('complete');
    const correct = trialData.filter(t => t.answer === t.correctAnswer).length;
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
      correctAnswer: 'correct_count',
      trialData,
      debrief: t(experiment.debriefKey),
    };
    onComplete(results);
  };

  if (phase === 'instruction') {
    return (
      <ExperimentWrapper experiment={experiment}>
        <div className="max-w-2xl mx-auto p-6">
          <h2 className="text-2xl font-bold text-navy-900 mb-4">{t('exp.wason.name')}</h2>
          <p className="text-gray-600 mb-4">{settings.customInstructions || t('exp.wason.instruction')}</p>
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
            <p className="text-blue-800">{t('exp.wason.instructionDetail')}</p>
          </div>
          <button onClick={() => setPhase('experiment')} className="bg-teal-600 text-white px-6 py-3 rounded-lg">{t('common.start')}</button>
        </div>
      </ExperimentWrapper>
    );
  }

  if (phase === 'complete') {
    const correct = trialData.filter(t => t.answer === t.correctAnswer).length;
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
          <p className="text-gray-600 mb-4">{t('exp.wason.debrief')}</p>
        </div>
      </ExperimentWrapper>
    );
  }

  return (
    <ExperimentWrapper experiment={experiment}>
      <div className="max-w-2xl mx-auto p-6">
        {settings.showProgressBar && <div className="mb-6"><div className="h-2 bg-gray-200 rounded"><div className="h-full bg-teal-600" style={{ width: `${((trialIndex + 1) / settings.trials) * 100}%` }} /></div></div>}
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg mb-6">
          <p className="text-amber-800 font-medium">{t('exp.wason.rule')}: "{currentScenario.rule}"</p>
        </div>
        <p className="text-gray-600 mb-4 text-center">{t('exp.wason.selectCards')}</p>
        <div className="flex justify-center gap-4 mb-6">
          {currentScenario.cards.map(card => (
            <button key={card} onClick={() => handleCardToggle(card)} className={`w-16 h-20 rounded-lg border-2 flex items-center justify-center text-2xl font-bold ${selectedCards.includes(card) ? 'border-teal-500 bg-teal-50' : 'border-gray-200'}`}>
              {card}
            </button>
          ))}
        </div>
        <div className="flex justify-center">
          <button onClick={handleSubmit} disabled={selectedCards.length === 0} className="bg-teal-600 text-white px-8 py-3 rounded-lg disabled:opacity-50">{t('common.submit')}</button>
        </div>
      </div>
    </ExperimentWrapper>
  );
}

export default WasonExperiment;
