import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { getUser, createRoom, ensureUserRecord } from '../lib/supabase';
import { AIAssistant } from '../components/AIAssistant';
import { ExperimentConfigPanel, getDefaultConfig } from '../experiments/config';
import { EXPERIMENTS_BY_CATEGORY, getExperimentById } from '../data/experiments';
import './RoomBuilderPage.css';

export function RoomBuilderPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [selectedExperiment, setSelectedExperiment] = useState<string | null>(null);
  const [experimentConfig, setExperimentConfig] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (selectedExperiment) {
      const defaults = getDefaultConfig(selectedExperiment);
      setExperimentConfig(defaults);
    }
  }, [selectedExperiment]);

  const handleSelectExperiment = useCallback((experimentId: string) => {
    setSelectedExperiment(prev => prev === experimentId ? null : experimentId);
  }, []);

  const handleCreateRoom = async () => {
    if (!selectedExperiment) return;

    setLoading(true);
    setError('');

    try {
      const user = await getUser();
      if (!user) {
        navigate('/login');
        return;
      }
      await ensureUserRecord(user.id, user.email || '');
      const room = await createRoom(user.id, selectedExperiment, experimentConfig);
      navigate(`/room-live/${room.code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create room');
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = EXPERIMENTS_BY_CATEGORY
    .filter(cat => !activeCategory || cat.id === activeCategory)
    .map(cat => ({
      ...cat,
      experiments: cat.experiments.filter(exp => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return exp.name.toLowerCase().includes(q) ||
          exp.description.toLowerCase().includes(q);
      }),
    }))
    .filter(cat => cat.experiments.length > 0);

  const selectedExpData = selectedExperiment ? getExperimentById(selectedExperiment) : null;

  return (
    <div className="builder-layout animate-fade-in">
      <main className="builder-catalog">
        <header className="mb-8">
          <h1 className="mb-2">Design Your Study</h1>
          <p className="text-text-secondary">Select an experiment to configure its scientific parameters.</p>
        </header>

        <div className="mb-8">
          <input
            type="text"
            className="input-premium py-3 px-4 mb-4"
            placeholder="Search experiments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="category-filters">
            <button
              onClick={() => setActiveCategory(null)}
              className={`filter-pill ${!activeCategory ? 'active' : ''}`}
            >
              All
            </button>
            {EXPERIMENTS_BY_CATEGORY.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
                className={`filter-pill ${activeCategory === cat.id ? 'active' : ''}`}
              >
                {t(cat.nameKey)}
              </button>
            ))}
          </div>
        </div>

        {filteredCategories.map(cat => (
          <section key={cat.id} className="mb-10">
            <h4 className="config-section-title">{t(cat.nameKey)}</h4>
            <div className="catalog-grid-compact">
              {cat.experiments.map(exp => (
                <div
                  key={exp.id}
                  onClick={() => handleSelectExperiment(exp.id)}
                  className={`select-card ${selectedExperiment === exp.id ? 'active' : ''}`}
                >
                  {selectedExperiment === exp.id && <span className="active-check">✓</span>}
                  <h4>{t(exp.nameKey) || exp.name}</h4>
                  <p className="line-clamp-2">{t(exp.descriptionKey) || exp.description}</p>
                  <div className="flex justify-between items-center mt-3 pt-3 border-t">
                    <span className="citation" style={{ fontSize: '0.65rem' }}>~{exp.duration}m</span>
                    <span className="label" style={{ fontSize: '0.6rem' }}>{exp.trials} Trials</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </main>

      <aside className="builder-config">
        {selectedExpData ? (
          <div className="flex flex-col h-full">
            <ExperimentConfigPanel
              experimentId={selectedExpData.id}
              experimentName={selectedExpData.name}
              config={experimentConfig}
              onConfigChange={setExperimentConfig}
            />
            <div className="ai-panel">
              <AIAssistant
                currentExperiment={selectedExpData.id}
                experimentConfig={{ [selectedExpData.id]: experimentConfig }}
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-text-muted">
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📄</div>
            <h3>Metadata Viewer</h3>
            <p>Select an experiment to view theoretical basis and configure methodology.</p>
          </div>
        )}
      </aside>

      <footer className="builder-footer">
        <div className="footer-experiment-info flex-1">
          {selectedExpData ? (
            <>
              <span className="footer-badge">Target Experiment</span>
              <h3>{selectedExpData.name}</h3>
            </>
          ) : (
            <p className="text-text-muted italic">Ready to deploy? Select a task first.</p>
          )}
        </div>

        {error && <p className="text-error text-sm mr-4">{error}</p>}

        <div className="flex gap-4">
          <button onClick={() => navigate('/dashboard')} className="btn-outline">Cancel</button>
          <button
            onClick={handleCreateRoom}
            disabled={!selectedExperiment || loading}
            className="btn-primary"
            style={{ paddingLeft: '3rem', paddingRight: '3rem' }}
          >
            {loading ? 'Initializing...' : 'Launch Research Room'}
          </button>
        </div>
      </footer>
    </div>
  );
}
