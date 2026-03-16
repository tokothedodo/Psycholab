export const GUARDRAIL_MESSAGES: Record<string, Record<string, string>> = {
  en: {
    'warnings.trials.tooFew': 'Very few trials may not capture true performance. Consider at least 10-20 trials.',
    'warnings.isi.tooShort': 'ISI below 200ms may cause anticipation effects and inflate response times.',
    'warnings.isi.tooLong': 'Very long ISI may reduce experimental efficiency.',
    'warnings.stimulusDuration.tooShort': 'Stimulus below 100ms may not be consciously perceived.',
    'warnings.practiceTrials.tooMany': 'Many practice trials may cause fatigue before real data collection.',
    'warnings.stroop.congruentRatio': 'Extreme ratios reduce reliability of interference score. 30-70% is recommended.',
    'warnings.stroop.colors': 'At least 2 colors must be selected for the Stroop test.',
    'warnings.mullerLyer.finAngle': 'Fin angles outside 30-60° deviate from standard published stimuli.',
    'warnings.reactionTime.foreperiodRange': 'Foreperiod range below 300ms reduces temporal uncertainty — a key element of valid RT measurement.',
    'warnings.outlierThreshold': 'Threshold outside 1.5-3 SD is unusual.',
  },
  ka: {
    'warnings.trials.tooFew': '[KA] Very few trials may not capture true performance.',
    'warnings.isi.tooShort': '[KA] ISI below 200ms may cause anticipation effects.',
    'warnings.isi.tooLong': '[KA] Very long ISI may reduce experimental efficiency.',
    'warnings.stimulusDuration.tooShort': '[KA] Stimulus below 100ms may not be consciously perceived.',
    'warnings.practiceTrials.tooMany': '[KA] Many practice trials may cause fatigue.',
    'warnings.stroop.congruentRatio': '[KA] Extreme ratios reduce reliability.',
    'warnings.stroop.colors': '[KA] At least 2 colors must be selected.',
    'warnings.mullerLyer.finAngle': '[KA] Fin angles outside 30-60° deviate from standard.',
    'warnings.reactionTime.foreperiodRange': '[KA] Foreperiod range below 300ms reduces temporal uncertainty.',
    'warnings.outlierThreshold': '[KA] Threshold outside 1.5-3 SD is unusual.',
  },
  hy: {
    'warnings.trials.tooFew': '[HY] Very few trials may not capture true performance.',
    'warnings.isi.tooShort': '[HY] ISI below 200ms may cause anticipation effects.',
    'warnings.isi.tooLong': '[HY] Very long ISI may reduce experimental efficiency.',
    'warnings.stimulusDuration.tooShort': '[HY] Stimulus below 100ms may not be consciously perceived.',
    'warnings.practiceTrials.tooMany': '[HY] Many practice trials may cause fatigue.',
    'warnings.stroop.congruentRatio': '[HY] Extreme ratios reduce reliability.',
    'warnings.stroop.colors': '[HY] At least 2 colors must be selected.',
    'warnings.mullerLyer.finAngle': '[HY] Fin angles outside 30-60° deviate from standard.',
    'warnings.reactionTime.foreperiodRange': '[HY] Foreperiod range below 300ms reduces temporal uncertainty.',
    'warnings.outlierThreshold': '[HY] Threshold outside 1.5-3 SD is unusual.',
  },
  az: {
    'warnings.trials.tooFew': '[AZ] Very few trials may not capture true performance.',
    'warnings.isi.tooShort': '[AZ] ISI below 200ms may cause anticipation effects.',
    'warnings.isi.tooLong': '[AZ] Very long ISI may reduce experimental efficiency.',
    'warnings.stimulusDuration.tooShort': '[AZ] Stimulus below 100ms may not be consciously perceived.',
    'warnings.practiceTrials.tooMany': '[AZ] Many practice trials may cause fatigue.',
    'warnings.stroop.congruentRatio': '[AZ] Extreme ratios reduce reliability.',
    'warnings.stroop.colors': '[AZ] At least 2 colors must be selected.',
    'warnings.mullerLyer.finAngle': '[AZ] Fin angles outside 30-60° deviate from standard.',
    'warnings.reactionTime.foreperiodRange': '[AZ] Foreperiod range below 300ms reduces temporal uncertainty.',
    'warnings.outlierThreshold': '[AZ] Threshold outside 1.5-3 SD is unusual.',
  },
};

export const getWarningMessage = (messageKey: string, language: string): string => {
  return GUARDRAIL_MESSAGES[language]?.[messageKey] || GUARDRAIL_MESSAGES['en'][messageKey] || messageKey;
};
