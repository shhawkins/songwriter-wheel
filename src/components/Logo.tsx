import React from 'react';

interface LogoProps {
    className?: string;
    size?: number;
}

export const Logo: React.FC<LogoProps> = ({ className = '', size = 24 }) => {
    return (
        <div className={`relative flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
            <svg viewBox="0 0 100 100" className="w-full h-full">
                {/* Generate 12 wedge segments */}
                {[...Array(12)].map((_, i) => {
                    const angle = i * 30;
                    const startAngle = (angle - 15 - 90) * Math.PI / 180;
                    const endAngle = (angle + 15 - 90) * Math.PI / 180;
                    const innerR = 20;
                    const outerR = 48;

                    // Check if this is in the "highlighted" key area (top 7 segments: positions 10, 11, 0, 1, 2, 3, 4)
                    const isHighlighted = i <= 4 || i >= 10;

                    // Color scheme matching the real wheel
                    let fillColor;
                    if (!isHighlighted) {
                        // Muted background colors for non-key segments
                        const mutedColors = [
                            'rgba(100, 80, 120, 0.5)',  // muted purple
                            'rgba(80, 70, 90, 0.5)',    // dark purple
                            'rgba(60, 55, 70, 0.5)',    // darker
                        ];
                        fillColor = mutedColors[i % 3];
                    } else {
                        // Bright colors for key segments
                        if (i === 0) fillColor = 'rgba(234, 179, 8, 0.95)';      // I - bright yellow
                        else if (i === 1) fillColor = 'rgba(163, 190, 60, 0.9)'; // V - yellow-green  
                        else if (i === 2) fillColor = 'rgba(132, 204, 22, 0.85)';  // ii - lime
                        else if (i === 3) fillColor = 'rgba(74, 222, 128, 0.75)';  // vi - green
                        else if (i === 4) fillColor = 'rgba(45, 212, 191, 0.65)';  // iii - teal
                        else if (i === 11) fillColor = 'rgba(251, 146, 60, 0.9)'; // IV - orange
                        else if (i === 10) fillColor = 'rgba(168, 162, 158, 0.65)'; // vii° - gray/brown
                        else fillColor = 'rgba(200, 180, 100, 0.7)';
                    }

                    const x1 = 50 + innerR * Math.cos(startAngle);
                    const y1 = 50 + innerR * Math.sin(startAngle);
                    const x2 = 50 + outerR * Math.cos(startAngle);
                    const y2 = 50 + outerR * Math.sin(startAngle);
                    const x3 = 50 + outerR * Math.cos(endAngle);
                    const y3 = 50 + outerR * Math.sin(endAngle);
                    const x4 = 50 + innerR * Math.cos(endAngle);
                    const y4 = 50 + innerR * Math.sin(endAngle);

                    return (
                        <path
                            key={i}
                            d={`M ${x1} ${y1} L ${x2} ${y2} A ${outerR} ${outerR} 0 0 1 ${x3} ${y3} L ${x4} ${y4} A ${innerR} ${innerR} 0 0 0 ${x1} ${y1}`}
                            fill={fillColor}
                            stroke="rgba(0, 0, 0, 0.3)"
                            strokeWidth="0.5"
                        />
                    );
                })}

                {/* Dark center circle */}
                <circle cx="50" cy="50" r="18" fill="rgba(20, 20, 30, 0.95)" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="1" />
            </svg>
        </div>
    );
};
