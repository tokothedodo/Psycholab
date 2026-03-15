/**
 * WASON SELECTION TASK - Logical Reasoning Experiment
 * 
 * Tests logical reasoning and confirmation bias.
 */

import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ExperimentWrapper } from './ExperimentWrapper';
import type { Experiment } from '../data/experiments';
import type { TrialData, ExperimentResults } from './ExperimentWrapper';
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
        <div className="max-w-2xl mx-auto p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
          <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-emerald-600 mb-6">{t('exp.wason.name')}</h2>

          <div className="bg-slate-50 border-l-4 border-teal-500 p-5 rounded-r-lg shadow-sm mb-6">
            <p className="text-slate-700 leading-relaxed text-md">
              {settings.customInstructions || t('exp.wason.instruction')}
            </p>
          </div>

          <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-5 mb-8">
            <p className="text-sm font-semibold text-indigo-900 mb-2 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              {t('exp.wason.instructionDetail')}
            </p>
          </div>

          <p className="text-sm font-medium text-slate-400 mb-8 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
            {t('citation')}: {experiment.citation}, {experiment.year}
          </p>

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
      <div className="max-w-3xl mx-auto p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 min-h-[500px] flex flex-col relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-white -z-10"></div>

        {settings.showProgressBar && (
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
        )}

        <div className="flex-1 flex flex-col items-center justify-center animate-fade-in w-full max-w-2xl mx-auto">
          <div className="w-full bg-amber-50/80 backdrop-blur-sm p-6 sm:p-8 rounded-2xl border border-amber-200/60 shadow-sm mb-10 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-400"></div>
            <p className="text-lg sm:text-xl font-medium text-amber-900 leading-relaxed text-center">
              <span className="font-bold text-amber-700 uppercase text-sm tracking-widest block mb-2">{t('exp.wason.rule')}</span>
              "{currentScenario.rule}"
            </p>
          </div>

          <p className="text-xl font-extrabold text-slate-800 tracking-tight mb-8 text-center px-4">
            {t('exp.wason.selectCards')}
          </p>

          <div className="flex flex-wrap justify-center gap-6 mb-12 w-full">
            {currentScenario.cards.map((card, idx) => (
              <button
                key={card}
                onClick={() => handleCardToggle(card)}
                className={`group relative w-24 h-32 sm:w-28 sm:h-36 rounded-xl border-2 transition-all duration-300 flex flex-col items-center justify-center focus:outline-none focus:ring-4 ${selectedCards.includes(card)
                    ? 'border-teal-500 bg-teal-50/80 shadow-md focus:ring-teal-500/30 -translate-y-2'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md hover:-translate-y-1 focus:ring-slate-500/20'
                  }`}
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                {selectedCards.includes(card) && (
                  <div className="absolute top-2 right-2 text-teal-600 bg-teal-100 rounded-full p-0.5 shadow-sm transform scale-100 transition-transform">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                  </div>
                )}
                <span className={`text-4xl sm:text-5xl font-black tracking-tighter transition-colors ${selectedCards.includes(card) ? 'text-teal-700' : 'text-slate-700 group-hover:text-slate-900'
                  }`}>
                  {card}
                </span>
              </button>
            ))}
          </div>

          <div className="flex justify-center mt-auto w-full">
            <button
              onClick={handleSubmit}
              disabled={selectedCards.length === 0}
              className="group relative w-full sm:w-auto px-10 py-4 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-bold text-lg rounded-xl shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2 focus:outline-none focus:ring-4 focus:ring-teal-500/30 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-md disabled:cursor-not-allowed"
            >
              {t('common.submit')}
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
            </button>
          </div>
        </div>
      </div>
    </ExperimentWrapper>
  );
}

export default WasonExperiment;
