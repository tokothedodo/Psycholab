export type Language = 'en' | 'ka' | 'hy' | 'az';

export type UserRole = 'researcher' | 'participant';

export interface User {
  id: string;
  email: string;
  role: UserRole;
}

export interface Room {
  id: string;
  researcher_id: string;
  code: string;
  experiments: string[];
  status: 'active' | 'closed';
  created_at: string;
  title: string;
}

export interface Result {
  id: string;
  room_id: string;
  participant_id: string;
  experiment_name: string;
  response_time_ms: number;
  answer: string | number;
  correct_answer: string | number;
  language: Language;
  timestamp: string;
}

export type ExperimentType = 
  | 'muller-lyer'
  | 'stroop'
  | 'anchoring'
  | 'ultimatum'
  | 'digit-span'
  | 'ponzo';

export interface ExperimentConfig {
  type: ExperimentType;
  trials?: number;
  stimuli?: unknown[];
}
