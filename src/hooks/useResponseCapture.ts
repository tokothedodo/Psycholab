import { useEffect, useCallback } from 'react';

type KeyHandler = (key: string) => void;

interface UseResponseCaptureProps {
    validKeys: string[];
    onResponse: KeyHandler;
    disabled?: boolean;
}

export function useResponseCapture({ validKeys, onResponse, disabled = false }: UseResponseCaptureProps) {
    const handleKeyDown = useCallback(
        (event: KeyboardEvent) => {
            if (disabled) return;
            const key = event.key.toLowerCase();

            // Ensure we match either exact keys or lowercased versions
            const matchedKey = validKeys.find(k => k.toLowerCase() === key);
            if (matchedKey) {
                event.preventDefault();
                onResponse(matchedKey);
            }
        },
        [validKeys, onResponse, disabled]
    );

    useEffect(() => {
        if (!disabled) {
            window.addEventListener('keydown', handleKeyDown);
            return () => {
                window.removeEventListener('keydown', handleKeyDown);
            };
        }
    }, [disabled, handleKeyDown]);
}
