
import { getIntervalFromKey } from './src/utils/musicTheory';

const testCases = [
    { key: 'C', note: 'E', expected: '3' },
    { key: 'C', note: 'G', expected: '5' },
    { key: 'C', note: 'B', expected: '7' },
    { key: 'C', note: 'C', expected: '1' },
    { key: 'G', note: 'E', expected: '6' },
    { key: 'G', note: 'G', expected: '1' },
    { key: 'G', note: 'B', expected: '3' },
    { key: 'C', note: 'D', expected: '2' },
    { key: 'C', note: 'F#', expected: '♭5' }, // or #4
];

console.log('Running Verification...');
let passed = 0;
testCases.forEach(tc => {
    const result = getIntervalFromKey(tc.key, tc.note);
    if (result === tc.expected || (result === '♭5' && tc.expected === '#4') || (result === '#4' && tc.expected === '♭5')) {
        console.log(`PASS: Key ${tc.key}, Note ${tc.note} -> ${result}`);
        passed++;
    } else {
        console.error(`FAIL: Key ${tc.key}, Note ${tc.note} -> Got ${result}, Expected ${tc.expected}`);
    }
});

console.log(`\nPassed ${passed} / ${testCases.length} tests.`);
