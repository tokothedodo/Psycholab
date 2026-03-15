import { useLanguage } from '../context/LanguageContext';
import type { Experiment } from '../data/experiments';

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
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-primary text-white py-4">
        <div className="academic-container flex justify-between items-center">
          <h2 className="mb-0 text-white leading-none">{t(experiment.nameKey) || experiment.name}</h2>
          <span className="citation text-white/80">{t('citation')}: {experiment.citation}, {experiment.year}</span>
        </div>
      </header>

      <main className="academic-container py-8 flex-1">
        {children}
      </main>
    </div>
  );
}

export { useLanguage };
