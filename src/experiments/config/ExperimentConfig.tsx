import { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { getExperimentVariables, getDefaultConfig } from './experimentDefaults';
import { validateAllVariables } from './scientificBounds';
import { getWarningMessage } from './guardrailMessages';
import './ExperimentConfig.css';

interface ExperimentConfigPanelProps {
  experimentId: string;
  experimentName: string;
  config: Record<string, unknown>;
  onConfigChange: (newConfig: Record<string, unknown>) => void;
  onPreview?: () => void;
  participantCount?: number;
  dismissedWarnings?: string[];
  onDismissWarning?: (warningKey: string) => void;
}

export function ExperimentConfigPanel({
  experimentId,
  experimentName,
  config,
  onConfigChange,
  onPreview,
  participantCount = 0,
  dismissedWarnings = [],
  onDismissWarning,
}: ExperimentConfigPanelProps) {
  const { t, language } = useLanguage();
  const [localConfig, setLocalConfig] = useState(config);
  const [expandedSection, setExpandedSection] = useState<'universal' | 'experiment'>('universal');

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  const variables = useMemo(() => getExperimentVariables(experimentId), [experimentId]);
  const validation = useMemo(
    () => validateAllVariables(experimentId, localConfig),
    [experimentId, localConfig]
  );

  const handleChange = (variableId: string, value: unknown) => {
    const newConfig = { ...localConfig, [variableId]: value };
    setLocalConfig(newConfig);
    onConfigChange(newConfig);
  };

  const handleReset = () => {
    const defaults = getDefaultConfig(experimentId);
    setLocalConfig(defaults);
    onConfigChange(defaults);
  };

  const universalVarIds = ['trials', 'isi', 'stimulusDuration', 'responseTimeLimit', 'showFeedback', 'showProgressBar', 'customInstructions', 'randomizeOrder', 'practiceTrials', 'outlierRemoval', 'outlierThreshold'];
  const universalVars = Object.entries(variables).filter(([key]) => universalVarIds.includes(key));
  const experimentVars = Object.entries(variables).filter(([key]) => !universalVarIds.includes(key));

  const renderInput = (variableId: string, variableConfig: Record<string, unknown>) => {
    const value = localConfig[variableId];
    const warnings = validation.allWarnings.filter(w => w.variableId === variableId);
    const isDismissed = dismissedWarnings.includes(variableId);

    const renderInputField = () => {
      const varType = variableConfig.type as string;

      switch (varType) {
        case 'number':
          const step = (variableConfig.step as number) || 1;
          const min = variableConfig.min as number;
          const max = variableConfig.max as number;

          return (
            <div className="flex items-center gap-2">
              <div className="flex items-center border border-border rounded overflow-hidden">
                <button
                  onClick={() => handleChange(variableId, Math.max(min ?? -Infinity, (value as number) - step))}
                  className="px-3 py-2 bg-surface hover:bg-border transition-colors border-r"
                  type="button"
                >
                  -
                </button>
                <input
                  type="number"
                  value={value as number}
                  onChange={(e) => handleChange(variableId, Number(e.target.value))}
                  min={min}
                  max={max}
                  className="w-20 p-2 text-center focus:outline-none bg-white font-mono"
                />
                <button
                  onClick={() => handleChange(variableId, Math.min(max ?? Infinity, (value as number) + step))}
                  className="px-3 py-2 bg-surface hover:bg-border transition-colors border-l"
                  type="button"
                >
                  +
                </button>
              </div>
              {(variableConfig.unit as string) && <span className="text-text-muted text-xs font-semibold uppercase">{variableConfig.unit as string}</span>}
            </div>
          );

        case 'slider':
          return (
            <div className="space-y-2">
              <input
                type="range"
                value={value as number}
                onChange={(e) => handleChange(variableId, Number(e.target.value))}
                min={variableConfig.min as number}
                max={variableConfig.max as number}
                step={variableConfig.step as number || 1}
                className="premium-slider"
              />
              <div className="flex justify-between text-xs font-mono text-text-muted">
                <span>{variableConfig.min as number}{variableConfig.unit as string}</span>
                <span className="text-navy font-bold">{value as string}{variableConfig.unit as string}</span>
                <span>{variableConfig.max as number}{variableConfig.unit as string}</span>
              </div>
            </div>
          );

        case 'boolean':
          return (
            <div
              onClick={() => handleChange(variableId, !value)}
              className={`premium-switch ${value ? 'active' : ''}`}
            >
              <div className="premium-switch-thumb" />
            </div>
          );

        case 'select':
          return (
            <select
              value={value as string}
              onChange={(e) => handleChange(variableId, e.target.value)}
              className="input-premium"
            >
              {(variableConfig.options as Array<{ value: string, labelKey: string }>)?.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {t(opt.labelKey)}
                </option>
              ))}
            </select>
          );

        case 'multiselect':
          const selected = (value as string[]) || [];
          return (
            <div className="grid grid-cols-2 gap-2">
              {((variableConfig.options as Array<{ value: string, labelKey: string }>) || []).map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-surface transition-colors">
                  <input
                    type="checkbox"
                    checked={selected.includes(opt.value)}
                    onChange={(e) => {
                      const newSelected = e.target.checked
                        ? [...selected, opt.value]
                        : selected.filter((v) => v !== opt.value);
                      handleChange(variableId, newSelected);
                    }}
                    className="accent-teal shadow-none"
                  />
                  <span className="text-xs">{t(opt.labelKey)}</span>
                </label>
              ))}
            </div>
          );

        case 'textarea':
          return (
            <textarea
              value={(value as string) || ''}
              onChange={(e) => handleChange(variableId, e.target.value)}
              rows={3}
              className="input-premium"
              placeholder={variableConfig.descriptionKey ? t(variableConfig.descriptionKey as string) : ''}
            />
          );

        default:
          return null;
      }
    };

    return (
      <div key={variableId} className="config-field">
        <label className="config-label">
          {t(variableConfig.labelKey as string)}
        </label>
        {renderInputField()}
        {warnings.length > 0 && !isDismissed && (
          <div className="animate-fade-in">
            {warnings.map((warning, idx) => (
              <div
                key={idx}
                className={`msg msg-${warning.level}`}
              >
                <div className="flex justify-between items-start">
                  <p>{getWarningMessage(warning.messageKey, language)}</p>
                  {onDismissWarning && (
                    <button
                      onClick={() => onDismissWarning(warning.variableId)}
                      className="opacity-60 hover:opacity-100 uppercase text-[10px] font-bold"
                    >
                      Dismiss
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="config-sidebar animate-fade-in">
      <div className="config-header">
        <h3>{experimentName}</h3>
        <p className="citation" style={{ color: 'rgba(255,255,255,0.6)' }}>Study Parameters</p>
      </div>

      <div className="config-tabs">
        <button
          onClick={() => setExpandedSection('universal')}
          className={`config-tab ${expandedSection === 'universal' ? 'active' : ''}`}
        >
          Methodology
        </button>
        <button
          onClick={() => setExpandedSection('experiment')}
          className={`config-tab ${expandedSection === 'experiment' ? 'active' : ''}`}
        >
          Variables
        </button>
      </div>

      <div className="config-scroll-area">
        {expandedSection === 'universal' && (
          <div>
            <h4 className="config-section-title">Common Settings</h4>
            {universalVars.map(([varId, varConfig]) =>
              renderInput(varId, varConfig as Record<string, unknown>)
            )}
          </div>
        )}
        {expandedSection === 'experiment' && (
          <div>
            <h4 className="config-section-title">Stimuli & Task</h4>
            {experimentVars.length > 0 ? (
              experimentVars.map(([varId, varConfig]) =>
                renderInput(varId, varConfig as Record<string, unknown>)
              )
            ) : (
              <p className="text-text-muted text-xs italic">No experiment-specific variables</p>
            )}
          </div>
        )}
      </div>

      <div className="p-4 border-t bg-surface flex gap-2">
        <button
          onClick={handleReset}
          className="btn-outline flex-1 py-2 text-xs"
        >
          Default
        </button>
        {onPreview && (
          <button
            onClick={onPreview}
            className="btn-primary flex-1 py-2 text-xs"
          >
            Preview
          </button>
        )}
      </div>

      {participantCount > 0 && (
        <div className="p-3 bg-teal text-white text-[10px] font-bold uppercase tracking-wider text-center">
          {participantCount} Active Participants
        </div>
      )}
    </div>
  );
}

export { getDefaultConfig, getExperimentVariables };
