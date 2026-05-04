export const UNIVERSAL_VARIABLES: Record<string, unknown> = {
  trials: {
    id: 'trials',
    labelKey: 'config.trials',
    type: 'number',
    default: 10,
    min: 1,
    unit: 'trials',
  },
  isi: {
    id: 'isi',
    labelKey: 'config.isi',
    type: 'number',
    default: 500,
    min: 50,
    scientificMin: 200,
    scientificMax: 2000,
    unit: 'ms',
  },
  stimulusDuration: {
    id: 'stimulusDuration',
    labelKey: 'config.stimulusDuration',
    type: 'number',
    default: 0,
    min: 0,
    unit: 'ms',
  },
  responseTimeLimit: {
    id: 'responseTimeLimit',
    labelKey: 'config.responseTimeLimit',
    type: 'number',
    default: 0,
    min: 0,
    unit: 'ms',
    descriptionKey: 'config.responseTimeLimitDesc',
  },
  showFeedback: {
    id: 'showFeedback',
    labelKey: 'config.showFeedback',
    type: 'boolean',
    default: false,
  },
  showProgressBar: {
    id: 'showProgressBar',
    labelKey: 'config.showProgressBar',
    type: 'boolean',
    default: true,
  },
  customInstructions: {
    id: 'customInstructions',
    labelKey: 'config.customInstructions',
    type: 'textarea',
    default: '',
    descriptionKey: 'config.customInstructionsDesc',
  },
  randomizeOrder: {
    id: 'randomizeOrder',
    labelKey: 'config.randomizeOrder',
    type: 'boolean',
    default: true,
  },
  practiceTrials: {
    id: 'practiceTrials',
    labelKey: 'config.practiceTrials',
    type: 'number',
    default: 5,
    min: 0,
    max: 20,
  },
  outlierRemoval: {
    id: 'outlierRemoval',
    labelKey: 'config.outlierRemoval',
    type: 'boolean',
    default: true,
  },
  outlierThreshold: {
    id: 'outlierThreshold',
    labelKey: 'config.outlierThreshold',
    type: 'number',
    default: 2,
    min: 1.5,
    max: 3,
    unit: 'SD',
  },
};

export const EXPERIMENT_SPECIFIC_VARIABLES: Record<string, Record<string, unknown>> = {
  'stroop-color-word-interference-task': {
    congruentRatio: {
      id: 'congruentRatio',
      labelKey: 'config.stroop.congruentRatio',
      type: 'slider',
      min: 0.1,
      max: 0.9,
      step: 0.1,
      default: 0.5,
    },
    colors: {
      id: 'colors',
      labelKey: 'config.stroop.colors',
      type: 'multiselect',
      options: [
        { value: 'red', labelKey: 'color.red' },
        { value: 'green', labelKey: 'color.green' },
        { value: 'blue', labelKey: 'color.blue' },
        { value: 'yellow', labelKey: 'color.yellow' },
        { value: 'purple', labelKey: 'color.purple' },
        { value: 'orange', labelKey: 'color.orange' },
      ],
      default: ['red', 'green', 'blue', 'yellow'],
      minSelected: 2,
    },
    fontSize: {
      id: 'fontSize',
      labelKey: 'config.stroop.fontSize',
      type: 'number',
      default: 48,
      min: 24,
      max: 96,
      unit: 'px',
    },
    inputMethod: {
      id: 'inputMethod',
      labelKey: 'config.stroop.inputMethod',
      type: 'select',
      options: [
        { value: 'keyboard', labelKey: 'config.stroop.keyboard' },
        { value: 'click', labelKey: 'config.stroop.clickButtons' },
      ],
      default: 'keyboard',
    },
  },
  'muller-lyer-illusion': {
    finAngle: {
      id: 'finAngle',
      labelKey: 'config.mullerLyer.finAngle',
      type: 'number',
      default: 45,
      min: 15,
      max: 75,
      unit: '°',
    },
    finLength: {
      id: 'finLength',
      labelKey: 'config.mullerLyer.finLength',
      type: 'number',
      default: 40,
      min: 10,
      max: 100,
      unit: 'px',
    },
  },
  'moral-machine-ingroup': {
    maxResponseTime: {
      id: 'maxResponseTime',
      labelKey: 'config.moralMachine.maxResponseTime',
      type: 'number',
      default: 5000,
      min: 1000,
      max: 10000,
      unit: 'ms',
    },
  },
};

export const getExperimentVariables = (experimentId: string) => {
  const universal = { ...UNIVERSAL_VARIABLES };
  const experimentSpecific = EXPERIMENT_SPECIFIC_VARIABLES[experimentId] || {};
  return { ...universal, ...experimentSpecific };
};

export const getDefaultConfig = (experimentId: string) => {
  const variables = getExperimentVariables(experimentId);
  const defaults: Record<string, unknown> = {};
  for (const [key, config] of Object.entries(variables)) {
    if (config && typeof config === 'object' && 'default' in (config as Record<string, unknown>)) {
      defaults[key] = (config as Record<string, unknown>).default;
    }
  }
  return defaults;
};
