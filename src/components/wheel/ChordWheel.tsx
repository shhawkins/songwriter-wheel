import React, { useMemo } from 'react';
import { useSongStore } from '../../store/useSongStore';
import { 
    WHEEL_POSITIONS, 
    getWheelColors, 
    getChordNotes,
    getKeySignature,
    isSegmentDiatonic,
    type Chord 
} from '../../utils/musicTheory';
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
        currentSong,
        setSelectedChord
    } = useSongStore();

    const colors = getWheelColors();

    // Dimensions - CORRECT ORDER: Major (inner) -> Minor (middle) -> Diminished (outer)
    const size = 600;
    const cx = size / 2;
    const cy = size / 2;
    
    // Ring radii from inside to outside
    const centerRadius = 70;
    const majorInnerRadius = centerRadius + 10;    // Major ring (innermost)
    const majorOuterRadius = 165;
    const minorInnerRadius = majorOuterRadius;      // Minor ring (middle)
    const minorOuterRadius = 230;
    const dimInnerRadius = minorOuterRadius;        // Diminished ring (outer)
    const dimOuterRadius = 270;

    // Key signature info
    const keySig = useMemo(() => getKeySignature(selectedKey), [selectedKey]);
    const keySigDisplay = useMemo(() => {
        if (keySig.sharps > 0) return `${keySig.sharps}♯`;
        if (keySig.flats > 0) return `${keySig.flats}♭`;
        return '';
    }, [keySig]);

    const handleChordClick = (chord: Chord) => {
        // Play sound
        playChord(chord.notes);
        
        // Set selected chord for details panel
        setSelectedChord(chord);

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

        // Update key based on rotation - clockwise goes UP in fifths
        const keys = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F'];
        const currentIndex = keys.indexOf(selectedKey);
        const newIndex = direction === 'cw'
            ? (currentIndex + 1) % 12
            : (currentIndex - 1 + 12) % 12;

        setKey(keys[newIndex]);
    };

    // Create the triangular overlay path that highlights diatonic chords
    // The triangle spans from the IV position through I to V
    const createTriangleOverlay = () => {
        // The triangle needs to highlight positions covering:
        // - IV (1 position counter-clockwise from I)
        // - I (at top, 12 o'clock)  
        // - V (1 position clockwise from I)
        // And the ii, iii, vi, vii° positions within that span
        
        // The span is roughly -60° to +30° from top (covering ~3 main segments)
        // But we need to encompass the full diatonic area
        
        const triangleStartAngle = -75;  // Start left of IV
        const triangleEndAngle = 45;     // End right of V
        
        // Outer edge of diminished ring
        const outerStart = polarToCartesian(cx, cy, dimOuterRadius + 5, triangleStartAngle);
        const outerEnd = polarToCartesian(cx, cy, dimOuterRadius + 5, triangleEndAngle);
        
        // Inner edge near center
        const innerStart = polarToCartesian(cx, cy, majorInnerRadius - 5, triangleStartAngle);
        const innerEnd = polarToCartesian(cx, cy, majorInnerRadius - 5, triangleEndAngle);
        
        return `
            M ${outerStart.x} ${outerStart.y}
            A ${dimOuterRadius + 5} ${dimOuterRadius + 5} 0 0 1 ${outerEnd.x} ${outerEnd.y}
            L ${innerEnd.x} ${innerEnd.y}
            A ${majorInnerRadius - 5} ${majorInnerRadius - 5} 0 0 0 ${innerStart.x} ${innerStart.y}
            Z
        `;
    };

    return (
        <div className="relative flex flex-col items-center justify-center w-full h-full max-w-[580px] max-h-[580px] aspect-square p-2">
            <svg
                width="100%"
                height="100%"
                viewBox={`0 0 ${size} ${size}`}
                className="w-full h-full select-none"
            >
                <defs>
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.3" />
                    </filter>
                </defs>

                {/* Rotatable Wheel Group */}
                <g
                    style={{
                        transform: `rotate(${wheelRotation}deg)`,
                        transformOrigin: `${cx}px ${cy}px`,
                        transition: 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)'
                    }}
                >
                    {WHEEL_POSITIONS.map((position, i) => {
                        const angleSize = 30;
                        const startAngle = i * angleSize - 90 - (angleSize / 2);
                        const endAngle = startAngle + angleSize;
                        
                        const baseColor = colors[position.major as keyof typeof colors] || colors.C;
                        
                        // Extract the root from minor chord symbol (e.g., "Am" -> "A")
                        const minorRoot = position.minor.replace('m', '');
                        // Extract the root from diminished chord symbol (e.g., "B°" -> "B")
                        const dimRoot = position.diminished.replace('°', '');

                        // Check if each segment is diatonic to the current key
                        const majorDiatonic = isSegmentDiatonic(i, 'major', selectedKey);
                        const minorDiatonic = isSegmentDiatonic(i, 'minor', selectedKey);
                        const dimDiatonic = isSegmentDiatonic(i, 'diminished', selectedKey);

                        // Create chord objects with proper notes
                        const majorChord: Chord = {
                            root: position.major,
                            quality: 'major',
                            numeral: majorDiatonic.numeral || '',
                            notes: getChordNotes(position.major, 'major'),
                            symbol: position.major
                        };

                        const minorChord: Chord = {
                            root: minorRoot,
                            quality: 'minor',
                            numeral: minorDiatonic.numeral || '',
                            notes: getChordNotes(minorRoot, 'minor'),
                            symbol: position.minor
                        };

                        const dimChord: Chord = {
                            root: dimRoot,
                            quality: 'diminished',
                            numeral: dimDiatonic.numeral || 'vii°',
                            notes: getChordNotes(dimRoot, 'diminished'),
                            symbol: position.diminished
                        };

                        // Determine labels
                        const majorLabel = showRomanNumerals && majorDiatonic.isDiatonic
                            ? majorDiatonic.numeral!
                            : position.major;
                        
                        const minorLabel = showRomanNumerals && minorDiatonic.isDiatonic
                            ? minorDiatonic.numeral!
                            : position.minor;
                        
                        const dimLabel = showRomanNumerals && dimDiatonic.isDiatonic
                            ? dimDiatonic.numeral!
                            : position.diminished;

                        return (
                            <g key={position.major}>
                                {/* INNER RING: Major chords (closest to center) */}
                                <WheelSegment
                                    cx={cx}
                                    cy={cy}
                                    innerRadius={majorInnerRadius}
                                    outerRadius={majorOuterRadius}
                                    startAngle={startAngle}
                                    endAngle={endAngle}
                                    color={baseColor}
                                    label={majorLabel}
                                    chord={majorChord}
                                    isSelected={false}
                                    isDiatonic={majorDiatonic.isDiatonic}
                                    onClick={handleChordClick}
                                    ringType="major"
                                />

                                {/* MIDDLE RING: Minor chords */}
                                <WheelSegment
                                    cx={cx}
                                    cy={cy}
                                    innerRadius={minorInnerRadius}
                                    outerRadius={minorOuterRadius}
                                    startAngle={startAngle}
                                    endAngle={endAngle}
                                    color={baseColor}
                                    label={minorLabel}
                                    chord={minorChord}
                                    isSelected={false}
                                    isDiatonic={minorDiatonic.isDiatonic}
                                    onClick={handleChordClick}
                                    ringType="minor"
                                />

                                {/* OUTER RING: Diminished chords (notches on outside) */}
                                <WheelSegment
                                    cx={cx}
                                    cy={cy}
                                    innerRadius={dimInnerRadius}
                                    outerRadius={dimOuterRadius}
                                    startAngle={startAngle}
                                    endAngle={endAngle}
                                    color={baseColor}
                                    label={dimLabel}
                                    chord={dimChord}
                                    isSelected={false}
                                    isDiatonic={dimDiatonic.isDiatonic}
                                    onClick={handleChordClick}
                                    ringType="diminished"
                                />
                            </g>
                        );
                    })}
                </g>

                {/* Static Triangular Overlay - Shows diatonic area */}
                <g pointerEvents="none">
                    <path
                        d={createTriangleOverlay()}
                        fill="none"
                        stroke="rgba(255,255,255,0.85)"
                        strokeWidth="2.5"
                        strokeLinejoin="round"
                        filter="url(#glow)"
                    />
                </g>

                {/* Ring Labels - Chord extension hints (like the physical wheel) */}
                <g pointerEvents="none" opacity="0.6">
                    {/* Inner ring label - Major extensions */}
                    <text
                        x={cx + 135}
                        y={cy - 45}
                        fill="#333"
                        fontSize="7"
                        fontWeight="500"
                        transform={`rotate(15, ${cx + 135}, ${cy - 45})`}
                    >
                        maj7, maj9
                    </text>
                    
                    {/* Middle ring label - Minor extensions */}
                    <text
                        x={cx + 185}
                        y={cy - 65}
                        fill="#333"
                        fontSize="7"
                        fontWeight="500"
                        transform={`rotate(15, ${cx + 185}, ${cy - 65})`}
                    >
                        m7, m9, m11
                    </text>
                    
                    {/* Outer ring label - Diminished */}
                    <text
                        x={cx + 235}
                        y={cy - 85}
                        fill="#555"
                        fontSize="6"
                        fontWeight="500"
                        transform={`rotate(15, ${cx + 235}, ${cy - 85})`}
                    >
                        m7♭5
                    </text>
                </g>

                {/* Center Circle with Key Info */}
                <g filter="url(#shadow)">
                    <circle 
                        cx={cx} 
                        cy={cy} 
                        r={centerRadius} 
                        fill="linear-gradient(180deg, #1e1e28 0%, #16161d 100%)"
                        stroke="#3a3a4a" 
                        strokeWidth="2" 
                    />
                    <circle 
                        cx={cx} 
                        cy={cy} 
                        r={centerRadius} 
                        fill="#1a1a24"
                    />
                </g>
                
                {/* KEY Label */}
                <text 
                    x={cx} 
                    y={cy - 28} 
                    textAnchor="middle" 
                    fill="#6366f1" 
                    fontSize="10"
                    fontWeight="bold"
                    letterSpacing="2"
                >
                    KEY
                </text>
                
                {/* Key Name */}
                <text 
                    x={cx} 
                    y={cy + 5} 
                    textAnchor="middle" 
                    fill="white" 
                    fontSize="32"
                    fontWeight="bold"
                    fontFamily="system-ui, -apple-system, sans-serif"
                >
                    {selectedKey}
                </text>
                
                {/* Key Signature */}
                <text 
                    x={cx} 
                    y={cy + 28} 
                    textAnchor="middle" 
                    fill="#9898a6" 
                    fontSize="14"
                >
                    {keySigDisplay || 'No ♯/♭'}
                </text>

                {/* Rotation Controls */}
                <g 
                    transform={`translate(${cx - 30}, ${cy + 48})`} 
                    onClick={() => handleRotate('ccw')} 
                    className="cursor-pointer"
                    style={{ pointerEvents: 'all' }}
                >
                    <circle r="12" fill="#282833" className="hover:fill-[#3a3a4a] transition-colors" />
                    <g transform="translate(-6, -6)">
                        <RotateCcw size={12} color="#9898a6" />
                    </g>
                </g>
                <g 
                    transform={`translate(${cx + 30}, ${cy + 48})`} 
                    onClick={() => handleRotate('cw')} 
                    className="cursor-pointer"
                    style={{ pointerEvents: 'all' }}
                >
                    <circle r="12" fill="#282833" className="hover:fill-[#3a3a4a] transition-colors" />
                    <g transform="translate(-6, -6)">
                        <RotateCw size={12} color="#9898a6" />
                    </g>
                </g>

                {/* Direction Indicators */}
                <text 
                    x={cx - 55} 
                    y={cy + 52} 
                    textAnchor="middle" 
                    fill="#6b6b7b" 
                    fontSize="8"
                >
                    IV
                </text>
                <text 
                    x={cx + 55} 
                    y={cy + 52} 
                    textAnchor="middle" 
                    fill="#6b6b7b" 
                    fontSize="8"
                >
                    V
                </text>
            </svg>
        </div>
    );
};
