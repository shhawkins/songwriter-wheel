import { useSongStore } from '../../store/useSongStore';
import { Play, Pause, SkipBack, SkipForward, Repeat, Volume2 } from 'lucide-react';
import { initAudio } from '../../utils/audioEngine';

export const PlaybackControls: React.FC = () => {
    const {
        isPlaying,
        tempo,
        volume,
        setIsPlaying,
        setTempo,
        setVolume,
        currentSong
    } = useSongStore();

    const handlePlayPause = async () => {
        if (!isPlaying) {
            await initAudio();
            setIsPlaying(true);
            // Actual playback loop logic would go here or in a useEffect in the main layout
            // For now we just toggle state
        } else {
            setIsPlaying(false);
        }
    };

    return (
        <div className="h-20 bg-bg-elevated border-t border-border-subtle flex items-center justify-between px-8">
            {/* Transport */}
            <div className="flex items-center gap-4">
                <button className="p-2 text-text-secondary hover:text-text-primary transition-colors">
                    <SkipBack size={20} />
                </button>
                <button
                    onClick={handlePlayPause}
                    className="w-12 h-12 rounded-full bg-accent-primary hover:bg-indigo-500 flex items-center justify-center text-white shadow-lg transition-all hover:scale-105 active:scale-95"
                >
                    {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
                </button>
                <button className="p-2 text-text-secondary hover:text-text-primary transition-colors">
                    <SkipForward size={20} />
                </button>
                <button className="p-2 text-text-secondary hover:text-text-primary transition-colors ml-2">
                    <Repeat size={18} />
                </button>
            </div>

            {/* Tempo & Info */}
            <div className="flex flex-col items-center">
                <div className="text-sm font-bold text-text-primary mb-1">
                    {currentSong.title}
                </div>
                <div className="flex items-center gap-4 text-xs text-text-muted">
                    <div className="flex items-center gap-2">
                        <span>Tempo</span>
                        <input
                            type="number"
                            value={tempo}
                            onChange={(e) => setTempo(Number(e.target.value))}
                            className="w-12 bg-bg-tertiary border border-border-subtle rounded px-1 py-0.5 text-center text-text-primary"
                        />
                        <span>BPM</span>
                    </div>
                    <span>|</span>
                    <span>4/4</span>
                </div>
            </div>

            {/* Volume */}
            <div className="flex items-center gap-3 w-48">
                <Volume2 size={18} className="text-text-secondary" />
                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volume}
                    onChange={(e) => setVolume(Number(e.target.value))}
                    className="w-full h-1 bg-bg-tertiary rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-accent-primary [&::-webkit-slider-thumb]:rounded-full"
                />
            </div>
        </div>
    );
};
