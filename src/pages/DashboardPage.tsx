import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { getRooms, getUniqueParticipants, getRoomResultsCount, closeRoom, getResults, getUser, signOut, type Room, type Result } from '../lib/supabase';
import { AIAssistant } from '../components/AIAssistant';
import { getExperimentById } from '../data/experiments';
import './DashboardPage.css';

export function DashboardPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [showAI, setShowAI] = useState(false);
  const [roomStats, setRoomStats] = useState<Record<string, { participants: number; results: number }>>({});

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user?.id) {
      loadRooms();
    }
  }, [user?.id]);

  const checkUser = async () => {
    const userData = await getUser();
    if (!userData) {
      navigate('/login');
      return;
    }
    setUser({ id: userData.id, email: userData.email });
  };

  const loadRooms = async () => {
    if (!user?.id) return;
    try {
      const roomsData = await getRooms(user.id);
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

  const totalParticipants = Object.values(roomStats).reduce((acc, curr) => acc + curr.participants, 0);
  const totalResults = Object.values(roomStats).reduce((acc, curr) => acc + curr.results, 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-text-muted animate-pulse">Initializing Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-layout animate-fade-in">
      <aside className="sidebar">
        <nav className="sidebar-nav">
          <div className="px-6 mb-8">
            <h3 style={{ fontFamily: 'DM Serif Display' }}>PsychoLab<span style={{ color: 'var(--teal)' }}>.</span></h3>
          </div>
          <a href="#" className="sidebar-link active">
            <span>🏠</span> Dashboard
          </a>
          <a href="#" className="sidebar-link" onClick={() => navigate('/experiments')}>
            <span>🔬</span> Experiments
          </a>
          <button className="sidebar-link w-full text-left" onClick={() => setShowAI(!showAI)}>
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
          <h1 className="mb-0">Research Summary</h1>
          <button
            onClick={() => navigate('/create-room')}
            className="btn-primary"
          >
            + Create New Room
          </button>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <p className="stat-value">{rooms.length}</p>
            <p className="stat-label">Total Rooms</p>
          </div>
          <div className="stat-card">
            <p className="stat-value">{totalParticipants}</p>
            <p className="stat-label">Participants</p>
          </div>
          <div className="stat-card">
            <p className="stat-value">{totalResults}</p>
            <p className="stat-label">Data Points</p>
          </div>
        </div>

        {showAI && (
          <div className="mb-8 animate-fade-up">
            <AIAssistant currentExperiment={null} onClose={() => setShowAI(false)} />
          </div>
        )}

        {rooms.length === 0 ? (
          <div className="text-center py-16 bg-white border border-border rounded-xl">
            <p className="text-text-muted">No research rooms created yet.</p>
            <button
              onClick={() => navigate('/create-room')}
              className="btn-outline mt-4"
            >
              Start First Study
            </button>
          </div>
        ) : (
          <div className="space-y-12">
            {activeRooms.length > 0 && (
              <section className="animate-fade-up">
                <h3 className="mb-6 flex items-center gap-3">
                  <span className="w-2 h-2 bg-teal rounded-full animate-pulse"></span>
                  Active Studies
                </h3>
                <div className="grid gap-6">
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
              <section className="animate-fade-up">
                <h3 className="mb-6">{t('dashboard.pastRooms')}</h3>
                <div className="grid gap-6">
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
          </div>
        )}
      </main>
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
    <div className="room-card-v2">
      <div className="room-info">
        <div className="room-title-area">
          <div className="flex items-center gap-3 mb-1">
            <span className={`room-status-pill ${room.status === 'active' ? 'status-active' : room.status === 'draft' ? 'status-draft' : 'status-closed'}`}>
              {room.status}
            </span>
            <h3>{room.title || `Study: ${experimentName}`}</h3>
          </div>
          <p className="text-text-muted text-sm flex items-center gap-2">
            Code: <span className="room-code-badge">{room.code}</span>
          </p>
        </div>

        <div className="flex gap-8 items-center pr-4">
          <div className="text-center">
            <p className="font-bold text-navy text-xl">{stats.participants}</p>
            <p className="label" style={{ fontSize: '0.65rem' }}>Users</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-navy text-xl">{stats.results}</p>
            <p className="label" style={{ fontSize: '0.65rem' }}>Data</p>
          </div>
        </div>
      </div>

      <div className="room-actions">
        {isActive && onViewLive && (
          <button
            onClick={onViewLive}
            className="btn-primary"
          >
            Launch Live Room
          </button>
        )}
        <button
          onClick={onExport}
          className="btn-outline btn-csv"
        >
          <span>📉</span> Export CSV
        </button>
        {isActive && onClose && (
          <button
            onClick={onClose}
            className="btn-outline"
            style={{ color: 'var(--error)', borderColor: 'rgba(220,38,38,0.2)' }}
          >
            {t('dashboard.closeRoom')}
          </button>
        )}
      </div>
    </div>
  );
}
