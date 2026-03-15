import { useState } from 'react';
import { saveResult } from '../lib/supabase';
import type { ExperimentResults } from '../experiments/ExperimentWrapper';

export function useResults() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submitResults = async (results: ExperimentResults) => {
        setIsSubmitting(true);
        setError(null);

        const basePayload = {
            room_id: results.roomId,
            participant_id: results.participantId,
            experiment_name: results.experimentName,
            response_time_ms: results.responseTimeMs,
            answer: String(results.answer), // Ensure it's stringified
            correct_answer: String(results.correctAnswer),
            language: results.language,
            timestamp: results.timestamp,
        };

        try {
            // First attempt: try to save with the detailed JSON trial data
            await saveResult({
                ...basePayload,
                trial_data: results.trialData, // Requires a JSONB column 'trial_data' in Supabase
            } as any);
            return true;
        } catch (err: any) {
            // Graceful fallback: if the column 'trial_data' doesn't exist yet, we catch the error 
            // and save only the basic metrics so data isn't lost.
            console.warn(
                "Failed to save full trial_data. If you want trial-by-trial logs, " +
                "please add a 'trial_data' JSONB column to your 'results' table in Supabase."
            );

            try {
                // Second attempt: save without trial_data
                await saveResult(basePayload as any);
                return true;
            } catch (fallbackErr: unknown) {
                const message = fallbackErr instanceof Error ? fallbackErr.message : 'An error occurred while saving results';
                console.error('Error saving result on fallback:', fallbackErr);
                setError(message);
                return false;
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return { submitResults, isSubmitting, error, setError };
}
