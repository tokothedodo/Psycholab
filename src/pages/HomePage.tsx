import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './HomePage.css';

export function HomePage() {
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
    <div className="animate-fade-in">
      <section className="hero">
        <div className="academic-container hero-content">
          <h1>Scientific Precision Meets <span>Modern Clarity</span></h1>
          <p>A premium research platform for experimental psychology. Conduct studies with clinical accuracy and elegant simplicity.</p>

          <div className="hero-actions">
            <button
              onClick={() => navigate('/experiments')}
              className="btn-primary"
            >
              Start Experimenting
            </button>
            <button
              onClick={() => navigate('/login')}
              className="btn-outline"
              style={{ borderColor: 'rgba(255,255,255,0.3)', color: 'white' }}
            >
              For Researchers
            </button>
          </div>
        </div>
      </section>

      <section className="academic-container">
        <div className="join-section">
          <h3 className="text-center mb-6">Join an Experiment</h3>
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
              Join Room
            </button>
          </div>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🔬</div>
            <h3>38 Validated Tasks</h3>
            <p>Access a full library of classic psychological experiments from Stroop to Iowa Gambling Task.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h3>Real-time Data</h3>
            <p>Monitor participant progress live and export raw clinical data in standardized CSV formats.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🤖</div>
            <h3>AI Configuration</h3>
            <p>Our methodology assistant helps you configure experiment guardrails based on clinical standards.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
