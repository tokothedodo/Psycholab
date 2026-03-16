import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { getUser, createRoom, ensureUserRecord } from '../lib/supabase';
import { AIAssistant } from '../components/AIAssistant';
import { ExperimentConfigPanel, getDefaultConfig } from '../experiments/config';
import { EXPERIMENTS, EXPERIMENTS_BY_CATEGORY, getExperimentById, type Experiment } from '../data/experiments';
import { getMetadataById, getCategoryById } from '../data/experimentTaxonomy';

export function RoomBuilderPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [selectedExperiment, setSelectedExperiment] = useState<string | null>(null);
  const [experimentConfig, setExperimentConfig] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationError, setValidationError] = useState('');
  const [dismissedWarnings, setDismissedWarnings] = useState<string[]>([]);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const configPanelRef = useRef<HTMLDivElement>(null);

  // Load default config when experiment changes
  useEffect(() => {
    if (selectedExperiment) {
      const defaults = getDefaultConfig(selectedExperiment);
      setExperimentConfig(defaults);
      setDismissedWarnings([]);
      setValidationError('');
    }
  }, [selectedExperiment]);

  const handleSelectExperiment = useCallback((experimentId: string) => {
    setSelectedExperiment(prev => prev === experimentId ? null : experimentId);
    // Open mobile sheet on selection
    if (window.innerWidth < 768) {
      setMobileSheetOpen(true);
    }
  }, []);

  const handleConfigChange = useCallback((newConfig: Record<string, unknown>) => {
    setExperimentConfig(newConfig);
  }, []);

  const handleDismissWarning = useCallback((warningKey: string) => {
    setDismissedWarnings(prev => [...prev, warningKey]);
  }, []);

  const handleCreateRoom = async () => {
    if (!selectedExperiment) {
      setValidationError('Please select an experiment to continue');
      return;
    }

    setLoading(true);
    setError('');
    setValidationError('');

    try {
      console.log('[PsychoLab] handleCreateRoom: getting user');
      const user = await getUser();
      if (!user) {
        console.log('[PsychoLab] handleCreateRoom: no user, redirecting to login');
        navigate('/login');
        return;
      }

      // Ensure user record exists in users table
      console.log('[PsychoLab] handleCreateRoom: ensuring user record');
      await ensureUserRecord(user.id, user.email || '');

      // Create the room
      console.log('[PsychoLab] handleCreateRoom: creating room');
      const room = await createRoom(user.id, selectedExperiment, experimentConfig);
      console.log('[PsychoLab] handleCreateRoom: success, navigating to live page');

      navigate(`/room-live/${room.code}`);
    } catch (err) {
      console.error('[PsychoLab] handleCreateRoom: error:', err);
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // Get selected experiment data
  const selectedExpData = selectedExperiment ? getExperimentById(selectedExperiment) : null;
  const selectedExpMeta = selectedExperiment ? getMetadataById(selectedExperiment) : null;
  const selectedExpCategory = selectedExpMeta ? getCategoryById(selectedExpMeta.category) : null;

  // Filter experiments
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

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Header */}
      <header className="bg-primary text-white py-4 border-b border-navy-800">
        <div className="academic-container flex justify-between items-center">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-white hover:text-gray-200 transition-colors"
          >
            ← {t('common.back')}
          </button>
          <h2 className="mb-0 text-white text-lg leading-none">
            {t('roomBuilder.title')}
          </h2>
          <div className="w-16" />
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-3">
          <div className="academic-container flex items-center gap-2">
            <span className="text-red-600 font-medium">⚠ Error:</span>
            <span className="text-red-700 text-sm">{error}</span>
            <button
              onClick={() => setError('')}
              className="ml-auto text-red-500 hover:text-red-700"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Content — 60/40 Split */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden" style={{ height: 'calc(100vh - 130px)' }}>
        {/* Left Panel — Experiment Catalog (60%) */}
        <div className="w-full md:w-[60%] overflow-y-auto border-r border-border p-4 md:p-6">
          {/* Search & Filter */}
          <div className="mb-4 space-y-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search experiments..."
              className="w-full p-3 border border-border rounded-lg focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all"
            />
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setActiveCategory(null)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${!activeCategory
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
              >
                All ({EXPERIMENTS.length})
              </button>
              {EXPERIMENTS_BY_CATEGORY.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${activeCategory === cat.id
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                >
                  {t(cat.nameKey)} ({cat.experiments.length})
                </button>
              ))}
            </div>
          </div>

          {/* Validation error */}
          {validationError && (
            <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-700 p-3 rounded-lg text-sm flex items-center gap-2">
              <span>⚠</span>
              <span>{validationError}</span>
            </div>
          )}

          {/* Experiment Cards */}
          {filteredCategories.map(cat => (
            <div key={cat.id} className="mb-6">
              <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">
                {t(cat.nameKey)}
              </h3>
              <div className="grid gap-2">
                {cat.experiments.map(exp => (
                  <ExperimentCard
                    key={exp.id}
                    experiment={exp}
                    isSelected={selectedExperiment === exp.id}
                    onSelect={() => handleSelectExperiment(exp.id)}
                    t={t}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Right Panel — Config (40%) — Desktop */}
        <div
          ref={configPanelRef}
          className="hidden md:flex w-[40%] flex-col overflow-y-auto bg-white"
        >
          {selectedExpData && selectedExpMeta ? (
            <ConfigPanelContent
              experiment={selectedExpData}
              metadata={selectedExpMeta}
              category={selectedExpCategory}
              config={experimentConfig}
              onConfigChange={handleConfigChange}
              dismissedWarnings={dismissedWarnings}
              onDismissWarning={handleDismissWarning}
              t={t}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <span className="text-3xl">🔬</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                Select an experiment to configure it
              </h3>
              <p className="text-sm text-gray-500 max-w-xs">
                Choose an experiment from the catalog on the left to see its settings and customize variables.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Bottom Sheet */}
      {mobileSheetOpen && selectedExpData && selectedExpMeta && (
        <div className="md:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileSheetOpen(false)}
          />
          {/* Sheet */}
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[85vh] flex flex-col animate-slideUp">
            {/* Handle */}
            <div className="flex justify-center py-3">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>
            {/* Header */}
            <div className="px-4 pb-3 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-semibold text-navy-900">{selectedExpData.name}</h3>
              <button
                onClick={() => setMobileSheetOpen(false)}
                className="text-gray-500 hover:text-gray-700 p-1"
              >
                ✕
              </button>
            </div>
            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              <ConfigPanelContent
                experiment={selectedExpData}
                metadata={selectedExpMeta}
                category={selectedExpCategory}
                config={experimentConfig}
                onConfigChange={handleConfigChange}
                dismissedWarnings={dismissedWarnings}
                onDismissWarning={handleDismissWarning}
                t={t}
              />
            </div>
          </div>
        </div>
      )}

      {/* Sticky Bottom Bar */}
      <div className="bg-white border-t border-border px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          {selectedExpData ? (
            <div className="flex items-center gap-2">
              <span className="text-teal-600 font-medium">✓</span>
              <span className="text-sm font-medium text-navy-900 truncate">
                {selectedExpData.name}
              </span>
              {/* Mobile config button */}
              <button
                onClick={() => setMobileSheetOpen(true)}
                className="md:hidden text-teal-600 text-sm font-medium whitespace-nowrap"
              >
                Configure →
              </button>
            </div>
          ) : (
            <span className="text-sm text-text-secondary">No experiment selected</span>
          )}
        </div>
        <button
          onClick={handleCreateRoom}
          disabled={loading || !selectedExperiment}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap px-8"
        >
          {loading ? t('common.loading') : 'Create Room'}
        </button>
      </div>
    </div>
  );
}

// ─── Experiment Card Component ──────────────────────────────────────────────

interface ExperimentCardProps {
  experiment: Experiment;
  isSelected: boolean;
  onSelect: () => void;
  t: (key: string) => string;
}

function ExperimentCard({ experiment, isSelected, onSelect, t }: ExperimentCardProps) {
  const meta = getMetadataById(experiment.id);
  const category = meta ? getCategoryById(meta.category) : null;

  return (
    <button
      onClick={onSelect}
      className={`relative w-full text-left p-4 rounded-lg border-2 transition-all ${isSelected
          ? 'border-teal-500 bg-teal-50/60 shadow-md shadow-teal-500/10'
          : 'border-gray-200 hover:border-teal-300 hover:shadow-sm bg-white'
        }`}
    >
      {/* Checkmark */}
      {isSelected && (
        <div className="absolute top-3 right-3 w-6 h-6 bg-teal-500 rounded-full flex items-center justify-center">
          <span className="text-white text-sm font-bold">✓</span>
        </div>
      )}

      <div className="pr-8">
        <h4 className={`font-medium text-sm mb-1 ${isSelected ? 'text-teal-700' : 'text-navy-900'}`}>
          {t(experiment.nameKey) || experiment.name}
        </h4>
        <p className="text-xs text-gray-500 mb-2 line-clamp-2">
          {t(experiment.descriptionKey) || experiment.description}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          {category && (
            <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full text-gray-600">
              {t(category.nameKey)}
            </span>
          )}
          <span className="text-xs text-gray-400">
            ~{experiment.duration} min
          </span>
          <span className="text-xs text-gray-400">
            {experiment.citation}
          </span>
        </div>
      </div>
    </button>
  );
}

// ─── Config Panel Content Component ─────────────────────────────────────────

import type { ExperimentMetadata, CategoryDefinition } from '../data/experimentTaxonomy';

interface ConfigPanelContentProps {
  experiment: Experiment;
  metadata: ExperimentMetadata;
  category: CategoryDefinition | null | undefined;
  config: Record<string, unknown>;
  onConfigChange: (config: Record<string, unknown>) => void;
  dismissedWarnings: string[];
  onDismissWarning: (key: string) => void;
  t: (key: string) => string;
}

function ConfigPanelContent({
  experiment,
  metadata,
  category,
  config,
  onConfigChange,
  dismissedWarnings,
  onDismissWarning,
  t,
}: ConfigPanelContentProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 p-4">
        <h3 className="font-bold text-navy-900 text-lg leading-tight mb-1">
          {t(experiment.nameKey) || experiment.name}
        </h3>
        <div className="flex items-center gap-2 flex-wrap">
          {category && (
            <span className={`text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700`}>
              {t(category.nameKey)}
            </span>
          )}
          <span className="text-xs text-gray-500">
            ~{experiment.duration} min
          </span>
          <span className="text-xs text-gray-500">
            {experiment.trials} trials
          </span>
        </div>
        <p className="text-xs text-gray-400 italic mt-2 leading-relaxed">
          {metadata.originalCitation.length > 120
            ? metadata.originalCitation.slice(0, 120) + '...'
            : metadata.originalCitation}
        </p>
      </div>

      {/* Config Panel */}
      <div className="flex-1 p-4">
        <ExperimentConfigPanel
          experimentId={experiment.id}
          experimentName={experiment.name}
          config={config}
          onConfigChange={onConfigChange}
          dismissedWarnings={dismissedWarnings}
          onDismissWarning={onDismissWarning}
        />
      </div>

      {/* AI Assistant */}
      <div className="border-t border-gray-200 p-4" style={{ maxHeight: '350px' }}>
        <AIAssistant
          currentExperiment={experiment.id}
          experimentConfig={{ [experiment.id]: config }}
        />
      </div>
    </div>
  );
}
