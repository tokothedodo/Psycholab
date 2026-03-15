import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

export function HomePage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');

  const handleJoinRoom = () => {
    if (roomCode.length === 6 && /^\d+$/.test(roomCode)) {
      navigate(`/join/${roomCode}`);
    } else {
      setError('Please enter a valid 6-digit code');
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <main className="academic-container py-16 flex-1">
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-12">
            <img src="/Psycholab.svg" alt="PsychoLab" className="h-16 w-auto mx-auto mb-6" />
            <h1 className="mb-2">{t('app.title')}</h1>
            <p className="text-text-secondary text-lg">{t('app.subtitle')}</p>
          </div>

          <section className="bg-white border border-border rounded p-8 mb-6">
            <h2 className="mb-4 text-center">
              {t('home.enterRoomCode')}
            </h2>
            <div className="space-y-3">
              <input
                type="text"
                value={roomCode}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setRoomCode(val);
                  setError('');
                }}
                placeholder="000000"
                className="w-full p-4 text-center text-2xl tracking-widest border border-border rounded focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                maxLength={6}
              />
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <button
                onClick={handleJoinRoom}
                disabled={roomCode.length !== 6}
                className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('home.joinButton')}
              </button>
            </div>
          </section>

          <section className="bg-white border border-border rounded p-6">
            <h2 className="mb-2 text-lg">Experiment Library</h2>
            <p className="text-text-secondary mb-4 text-sm">Explore 38 psychological experiments across 8 research domains</p>
            <button
              onClick={() => navigate('/experiments')}
              className="btn-outline w-full"
            >
              Browse Experiments
            </button>
          </section>
        </div>
      </main>
    </div>
  );
}
