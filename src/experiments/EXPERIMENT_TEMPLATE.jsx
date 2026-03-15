/**
 * EXPERIMENT TEMPLATE
 * 
 * When adding a new experiment to PsychoLab.ge, copy this template
 * and fill in the experiment-specific sections. Never hardcode variables —
 * everything configurable must go through the variable schema system.
 * 
 * @author PsychoLab.ge
 * @version 1.0.0
 */

import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ExperimentWrapper } from '../components/experiments/ExperimentWrapper';
import type { Experiment } from '../data/experiments';
import type { TrialData, ExperimentResults } from '../components/experiments/ExperimentWrapper';

// IMPORT YOUR CONFIG VARIABLES HERE
// import { getDefaultConfig, getExperimentVariables } from './config';

/**
 * INTERFACE - Define your experiment-specific variables here
 * These will be merged with universal variables by the config system
 */
interface YourExperimentConfig {
  // Universal variables (provided automatically):
  // trials: number
  // isi: number
  // stimulusDuration: number
  // responseTimeLimit: number
  // showFeedback: boolean
  // showProgressBar: boolean
  // customInstructions: string
  // randomizeOrder: boolean
  // practiceTrials: number
  // outlierRemoval: boolean
  // outlierThreshold: number
  
  // Add your experiment-specific variables here:
  // exampleSetting: number;
  // anotherSetting: string;
}

/**
 * PROPS - Experiment component receives these from the parent
 */
interface YourExperimentProps {
  experiment: Experiment;
  onComplete: (results: ExperimentResults) => void;
  participantId: string;
  roomId: string;
  config?: Partial<YourExperimentConfig>; // Optional config from researcher
}

/**
 * COMPONENT - Main experiment component
 * 
 * Follow this pattern:
 * 1. Use config values (with sensible defaults if not provided)
 * 2. Record all trial data with responseTimeMs
 * 3. Call onComplete with full results
 * 4. Handle all 4 languages via t() function
 */
export function YourExperiment({
  experiment,
  onComplete,
  participantId,
  roomId,
  config = {},
}: YourExperimentProps) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { t, language } = useLanguage();
  
  // Merge config with defaults
  const settings: YourExperimentConfig = {
    // Default values for your experiment-specific variables:
    // exampleSetting: 10,
    // anotherSetting: 'default',
    
    // Override with provided config:
    ...config as YourExperimentConfig,
  };

  // Phase management
  type Phase = 'instruction' | 'practice' | 'experiment' | 'complete';
  const [phase, setPhase] = useState<Phase>('instruction');
  
  // Trial state - these will be used in real implementations
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [trialIndex, setTrialIndex] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [trialData, setTrialData] = useState<TrialData[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [experimentStartTime, setExperimentStartTime] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [trialStartTime, setTrialStartTime] = useState(0);

  // ============================================
  // YOUR EXPERIMENT-SPECIFIC STATE HERE
  // ============================================
  // const [stimulus, setStimulus] = useState(null);
  // const [currentStimulus, setCurrentStimulus] = useState(null);

  // ============================================
  // STIMULUS GENERATION
  // ============================================
  // Generate your stimuli based on config settings
  // const generateStimuli = useCallback(() => {
  //   const stimuli = [];
  //   for (let i = 0; i < settings.trials; i++) {
  //     // Generate based on settings.exampleSetting, etc.
  //   }
  //   return stimuli;
  // }, [settings]);

  // const [allStimuli] = useState(generateStimuli);

  // ============================================
  // EFFECTS
  // ============================================
  
  // Start experiment timer
  useEffect(() => {
    if (phase === 'experiment' || phase === 'practice') {
      setExperimentStartTime(performance.now());
    }
  }, [phase]);

  // Handle response time limit
  // useEffect(() => {
  //   if (settings.responseTimeLimit > 0 && phase === 'experiment') {
  //     const timer = setTimeout(() => {
  //       // Handle timeout - record as no response
  //     }, settings.responseTimeLimit);
  //     return () => clearTimeout(timer);
  // }
  // }, [phase, settings.responseTimeLimit]);

  // ============================================
  // RESPONSE HANDLING
  // ============================================
  
  // const handleResponse = (response: string | number | boolean) => {
  //   const endTime = performance.now();
  //   const responseTime = Math.round(endTime - trialStartTime);
  //   
  //   // Check correctness
  //   const isCorrect = response === getCorrectAnswer();
  //   
  //   // Record trial data - THIS IS CRITICAL
  //   const trial: TrialData = {
  //     trialNumber: trialIndex + 1,
  //     responseTimeMs: responseTime,
  //     answer: response,
  //     correctAnswer: getCorrectAnswer(),
  //     stimulus: currentStimulus, // Store for analysis
  //   };
  //   
  //   setTrialData(prev => [...prev, trial]);
  //   
  //   // Show feedback if enabled
  //   if (settings.showFeedback) {
  //     // Show feedback, then continue
  //     return;
  //   }
  //   
  //   // Move to next trial
  //   if (trialIndex < totalTrials - 1) {
  //     setTrialIndex(prev => prev + 1);
  //     setTrialStartTime(performance.now());
  //   } else {
  //     completeExperiment();
  //   }
  // };

  // ============================================
  // COMPLETION
  // ============================================
  
  // const completeExperiment = () => {
  //   const endTime = performance.now();
  //   const totalTime = Math.round(endTime - experimentStartTime);
  //   
  //   // Calculate accuracy
  //   const correctCount = trialData.filter(t => t.answer === t.correctAnswer).length;
  //   const accuracy = trialData.length > 0 
  //     ? (correctCount / trialData.length) * 100 
  //     : 0;
  //   
  //   // Optionally remove outliers
  //   let finalTrialData = trialData;
  //   if (settings.outlierRemoval) {
  //     finalTrialData = removeOutliers(trialData, settings.outlierThreshold);
  //   }
  //   
  //   const results: ExperimentResults = {
  //     experimentName: experiment.id,
  //     participantId,
  //     roomId,
  //     language,
  //     timestamp: new Date().toISOString(),
  //     totalTrials: trialData.length,
  //     responseTimeMs: totalTime,
  //     accuracy,
  //     answer: '', // Your summary metric
  //     correctAnswer: '', // What the correct answer represents
  //     trialData: finalTrialData,
  //     debrief: t(experiment.debriefKey),
  //   };
  //   
  //   onComplete(results);
  // };

  // ============================================
  // HELPER FUNCTIONS
  // ============================================
  
  // const removeOutliers = (data: TrialData[], threshold: number): TrialData[] => {
  //   if (data.length < 3) return data;
  //   const times = data.map(t => t.responseTimeMs).sort((a, b) => a - b);
  //   const q1 = times[Math.floor(times.length * 0.25)];
  //   const q3 = times[Math.floor(times.length * 0.75)];
  //   const iqr = q3 - q1;
  //   const lower = q1 - threshold * iqr;
  //   const upper = q3 + threshold * iqr;
  //   return data.filter(t => t.responseTimeMs >= lower && t.responseTimeMs <= upper);
  // };

  // ============================================
  // RENDER METHODS
  // ============================================

  // INSTRUCTION PHASE
  if (phase === 'instruction') {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <h2 className="text-2xl font-bold text-navy-900 mb-4">
          {t(experiment.nameKey)}
        </h2>
        <p className="text-gray-600 mb-6">
          {settings.customInstructions || t(experiment.descriptionKey)}
        </p>
        <p className="text-sm text-gray-500 mb-4">
          {t('citation')}: {experiment.citation}, {experiment.year}
        </p>
        <button
          onClick={() => {
            if (settings.practiceTrials > 0) {
              setPhase('practice');
            } else {
              setPhase('experiment');
              setTrialStartTime(performance.now());
            }
          }}
          className="bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 transition-colors"
        >
          {t('common.start')}
        </button>
      </div>
    );
  }

  // PRACTICE PHASE (optional)
  // if (phase === 'practice') {
  //   // Similar to experiment but doesn't count toward final results
  // }

  // COMPLETE PHASE
  // if (phase === 'complete') {
  //   return (
  //     <div className="max-w-2xl mx-auto p-6">
  //       <h2 className="text-2xl font-bold text-navy-900 mb-4">
  //         {t('common.debrief.title')}
  //       </h2>
  //       <div className="bg-teal-50 border-l-4 border-teal-500 p-4 mb-4">
  //         <p className="text-teal-800">{t('common.debrief.thankYou')}</p>
  //       </div>
  //       <p className="text-gray-600 mb-4">{t(experiment.debriefKey)}</p>
  //       <p className="text-sm text-gray-500">{t('citation')}: {experiment.citation}</p>
  //     </div>
  //   );
  // }

  // EXPERIMENT PHASE
  // return (
  //   <div className="max-w-2xl mx-auto p-6">
  //     {settings.showProgressBar && (
  //       <div className="mb-4">
  //         <div className="h-2 bg-gray-200 rounded overflow-hidden">
  //           <div 
  //             className="h-full bg-teal-600 transition-all"
  //             style={{ width: `${((trialIndex + 1) / settings.trials) * 100}%` }}
  //           />
  //         </div>
  //         <p className="text-sm text-gray-500 text-center mt-1">
  //           {trialIndex + 1} / {settings.trials}
  //         </p>
  //       </div>
  //     )}
  //     
  //     {/* YOUR STIMULUS DISPLAY HERE */}
  //     
  //     {/* RESPONSE INPUTS HERE */}
  //   </div>
  // );

  // Default fallback - remove when implementing
  return (
    <ExperimentWrapper experiment={experiment}>
      <div className="max-w-2xl mx-auto p-6">
        <p className="text-gray-600">Template experiment - implement your logic here</p>
      </div>
    </ExperimentWrapper>
  );
}

/**
 * EXPORT DEFAULT CONFIG FOR THIS EXPERIMENT
 * This is used by the config panel to get default values
 * 
 * const DEFAULT_CONFIG = {
 *   ...getDefaultConfig('your-experiment-id'),
 *   exampleSetting: 10,
 * };
 */

export default YourExperiment;
