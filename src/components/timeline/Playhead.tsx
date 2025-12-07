import React, { useRef, useEffect, useState } from 'react';
import * as Tone from 'tone';
import { useSongStore } from '../../store/useSongStore';

interface PlayheadProps {
    scale: number;
    chordSize: number;
}

export const Playhead: React.FC<PlayheadProps> = ({ scale, chordSize }) => {
    const { isPlaying, currentSong } = useSongStore();
    const playheadRef = useRef<HTMLDivElement>(null);
    const frameRef = useRef<number>(0);

    const baseUnitWidth = chordSize * 0.9;
    const beatUnitWidth = Math.max(8, baseUnitWidth * scale);
    const SECTION_GAP = 12; // Gap-3 in Tailwind = 12px
    const MEASURE_BORDER = 2; // Border-r-2 = 2px (Wait, measure has border-r-2, does it take space or is it part of width? Usually box-sizing border-box includes it, but here we stack measures. Flex items.)
    // In Measure.tsx: flex flex-col border-r-2 border-border-medium last:border-r-0 px-1 min-w-[64px]
    // The width of a beat is `beatUnitWidth`.
    // The width of a measure is roughly `beats * beatUnitWidth` + padding/border.
    // Measure has `px-1` (4px left + 4px right = 8px total).
    // Plus `border-r-2` (2px).
    // So each measure adds ~10px of extra width?
    // Let's look at Measure.tsx again:
    // style={{ minWidth: beatUnitWidth * Math.max(1, totalBeats) + 8 }}
    // And `gap-0.5` between beats inside ChordSlot container? No, Measure.tsx:
    // <div className="flex gap-0.5"> ... slots ... </div>
    // Gap 0.5 = 2px per gap between beats.
    
    // This is complex to calculate analytically. 
    // Ideally we should use the actual DOM elements to find position, but that requires querying the DOM every frame or mapping beats to elements.
    
    // Simplified approximation that might be "good enough" if we just account for Section gaps and Measure padding?
    // Let's try to map "currentBeats" to "Section Index" + "Beat Index within Section".
    
    const calculatePixelOffset = (totalBeats: number) => {
        let remainingBeats = totalBeats;
        let pixelOffset = 0;
        
        for (const section of currentSong.sections) {
            // Calculate total beats in this section
            let sectionBeats = 0;
            let sectionWidth = 0;
            
            // We need to replicate the exact layout logic of Section -> Measure -> Beat
            // This is brittle. 
            // Better: Just assume average width? No, that drifts.
            
            // Let's try to calculate per section.
            for (const measure of section.measures) {
                const measureDuration = measure.beats.reduce((acc, b) => acc + (b.duration || 1), 0);
                
                if (remainingBeats < measureDuration) {
                    // We are in this measure
                    // Add padding for measure start (px-1 = 4px)
                    pixelOffset += 4;
                    
                    // Inside measure, beats have gap-0.5 (2px) between them
                    // We need to know which beat we are in.
                    let measureTime = remainingBeats;
                    for (const beat of measure.beats) {
                         const beatDur = beat.duration || 1;
                         if (measureTime < beatDur) {
                             // We are in this beat
                             // Add width proportional to progress
                             const progress = measureTime / beatDur;
                             const slotWidth = Math.max(beatUnitWidth * beatDur, beatUnitWidth);
                             pixelOffset += progress * slotWidth;
                             return pixelOffset;
                         }
                         // Completed beat
                         const slotWidth = Math.max(beatUnitWidth * beatDur, beatUnitWidth);
                         pixelOffset += slotWidth + 2; // + gap 2px
                         measureTime -= beatDur;
                    }
                    // Should not happen if logic is correct
                    return pixelOffset;
                }
                
                // Completed measure
                // Calculate full measure width: 
                // Sum of (beat widths + 2px gaps) - last gap + padding 8px + border 2px (except last measure? no border on last?)
                // Measure.tsx: border-r-2 last:border-r-0
                // Section.tsx: measures map...
                
                const beatWidths = measure.beats.reduce((acc, b) => acc + Math.max(beatUnitWidth * (b.duration || 1), beatUnitWidth), 0);
                const gapWidths = Math.max(0, measure.beats.length - 1) * 2; // gap-0.5
                const padding = 8; // px-1 (4+4)
                const border = 2; // border-r-2
                
                // Note: Measure component structure:
                // outer div (border-r-2, px-1)
                //   inner div (flex gap-0.5)
                
                // If this is the last measure of the section, border is 0 (last:border-r-0)
                // Actually `last:border-r-0` applies to the list of measures.
                const isLastMeasure = measure === section.measures[section.measures.length - 1];
                
                pixelOffset += beatWidths + gapWidths + padding + (isLastMeasure ? 0 : border);
                
                remainingBeats -= measureDuration;
            }
            
            // Completed section
            // Add section gap
            pixelOffset += SECTION_GAP;
        }
        
        return pixelOffset;
    };

    useEffect(() => {
        if (!isPlaying) {
            // ...
            return;
        }

        const animate = () => {
            if (playheadRef.current) {
                // Parse position: "0:0:0"
                const position = Tone.Transport.position.toString().split(':');
                const bars = parseFloat(position[0]);
                const quarters = parseFloat(position[1]);
                const sixteenths = parseFloat(position[2]);
                
                // Current song time in beats
                const currentBeats = (bars * 4) + quarters + (sixteenths / 4);
                
                const pixelOffset = calculatePixelOffset(currentBeats);
                
                playheadRef.current.style.transform = `translateX(${pixelOffset}px)`;
            }
            frameRef.current = requestAnimationFrame(animate);
        };

        frameRef.current = requestAnimationFrame(animate);

        return () => {
            if (frameRef.current) cancelAnimationFrame(frameRef.current);
        };
    }, [isPlaying, beatUnitWidth, currentSong]);

    if (!isPlaying) return null;

    return (
        <div 
            ref={playheadRef}
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-50 pointer-events-none shadow-[0_0_8px_rgba(239,68,68,0.8)]"
            style={{ 
                left: 0,
                // Add a triangle cap
            }}
        >
            <div className="absolute -top-1 -left-[4.5px] w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[6px] border-t-red-500" />
        </div>
    );
};

