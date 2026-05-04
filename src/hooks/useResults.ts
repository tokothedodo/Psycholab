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
      experiment_name: (results as any).experiment_name || results.experimentName,
      response_time_ms: (results as any).overall_median_rt || results.responseTimeMs,
      answer: String(results.answer || "completed"),
      correct_answer: String(results.correctAnswer || "completed"),
      language: results.language,
      accuracy: results.accuracy || (results as any).accuracy_percent,
      total_trials: results.totalTrials || (results as any).total_trials,
      timestamp: results.timestamp || new Date().toISOString(),
    };

    // Add optional fields if present (mapping scientific keys to DB columns)
    const res = results as any;
    if (res.subject_age !== undefined) payload.age = res.subject_age;
    else if (results.age !== undefined) payload.age = results.age;

    if (res.subject_gender !== undefined) payload.gender = res.subject_gender;
    else if (results.gender !== undefined) payload.gender = results.gender;

    // Mapping Median values to the AVG columns in DB for consistency
    if (res.white_male_median !== undefined) payload.white_male_avg = res.white_male_median;
    else if (res.white_male_avg !== undefined) payload.white_male_avg = res.white_male_avg;

    if (res.white_female_median !== undefined) payload.white_female_avg = res.white_female_median;
    else if (res.white_female_avg !== undefined) payload.white_female_avg = res.white_female_avg;

    if (res.black_male_median !== undefined) payload.black_male_avg = res.black_male_median;
    else if (res.black_male_avg !== undefined) payload.black_male_avg = res.black_male_avg;

    if (res.black_female_median !== undefined) payload.black_female_avg = res.black_female_median;
    else if (res.black_female_avg !== undefined) payload.black_female_avg = res.black_female_avg;

    console.log('[PsychoLab] 🛰️ Attempting to sync research data...', { experiment: payload.experiment_name });

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
