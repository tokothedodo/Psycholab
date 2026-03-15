/**
 * Implements a true Fisher-Yates (Knuth) shuffle algorithm.
 * This is the gold standard for unbiased array randomization in scientific experiments.
 *
 * @param array The array to shuffle
 * @returns A new shuffled array
 */
export function fisherYatesShuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

/**
 * Returns a random integer between min (inclusive) and max (inclusive).
 */
export function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Returns a random element from an array.
 */
export function randomChoice<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
}
