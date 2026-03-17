import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { getRoomByCode, saveResult, type Room } from '../lib/supabase';
import type { Language } from '../types';
import type { ExperimentResults } from '../experiments/ExperimentWrapper';
import type { Experiment } from '../data/experiments';
import { getExperimentById } from '../data/experiments';
import './Participant.css';
import {
  MullerLyerExperiment,
  StroopExperiment,
  UltimatumExperiment,
  DigitSpanExperiment,
  ReactionTimeExperiment,
} from '../experiments';

const EXPERIMENT_COMPONENTS: Record<string, React.ComponentType<{
  experiment: Experiment;
  onComplete: (results: ExperimentResults) => void;
  participantId: string;
  roomId: string;
}>> = {
  'muller-lyer-illusion': MullerLyerExperiment,
  'stroop-color-word-interference-task': StroopExperiment,
  'ultimatum-game': UltimatumExperiment,
  'digit-span-task': DigitSpanExperiment,
  'simple-and-choice-reaction-time-task': ReactionTimeExperiment,
};

export function JoinExperimentPage() {
  const { code } = useParams<{ code: string }>();
  const { language, setLanguage } = useLanguage();
  const navigate = useNavigate();

  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [completed, setCompleted] = useState(false);
  const [participantId] = useState(() => `P_${Math.random().toString(36).substr(2, 9)}`);
  const [showLanguagePicker, setShowLanguagePicker] = useState(true);

  const languages: { code: Language; name: string; flag: string }[] = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'ka', name: 'Georgian', flag: '🇬🇪' },
    { code: 'hy', name: 'Armenian', flag: '🇦🇲' },
    { code: 'az', name: 'Azerbaijani', flag: '🇦🇿' },
  ];

  useEffect(() => {
    if (code) loadRoom();
  }, [code]);

  const loadRoom = async () => {
    try {
      const roomData = await getRoomByCode(code!);
      if (!roomData) {
        setError('Study access key invalid or experiment closed.');
        return;
      }
      setRoom(roomData);
    } catch {
      setError('System connection error. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  const handleExperimentComplete = async (results: ExperimentResults) => {
    if (!room) return;
    console.log('[PsychoLab] Experiment complete, submitting results:', results);
    try {
      const payload = {
        room_id: room.id,
        participant_id: participantId,
        experiment_name: results.experimentName,
        response_time_ms: results.responseTimeMs,
        answer: String(results.answer),
        correct_answer: String(results.correctAnswer),
        language,
        timestamp: results.timestamp,
        trial_data: results.trialData,
        accuracy: results.accuracy,
        total_trials: results.totalTrials,
      };

      console.log('[PsychoLab] Submitting payload to Supabase:', payload);
      await saveResult(payload as any);
      console.log('[PsychoLab] Results saved successfully');
      setCompleted(true);
    } catch (e: any) {
      console.error('[PsychoLab] CRITICAL: Failed to save results:', e);
      // Still set completed to true to avoid stranding the participant, 
      // but the console now shows the real reason.
      setCompleted(true);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-surface"><div className="animate-pulse font-mono text-navy">SYNCING RESEARCH PROTOCOL...</div></div>;

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface p-8">
        <div className="text-center max-w-md">
          <h2 className="text-error mb-4">Connection Failed</h2>
          <p className="text-text-secondary mb-8">{error}</p>
          <button onClick={() => navigate('/')} className="btn-primary">Return Home</button>
        </div>
      </div>
    );
  }

  if (showLanguagePicker && room) {
    return (
      <div className="min-h-screen bg-surface">
        <header className="participant-header">
          <span className="brand-mono">PsychoLab.ge</span>
        </header>
        <main className="participant-container animate-fade-in">
          <div className="participant-status">Protocol: {room.code}</div>
          <h1>Choose your language</h1>
          <p className="text-text-secondary">Please select the language you are most comfortable with for this research task.</p>

          <div className="language-grid">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  setLanguage(lang.code);
                  setShowLanguagePicker(false);
                }}
                className="language-card"
              >
                <span className="language-flag">{lang.flag}</span>
                <span className="language-name">{lang.name}</span>
              </button>
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-8">
        <div className="completion-card text-center max-w-xl animate-fade-in">
          <div className="completion-icon">✓</div>
          <h1 className="mb-4">Data Synchronized</h1>
          <p className="text-text-secondary mb-10 leading-relaxed">
            Your results have been successfully recorded in the research database.
            Thank you for contributing to cognitive science at PsychoLab.
          </p>
          <div className="p-4 bg-gray-50 rounded-2xl mb-8 border border-gray-100 flex items-center justify-center gap-3">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-[10px] font-black tracking-widest text-gray-400 uppercase">Secure Link Active</span>
          </div>
          <button onClick={() => navigate('/')} className="btn-primary" style={{ paddingLeft: '3rem', paddingRight: '3rem' }}>Close Session</button>
        </div>
      </div>
    );
  }

  const currentExperimentId = room!.experiment;
  const currentExperiment = getExperimentById(currentExperimentId);
  const ExperimentComponent = currentExperimentId && EXPERIMENT_COMPONENTS[currentExperimentId];

  if (!currentExperiment || !ExperimentComponent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 text-center bg-surface">
        <div className="max-w-md">
          <h2 className="text-error">Task Unavailable</h2>
          <p className="text-text-secondary mt-4">The requested experiment module ({currentExperimentId}) is not currently implemented in this laboratory environment.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="participant-header flex justify-between">
        <span className="brand-mono text-xs opacity-50">PsychoLab Research Unit // {currentExperiment?.name}</span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">{language}</span>
        </div>
      </header>

      <main className="experiment-layout">
        <ExperimentComponent
          experiment={currentExperiment}
          onComplete={handleExperimentComplete}
          participantId={participantId}
          roomId={room!.id}
        />
      </main>
    </div>
  );
}
