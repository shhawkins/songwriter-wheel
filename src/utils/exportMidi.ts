/**
 * MIDI Export Utility
 * Converts song data to MIDI file format using midi-writer-js
 */

import MidiWriter from 'midi-writer-js';
import type { Song, Section, Measure } from '../types';

export interface MidiExportOptions {
    /** Base filename (without extension) */
    filename?: string;
    /** Velocity for all notes (1-127, default 100) */
    velocity?: number;
}

// Note names for octave calculation
const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/**
 * Convert flat notation to sharps for consistent indexing
 */
const normalizeToSharp = (note: string): string => {
    const flatToSharp: Record<string, string> = {
        'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#',
        'D♭': 'C#', 'E♭': 'D#', 'G♭': 'F#', 'A♭': 'G#', 'B♭': 'A#'
    };
    return flatToSharp[note] || note.replace('♯', '#').replace('♭', 'b');
};

/**
 * Add octave numbers to chord notes
 * Matches the voicing logic from audioEngine.playChord
 */
const addOctavesToNotes = (notes: string[], baseOctave: number = 3): string[] => {
    if (!notes || notes.length === 0) return [];

    // Get root note info
    const rootNote = normalizeToSharp(notes[0].replace(/\d/, ''));
    const rootIndex = NOTES.indexOf(rootNote);

    return notes.map((note, i) => {
        // If note already has octave, normalize and return it
        if (/\d/.test(note)) {
            return normalizeToSharp(note);
        }

        const noteName = normalizeToSharp(note);
        const noteIndex = NOTES.indexOf(noteName);

        if (i === 0) {
            // Root note in base octave
            return `${noteName}${baseOctave}`;
        }

        // Other notes: if they're "below" the root in the chromatic scale, put them an octave up
        let octave = baseOctave;
        if (rootIndex !== -1 && noteIndex !== -1) {
            if (noteIndex < rootIndex || (noteIndex - rootIndex > 6)) {
                octave = baseOctave + 1;
            }
        }

        // For extended chords (9, 11, 13), put those even higher
        if (i >= 4) {
            octave = baseOctave + 1;
        }
        if (i >= 5) {
            octave = baseOctave + 2;
        }

        return `${noteName}${octave}`;
    });
};

/**
 * Convert beat duration to MIDI ticks
 * Standard MIDI uses 128 ticks per beat (quarter note)
 */
const durationToTicks = (durationBeats: number): number => {
    // midi-writer-js tick resolution
    return Math.round(durationBeats * 128);
};

/**
 * Export a song as a MIDI file blob
 */
export const exportSongAsMidi = (song: Song, options: MidiExportOptions = {}): Blob => {
    const { velocity = 100 } = options;

    // Create a new MIDI track
    const track = new MidiWriter.Track();

    // Set tempo
    track.setTempo(song.tempo);

    // Set time signature - midi-writer-js uses different args
    const [numerator, denominator] = song.timeSignature;
    // The setTimeSignature method signature may vary - wrap in try/catch
    try {
        // Some versions expect (numerator, denominator, clocksPerClick, notesPerQuarter)
        (track as any).setTimeSignature(numerator, denominator, 24, 8);
    } catch {
        // Fallback if the method doesn't exist or has different signature
        console.warn('Could not set time signature on MIDI track');
    }

    // Add track name
    track.addTrackName(song.title);

    // Keep track of accumulated time for scheduling
    let tickPosition = 0;

    // Process each section
    song.sections.forEach((section: Section) => {
        section.measures.forEach((measure: Measure) => {
            measure.beats.forEach((beat) => {
                if (beat.chord && beat.chord.notes && beat.chord.notes.length > 0) {
                    // Add octaves to notes (chord.notes doesn't have octaves)
                    // Then normalize for MIDI format
                    const pitches = addOctavesToNotes(beat.chord.notes, 3);

                    // Calculate duration in ticks
                    const durationTicks = durationToTicks(beat.duration);

                    // Create note event for the chord
                    const noteEvent = new MidiWriter.NoteEvent({
                        pitch: pitches as any,
                        duration: `T${durationTicks}`,
                        velocity: velocity,
                        startTick: tickPosition,
                    });

                    track.addEvent(noteEvent);
                }

                // Advance position regardless of whether there's a chord (rests)
                tickPosition += durationToTicks(beat.duration);
            });
        });
    });

    // Generate MIDI file
    const write = new MidiWriter.Writer([track]);

    // Get the data URI and convert to Blob
    const dataUri = write.dataUri();
    const base64Data = dataUri.split(',')[1];
    const binaryData = atob(base64Data);
    const bytes = new Uint8Array(binaryData.length);
    for (let i = 0; i < binaryData.length; i++) {
        bytes[i] = binaryData.charCodeAt(i);
    }

    return new Blob([bytes], { type: 'audio/midi' });
};

/**
 * Generate a sanitized filename from song title
 */
export const sanitizeFilename = (title: string): string => {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
};
