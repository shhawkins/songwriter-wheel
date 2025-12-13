import React from 'react';

interface LogoProps {
    className?: string;
    size?: number;
}

export const Logo: React.FC<LogoProps> = ({ className = '', size = 24 }) => {
    return (
        <div className={`relative flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
            <svg
                viewBox="0 0 24 24"
                fill="none"
                strokeWidth="2.5" // Slightly thicker for better color visibility
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-full h-full overflow-visible"
                xmlns="http://www.w3.org/2000/svg"
            >
                <defs>
                    <linearGradient id="rainbow-style" x1="0%" y1="100%" x2="100%" y2="0%">
                        {/* Chromatic Rainbow from bottom-left to top-right */}
                        <stop offset="0%" stopColor="hsl(0, 90%, 65%)" />    {/* Red */}
                        <stop offset="20%" stopColor="hsl(35, 95%, 60%)" />   {/* Orange */}
                        <stop offset="40%" stopColor="hsl(55, 95%, 55%)" />   {/* Yellow */}
                        <stop offset="60%" stopColor="hsl(140, 90%, 50%)" />  {/* Green */}
                        <stop offset="80%" stopColor="hsl(210, 90%, 55%)" />  {/* Blue */}
                        <stop offset="100%" stopColor="hsl(280, 85%, 60%)" /> {/* Purple */}
                    </linearGradient>
                </defs>

                {/* Double Eighth Notes (similar to standard Music icon structure) */}
                {/* Note Heads (Filled for impact) */}
                <circle cx="6" cy="18" r="3.5" fill="url(#rainbow-style)" stroke="none" />
                <circle cx="18" cy="16" r="3.5" fill="url(#rainbow-style)" stroke="none" />

                {/* Stems and Beam (Stroked) */}
                <path
                    d="M9 18 V5 L21 3 V16"
                    stroke="url(#rainbow-style)"
                    fill="none"
                />
            </svg>
        </div>
    );
};
