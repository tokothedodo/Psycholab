import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import type { Language } from '../types';

export function HomePage() {
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');

  const languages: { code: Language; name: string; flag: string }[] = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'ka', name: 'Georgian', flag: '🇬🇪' },
    { code: 'hy', name: 'Armenian', flag: '🇦🇲' },
    { code: 'az', name: 'Azerbaijani', flag: '🇦🇿' },
  ];

  const handleJoinRoom = () => {
    if (roomCode.length === 6 && /^\d+$/.test(roomCode)) {
      navigate(`/join/${roomCode}`);
    } else {
      setError('Please enter a valid 6-digit code');
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <header className="bg-primary text-white py-8 border-b border-navy-800">
        <div className="academic-container">
          <h1 className="mb-2 text-white">{t('app.title')}</h1>
          <p className="text-secondary opacity-90 text-lg">{t('app.subtitle')}</p>
        </div>
      </header>

      <main className="academic-container py-12 flex-1">
        <div className="grid md:grid-cols-2 gap-12">
          <div>
            <section className="mb-12">
              <h2 className="mb-4">
                {t('home.chooseLanguage')}
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => setLanguage(lang.code)}
                    className={`p-4 rounded border-2 transition-all ${language === lang.code
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border hover:border-primary/50'
                      }`}
                  >
                    <span className="text-2xl mr-2">{lang.flag}</span>
                    <span className="font-medium">{lang.name}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="bg-white border border-border rounded p-6">
              <h2 className="mb-4">
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
          </div>

          <div>
            <section className="bg-primary text-white rounded p-8">
              <h2 className="text-white mb-4">{t('home.forResearchers')}</h2>
              <p className="text-white/80 mb-6">{t('home.researcherDescription')}</p>
              <button
                onClick={() => navigate('/login')}
                className="btn-secondary w-full sm:w-auto"
              >
                {t('home.createAccount')}
              </button>
            </section>

            <section className="mt-6 bg-white border border-border rounded p-6">
              <h2 className="mb-2">Experiment Library</h2>
              <p className="text-text-secondary mb-4">Explore 38 scientifically validated psychological experiments</p>
              <button
                onClick={() => navigate('/experiments')}
                className="btn-outline w-full sm:w-auto"
              >
                Browse Experiments
              </button>
            </section>

            <div className="mt-8 text-center">
              <p className="text-gray-500 text-sm">
                Supported by Georgian, Armenian, and Azerbaijani researchers
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
