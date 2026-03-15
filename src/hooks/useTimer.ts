import { useRef, useCallback } from 'react';

export function useTimer() {
    const startTime = useRef<number | null>(null);

    const startTimer = useCallback(() => {
        startTime.current = performance.now();
    }, []);

    const getResponseTime = useCallback(() => {
        if (startTime.current === null) return null;
        return Math.round(performance.now() - startTime.current);
    }, []);

    const clearTimer = useCallback(() => {
        startTime.current = null;
    }, []);

    return { startTimer, getResponseTime, clearTimer };
}
