import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { getUser, getRooms, activateRoom, closeRoom, getUniqueParticipants, type Room } from '../lib/supabase';

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

    // Poll for participants every 5 seconds
    useEffect(() => {
        if (!room) return;
        const interval = setInterval(async () => {
            try {
                const participants = await getUniqueParticipants(room.id);
                setParticipantCount(participants.length);
            } catch (e) {
                console.error('[PsychoLab] participant poll error:', e);
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
                setError('Room not found');
                return;
            }
            setRoom(found);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load room');
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

    const handleCopyLink = () => {
        if (room) {
            const link = `${window.location.origin}/join/${room.code}`;
            navigator.clipboard.writeText(link);
            setCopied('link');
            setTimeout(() => setCopied(null), 2000);
        }
    };

    const handleActivate = async () => {
        if (!room) return;
        try {
            await activateRoom(room.id);
            setRoom({ ...room, status: 'active' });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to activate room');
        }
    };

    const handleClose = async () => {
        if (!room) return;
        try {
            await closeRoom(room.id);
            navigate('/dashboard');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to close room');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-gray-500">{t('common.loading')}</p>
            </div>
        );
    }

    if (error || !room) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-600 mb-4">{error || 'Room not found'}</p>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="text-teal-600 hover:underline"
                    >
                        {t('nav.dashboard')}
                    </button>
                </div>
            </div>
        );
    }

    const shareLink = `${window.location.origin}/join/${room.code}`;
    const isActive = room.status === 'active';

    return (
        <div className="min-h-screen bg-surface flex flex-col">
            <header className="bg-primary text-white py-4 border-b border-navy-800">
                <div className="academic-container flex justify-between items-center">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="text-white hover:text-gray-200 transition-colors"
                    >
                        ← {t('common.back')}
                    </button>
                    <span className={`px-3 py-1 rounded text-sm font-medium ${isActive
                            ? 'bg-green-500/20 text-green-300'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}>
                        {isActive ? 'LIVE' : 'DRAFT'}
                    </span>
                </div>
            </header>

            <main className="academic-container py-12 flex-1 max-w-2xl mx-auto w-full">
                {/* Room Code */}
                <div className="bg-white rounded-lg border border-border p-8 text-center mb-6">
                    <p className="text-text-secondary text-sm uppercase tracking-wider mb-2">Room Code</p>
                    <div className="flex items-center justify-center gap-4">
                        <span className="text-5xl md:text-6xl font-mono font-bold text-primary tracking-widest">
                            {room.code}
                        </span>
                        <button
                            onClick={handleCopyCode}
                            className="p-3 rounded-lg border border-border hover:bg-gray-50 transition-colors"
                            title="Copy code"
                        >
                            {copied === 'code' ? (
                                <span className="text-green-600 text-xl">✓</span>
                            ) : (
                                <span className="text-gray-500 text-xl">📋</span>
                            )}
                        </button>
                    </div>
                </div>

                {/* Share Link */}
                <div className="bg-white rounded-lg border border-border p-6 mb-6">
                    <p className="text-text-secondary text-sm uppercase tracking-wider mb-2">Participant Link</p>
                    <div className="flex items-center gap-2">
                        <code className="flex-1 bg-gray-50 px-4 py-3 rounded border border-border text-sm break-all">
                            {shareLink}
                        </code>
                        <button
                            onClick={handleCopyLink}
                            className="px-4 py-3 rounded-lg border border-border hover:bg-gray-50 transition-colors whitespace-nowrap text-sm font-medium"
                        >
                            {copied === 'link' ? '✓ Copied' : 'Copy Link'}
                        </button>
                    </div>
                </div>

                {/* Status */}
                <div className="bg-white rounded-lg border border-border p-6 mb-6">
                    <div className="grid grid-cols-2 gap-6 text-center">
                        <div>
                            <p className="text-3xl font-bold text-primary">{participantCount}</p>
                            <p className="text-text-secondary text-sm">{t('dashboard.participants')}</p>
                        </div>
                        <div>
                            <p className="text-3xl font-bold text-navy-900">
                                {isActive ? '🟢' : '🟡'}
                            </p>
                            <p className="text-text-secondary text-sm">
                                {isActive ? 'Session Active' : 'Waiting to start...'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                    {!isActive ? (
                        <button
                            onClick={handleActivate}
                            className="flex-1 btn-primary text-lg py-4"
                        >
                            ▶ Start Session
                        </button>
                    ) : (
                        <button
                            onClick={handleClose}
                            className="flex-1 bg-red-50 border border-red-200 text-red-700 py-4 rounded-lg hover:bg-red-100 transition-colors text-lg font-medium"
                        >
                            ■ End Session
                        </button>
                    )}
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="flex-1 btn-outline text-lg py-4"
                    >
                        {t('nav.dashboard')}
                    </button>
                </div>
            </main>
        </div>
    );
}
