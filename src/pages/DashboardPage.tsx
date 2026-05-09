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

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportRawCSV = async (room: Room) => {
    try {
      const results = await getResults(room.id);
      let csvContent = '';

      if (room.experiment === 'iat-arab-georgian' || (results.length > 0 && (results[0] as any).trial_data)) {
        // Long Format for IAT
        const headers = [
          'participant_id', 'timestamp', 'age', 'gender', 'explicit_pref', 'warmth_georgian', 'warmth_arab',
          'd_score', 'is_valid', 'is_high_error', 'too_fast_rate', 
          'block', 'trial_idx', 'stimulus', 'category', 'latency', 'total_time', 'is_correct', 'error_count', 'too_fast', 'too_slow'
        ];
        
        const rows: string[] = [];
        results.forEach((r: any) => {
          const rawData = r.trial_data as any;
          const trials = Array.isArray(rawData) ? rawData : (rawData?.trials || []);
          const summary = Array.isArray(rawData) ? {} : (rawData || {});
          const m = r.participant_metadata || summary.participant_metadata || {};
          
          trials.forEach((t: any) => {
            rows.push([
              r.participant_id,
              r.timestamp,
              m.age || '',
              m.gender || '',
              m.explicit_pref || '',
              m.warmth_georgian || '',
              m.warmth_arab || '',
              r.d_score || summary.d_score || '',
              (r.is_valid !== undefined ? r.is_valid : summary.is_valid) ?? '',
              (r.is_high_error !== undefined ? r.is_high_error : summary.is_high_error) ?? '',
              r.too_fast_rate || summary.too_fast_rate || '',
              t.block || '',
              t.trial_idx || '',
              `"${String(t.stimulus).replace(/"/g, '""')}"`,
              `"${String(t.category).replace(/"/g, '""')}"`,
              t.latency || '',
              t.total_time || '',
              t.is_correct !== undefined ? t.is_correct : '',
              t.error_count !== undefined ? t.error_count : '',
              t.too_fast !== undefined ? t.too_fast : '',
              t.too_slow !== undefined ? t.too_slow : ''
            ].join(','));
          });
        });
        
        csvContent = [headers.join(','), ...rows].join('\n');
      } else {
        // Default Flat Format
        const headers = 'participant_id,language,experiment_name,response_time_ms,accuracy,total_trials,age,gender,white_male_avg,white_female_avg,black_male_avg,black_female_avg,answer,correct_answer,timestamp';
        const rows = results.map((r: Result) => {
          const ageStr = r.age !== undefined ? r.age : '';
          const genderStr = r.gender || '';
          const wm = r.white_male_avg !== undefined ? r.white_male_avg : '';
          const wf = r.white_female_avg !== undefined ? r.white_female_avg : '';
          const bm = r.black_male_avg !== undefined ? r.black_male_avg : '';
          const bf = r.black_female_avg !== undefined ? r.black_female_avg : '';
          const answerStr = String(r.answer).replace(/"/g, '""');
          const correctStr = String(r.correct_answer).replace(/"/g, '""');
          
          return `${r.participant_id},${r.language},${r.experiment_name},${r.response_time_ms},${r.accuracy || ''},${r.total_trials || ''},${ageStr},${genderStr},${wm},${wf},${bm},${bf},"${answerStr}","${correctStr}",${r.timestamp}`;
        });
        csvContent = [headers, ...rows].join('\n');
      }

      downloadCSV(csvContent, `raw_trial_data_${room.code}.csv`);
    } catch (error) {
      console.error('Error exporting raw CSV:', error);
    }
  };

  const handleExportRefinedCSV = async (room: Room) => {
    try {
      const results = await getResults(room.id);
      if (results.length === 0) return;

      const headers = [
        'participant_id', 'timestamp', 'age', 'gender', 'explicit_pref', 'warmth_georgian', 'warmth_arab',
        'd_score', 'error_rate', 'fast_response_rate', 'is_valid'
      ];
      
      const rows = results.map((r: any) => {
        const rawData = r.trial_data as any;
        const summary = Array.isArray(rawData) ? {} : (rawData || {});
        const m = r.participant_metadata || summary.participant_metadata || {};
        
        // Calculate rates if not explicitly stored
        const trials = Array.isArray(rawData) ? rawData : (rawData?.trials || []);
        const total = trials.length;
        const tooFast = trials.filter((t: any) => t.too_fast || (t.latency < 300)).length;
        const errors = trials.filter((t: any) => !t.is_correct).length;
        
        const fastRate = r.too_fast_rate || (total > 0 ? (tooFast / total).toFixed(3) : 0);
        const errorRate = total > 0 ? ((errors / total) * 100).toFixed(1) : 0;

        return [
          r.participant_id,
          r.timestamp,
          m.age || r.age || '',
          m.gender || r.gender || '',
          m.explicit_pref || '',
          m.warmth_georgian || '',
          m.warmth_arab || '',
          r.d_score || summary.d_score || '',
          `${errorRate}%`,
          fastRate,
          (r.is_valid !== undefined ? r.is_valid : summary.is_valid) ?? ''
        ].join(',');
      });
      
      const csvContent = [headers.join(','), ...rows].join('\n');
      downloadCSV(csvContent, `refined_scores_${room.code}.csv`);
    } catch (error) {
      console.error('Error exporting refined CSV:', error);
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
                      onExportRefined={() => handleExportRefinedCSV(room)}
                      onExportRaw={() => handleExportRawCSV(room)}
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
                      onExportRefined={() => handleExportRefinedCSV(room)}
                      onExportRaw={() => handleExportRawCSV(room)}
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
  onExportRefined: () => void;
  onExportRaw: () => void;
  onShare?: () => void;
  t: (key: string) => string;
}

function RoomCard({ room, stats, onActivate, onClose, onReopen, onDelete, onExportRefined, onExportRaw, onShare, t }: RoomCardProps) {
  const [showExportOptions, setShowExportOptions] = useState(false);
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
        
        <div className="export-split-button">
          <button
            onClick={(e) => { e.stopPropagation(); onExportRefined(); }}
            className="btn-primary btn-refined"
          >
            📊 {t('dashboard.exportRefined') || 'Download Refined Scores'}
          </button>
          <div className="dropdown-container">
            <button
              onClick={(e) => { e.stopPropagation(); setShowExportOptions(!showExportOptions); }}
              className="btn-primary btn-dropdown-toggle"
            >
              ▼
            </button>
            {showExportOptions && (
              <div className="export-dropdown-menu animate-fade-in">
                <button onClick={(e) => { e.stopPropagation(); onExportRaw(); setShowExportOptions(false); }}>
                  📄 {t('dashboard.exportRaw') || 'Download Raw Trial Data'}
                </button>
              </div>
            )}
          </div>
        </div>

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
