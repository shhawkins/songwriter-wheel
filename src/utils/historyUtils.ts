import type { Song } from '../types';

export const HISTORY_LIMIT = 100;

export const cloneSong = (song: Song): Song => {
    if (typeof structuredClone === 'function') {
        return structuredClone(song);
    }
    return JSON.parse(JSON.stringify(song));
};

export const buildHistoryState = (currentSong: Song, historyPast: Song[]) => {
    const snapshot = cloneSong(currentSong);
    const updatedPast = [...historyPast, snapshot].slice(-HISTORY_LIMIT);
    return {
        historyPast: updatedPast,
        historyFuture: [],
        canUndo: updatedPast.length > 0,
        canRedo: false
    };
};
