import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { getUser, getRooms, activateRoom, closeRoom, getUniqueParticipants, type Room } from '../lib/supabase';
import './RoomLivePage.css';

export function RoomLivePage() {
    const { code } = useParams<{ code: string }>();
    const { t } = useLanguage();
    const navigate = useNavigate();

    const [room, setRoom] = useState<Room | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [participantCount, setParticipantCount] = useState(0);
    const [copied, setCopied] = useState<'code' | 'link' | null>(null);

    useEffect(() => {
        loadRoom();
    }, [code]);

    useEffect(() => {
        if (!room) return;
        const interval = setInterval(async () => {
            try {
                const participants = await getUniqueParticipants(room.id);
                setParticipantCount(participants.length);
            } catch (e) {
                console.error('[PsychoLab] poll error:', e);
            }
        }, 5000);
        return () => clearInterval(interval);
    }, [room]);

    const loadRoom = async () => {
        try {
            const user = await getUser();
            if (!user) {
                navigate('/login');
                return;
            }
            const rooms = await getRooms(user.id);
            const found = rooms.find(r => r.code === code);
            if (!found) {
                setError('Experiment session not found');
                return;
            }
            setRoom(found);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'System synchronization failed');
        } finally {
            setLoading(false);
        }
    };

    const handleCopyCode = () => {
        if (room) {
            navigator.clipboard.writeText(room.code);
            setCopied('code');
            setTimeout(() => setCopied(null), 2000);
        }
    };

    const handleActivate = async () => {
        if (!room) return;
        try {
            await activateRoom(room.id);
            setRoom({ ...room, status: 'active' });
        } catch (err) {
            setError('Failed to initialize session');
        }
    };

    const handleClose = async () => {
        if (!room) return;
        try {
            await closeRoom(room.id);
            navigate('/dashboard');
        } catch (err) {
            setError('Terminating session failed');
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-pulse text-navy font-bold">SYNCHRONIZING...</div></div>;

    if (error || !room) {
        return (
            <div className="min-h-screen flex items-center justify-center p-8">
                <div className="text-center max-w-md">
                    <h2 className="text-error mb-4">Access Denied</h2>
                    <p className="text-text-secondary mb-8">{error || 'Session ID is invalid or has expired.'}</p>
                    <button onClick={() => navigate('/dashboard')} className="btn-primary">Return to Console</button>
                </div>
            </div>
        );
    }

    const shareLink = `${window.location.origin}/join/${room.code}`;
    const isActive = room.status === 'active';
    const qrUrl = `https://chart.googleapis.com/chart?cht=qr&chs=200x200&chl=${encodeURIComponent(shareLink)}`;

    return (
        <div className="min-h-screen bg-surface">
            <header className="p-6">
                <button onClick={() => navigate('/dashboard')} className="btn-outline py-2 text-xs">← End Observation</button>
            </header>

            <main className="live-room-container animate-fade-in">
                <div className={`live-status-pill ${isActive ? 'status-live' : 'status-draft'}`}>
                    <span className="w-2 h-2 rounded-full bg-current mr-2 animate-pulse" />
                    {isActive ? 'Collection Active' : 'Protocol Staging'}
                </div>

                <div className="room-display-card">
                    <p className="live-stat-label">Session Access Code</p>
                    <span className="live-code">{room.code}</span>

                    <div className="flex justify-center gap-3 mb-8">
                        <button onClick={handleCopyCode} className="copy-btn-premium">
                            {copied === 'code' ? '✓ Copied' : 'Copy Code'}
                        </button>
                    </div>

                    <div className="flex justify-center mb-4">
                        <div className="p-4 bg-white border rounded-xl shadow-inner">
                            <img src={qrUrl} alt="Join QR Code" className="w-40 h-40" />
                        </div>
                    </div>
                    <p className="text-[10px] text-text-muted uppercase font-bold tracking-widest mt-2">{t('roomBuilder.participantLink')}</p>
                    <p className="text-xs font-mono text-navy truncate max-w-xs mx-auto opacity-60 m-0">{shareLink}</p>
                </div>

                <div className="live-stats-grid">
                    <div className="live-stat-item">
                        <span className="live-stat-value">{participantCount}</span>
                        <span className="live-stat-label">Participants</span>
                    </div>
                    <div className="live-stat-item">
                        <span className="live-stat-value">{isActive ? 'LIVE' : 'WAIT'}</span>
                        <span className="live-stat-label">Data Stream</span>
                    </div>
                </div>

                <div className="live-actions mt-4">
                    {!isActive ? (
                        <button onClick={handleActivate} className="flex-1 btn-primary py-4 text-lg">Initialize Protocol</button>
                    ) : (
                        <button onClick={handleClose} className="flex-1 btn-end-session py-4 text-lg font-bold">Terminate Session</button>
                    )}
                </div>

                <p className="mt-8 text-xs text-text-muted max-w-md">
                    Observing {room.experiment.replace(/-/g, ' ')} research session.
                    Refresh frequency: 5s. Participant data is encrypted at rest.
                </p>
            </main>
        </div>
    );
}
