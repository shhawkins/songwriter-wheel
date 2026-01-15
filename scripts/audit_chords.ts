// Script to audit guitar chord database for impossible voicings
import { guitarChords } from './src/utils/guitarChordData';

interface Issue {
    root: string;
    quality: string;
    problem: string;
    data: any;
}

const issues: Issue[] = [];

// Check all chords
for (const [root, qualities] of Object.entries(guitarChords)) {
    for (const [quality, voicings] of Object.entries(qualities)) {
        for (const chord of voicings) {
            const { frets, fingers, barres, baseFret } = chord;

            // Check 1: Fretted notes that are lower (closer to nut) than any barre
            // This means a finger would need to press behind a barre
            for (const barreFret of barres) {
                // Find the string range covered by this barre
                const stringsAtBarre = frets
                    .map((f, idx) => ({ f, idx }))
                    .filter(x => x.f === barreFret);

                if (stringsAtBarre.length < 2) continue;

                const barreMinString = Math.min(...stringsAtBarre.map(x => x.idx));
                const barreMaxString = Math.max(...stringsAtBarre.map(x => x.idx));

                // Check all strings within the barre's range
                for (let i = barreMinString; i <= barreMaxString; i++) {
                    const fret = frets[i];
                    // Skip muted/open strings and strings at the barre fret
                    if (fret <= 0 || fret === barreFret) continue;

                    // If this fret is LOWER than the barre (closer to nut), 
                    // it's impossible to play - finger would be behind barre
                    if (fret < barreFret) {
                        issues.push({
                            root,
                            quality,
                            problem: `String ${i + 1} (0-indexed: ${i}) fretted at ${fret} is behind barre at ${barreFret}`,
                            data: chord
                        });
                    }
                }
            }

            // Check 2: Multiple barres where strings have conflicting positions
            if (barres.length > 1) {
                // Check if any barre covers strings that have frets specified for another barre
                // that would be impossible to play
                for (let b1 = 0; b1 < barres.length; b1++) {
                    for (let b2 = b1 + 1; b2 < barres.length; b2++) {
                        const barre1Fret = barres[b1];
                        const barre2Fret = barres[b2];

                        const getBarreRange = (barreFret: number) => {
                            const strings = frets.map((f, idx) => ({ f, idx }))
                                .filter(x => x.f === barreFret);
                            if (strings.length < 2) return null;
                            return {
                                min: Math.min(...strings.map(x => x.idx)),
                                max: Math.max(...strings.map(x => x.idx)),
                                fret: barreFret
                            };
                        };

                        const range1 = getBarreRange(barre1Fret);
                        const range2 = getBarreRange(barre2Fret);

                        // Check if ranges overlap
                        if (range1 && range2) {
                            const overlaps = !(range1.max < range2.min || range1.min > range2.max);
                            if (overlaps) {
                                // The lower barre's fingers would be behind the higher barre
                                // on overlapping strings
                                const lowerBarre = range1.fret < range2.fret ? range1 : range2;
                                const higherBarre = range1.fret < range2.fret ? range2 : range1;

                                // Find overlapping strings
                                const overlapMin = Math.max(range1.min, range2.min);
                                const overlapMax = Math.min(range1.max, range2.max);

                                if (overlapMin <= overlapMax) {
                                    issues.push({
                                        root,
                                        quality,
                                        problem: `Barre at fret ${lowerBarre.fret} overlaps with barre at fret ${higherBarre.fret} on strings ${overlapMin}-${overlapMax}`,
                                        data: chord
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

console.log('=== CHORD DATABASE AUDIT ===\n');
console.log(`Found ${issues.length} potential issues:\n`);

for (const issue of issues) {
    console.log(`${issue.root}${issue.quality}`);
    console.log(`  Problem: ${issue.problem}`);
    console.log(`  frets: [${issue.data.frets.join(', ')}]`);
    console.log(`  fingers: [${issue.data.fingers.join(', ')}]`);
    console.log(`  barres: [${issue.data.barres.join(', ')}]`);
    console.log(`  baseFret: ${issue.data.baseFret}`);
    console.log('');
}
