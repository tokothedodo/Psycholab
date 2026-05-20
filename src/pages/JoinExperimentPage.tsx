import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { getRoomByCode, type Room } from '../lib/supabase';
import { useResults } from '../hooks/useResults';
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
  AutonomousVehicleExperiment,
  ArabGeorgianIAT,
  GayStraightIAT,
} from '../experiments';

const EXPERIMENT_COMPONENTS: Record<string, React.ComponentType<{
  experiment: Experiment;
  onComplete: (results: any) => void;
  participantId: string;
  roomId: string;
  isSubmitting?: boolean;
}>> = {
  'muller-lyer-illusion': MullerLyerExperiment,
  'stroop-color-word-interference-task': StroopExperiment,
  'ultimatum-game': UltimatumExperiment,
  'digit-span-task': DigitSpanExperiment,
  'moral-machine-ingroup': AutonomousVehicleExperiment,
  'iat-arab-georgian': ArabGeorgianIAT,
  'iat-gay-straight': GayStraightIAT,
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
  const { submitResults, isSubmitting } = useResults();

  const languages: { code: Language; name: string; flag: string }[] = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'ka', name: 'Georgian', flag: '🇬🇪' },
    { code: 'hy', name: 'Armenian', flag: '🇦🇲' },
    { code: 'az', name: 'Azerbaijani', flag: '🇦🇿' },
  ];

  const loadRoom = async () => {
    try {
      const roomData = await getRoomByCode(code!);
      if (!roomData) {
        setError('Study access key invalid or experiment closed.');
        return;
      }
      setRoom(roomData);
      if (roomData.experiment === 'iat-arab-georgian' || roomData.experiment === 'iat-gay-straight') {
        setLanguage('ka');
        setShowLanguagePicker(false);
      }
    } catch {
      setError('System connection error. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (code) loadRoom();

    const interval = setInterval(async () => {
      if (code && (!room || room.status === 'draft')) {
        const roomData = await getRoomByCode(code);
        if (roomData && roomData.status !== room?.status) {
          console.log('[PsychoLab] 🛰️ Room status updated:', roomData.status);
          setRoom(roomData);
        }
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [code, room?.status, loadRoom]);

  const handleExperimentComplete = async (results: ExperimentResults) => {
    if (!room) return;
    console.log('[PsychoLab] Experiment complete, submitting results:', results);

    // Inject current room and participant info if not already there
    const finalResults = {
      ...results,
      roomId: room.id,
      participantId: participantId,
      language: language
    };

    console.log('[PsychoLab] 🚀 Data payload constructed:', finalResults);
    const success = await submitResults(finalResults);

    if (success) {
      console.log('[PsychoLab] 🎉 Session data synchronized successfully.');
    } else {
      console.error('[PsychoLab] 🚨 CRITICAL: Synchronization failed after all fallbacks.');
    }
    setCompleted(true);
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
    if (room.status === 'draft') {
      return (
        <div className="min-h-screen bg-surface flex items-center justify-center p-8">
          <header className="participant-header">
            <span className="brand-mono">PsychoLab.ge</span>
          </header>
          <div className="text-center max-w-md animate-fade-in translate-y-[-2rem]">
            <div className="w-16 h-16 bg-navy/5 text-navy rounded-3xl flex items-center justify-center text-3xl mb-8 mx-auto animate-pulse shadow-sm border border-navy/5">📡</div>
            <h1 className="text-3xl font-black mb-4 tracking-tight">Sync in Progress</h1>
            <p className="text-text-secondary mb-10 leading-relaxed font-medium">
              Research session <span className="text-navy font-bold">{room.code}</span> has not started yet.<br />
              Please wait for the supervisor's signal.
            </p>
            <div className="flex items-center justify-center gap-3 py-4 px-6 bg-white rounded-2xl border border-border shadow-sm">
              <div className="w-2 h-2 bg-teal rounded-full animate-pulse shadow-[0_0_8px_rgba(45,212,191,0.5)]"></div>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted">Waiting for Uplink...</span>
            </div>
          </div>
        </div>
      );
    }

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

  const currentExperimentId = room!.experiment;
  const isIAT = currentExperimentId === 'iat-arab-georgian' || currentExperimentId === 'iat-gay-straight';

  if (completed && !isIAT) {
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
  const isMoralMachine = currentExperimentId === 'moral-machine-ingroup';

  return (
    <div className="min-h-screen bg-white">
      {!isMoralMachine && !isIAT && (
        <header className="participant-header flex justify-between">
          <span className="brand-mono text-xs opacity-50">PsychoLab Research Unit // {currentExperiment?.name}</span>
          <div className="flex items-center gap-2">
            {room!.status === 'draft' && <span className="text-[9px] font-black bg-yellow-400 px-2 py-0.5 rounded text-black mr-2">STAGING</span>}
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">{language}</span>
          </div>
        </header>
      )}

      <main className={(isMoralMachine || isIAT) ? "w-full min-h-screen" : "experiment-layout"}>
        {isSubmitting && !isIAT && (
          <div className="fixed inset-0 z-[200] bg-white/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center animate-fade-in text-navy">
            <div className="w-16 h-16 border-4 border-navy border-t-transparent rounded-full animate-spin mb-8 shadow-2xl"></div>
            <h2 className="text-2xl font-black mb-2 tracking-tighter">Synchronizing Data</h2>
            <p className="opacity-70 font-medium">Please do not close this window while we secure your research contribution.</p>
          </div>
        )}
        <ExperimentComponent
          experiment={currentExperiment}
          onComplete={handleExperimentComplete}
          participantId={participantId}
          roomId={room!.id}
          {...(isIAT ? { isSubmitting } : {})}
        />
      </main>
    </div>
  );
}
