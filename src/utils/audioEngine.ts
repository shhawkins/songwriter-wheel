import * as Tone from 'tone';

let sampler: Tone.Sampler | null = null;

export const initAudio = async () => {
    if (sampler) return;

    // Use a free soundfont URL or basic synth fallback
    // Salamander Grand Piano is a good free option often used with Tone.js
    const baseUrl = "https://tonejs.github.io/audio/salamander/";

    sampler = new Tone.Sampler({
        urls: {
            "C4": "C4.mp3",
            "D#4": "Ds4.mp3",
            "F#4": "Fs4.mp3",
            "A4": "A4.mp3",
        },
        release: 1,
        baseUrl,
    }).toDestination();

    await Tone.loaded();
    console.log("Audio initialized");
};

export const playChord = async (notes: string[], duration: string = "1n") => {
    if (Tone.context.state !== 'running') {
        await Tone.start();
        console.log("Tone context started");
    }

    if (!sampler) {
        console.log("Initializing sampler...");
        await initAudio();
    }

    // Add octave to notes if missing (default to 4)
    const fullNotes = notes.map(n => {
        // If note has number, keep it. If not, add 4.
        // But wait, our notes are just "C", "F#".
        // We need to calculate octaves to make them sound good together.
        // Simple heuristic: Root is 3 or 4.
        // Let's just append '4' for now, handling the rollover (B3 -> C4) is tricky without index.
        // Let's assume octave 4 for all for simplicity, or spread them.
        return n.match(/\d/) ? n : `${n}4`;
    });

    sampler?.triggerAttackRelease(fullNotes, duration);
};

export const stopAudio = () => {
    sampler?.releaseAll();
};
