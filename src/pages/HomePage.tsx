import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import './HomePage.css';

export function HomePage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');

  const handleJoinRoom = () => {
    if (roomCode.length === 6 && /^\d+$/.test(roomCode)) {
      navigate(`/join/${roomCode}`);
    } else {
      setError(t('home.invalidCode'));
    }
  };

  return (
    <div className="animate-fade-in flex items-center justify-center min-h-screen">
      <div className="join-section">
        <h3 className="text-center mb-6">{t('home.joinTitle')}</h3>
        <div className="space-y-4">
          <input
            type="text"
            value={roomCode}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '').slice(0, 6);
              setRoomCode(val);
              setError('');
            }}
            placeholder="000000"
            className="join-input"
            maxLength={6}
          />
          {error && <p className="text-error text-center text-sm mb-4">{error}</p>}
          <button
            onClick={handleJoinRoom}
            disabled={roomCode.length !== 6}
            className="btn-primary w-full py-4 text-base"
          >
            {t('home.joinRoom')}
          </button>
        </div>
      </div>
    </div>
  );
}
