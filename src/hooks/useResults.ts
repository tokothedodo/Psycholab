import { useState } from 'react';
import { saveResult } from '../lib/supabase';
import type { ExperimentResults } from '../experiments/ExperimentWrapper';

export function useResults() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submitResults = async (results: ExperimentResults) => {
        setIsSubmitting(true);
        setError(null);

        const fullPayload = {
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

        const basicPayload = {
            room_id: results.roomId,
            participant_id: results.participantId,
            experiment_name: results.experimentName,
            response_time_ms: results.responseTimeMs,
            answer: String(results.answer),
            correct_answer: String(results.correctAnswer),
            language: results.language,
            timestamp: results.timestamp,
        };

        const minimumPayload = {
            room_id: results.roomId,
            participant_id: results.participantId,
            experiment_name: results.experimentName,
        };

        console.log('[PsychoLab] 🛰️ Attempting to sync research data...', { experiment: results.experimentName });

        try {
            // Level 1: Full data (including JSONB trial logs)
            console.log('[PsychoLab] 📡 Sync Level 1: Full dataset');
            await saveResult(fullPayload as any);
            console.log('[PsychoLab] ✅ Sync success: Full dataset preserved');
            return true;
        } catch (err: any) {
            console.warn('[PsychoLab] ⚠️ Sync Level 1 failed (check if trial_data/accuracy/total_trials exist):', err.message);

            try {
                // Level 2: Basic metrics only (no JSONB, no new columns)
                console.log('[PsychoLab] 📡 Sync Level 2: Basic metrics');
                await saveResult(basicPayload as any);
                console.log('[PsychoLab] ⚠️ Sync partial success: Core metrics preserved, trial logs lost');
                return true;
            } catch (fallbackErr: any) {
                console.warn('[PsychoLab] ❌ Sync Level 2 failed (check database connection/permissions):', fallbackErr.message);

                try {
                    // Level 3: Bare minimum (ID and Name) - only fail if world is ending
                    console.log('[PsychoLab] 📡 Sync Level 3: Minimal record');
                    await saveResult(minimumPayload as any);
                    console.log('[PsychoLab] 🆘 Sync emergency success: Participant presence recorded, all data points lost');
                    return true;
                } catch (emergencyErr: any) {
                    const message = emergencyErr instanceof Error ? emergencyErr.message : 'Total synchronization failure';
                    console.error('[PsychoLab] 💀 CRITICAL ERROR: All data synchronization paths failed:', emergencyErr);
                    setError(message);
                    return false;
                }
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return { submitResults, isSubmitting, error, setError };
}
