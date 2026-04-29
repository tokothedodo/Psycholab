import { useState } from 'react';
import { saveResult } from '../lib/supabase';
import type { ExperimentResults } from '../experiments/ExperimentWrapper';

export function useResults() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submitResults = async (results: ExperimentResults) => {
        setIsSubmitting(true);
        setError(null);

        const payload: any = {
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
    };

    // Add new fields if present
    if (results.age !== undefined) payload.age = results.age;
    if (results.gender !== undefined) payload.gender = results.gender;
    if (results.white_male_avg !== undefined) payload.white_male_avg = results.white_male_avg;
    if (results.white_female_avg !== undefined) payload.white_female_avg = results.white_female_avg;
    if (results.black_male_avg !== undefined) payload.black_male_avg = results.black_male_avg;
    if (results.black_female_avg !== undefined) payload.black_female_avg = results.black_female_avg;

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
