import { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { getExperimentVariables, getDefaultConfig } from './experimentDefaults';
import { validateAllVariables } from './scientificBounds';
import { getWarningMessage } from './guardrailMessages';

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

const WARNING_STYLES: Record<string, string> = {
  info: 'bg-blue-50 border-blue-200 text-blue-700',
  warning: 'bg-amber-50 border-amber-200 text-amber-700',
  error: 'bg-red-50 border-red-200 text-red-700',
};

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
              <div className="flex items-center border border-gray-200 rounded overflow-hidden">
                <button
                  onClick={() => handleChange(variableId, Math.max(min ?? -Infinity, (value as number) - step))}
                  className="px-3 py-2 bg-gray-50 hover:bg-gray-100 border-r border-gray-200 text-gray-600 transition-colors"
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
                  className="w-20 p-2 text-center focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button
                  onClick={() => handleChange(variableId, Math.min(max ?? Infinity, (value as number) + step))}
                  className="px-3 py-2 bg-gray-50 hover:bg-gray-100 border-l border-gray-200 text-gray-600 transition-colors"
                  type="button"
                >
                  +
                </button>
              </div>
              {(variableConfig.unit as string) && <span className="text-gray-500 text-sm">{variableConfig.unit as string}</span>}
            </div>
          );

        case 'slider':
          return (
            <div className="flex items-center gap-4">
              <input
                type="range"
                value={value as number}
                onChange={(e) => handleChange(variableId, Number(e.target.value))}
                min={variableConfig.min as number}
                max={variableConfig.max as number}
                step={variableConfig.step as number || 1}
                className="flex-1"
              />
              <span className="w-16 text-right font-mono">
                {String(value)}{String(variableConfig.unit || '')}
              </span>
            </div>
          );

        case 'boolean':
          return (
            <button
              onClick={() => handleChange(variableId, !value)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${value ? 'bg-teal-600' : 'bg-gray-200'
                }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${value ? 'translate-x-6' : 'translate-x-1'
                  }`}
              />
            </button>
          );

        case 'select':
          return (
            <select
              value={value as string}
              onChange={(e) => handleChange(variableId, e.target.value)}
              className="w-full p-2 border border-gray-200 rounded focus:border-teal-500 focus:outline-none"
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
            <div className="space-y-2">
              {((variableConfig.options as Array<{ value: string, labelKey: string }>) || []).map((opt) => (
                <label key={opt.value} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selected.includes(opt.value)}
                    onChange={(e) => {
                      const newSelected = e.target.checked
                        ? [...selected, opt.value]
                        : selected.filter((v) => v !== opt.value);
                      handleChange(variableId, newSelected);
                    }}
                    className="rounded text-teal-600"
                  />
                  <span>{t(opt.labelKey)}</span>
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
              className="w-full p-2 border border-gray-200 rounded focus:border-teal-500 focus:outline-none"
              placeholder={variableConfig.descriptionKey ? t(variableConfig.descriptionKey as string) : ''}
            />
          );

        default:
          return null;
      }
    };

    return (
      <div key={variableId} className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t(variableConfig.labelKey as string)}
        </label>
        {renderInputField()}
        {warnings.length > 0 && !isDismissed && (
          <div className="mt-2 space-y-1">
            {warnings.map((warning, idx) => (
              <div
                key={idx}
                className={`p-2 rounded border text-sm flex items-start justify-between gap-2 ${WARNING_STYLES[warning.level]}`}
              >
                <span>{getWarningMessage(warning.messageKey, language)}</span>
                {onDismissWarning && (
                  <button
                    onClick={() => onDismissWarning(warning.variableId)}
                    className="text-xs underline whitespace-nowrap"
                  >
                    Dismiss
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const warningBadge = () => {
    if (validation.warningCount.error > 0) {
      return (
        <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-medium">
          {validation.warningCount.error} error(s)
        </span>
      );
    }
    if (validation.warningCount.warning > 0) {
      return (
        <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded text-xs font-medium">
          {validation.warningCount.warning} warning(s)
        </span>
      );
    }
    if (validation.warningCount.info > 0) {
      return (
        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-medium">
          {validation.warningCount.info} info
        </span>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
      <div className="bg-navy-900 text-white p-4 flex justify-between items-center">
        <div>
          <h3 className="font-semibold">{experimentName}</h3>
          <p className="text-teal-400 text-sm">Experiment Configuration</p>
        </div>
        {warningBadge()}
      </div>

      <div className="border-b">
        <button
          onClick={() => setExpandedSection('universal')}
          className={`px-4 py-3 text-sm font-medium flex-1 ${expandedSection === 'universal'
              ? 'border-b-2 border-teal-500 text-teal-600'
              : 'text-gray-500'
            }`}
        >
          Universal Settings
        </button>
        <button
          onClick={() => setExpandedSection('experiment')}
          className={`px-4 py-3 text-sm font-medium flex-1 ${expandedSection === 'experiment'
              ? 'border-b-2 border-teal-500 text-teal-600'
              : 'text-gray-500'
            }`}
        >
          Experiment Settings
        </button>
      </div>

      <div className="p-4 max-h-[60vh] overflow-y-auto">
        {expandedSection === 'universal' && (
          <div>
            {universalVars.map(([varId, varConfig]) =>
              renderInput(varId, varConfig as Record<string, unknown>)
            )}
          </div>
        )}
        {expandedSection === 'experiment' && (
          <div>
            {experimentVars.length > 0 ? (
              experimentVars.map(([varId, varConfig]) =>
                renderInput(varId, varConfig as Record<string, unknown>)
              )
            ) : (
              <p className="text-gray-500 text-sm">No experiment-specific settings</p>
            )}
          </div>
        )}
      </div>

      <div className="p-4 border-t bg-gray-50 flex gap-2">
        <button
          onClick={handleReset}
          className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-100 text-sm"
        >
          Reset to Defaults
        </button>
        {onPreview && (
          <button
            onClick={onPreview}
            className="flex-1 px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 text-sm"
          >
            Preview Experiment
          </button>
        )}
      </div>

      {participantCount > 0 && (
        <div className="px-4 py-2 bg-teal-50 text-teal-700 text-xs">
          {participantCount} participant(s) currently in room
        </div>
      )}
    </div>
  );
}

export { getDefaultConfig, getExperimentVariables };
