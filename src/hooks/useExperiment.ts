import { useState, useCallback } from 'react';
import type { TrialData, ExperimentResults } from '../experiments/ExperimentWrapper';
import type { Experiment } from '../data/experiments';

export type PhaseType =
    | 'instruction' | 'ready' | 'practice' | 'experiment' | 'test' | 'study' | 'break' | 'complete'
    | 'response' | 'exposure' | 'adaptation' | 'showing' | 'input' | 'feedback'
    | 'fixation' | 'memory' | 'isi' | 'probe' | 'outcome' | 'rating' | 'pre' | 'question'
    | 'synchronization' | 'waiting' | 'stimulus' | 'display' | 'recall';

interface UseExperimentProps {
    experiment: Experiment;
    participantId: string;
    roomId: string;
    language: string;
    onComplete: (results: ExperimentResults) => void;
}

export function useExperiment({ experiment, participantId, roomId, language, onComplete }: UseExperimentProps) {
    const [phase, setPhase] = useState<PhaseType>('instruction');
    const [trialIndex, setTrialIndex] = useState(0);
    const [trialData, setTrialData] = useState<TrialData[]>([]);
    const [experimentStartTime, setExperimentStartTime] = useState<number>(0);

    const startExperiment = useCallback((startPhase: PhaseType = 'experiment') => {
        setPhase(startPhase);
        setTrialIndex(0);
        setTrialData([]);
        setExperimentStartTime(performance.now());
    }, []);

    const advanceTrial = useCallback((isPractice: boolean, currentLength: number) => {
        if (trialIndex < currentLength - 1) {
            setTrialIndex(prev => prev + 1);
        } else {
            if (isPractice) {
                setPhase('experiment');
                setTrialIndex(0);
            } else {
                setPhase('complete');
            }
        }
    }, [trialIndex]);

    const recordTrial = useCallback((data: TrialData) => {
        setTrialData(prev => [...prev, data]);
    }, []);

    const finishExperiment = useCallback((finalScore: number | string, computedAccuracy: number) => {
        const totalTime = Math.round(performance.now() - experimentStartTime);

        // Most experiments store trialData, and score calculations vary
        // The consumer computes finalScore and computedAccuracy 

        const results: ExperimentResults = {
            experimentName: experiment.id,
            participantId,
            roomId,
            language,
            timestamp: new Date().toISOString(),
            totalTrials: trialData.length,
            responseTimeMs: totalTime,
            accuracy: computedAccuracy,
            answer: finalScore,
            correctAnswer: 'score', // Generic placeholder, depends on interpretation
            trialData,
            // Default to picking it up from translations but often handled by wrapper
        };

        onComplete(results);
    }, [experiment.id, participantId, roomId, language, trialData, experimentStartTime, onComplete]);

    return {
        phase,
        setPhase,
        trialIndex,
        setTrialIndex,
        trialData,
        recordTrial,
        startExperiment,
        advanceTrial,
        finishExperiment,
    };
}
