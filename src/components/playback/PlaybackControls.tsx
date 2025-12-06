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
        } else {
            setIsPlaying(false);
        }
    };

    return (
        <div className="h-14 bg-bg-elevated border-t border-border-subtle flex items-center justify-between px-6">
            {/* Transport */}
            <div className="flex items-center gap-2">
                <button className="p-1.5 text-text-secondary hover:text-text-primary transition-colors">
                    <SkipBack size={16} />
                </button>
                <button
                    onClick={handlePlayPause}
                    className="w-9 h-9 rounded-full bg-accent-primary hover:bg-indigo-500 flex items-center justify-center text-white shadow-lg transition-all hover:scale-105 active:scale-95"
                >
                    {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
                </button>
                <button className="p-1.5 text-text-secondary hover:text-text-primary transition-colors">
                    <SkipForward size={16} />
                </button>
                <button className="p-1.5 text-text-secondary hover:text-text-primary transition-colors ml-1">
                    <Repeat size={14} />
                </button>
            </div>

            {/* Tempo & Info */}
            <div className="flex flex-col items-center">
                <div className="text-xs font-medium text-text-primary">
                    {currentSong.title}
                </div>
                <div className="flex items-center gap-3 text-[10px] text-text-muted">
                    <div className="flex items-center gap-1.5">
                        <span>Tempo</span>
                        <input
                            type="number"
                            value={tempo}
                            onChange={(e) => setTempo(Number(e.target.value))}
                            className="w-10 bg-bg-tertiary border border-border-subtle rounded px-1 py-0.5 text-center text-text-primary text-[10px]"
                        />
                        <span>BPM</span>
                    </div>
                    <span className="text-text-muted">•</span>
                    <span>4/4</span>
                </div>
            </div>

            {/* Volume */}
            <div className="flex items-center gap-2 w-32">
                <Volume2 size={14} className="text-text-secondary" />
                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volume}
                    onChange={(e) => setVolume(Number(e.target.value))}
                    className="w-full h-1 bg-bg-tertiary rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:bg-accent-primary [&::-webkit-slider-thumb]:rounded-full"
                />
            </div>
        </div>
    );
};
