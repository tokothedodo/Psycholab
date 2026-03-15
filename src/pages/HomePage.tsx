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
    <div className="min-h-screen bg-white">
      <header className="bg-navy-900 text-white py-6">
        <div className="max-w-6xl mx-auto px-4">
          <h1 className="text-3xl font-bold">{t('app.title')}</h1>
          <p className="text-teal-400 mt-1">{t('app.subtitle')}</p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 gap-12">
          <div>
            <section className="mb-12">
              <h2 className="text-xl font-semibold text-navy-900 mb-4">
                {t('home.chooseLanguage')}
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => setLanguage(lang.code)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      language === lang.code
                        ? 'border-teal-500 bg-teal-50'
                        : 'border-gray-200 hover:border-teal-300'
                    }`}
                  >
                    <span className="text-2xl mr-2">{lang.flag}</span>
                    <span className="font-medium">{lang.name}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="bg-gray-50 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-navy-900 mb-4">
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
                  className="w-full p-4 text-center text-2xl tracking-widest border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none"
                  maxLength={6}
                />
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <button
                  onClick={handleJoinRoom}
                  disabled={roomCode.length !== 6}
                  className="w-full bg-teal-600 text-white py-3 rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                >
                  {t('home.joinButton')}
                </button>
              </div>
            </section>
          </div>

          <div>
            <section className="bg-navy-900 text-white rounded-xl p-8">
              <h2 className="text-2xl font-bold mb-4">{t('home.forResearchers')}</h2>
              <p className="text-gray-300 mb-6">{t('home.researcherDescription')}</p>
              <button
                onClick={() => navigate('/login')}
                className="bg-teal-500 text-white px-6 py-3 rounded-lg hover:bg-teal-600 transition-colors font-semibold"
              >
                {t('home.createAccount')}
              </button>
            </section>

            <section className="mt-6 bg-teal-50 rounded-xl p-6 border border-teal-200">
              <h2 className="text-xl font-bold text-navy-900 mb-2">Experiment Library</h2>
              <p className="text-gray-600 mb-4">Explore 38 scientifically validated psychological experiments</p>
              <button
                onClick={() => navigate('/experiments')}
                className="bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700 transition-colors font-semibold"
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
