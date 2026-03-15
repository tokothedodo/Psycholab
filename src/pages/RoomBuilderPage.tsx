import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { getUser, createRoom } from '../lib/supabase';
import { AIAssistant } from '../components/AIAssistant';
import type { ExperimentType } from '../types';

const EXPERIMENTS: { type: ExperimentType; name: string }[] = [
  { type: 'muller-lyer-illusion', name: 'Müller-Lyer Illusion' },
  { type: 'stroop-color-word-interference-task', name: 'Stroop Color-Word Interference Task' },
  { type: 'anchoring-and-adjustment-heuristic-task', name: 'Anchoring and Adjustment Heuristic Task' },
  { type: 'ultimatum-game', name: 'Ultimatum Game' },
  { type: 'digit-span-task', name: 'Digit Span Task' },
  { type: 'ponzo-illusion', name: 'Ponzo Illusion' },
];

export function RoomBuilderPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [selectedExperiments, setSelectedExperiments] = useState<ExperimentType[]>([]);
  const [loading, setLoading] = useState(false);
  const [createdRoom, setCreatedRoom] = useState<{ code: string; id: string } | null>(null);
  const [showAI, setShowAI] = useState(false);

  const toggleExperiment = (type: ExperimentType) => {
    setSelectedExperiments((prev) =>
      prev.includes(type)
        ? prev.filter((e) => e !== type)
        : [...prev, type]
    );
  };

  const handleCreateRoom = async () => {
    if (selectedExperiments.length === 0) return;

    setLoading(true);
    try {
      const user = await getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      const room = await createRoom(user.id, selectedExperiments);
      setCreatedRoom({ code: room.code, id: room.id });
    } catch (error) {
      console.error('Error creating room:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyCode = () => {
    if (createdRoom) {
      navigator.clipboard.writeText(createdRoom.code);
    }
  };

  if (createdRoom) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded border border-border p-8 text-center">
          <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl text-success font-bold">✓</span>
          </div>
          <h2 className="text-2xl font-bold text-navy-900 mb-2">
            {t('roomBuilder.roomCreated')}
          </h2>
          <p className="text-gray-600 mb-6">{t('roomBuilder.yourRoomCode')}</p>

          <div className="bg-surface border border-border text-primary text-4xl font-mono py-4 rounded mb-6">
            {createdRoom.code}
          </div>

          <div className="flex gap-2">
            <button
              onClick={copyCode}
              className="flex-1 btn-outline"
            >
              {t('roomBuilder.copyCode')}
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="flex-1 btn-primary"
            >
              {t('dashboard.title')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <header className="bg-primary text-white py-4 border-b border-navy-800">
        <div className="academic-container">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-white hover:text-gray-200 transition-colors"
          >
            ← {t('common.back')}
          </button>
        </div>
      </header>

      <div className="academic-container py-8 max-w-4xl flex-1">
        {showAI && (
          <div className="mb-8">
            <AIAssistant
              currentExperiments={selectedExperiments}
              onClose={() => setShowAI(false)}
            />
          </div>
        )}

        <div className="bg-white rounded border border-border p-8">
          <h2 className="mb-6">
            {t('roomBuilder.title')}
          </h2>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('roomBuilder.roomTitle')}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="My Experiment"
              className="w-full p-3 border border-border text-base rounded focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <label className="block text-sm font-medium text-gray-700">
                {t('roomBuilder.selectExperiments')}
              </label>
              <button
                onClick={() => setShowAI(!showAI)}
                className="text-secondary hover:text-teal-700 font-medium transition-colors"
              >
                {showAI ? 'Hide AI' : 'Get AI Help'}
              </button>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              {EXPERIMENTS.map((exp) => (
                <button
                  key={exp.type}
                  onClick={() => toggleExperiment(exp.type)}
                  className={`p-4 rounded border-2 text-left transition-all ${selectedExperiments.includes(exp.type)
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border hover:border-primary/50'
                    }`}
                >
                  <span className="font-medium">{exp.name}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleCreateRoom}
            disabled={loading || selectedExperiments.length === 0}
            className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed text-lg"
          >
            {loading ? t('common.loading') : t('roomBuilder.openRoom')}
          </button>
        </div>
      </div>
    </div>
  );
}
