import { useState } from 'react';
import { saveResult } from '../lib/supabase';
import type { ExperimentResults } from '../experiments/ExperimentWrapper';

export function useResults() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submitResults = async (results: ExperimentResults) => {
        setIsSubmitting(true);
        setError(null);

        const payload = {
      room_id: results.roomId,
      participant_id: results.participantId,
      experiment_name: results.experimentName,
      response_time_ms: results.responseTimeMs,
      answer: String(results.answer),
      correct_answer: String(results.correctAnswer),
      language: results.language,
      accuracy: results.accuracy,
      total_trials: results.totalTrials,
      timestamp: results.timestamp,
      trial_data: results.trialData,
    };

    console.log('[PsychoLab] 🛰️ Attempting to sync research data...', { experiment: results.experimentName });

    try {
      await saveResult(payload);
      console.log('[PsychoLab] ✅ Sync success: Full dataset preserved');
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.warn('[PsychoLab] ⚠️ Sync failed:', errorMessage);
      setError(errorMessage);
      return false;
    } finally {
      setIsSubmitting(false);
    }
    };

    return { submitResults, isSubmitting, error, setError };
}
