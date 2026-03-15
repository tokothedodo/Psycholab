import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { getRooms, getUniqueParticipants, getRoomResultsCount, closeRoom, getResults, getUser, signOut, type Room, type Result } from '../lib/supabase';
import { AIAssistant } from '../components/AIAssistant';

const EXPERIMENT_NAMES: Record<string, string> = {
  'muller-lyer': 'Müller-Lyer Illusion',
  'stroop': 'Stroop Test',
  'anchoring': 'Anchoring Bias',
  'ultimatum': 'Ultimatum Game',
  'digit-span': 'Digit Span',
  'ponzo': 'Ponzo Illusion',
};

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
        'participant_id,language,experiment_name,response_time_ms,answer,correct_answer,timestamp',
        ...results.map((r: Result) =>
          `${r.participant_id},${r.language},${r.experiment_name},${r.response_time_ms},${r.answer},${r.correct_answer},${r.timestamp}`
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

  const activeRooms = rooms.filter((r) => r.status === 'open');
  const pastRooms = rooms.filter((r) => r.status === 'closed');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-navy-900 text-white py-4">
        <div className="max-w-6xl mx-auto px-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">{t('dashboard.title')}</h1>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => setShowAI(!showAI)}
              className="bg-teal-600 px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors"
            >
              AI Assistant
            </button>
            <button
              onClick={handleLogout}
              className="text-white hover:text-gray-200"
            >
              {t('nav.logout')}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {showAI && (
          <div className="mb-8">
            <AIAssistant currentExperiments={[]} />
          </div>
        )}

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-navy-900">
            {t('dashboard.createNewRoom')}
          </h2>
          <button
            onClick={() => navigate('/create-room')}
            className="bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 transition-colors font-semibold"
          >
            + {t('dashboard.createRoom')}
          </button>
        </div>

        {rooms.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl">
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
  t: (key: string) => string;
}

function RoomCard({ room, stats, onClose, onExport, t }: RoomCardProps) {
  const isActive = room.status === 'open';

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-lg font-semibold text-navy-900">
              {(room as Room & { title?: string }).title || `Room ${room.code}`}
            </h4>
            {isActive && (
              <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                {t('dashboard.live')}
              </span>
            )}
          </div>
          <p className="text-gray-500 text-sm">
            {t('dashboard.roomCode')}: <span className="font-mono font-bold text-navy-900">{room.code}</span>
          </p>
        </div>
        <span className={`text-sm ${isActive ? 'text-green-600' : 'text-gray-500'}`}>
          {isActive ? t('dashboard.status.active') : t('dashboard.status.closed')}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-navy-900">{stats.participants}</p>
          <p className="text-sm text-gray-500">{t('dashboard.participants')}</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-navy-900">{stats.results}</p>
          <p className="text-sm text-gray-500">{t('dashboard.results')}</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-navy-900">{room.experiments.length}</p>
          <p className="text-sm text-gray-500">{t('dashboard.experiments')}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {room.experiments.map((exp) => (
          <span
            key={exp}
            className="bg-gray-100 text-gray-700 text-sm px-3 py-1 rounded-full"
          >
            {EXPERIMENT_NAMES[exp] || exp}
          </span>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          onClick={onExport}
          className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
        >
          {t('dashboard.exportCSV')}
        </button>
        {isActive && onClose && (
          <button
            onClick={onClose}
            className="flex-1 bg-red-50 text-red-600 py-2 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
          >
            {t('dashboard.closeRoom')}
          </button>
        )}
      </div>
    </div>
  );
}
