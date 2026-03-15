import { useLanguage } from '../../context/LanguageContext';
import type { Experiment } from '../../data/experiments';

export interface TrialData {
  trialNumber: number;
  responseTimeMs: number;
  answer: string | number | boolean;
  correctAnswer: string | number | boolean;
  stimulus?: unknown;
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
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-navy-900 text-white py-3 px-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <h1 className="font-semibold">{t(experiment.nameKey) || experiment.name}</h1>
          <span className="text-sm text-teal-400">{t('citation')}: {experiment.citation}, {experiment.year}</span>
        </div>
      </header>
      
      <main className="max-w-4xl mx-auto p-6">
        {children}
      </main>
    </div>
  );
}

export { useLanguage };
