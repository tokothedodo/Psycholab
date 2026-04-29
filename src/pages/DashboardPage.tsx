import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { getRooms, getUniqueParticipants, getRoomResultsCount, closeRoom, deleteRoom, reopenRoom, activateRoom, getResults, getUser, signOut, type Room, type Result } from '../lib/supabase';
import { getExperimentById } from '../data/experiments';

import './DashboardPage.css';

export function DashboardPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [roomStats, setRoomStats] = useState<Record<string, { participants: number; results: number }>>({});

  const checkUser = useCallback(async () => {
    const userData = await getUser();
    if (!userData) {
      navigate('/login');
      return;
    }
    setUser({ id: userData.id, email: userData.email });
  }, [navigate]);

  const loadRooms = useCallback(async () => {
    console.log('[loadRooms] Starting, user:', user?.id);
    if (!user?.id) return;
    try {
      const roomsData = await getRooms(user.id);
      console.log('[loadRooms] Got rooms:', roomsData.length, roomsData.map(r => r.id));
      setRooms(roomsData);

      const stats: Record<string, { participants: number; results: number }> = {};
      for (const room of roomsData) {
        const participants = await getUniqueParticipants(room.id);
        const results = await getRoomResultsCount(room.id);
        stats[room.id] = {
          participants: participants.length,
          results,
        };
      }
      setRoomStats(stats);
    } catch (error) {
      console.error('Error loading rooms:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    checkUser();
  }, [checkUser]);

  useEffect(() => {
    if (user?.id) {
      loadRooms();
    }
  }, [user?.id, loadRooms]);

  const handleCloseRoom = async (roomId: string) => {
    try {
      await closeRoom(roomId);
      loadRooms();
    } catch (error) {
      console.error('Error closing room:', error);
    }
  };

  const handleReopenRoom = async (roomId: string) => {
    try {
      await reopenRoom(roomId);
      loadRooms();
    } catch (error) {
      console.error('Error reopening room:', error);
    }
  };

  const handleActivateRoom = async (roomId: string) => {
    try {
      await activateRoom(roomId);
      loadRooms();
    } catch (error) {
      console.error('Error activating room:', error);
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    console.log('Delete clicked for room:', roomId);
    const confirmed = window.confirm(t('dashboard.confirmDelete'));
    console.log('Confirmed:', confirmed);
    if (!confirmed) return;
    try {
      console.log('Attempting to delete room...');
      await deleteRoom(roomId);
      console.log('Room deleted, reloading...');
      setRooms([]);
      await loadRooms();
      console.log('Done');
      alert(t('dashboard.deleteSuccess'));
    } catch (error) {
      console.error('Error deleting room:', error);
      alert(t('dashboard.deleteFailed'));
    }
  };

  const handleExportCSV = async (room: Room) => {
    try {
      const results = await getResults(room.id);

      const csvContent = [
        'participant_id,language,experiment_name,response_time_ms,accuracy,total_trials,answer,correct_answer,timestamp,trial_data',
        ...results.map((r: Result) =>
          `${r.participant_id},${r.language},${r.experiment_name},${r.response_time_ms},${r.accuracy || ''},${r.total_trials || ''},"${String(r.answer).replace(/"/g, '""')}","${String(r.correct_answer).replace(/"/g, '""')}",${r.timestamp},"${r.trial_data ? JSON.stringify(r.trial_data).replace(/"/g, '""') : ''}"`
        ),
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `results_${room.code}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting CSV:', error);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const activeRooms = rooms.filter((r) => r.status === 'active' || r.status === 'draft');
  const pastRooms = rooms.filter((r) => r.status === 'closed');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-text-muted animate-pulse">{t('dashboard.initializing')}</p>
      </div>
    );
  }

  return (
    <div className="dashboard-layout animate-fade-in">
      <aside className="sidebar">
        <nav className="sidebar-nav">
          <a href="#" className="sidebar-link active">
            <span>🏠</span> {t('nav.dashboard')}
          </a>
          <button className="sidebar-link w-full text-left" onClick={() => navigate('/ai-assistant')}>
            <span>🤖</span> AI Assistant
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="avatar">
            {user?.email?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="font-semibold text-sm mb-0">{user?.email?.split('@')[0]}</p>
            <p className="user-email">{user?.email}</p>
          </div>
          <button onClick={handleLogout} className="text-secondary hover:text-navy cursor-pointer" title="Logout">
            🚪
          </button>
        </div>
      </aside>

      <main className="dashboard-main">
        <div className="flex justify-between items-center mb-8">
          <h1 className="mb-0">{t('dashboard.researchSummary')}</h1>
          <button
            onClick={() => navigate('/create-room')}
            className="btn-primary"
          >
            + {t('dashboard.createRoom')}
          </button>
        </div>

        {rooms.length === 0 ? (
          <div className="text-center py-16 bg-white border border-border rounded-xl">
            <p className="text-text-muted">{t('dashboard.noRoomsYet')}</p>
            <button
              onClick={() => navigate('/create-room')}
              className="btn-outline mt-4"
            >
              {t('dashboard.startFirstStudy')}
            </button>
          </div>
        ) : (
          <div className="space-y-12">
            {activeRooms.length > 0 && (
              <section className="animate-fade-up">
                <h3 className="mb-6 flex items-center gap-3">
                  <span className="w-2 h-2 bg-teal rounded-full animate-pulse"></span>
                  {t('dashboard.activeStudies')}
                </h3>
                <div className="grid gap-6">
                {activeRooms.map((room) => (
                    <RoomCard
                      key={room.id}
                      room={room}
                      stats={roomStats[room.id] || { participants: 0, results: 0 }}
                      onActivate={room.status === 'draft' ? () => handleActivateRoom(room.id) : undefined}
                      onClose={() => handleCloseRoom(room.id)}
                      onExport={() => handleExportCSV(room)}
                      onShare={() => navigate(`/room-live/${room.code}`)}
                      t={t}
                    />
                  ))}
                </div>
              </section>
            )}

            {pastRooms.length > 0 && (
              <section className="animate-fade-up">
                <h3 className="mb-6">{t('dashboard.pastRooms')}</h3>
                <div className="grid gap-6">
                  {pastRooms.map((room) => (
                    <RoomCard
                      key={room.id}
                      room={room}
                      stats={roomStats[room.id] || { participants: 0, results: 0 }}
                      onReopen={() => handleReopenRoom(room.id)}
                      onDelete={() => handleDeleteRoom(room.id)}
                      onExport={() => handleExportCSV(room)}
                      t={t}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

interface RoomCardProps {
  room: Room;
  stats: { participants: number; results: number };
  onActivate?: () => void;
  onClose?: () => void;
  onReopen?: () => void;
  onDelete?: () => void;
  onExport: () => void;
  onShare?: () => void;
  t: (key: string) => string;
}

function RoomCard({ room, stats, onActivate, onClose, onReopen, onDelete, onExport, onShare, t }: RoomCardProps) {
  const isDraft = room.status === 'draft';
  const isActive = room.status === 'active';
  const experimentData = getExperimentById(room.experiment);
  const experimentNameKey = experimentData?.nameKey;

  return (
    <div className="room-card-v2" onClick={isActive ? onShare : undefined} style={isActive ? { cursor: 'pointer' } : undefined}>
      <div className="room-info">
        <div className="room-title-area">
          <div className="flex items-center gap-3 mb-1">
            <span className={`room-status-pill ${isActive ? 'status-active' : isDraft ? 'status-draft' : 'status-closed'}`}>
              {t(`dashboard.status.${room.status}`)}
            </span>
            <h3>{room.title || (experimentNameKey ? t(experimentNameKey) : room.experiment)}</h3>
          </div>
          <p className="text-text-muted text-sm flex items-center gap-2">
            {t('dashboard.code')}: <span className="room-code-badge">{room.code}</span>
          </p>
        </div>

        <div className="flex gap-8 items-center pr-4">
          <div className="text-center">
            <p className="font-bold text-navy text-xl">{stats.participants}</p>
            <p className="label" style={{ fontSize: '0.65rem' }}>{t('dashboard.participants')}</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-navy text-xl">{stats.results}</p>
            <p className="label" style={{ fontSize: '0.65rem' }}>{t('dashboard.results')}</p>
          </div>
        </div>
      </div>

      <div className="room-actions">
        {isDraft && onActivate && (
          <button
            onClick={(e) => { e.stopPropagation(); onActivate(); }}
            className="btn-primary"
          >
            {t('dashboard.launchRoom')}
          </button>
        )}
        {isActive && onShare && (
          <button
            onClick={(e) => { e.stopPropagation(); onShare(); }}
            className="btn-outline"
          >
            {t('roomBuilder.shareLink')}
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onExport(); }}
          className="btn-outline btn-csv"
        >
          <span>📉</span> {t('dashboard.exportCSV')}
        </button>
        {isActive && onClose && (
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="btn-outline"
            style={{ color: 'var(--error)', borderColor: 'rgba(220,38,38,0.2)' }}
          >
            {t('dashboard.closeRoom')}
          </button>
        )}
        {!isActive && !isDraft && onReopen && (
          <button
            onClick={(e) => { e.stopPropagation(); onReopen(); }}
            className="btn-primary"
          >
            {t('dashboard.reopenRoom')}
          </button>
        )}
        {!isActive && !isDraft && onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="btn-outline"
            style={{ color: 'var(--error)', borderColor: 'rgba(220,38,38,0.2)' }}
          >
            {t('dashboard.deleteRoom')}
          </button>
        )}
      </div>
    </div>
  );
}
