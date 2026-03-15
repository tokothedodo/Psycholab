import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { getUser, createRoom } from '../lib/supabase';
import { AIAssistant } from '../components/AIAssistant';
import type { ExperimentType } from '../types';

const EXPERIMENTS: { type: ExperimentType; name: string }[] = [
  { type: 'muller-lyer', name: 'Müller-Lyer Illusion' },
  { type: 'stroop', name: 'Stroop Test' },
  { type: 'anchoring', name: 'Anchoring Bias' },
  { type: 'ultimatum', name: 'Ultimatum Game' },
  { type: 'digit-span', name: 'Digit Span' },
  { type: 'ponzo', name: 'Ponzo Illusion' },
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
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">✓</span>
          </div>
          <h2 className="text-2xl font-bold text-navy-900 mb-2">
            {t('roomBuilder.roomCreated')}
          </h2>
          <p className="text-gray-600 mb-6">{t('roomBuilder.yourRoomCode')}</p>
          
          <div className="bg-navy-900 text-white text-4xl font-mono py-4 rounded-lg mb-6">
            {createdRoom.code}
          </div>

          <div className="flex gap-2">
            <button
              onClick={copyCode}
              className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              {t('roomBuilder.copyCode')}
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="flex-1 bg-teal-600 text-white py-2 rounded-lg hover:bg-teal-700 transition-colors"
            >
              {t('dashboard.title')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-navy-900 text-white py-4">
        <div className="max-w-4xl mx-auto px-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-white hover:text-gray-200"
          >
            ← {t('common.back')}
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {showAI && (
          <div className="mb-8">
            <AIAssistant 
              currentExperiments={selectedExperiments} 
              onClose={() => setShowAI(false)}
            />
          </div>
        )}

        <div className="bg-white rounded-xl shadow-lg p-8">
          <h1 className="text-2xl font-bold text-navy-900 mb-6">
            {t('roomBuilder.title')}
          </h1>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('roomBuilder.roomTitle')}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="My Experiment"
              className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:border-teal-500"
            />
          </div>

          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <label className="block text-sm font-medium text-gray-700">
                {t('roomBuilder.selectExperiments')}
              </label>
              <button
                onClick={() => setShowAI(!showAI)}
                className="text-teal-600 hover:text-teal-700 text-sm"
              >
                {showAI ? 'Hide AI' : 'Get AI Help'}
              </button>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              {EXPERIMENTS.map((exp) => (
                <button
                  key={exp.type}
                  onClick={() => toggleExperiment(exp.type)}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    selectedExperiments.includes(exp.type)
                      ? 'border-teal-500 bg-teal-50'
                      : 'border-gray-200 hover:border-teal-300'
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
            className="w-full bg-teal-600 text-white py-4 rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg"
          >
            {loading ? t('common.loading') : t('roomBuilder.openRoom')}
          </button>
        </div>
      </div>
    </div>
  );
}
