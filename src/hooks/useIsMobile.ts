import { useState, useEffect } from 'react';

const MOBILE_BREAKPOINT = 768;

/**
 * Custom hook to detect mobile viewport
 * For components that only need to know if it's mobile
 */
export function useIsMobile() {
    const [isMobile, setIsMobile] = useState(
        () => typeof window !== 'undefined' ? window.innerWidth < MOBILE_BREAKPOINT : false
    );

    useEffect(() => {
        const updateMobile = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
        window.addEventListener('resize', updateMobile);
        window.addEventListener('orientationchange', updateMobile);
        return () => {
            window.removeEventListener('resize', updateMobile);
            window.removeEventListener('orientationchange', updateMobile);
        };
    }, []);

    return isMobile;
}

/**
 * Hook that returns both isMobile and isLandscape
 * Uses height-based detection for landscape since modern phones can have width > 768 in landscape
 */
export function useMobileLayout() {
    const [isMobile, setIsMobile] = useState(
        () => typeof window !== 'undefined'
            ? window.innerWidth < MOBILE_BREAKPOINT || (window.innerHeight < 500 && window.innerHeight < window.innerWidth)
            : false
    );
    const [isLandscape, setIsLandscape] = useState(
        () => typeof window !== 'undefined'
            ? window.innerHeight < window.innerWidth && window.innerHeight < 500
            : false
    );

    useEffect(() => {
        const updateLayout = () => {
            const width = window.innerWidth;
            const height = window.innerHeight;
            // Mobile: traditional width check OR landscape phone (height < 500 means phone in landscape)
            const mobile = width < MOBILE_BREAKPOINT || (height < 500 && height < width);
            // Landscape: height < width AND height indicates phone (< 500px)
            const landscape = height < width && height < 500;
            setIsMobile(mobile);
            setIsLandscape(landscape);
        };
        window.addEventListener('resize', updateLayout);
        window.addEventListener('orientationchange', updateLayout);
        return () => {
            window.removeEventListener('resize', updateLayout);
            window.removeEventListener('orientationchange', updateLayout);
        };
    }, []);

    return { isMobile, isLandscape };
}
