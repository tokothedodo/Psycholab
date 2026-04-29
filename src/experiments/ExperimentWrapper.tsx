import { useLanguage } from '../context/LanguageContext';
import type { Experiment } from '../data/experiments';

export interface TrialData {
  trialNumber: number;
  responseTimeMs?: number;
  answer?: string | number | boolean;
  correctAnswer?: string | number | boolean;
  type?: 'control' | 'experimental';
  race?: string;
  gender?: string;
  rt?: number;
  isCorrect?: boolean;
}

export interface ExperimentResults {
  experimentName: string;
  participantId: string;
  roomId: string;
  language: string;
  timestamp: string;
  totalTrials: number;
  responseTimeMs: number;
  accuracy: number;
  answer: string | number | boolean;
  correctAnswer: string | number | boolean;
  trialData: TrialData[];
  debrief?: string;
}

interface ExperimentWrapperProps {
  experiment: Experiment;
  children: React.ReactNode;
}

export function ExperimentWrapper({ experiment, children }: ExperimentWrapperProps) {
  return (
    <div className="w-full min-h-[100vh] flex flex-col items-center justify-center p-4 bg-gray-50/50">
      <div className="w-full max-w-6xl flex flex-col items-center">
        {children}
      </div>

      <div className="mt-16 text-center opacity-30">
        <span className="text-[10px] uppercase tracking-[0.3em] font-black text-gray-400">
          Paradigm: {experiment.citation}
        </span>
      </div>
    </div>
  );
}

export { useLanguage };
