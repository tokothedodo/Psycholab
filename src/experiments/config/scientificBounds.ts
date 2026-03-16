export type WarningLevel = 'info' | 'warning' | 'error';

export interface Warning {
  level: WarningLevel;
  messageKey: string;
  variableId: string;
}

export interface BoundCheck {
  isValid: boolean;
  warnings: Warning[];
}

type WarningFunction = (value: number, config?: Record<string, unknown>) => Warning | null;

const BOUNDS: Record<string, WarningFunction> = {
  trials: (value: number) => {
    if (value < 5) {
      return { level: 'warning', messageKey: 'warnings.trials.tooFew', variableId: 'trials' };
    }
    return null;
  },
  isi: (value: number) => {
    if (value < 200) {
      return { level: 'warning', messageKey: 'warnings.isi.tooShort', variableId: 'isi' };
    }
    if (value > 2000) {
      return { level: 'info', messageKey: 'warnings.isi.tooLong', variableId: 'isi' };
    }
    return null;
  },
  stimulusDuration: (value: number) => {
    if (value > 0 && value < 100) {
      return { level: 'warning', messageKey: 'warnings.stimulusDuration.tooShort', variableId: 'stimulusDuration' };
    }
    return null;
  },
  practiceTrials: (value: number) => {
    if (value > 10) {
      return { level: 'info', messageKey: 'warnings.practiceTrials.tooMany', variableId: 'practiceTrials' };
    }
    return null;
  },
  congruentRatio: (value: number) => {
    if (value < 0.3 || value > 0.7) {
      return { level: 'warning', messageKey: 'warnings.stroop.congruentRatio', variableId: 'congruentRatio' };
    }
    return null;
  },
  finAngle: (value: number) => {
    if (value < 30 || value > 60) {
      return { level: 'warning', messageKey: 'warnings.mullerLyer.finAngle', variableId: 'finAngle' };
    }
    return null;
  },
  foreperiodMin: (value: number, config?: Record<string, unknown>) => {
    const max = config?.foreperiodMax as number | undefined;
    if (max && (max - value) < 300) {
      return { level: 'warning', messageKey: 'warnings.reactionTime.foreperiodRange', variableId: 'foreperiodMin' };
    }
    return null;
  },
};

export const checkScientificBounds = (
  variableId: string,
  value: unknown,
  config?: Record<string, unknown>
): BoundCheck => {
  const warnings: Warning[] = [];

  const boundFn = BOUNDS[variableId];
  if (!boundFn) {
    return { isValid: true, warnings: [] };
  }

  if (typeof value === 'number') {
    const warning = boundFn(value, config);
    if (warning) {
      warnings.push(warning);
    }
  }

  return {
    isValid: warnings.filter(w => w.level === 'error').length === 0,
    warnings,
  };
};

export const validateAllVariables = (
  _experimentId: string,
  config: Record<string, unknown>
): { isValid: boolean; allWarnings: Warning[]; warningCount: { info: number; warning: number; error: number } } => {
  const allWarnings: Warning[] = [];

  for (const [key, value] of Object.entries(config)) {
    const result = checkScientificBounds(key, value, config);
    allWarnings.push(...result.warnings);
  }

  const warningCount = {
    info: allWarnings.filter(w => w.level === 'info').length,
    warning: allWarnings.filter(w => w.level === 'warning').length,
    error: allWarnings.filter(w => w.level === 'error').length,
  };

  return {
    isValid: warningCount.error === 0,
    allWarnings,
    warningCount,
  };
};
