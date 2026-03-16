import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { getRooms, getUniqueParticipants, getRoomResultsCount, closeRoom, getResults, getUser, signOut, type Room, type Result } from '../lib/supabase';
import { AIAssistant } from '../components/AIAssistant';
import { getExperimentById } from '../data/experiments';

export function DashboardPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [showAI, setShowAI] = useState(false);
  const [roomStats, setRoomStats] = useState<Record<string, { participants: number; results: number }>>({});

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (userId) {
      loadRooms();
    }
  }, [userId]);

  const checkUser = async () => {
    const user = await getUser();
    if (!user) {
      navigate('/login');
      return;
    }
    setUserId(user.id);
  };

  const loadRooms = async () => {
    if (!userId) return;
    try {
      const roomsData = await getRooms(userId);
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
  };

  const handleCloseRoom = async (roomId: string) => {
    try {
      await closeRoom(roomId);
      loadRooms();
    } catch (error) {
      console.error('Error closing room:', error);
    }
  };

  const handleExportCSV = async (room: Room) => {
    try {
      const results = await getResults(room.id);

      const csvContent = [
        'participant_id,language,experiment_name,response_time_ms,answer,correct_answer,timestamp,trial_data',
        ...results.map((r: Result) =>
          `${r.participant_id},${r.language},${r.experiment_name},${r.response_time_ms},"${String(r.answer).replace(/"/g, '""')}","${String(r.correct_answer).replace(/"/g, '""')}",${r.timestamp},"${r.trial_data ? JSON.stringify(r.trial_data).replace(/"/g, '""') : ''}"`
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
        <p className="text-gray-500">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <header className="bg-primary text-white py-4 border-b border-navy-800">
        <div className="academic-container flex justify-between items-center">
          <div>
            <h2 className="mb-0 text-white leading-none">{t('dashboard.title')}</h2>
          </div>
          <div className="flex gap-4 items-center">
            <button
              onClick={() => setShowAI(!showAI)}
              className="btn-secondary"
            >
              AI Assistant
            </button>
            <button
              onClick={handleLogout}
              className="text-white hover:text-gray-200 transition-colors"
            >
              {t('nav.logout')}
            </button>
          </div>
        </div>
      </header>

      <div className="academic-container py-8 flex-1">
        {showAI && (
          <div className="mb-8">
            <AIAssistant currentExperiment={null} />
          </div>
        )}

        <div className="flex justify-between items-center mb-6">
          <h2 className="mb-0">{t('dashboard.createNewRoom')}</h2>
          <button
            onClick={() => navigate('/create-room')}
            className="btn-primary"
          >
            + {t('dashboard.createRoom')}
          </button>
        </div>

        {rooms.length === 0 ? (
          <div className="text-center py-12 bg-white border border-border rounded">
            <p className="text-gray-500">{t('dashboard.noRooms')}</p>
          </div>
        ) : (
          <>
            {activeRooms.length > 0 && (
              <section className="mb-8">
                <h3 className="text-lg font-semibold text-navy-900 mb-4">
                  {t('dashboard.activeRooms')}
                </h3>
                <div className="grid gap-4">
                  {activeRooms.map((room) => (
                    <RoomCard
                      key={room.id}
                      room={room}
                      stats={roomStats[room.id] || { participants: 0, results: 0 }}
                      onClose={() => handleCloseRoom(room.id)}
                      onExport={() => handleExportCSV(room)}
                      onViewLive={() => navigate(`/room-live/${room.code}`)}
                      t={t}
                    />
                  ))}
                </div>
              </section>
            )}

            {pastRooms.length > 0 && (
              <section>
                <h3 className="text-lg font-semibold text-navy-900 mb-4">
                  {t('dashboard.pastRooms')}
                </h3>
                <div className="grid gap-4">
                  {pastRooms.map((room) => (
                    <RoomCard
                      key={room.id}
                      room={room}
                      stats={roomStats[room.id] || { participants: 0, results: 0 }}
                      onExport={() => handleExportCSV(room)}
                      t={t}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

interface RoomCardProps {
  room: Room;
  stats: { participants: number; results: number };
  onClose?: () => void;
  onExport: () => void;
  onViewLive?: () => void;
  t: (key: string) => string;
}

function RoomCard({ room, stats, onClose, onExport, onViewLive, t }: RoomCardProps) {
  const isActive = room.status === 'active' || room.status === 'draft';
  const experimentData = getExperimentById(room.experiment);
  const experimentName = experimentData?.name || room.experiment || 'No experiment';

  return (
    <div className="bg-white rounded p-6 border border-border">
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h3 className="mb-0">
              {room.title || `Room ${room.code}`}
            </h3>
            {room.status === 'active' && (
              <span className="bg-success/10 text-success text-xs px-2 py-1 rounded">
                LIVE
              </span>
            )}
            {room.status === 'draft' && (
              <span className="bg-amber-100 text-amber-700 text-xs px-2 py-1 rounded">
                DRAFT
              </span>
            )}
          </div>
          <p className="text-text-secondary text-sm">
            {t('dashboard.roomCode')}: <span className="font-mono font-bold text-text-primary">{room.code}</span>
          </p>
        </div>
        <span className={`text-sm ${isActive ? 'text-green-600' : 'text-gray-500'}`}>
          {isActive ? t('dashboard.status.active') : t('dashboard.status.closed')}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-navy-900">{stats.participants}</p>
          <p className="text-sm text-gray-500">{t('dashboard.participants')}</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-navy-900">{stats.results}</p>
          <p className="text-sm text-gray-500">{t('dashboard.results')}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <span className="bg-gray-100 text-gray-700 text-sm px-3 py-1 rounded-full">
          {experimentName}
        </span>
      </div>

      <div className="flex gap-2">
        {isActive && onViewLive && (
          <button
            onClick={onViewLive}
            className="flex-1 btn-primary"
          >
            View Room
          </button>
        )}
        <button
          onClick={onExport}
          className="flex-1 btn-outline"
        >
          {t('dashboard.exportCSV')}
        </button>
        {isActive && onClose && (
          <button
            onClick={onClose}
            className="flex-1 bg-surface border border-error/20 text-error py-2 rounded hover:bg-error/5 transition-colors text-sm font-medium"
          >
            {t('dashboard.closeRoom')}
          </button>
        )}
      </div>
    </div>
  );
}
