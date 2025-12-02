import React, { useMemo, useRef } from 'react';
import { useSongStore } from '../../store/useSongStore';
import { CIRCLE_OF_FIFTHS, getDiatonicChords, getWheelColors, type Chord } from '../../utils/musicTheory';
import { WheelSegment } from './WheelSegment';
import { polarToCartesian } from '../../utils/geometry';
import { RotateCw, RotateCcw } from 'lucide-react';
import { playChord } from '../../utils/audioEngine';

export const ChordWheel: React.FC = () => {
    const {
        selectedKey,
        wheelRotation,
        rotateWheel,
        setKey,
        addChordToSlot,
        selectedSectionId,
        selectedSlotId,
        showRomanNumerals,
        currentSong
    } = useSongStore();

    const wheelRef = useRef<SVGSVGElement>(null);
    const colors = getWheelColors();

    // Dimensions
    const size = 600;
    const cx = size / 2;
    const cy = size / 2;
    const outerRadius = 280;
    const midRadius = 220;
    const innerRadius = 160;
    const centerRadius = 80;

    // Current Key Data
    const diatonicChords = useMemo(() => getDiatonicChords(selectedKey), [selectedKey]);
    const diatonicRoots = useMemo(() => diatonicChords.map(c => c.root), [diatonicChords]);

    const handleChordClick = (chord: Chord) => {
        // Play sound
        playChord(chord.notes);
        console.log('Play', chord.symbol);

        // 1. If slot selected, add to it
        if (selectedSectionId && selectedSlotId) {
            addChordToSlot(chord, selectedSectionId, selectedSlotId);
            return;
        }

        // 2. If section selected, find first empty slot in it
        if (selectedSectionId) {
            const section = currentSong.sections.find(s => s.id === selectedSectionId);
            if (section) {
                for (const measure of section.measures) {
                    for (const beat of measure.beats) {
                        if (!beat.chord) {
                            addChordToSlot(chord, section.id, beat.id);
                            return;
                        }
                    }
                }
            }
        }

        // 3. Find first empty slot in song
        for (const section of currentSong.sections) {
            for (const measure of section.measures) {
                for (const beat of measure.beats) {
                    if (!beat.chord) {
                        addChordToSlot(chord, section.id, beat.id);
                        return;
                    }
                }
            }
        }
    };

    const handleRotate = (direction: 'cw' | 'ccw') => {
        const step = 30;
        const newRotation = direction === 'cw' ? wheelRotation + step : wheelRotation - step;
        rotateWheel(newRotation);

        // Update key based on rotation
        const currentIndex = CIRCLE_OF_FIFTHS.indexOf(selectedKey);
        const newIndex = direction === 'cw'
            ? (currentIndex - 1 + 12) % 12
            : (currentIndex + 1) % 12;

        setKey(CIRCLE_OF_FIFTHS[newIndex]);
    };

    return (
        <div className="relative flex flex-col items-center justify-center w-[700px] h-[700px]">
            <svg
                ref={wheelRef}
                width="100%"
                height="100%"
                viewBox={`0 0 ${size} ${size}`}
                className="w-full max-w-[600px] h-auto select-none"
            >
                <defs>
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="4" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                </defs>

                {/* Rotatable Group */}
                <g
                    style={{
                        transform: `rotate(${wheelRotation}deg)`,
                        transformOrigin: `${cx}px ${cy}px`,
                        transition: 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)'
                    }}
                >
                    {CIRCLE_OF_FIFTHS.map((root, i) => {
                        const angleSize = 30;
                        const startAngle = i * angleSize - 90 - (angleSize / 2); // Start at top centered
                        const endAngle = startAngle + angleSize;

                        // Calculate chords for this segment
                        // Major: The root itself
                        const majorChord: Chord = {
                            root,
                            quality: 'major',
                            numeral: 'I',
                            notes: [], // TODO: fill
                            symbol: root
                        };

                        // Minor: Relative minor (vi)
                        const relMinorRoot = getDiatonicChords(root)[5].root; // vi
                        const minorChord: Chord = {
                            root: relMinorRoot,
                            quality: 'minor',
                            numeral: 'vi',
                            notes: [],
                            symbol: relMinorRoot + 'm'
                        };

                        // Diminished: vii° of the Major Key
                        const dimRoot = getDiatonicChords(root)[6].root; // vii°
                        const dimChord: Chord = {
                            root: dimRoot,
                            quality: 'diminished',
                            numeral: 'vii°',
                            notes: [],
                            symbol: dimRoot + '°'
                        };

                        const isMajorDiatonic = diatonicRoots.includes(majorChord.root);
                        const isMinorDiatonic = diatonicRoots.includes(minorChord.root);
                        const isDimDiatonic = diatonicRoots.includes(dimChord.root);

                        return (
                            <g key={root}>
                                {/* Outer Ring: Major */}
                                <WheelSegment
                                    cx={cx}
                                    cy={cy}
                                    innerRadius={midRadius}
                                    outerRadius={outerRadius}
                                    startAngle={startAngle}
                                    endAngle={endAngle}
                                    color={colors[root as keyof typeof colors]}
                                    label={showRomanNumerals && isMajorDiatonic
                                        ? diatonicChords.find(c => c.root === root)?.numeral || '?'
                                        : root}
                                    chord={majorChord}
                                    isSelected={false}
                                    isDiatonic={isMajorDiatonic}
                                    onClick={handleChordClick}
                                />

                                {/* Diminished Notch */}
                                <WheelSegment
                                    cx={cx}
                                    cy={cy}
                                    innerRadius={outerRadius}
                                    outerRadius={outerRadius + 30}
                                    startAngle={startAngle}
                                    endAngle={endAngle}
                                    color={colors[root as keyof typeof colors]}
                                    label={showRomanNumerals && isDimDiatonic
                                        ? 'vii°'
                                        : dimChord.symbol}
                                    chord={dimChord}
                                    isSelected={false}
                                    isDiatonic={isDimDiatonic}
                                    onClick={handleChordClick}
                                />

                                {/* Inner Ring: Minor */}
                                <WheelSegment
                                    cx={cx}
                                    cy={cy}
                                    innerRadius={innerRadius}
                                    outerRadius={midRadius}
                                    startAngle={startAngle}
                                    endAngle={endAngle}
                                    color={colors[root as keyof typeof colors]}
                                    label={showRomanNumerals && isMinorDiatonic
                                        ? diatonicChords.find(c => c.root === relMinorRoot)?.numeral || '?'
                                        : minorChord.symbol}
                                    chord={minorChord}
                                    isSelected={false}
                                    isDiatonic={isMinorDiatonic}
                                    onClick={handleChordClick}
                                />
                            </g>
                        );
                    })}
                </g>

                {/* Static Overlay */}
                <g pointerEvents="none">
                    <path
                        d={`
               M ${polarToCartesian(cx, cy, outerRadius + 35, -45).x} ${polarToCartesian(cx, cy, outerRadius + 35, -45).y}
               A ${outerRadius + 35} ${outerRadius + 35} 0 0 1 ${polarToCartesian(cx, cy, outerRadius + 35, 45).x} ${polarToCartesian(cx, cy, outerRadius + 35, 45).y}
               L ${polarToCartesian(cx, cy, innerRadius - 10, 45).x} ${polarToCartesian(cx, cy, innerRadius - 10, 45).y}
               A ${innerRadius - 10} ${innerRadius - 10} 0 0 0 ${polarToCartesian(cx, cy, innerRadius - 10, -45).x} ${polarToCartesian(cx, cy, innerRadius - 10, -45).y}
               Z
             `}
                        fill="none"
                        stroke="white"
                        strokeWidth="3"
                        filter="url(#glow)"
                        className="opacity-50"
                    />
                </g>

                {/* Center Controls */}
                <circle cx={cx} cy={cy} r={centerRadius} fill="#1e1e28" stroke="#282833" strokeWidth="2" />
                <text x={cx} y={cy - 15} textAnchor="middle" fill="white" className="text-3xl font-bold font-display">
                    {selectedKey}
                </text>
                <text x={cx} y={cy + 10} textAnchor="middle" fill="#9898a6" className="text-xs">
                    {diatonicChords[0].root === 'C' ? 'No sharps/flats' : 'Key Sig'}
                </text>

                {/* Rotation Controls */}
                <g transform={`translate(${cx - 40}, ${cy + 30})`} onClick={() => handleRotate('ccw')} className="cursor-pointer hover:opacity-80">
                    <circle r="15" fill="#282833" />
                    <RotateCcw size={16} x={-8} y={-8} color="white" />
                </g>
                <g transform={`translate(${cx + 40}, ${cy + 30})`} onClick={() => handleRotate('cw')} className="cursor-pointer hover:opacity-80">
                    <circle r="15" fill="#282833" />
                    <RotateCw size={16} x={-8} y={-8} color="white" />
                </g>

            </svg>
        </div>
    );
};
