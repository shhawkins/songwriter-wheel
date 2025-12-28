import jsPDF from 'jspdf';
import { getGuitarChord, type GuitarChordShape } from './guitarChordData';
import { getSectionDisplayName, type Song, type Section } from '../types';
import { formatChordForDisplay } from './musicTheory';

// Helper function to draw a chord diagram using jsPDF primitives (black & white, compact)
const drawChordDiagram = (doc: jsPDF, chord: GuitarChordShape, startX: number, startY: number, compact: boolean = false) => {
    const { frets, barres, baseFret } = chord;

    // Layout constants (adjust for compact two-column mode)
    const stringSpacing = compact ? 2.5 : 3;
    const fretSpacing = compact ? 3 : 4;
    const numFrets = 4;
    const numStrings = 6;
    const dotRadius = compact ? 1 : 1.2;

    // String positions
    const stringPositions = Array.from({ length: numStrings }, (_, i) => startX + i * stringSpacing);
    const fretPositions = Array.from({ length: numFrets + 1 }, (_, i) => startY + i * fretSpacing);

    const isAtNut = baseFret === 1;
    const fretboardWidth = stringSpacing * (numStrings - 1);
    const fretboardHeight = fretSpacing * numFrets;

    // Draw nut (thick line) or fret indicator
    doc.setDrawColor(0, 0, 0);
    if (isAtNut) {
        doc.setLineWidth(1);
        doc.line(startX, startY, startX + fretboardWidth, startY);
    } else {
        doc.setLineWidth(0.3);
        doc.line(startX, startY, startX + fretboardWidth, startY);
        doc.setFontSize(compact ? 6 : 7);
        doc.setFont("helvetica", "bold");
        doc.text(baseFret.toString(), startX - 3, startY + fretSpacing / 2 + 1);
    }

    // Draw fret lines (horizontal)
    doc.setLineWidth(0.2);
    fretPositions.slice(1).forEach(fretY => {
        doc.line(startX, fretY, startX + fretboardWidth, fretY);
    });

    // Draw string lines (vertical)
    stringPositions.forEach(stringX => {
        doc.line(stringX, startY, stringX, startY + fretboardHeight);
    });

    // Draw barre lines
    barres.forEach(barreFret => {
        const barreStrings = frets
            .map((f, idx) => ({ fret: f, idx }))
            .filter(({ fret }) => fret === barreFret);

        if (barreStrings.length < 2) return;

        const minIdx = Math.min(...barreStrings.map(s => s.idx));
        const maxIdx = Math.max(...barreStrings.map(s => s.idx));
        const barreY = startY + (barreFret - 0.5) * fretSpacing;

        // Draw barre as thick line
        doc.setLineWidth(dotRadius * 1.4);
        doc.line(stringPositions[minIdx], barreY, stringPositions[maxIdx], barreY);
        doc.setLineWidth(0.2);
    });

    // Draw finger dots and open/muted indicators
    frets.forEach((fret, stringIndex) => {
        const x = stringPositions[stringIndex];

        if (fret === -1) {
            // Muted string (X)
            doc.setFontSize(compact ? 6 : 7);
            doc.setFont("helvetica", "bold");
            doc.text('x', x, startY - 1, { align: 'center' });
            return;
        }

        if (fret === 0) {
            // Open string (O)
            doc.setLineWidth(0.3);
            doc.circle(x, startY - 1.5, 0.8, 'S');
            return;
        }

        // Fingered fret - skip if part of a barre (unless first string)
        const isInBarre = barres.includes(fret);
        if (isInBarre) {
            const firstBarreString = frets.findIndex(f => f === fret);
            if (stringIndex !== firstBarreString) return;
        }

        const dotY = startY + (fret - 0.5) * fretSpacing;

        // Draw filled circle for finger position
        doc.setFillColor(0, 0, 0);
        doc.circle(x, dotY, dotRadius, 'F');
    });
};

/**
 * Generate PDF document (used by both direct export and bundle export)
 */
export const generatePdfDocument = (currentSong: Song, selectedKey: string): jsPDF => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const leftMargin = 20;
    const measuresPerRow = 4; // Wrap after 4 measures

    // Calculate song stats (same as Song Map)
    const totalBeats = currentSong.sections.reduce((acc, section) => {
        const sectionTimeSignature = section.timeSignature || currentSong.timeSignature;
        const beatsPerMeasure = sectionTimeSignature[0];
        return acc + (section.measures.length * beatsPerMeasure);
    }, 0);
    const durationSeconds = (totalBeats / currentSong.tempo) * 60;
    const durationMinutes = Math.floor(durationSeconds / 60);
    const durationRemainingSeconds = Math.floor(durationSeconds % 60);
    const formattedDuration = `${durationMinutes}:${durationRemainingSeconds.toString().padStart(2, '0')}`;
    const totalMeasures = currentSong.sections.reduce((acc, s) => acc + s.measures.length, 0);
    const totalSections = currentSong.sections.length;

    // === HEADER ===
    // Title
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text(currentSong.title, leftMargin, 18);

    // Artist name (to the right of title)
    if (currentSong.artist && currentSong.artist.trim()) {
        // Get the width of the title to position artist after it
        const titleWidth = doc.getTextWidth(currentSong.title);
        doc.setFontSize(14);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(100, 100, 100); // Gray color
        doc.text(`by ${currentSong.artist}`, leftMargin + titleWidth + 6, 18);
        doc.setTextColor(0, 0, 0); // Reset to black
    }

    // Horizontal line under title
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(leftMargin, 22, pageWidth - leftMargin, 22);

    // Song info row: Key | Time Sig | Tempo | Duration | Sections | Bars
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const infoItems = [
        `Key: ${formatChordForDisplay(selectedKey)}`,
        `${currentSong.timeSignature[0]}/${currentSong.timeSignature[1]}`,
        `Tempo: ${currentSong.tempo} BPM`,
        `Duration: ${formattedDuration}`,
        `${totalSections} sections`,
        `${totalMeasures} bars`
    ];
    doc.text(infoItems.join('   •   '), leftMargin, 30);

    let y = 48; // Extra margin before first section

    // Collect unique chords for diagram section
    const uniqueChords: Set<string> = new Set();

    currentSong.sections.forEach(section => {
        // Build rhythm notation for each measure first to calculate height
        const measureNotations = section.measures.map(measure => {
            const beatCount = measure.beats.length;

            // Collect chords for diagrams
            measure.beats.forEach(beat => {
                if (beat.chord) {
                    const root = beat.chord.root;
                    const qualityMap: Record<string, string> = {
                        'major': 'maj',
                        'minor': 'm',
                        'diminished': 'dim',
                        'augmented': 'aug',
                        'major7': 'maj7',
                        'minor7': 'm7',
                        'dominant7': '7',
                        'halfDiminished7': 'm7b5',
                        'sus2': 'sus2',
                        'sus4': 'sus4',
                    };
                    const quality = qualityMap[beat.chord.quality] || beat.chord.quality || 'maj';
                    uniqueChords.add(`${root}|${quality}`);
                }
            });

            if (beatCount === 1) {
                const chord = measure.beats[0]?.chord?.symbol || '—';
                return chord;
            } else if (beatCount === 2) {
                return measure.beats.map(beat => beat.chord?.symbol || '—').join(' ');
            } else {
                return measure.beats.map(beat => beat.chord?.symbol || '—').join(' ');
            }
        });

        // Calculate the total height this section will need:
        // - Section header: 10
        // - Each row of chords: 10 per row
        // - No chords message: 12
        // - Space after section: 6
        const numRows = measureNotations.length === 0 ? 1 : Math.ceil(measureNotations.length / measuresPerRow);
        const rowHeight = measureNotations.length === 0 ? 12 : numRows * 10;
        const sectionHeight = 10 + rowHeight + 6; // header + rows + spacing

        // Check if we need a new page - ensure entire section fits on one page
        // If we're past line 48 (not at start) and section won't fit, start new page
        if (y > 48 && y + sectionHeight > 280) {
            doc.addPage();
            y = 20;
        }

        // Section header
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text(`[${getSectionDisplayName(section, currentSong.sections)}]`, leftMargin, y);
        y += 10;

        // Wrap measures into rows of 4
        doc.setFontSize(14);
        doc.setFont("helvetica", "normal");

        if (measureNotations.length === 0) {
            doc.text('(No chords)', leftMargin, y);
            y += 12;
        } else {
            for (let i = 0; i < measureNotations.length; i += measuresPerRow) {
                const rowMeasures = measureNotations.slice(i, i + measuresPerRow);
                const rowText = rowMeasures.join('  |  ');

                // All rows flush left at margin - no indentation needed
                doc.text(rowText, leftMargin, y);
                y += 10;
            }
        }

        y += 6; // Space between sections
    });

    // === CHORD DIAGRAMS ===
    if (uniqueChords.size > 0) {
        const chordArray = Array.from(uniqueChords);
        const maxHeightAvailable = 245;
        const diagramSpacing = 5;

        const singleColumnHeight = 22;
        const totalSingleColumnHeight = chordArray.length * (singleColumnHeight + diagramSpacing);
        const needsTwoColumns = totalSingleColumnHeight > maxHeightAvailable;

        const diagramHeight = needsTwoColumns ? 18 : 22;
        const diagramWidth = needsTwoColumns ? 18 : 20;
        const columnWidth = needsTwoColumns ? 22 : 25;
        const diagramStartX = needsTwoColumns ? 155 : 170;

        let currentColumn = 0;
        let diagramY = 35;
        const chordsPerColumn = needsTwoColumns
            ? Math.ceil(chordArray.length / 2)
            : chordArray.length;

        // Go back to first page for chord diagrams
        doc.setPage(1);

        chordArray.forEach((chordKey, index) => {
            const [root, quality] = chordKey.split('|');
            const chord = getGuitarChord(root, quality);

            if (!chord) return;

            if (needsTwoColumns && index === chordsPerColumn) {
                currentColumn = 1;
                diagramY = 35;
            }

            const xOffset = currentColumn * columnWidth;

            const chordName = `${root}${quality === 'maj' ? '' : quality}`;
            doc.setFontSize(needsTwoColumns ? 6 : 7);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(0, 0, 0);
            doc.text(chordName, diagramStartX + xOffset + diagramWidth / 2 + 2, diagramY, { align: 'center' });

            drawChordDiagram(doc, chord, diagramStartX + xOffset, diagramY + 3, needsTwoColumns);

            diagramY += diagramHeight + diagramSpacing;
        });
    }

    // === SONG TIMELINE FOOTER ===
    // Helper function to get section abbreviation for compact display
    const getSectionAbbreviation = (section: Section, allSections: Section[]): string => {
        const typeAbbreviations: Record<string, string> = {
            'intro': 'In',
            'verse': 'V',
            'pre-chorus': 'PC',
            'chorus': 'C',
            'bridge': 'Br',
            'interlude': 'Int',
            'solo': 'So',
            'breakdown': 'Bd',
            'tag': 'Tg',
            'hook': 'Hk',
            'outro': 'Out',
        };

        const abbrev = typeAbbreviations[section.type] || section.type.charAt(0).toUpperCase();

        // Count how many of this type exist
        const sameTypeSections = allSections.filter(s => s.type === section.type);
        if (sameTypeSections.length > 1) {
            const index = sameTypeSections.findIndex(s => s.id === section.id) + 1;
            return `${abbrev}${index}`;
        }
        return abbrev;
    };

    // Draw timeline footer on a page
    const drawTimelineFooter = (pageDoc: jsPDF) => {
        const horizontalY = 285; // Y position for horizontal line (centered)
        const verticalExtent = 4; // How far vertical lines extend UP and DOWN from horizontal
        const labelY = horizontalY - verticalExtent - 3; // Labels above the bracket
        const timelineWidth = pageWidth - (leftMargin * 2);

        // Calculate total measures for proportional sizing
        const totalMeasures = currentSong.sections.reduce((acc, s) => acc + s.measures.length, 0);
        if (totalMeasures === 0) return;

        // Draw each section as a bracket with label above
        let currentX = leftMargin;
        pageDoc.setDrawColor(0, 0, 0);
        pageDoc.setLineWidth(0.4);

        currentSong.sections.forEach((section) => {
            const sectionWidth = (section.measures.length / totalMeasures) * timelineWidth;
            const bracketStartX = currentX + 2; // Small padding from edge
            const bracketEndX = currentX + sectionWidth - 2;

            // Draw horizontal line in the middle
            pageDoc.line(bracketStartX, horizontalY, bracketEndX, horizontalY);

            // Draw left vertical end cap (extending both UP and DOWN from horizontal)
            pageDoc.line(bracketStartX, horizontalY - verticalExtent, bracketStartX, horizontalY + verticalExtent);

            // Draw right vertical end cap (extending both UP and DOWN from horizontal)
            pageDoc.line(bracketEndX, horizontalY - verticalExtent, bracketEndX, horizontalY + verticalExtent);

            // Draw section label centered ABOVE the bracket
            const label = getSectionAbbreviation(section, currentSong.sections);
            pageDoc.setFontSize(7);
            pageDoc.setFont("helvetica", "normal");
            pageDoc.setTextColor(0, 0, 0);
            pageDoc.text(label, currentX + sectionWidth / 2, labelY, { align: 'center' });

            currentX += sectionWidth;
        });
    };

    // Add timeline footer to all pages
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        drawTimelineFooter(doc);
    }

    // === NOTES & LYRICS ADDENDUM ===
    // Check if there are any notes or lyrics to include
    const hasNotes = currentSong.notes && currentSong.notes.trim().length > 0;
    const sectionsWithLyrics = currentSong.sections.filter(s => s.lyrics && s.lyrics.trim().length > 0);
    const hasLyrics = sectionsWithLyrics.length > 0;

    if (hasNotes || hasLyrics) {
        // Start a new page for the addendum
        doc.addPage();
        let addendumY = 20;

        // Helper function to render text with inline chord notation
        const renderFormattedText = (text: string, startY: number): number => {
            let currentY = startY;
            const lineHeight = 5;
            const lines = text.split('\n');

            lines.forEach(line => {
                // Check if we need a new page
                if (currentY > 260) {
                    doc.addPage();
                    currentY = 20;
                    drawTimelineFooter(doc);
                }

                // Handle headers
                if (line.startsWith('# ')) {
                    doc.setFontSize(14);
                    doc.setFont("helvetica", "bold");
                    doc.setTextColor(0, 0, 0);
                    doc.text(line.slice(2), leftMargin, currentY);
                    currentY += lineHeight + 3;
                    return;
                } else if (line.startsWith('## ')) {
                    doc.setFontSize(12);
                    doc.setFont("helvetica", "bold");
                    doc.setTextColor(0, 0, 0);
                    doc.text(line.slice(3), leftMargin, currentY);
                    currentY += lineHeight + 2;
                    return;
                }

                // Parse inline chords and text
                // Matches: [Chord], **Bold**, *Italic*
                const parts = line.split(/(\[[^\]]+\]|\*\*[^*]+\*\*|\*[^*]+\*)/g);
                let currentX = leftMargin;

                doc.setFontSize(10);
                doc.setFont("helvetica", "normal");
                doc.setTextColor(0, 0, 0);

                parts.forEach(part => {
                    if (!part) return;

                    if (part.startsWith('[') && part.endsWith(']')) {
                        // Chord notation - render in bold with brackets
                        const chordText = part.slice(1, -1);
                        doc.setFont("helvetica", "bold");
                        doc.setTextColor(80, 80, 80);
                        const chordWidth = doc.getTextWidth(`[${chordText}]`);
                        doc.text(`[${chordText}]`, currentX, currentY);
                        currentX += chordWidth + 1;
                        doc.setFont("helvetica", "normal");
                        doc.setTextColor(0, 0, 0);
                    } else if (part.startsWith('**') && part.endsWith('**')) {
                        // Bold text
                        const boldText = part.slice(2, -2);
                        doc.setFont("helvetica", "bold");
                        const boldWidth = doc.getTextWidth(boldText);
                        doc.text(boldText, currentX, currentY);
                        currentX += boldWidth;
                        doc.setFont("helvetica", "normal");
                    } else if (part.startsWith('*') && part.endsWith('*')) {
                        // Italic text
                        const italicText = part.slice(1, -1);
                        doc.setFont("helvetica", "italic");
                        const italicWidth = doc.getTextWidth(italicText);
                        doc.text(italicText, currentX, currentY);
                        currentX += italicWidth;
                        doc.setFont("helvetica", "normal");
                    } else {
                        // Regular text - handle word wrapping
                        const textWidth = doc.getTextWidth(part);
                        if (currentX + textWidth > pageWidth - leftMargin) {
                            // Wrap to next line
                            currentY += lineHeight;
                            currentX = leftMargin;
                            if (currentY > 260) {
                                doc.addPage();
                                currentY = 20;
                                drawTimelineFooter(doc);
                            }
                        }
                        doc.text(part, currentX, currentY);
                        currentX += textWidth;
                    }
                });

                currentY += lineHeight;
            });

            return currentY;
        };

        // Addendum header
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text("Notes & Lyrics", leftMargin, addendumY);
        addendumY += 12;

        // Horizontal line
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.3);
        doc.line(leftMargin, addendumY - 4, pageWidth - leftMargin, addendumY - 4);

        // Song Notes section
        if (hasNotes) {
            addendumY += 6; // Extra spacing above Notes heading
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(120, 120, 120);
            doc.text("Notes:", leftMargin, addendumY);
            addendumY += 6;

            addendumY = renderFormattedText(currentSong.notes, addendumY);
            addendumY += 8; // Extra space after notes
        }

        // Section Lyrics
        if (hasLyrics) {
            // Check if we need a new page for lyrics section header
            if (addendumY > 250) {
                doc.addPage();
                addendumY = 20;
            }

            if (hasNotes) {
                // Add a separator line if we had notes above
                doc.setDrawColor(180, 180, 180);
                doc.setLineWidth(0.2);
                doc.line(leftMargin, addendumY - 2, pageWidth - leftMargin, addendumY - 2);
                addendumY += 6;
            }

            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(60, 60, 60);
            doc.text("Lyrics", leftMargin, addendumY);
            addendumY += 10;

            sectionsWithLyrics.forEach((section, idx) => {
                // Check if we need a new page
                if (addendumY > 250) {
                    doc.addPage();
                    addendumY = 20;
                }

                // Section name
                const sectionName = getSectionDisplayName(section, currentSong.sections);
                doc.setFontSize(11);
                doc.setFont("helvetica", "bold");
                doc.setTextColor(0, 0, 0);
                doc.text(`[${sectionName}]`, leftMargin, addendumY);
                addendumY += 6;

                // Section lyrics
                addendumY = renderFormattedText(section.lyrics!, addendumY);

                // Add space between sections
                if (idx < sectionsWithLyrics.length - 1) {
                    addendumY += 6;
                }
            });
        }

        // Add timeline footer to any new pages created by the addendum
        const newTotalPages = doc.getNumberOfPages();
        for (let i = totalPages + 1; i <= newTotalPages; i++) {
            doc.setPage(i);
            drawTimelineFooter(doc);
        }
    }

    return doc;
};
