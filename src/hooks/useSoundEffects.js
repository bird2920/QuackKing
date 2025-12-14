import { useEffect, useRef, useState } from 'react';
import soundManager from '../services/SoundManager';

/**
 * React hook for integrating sound effects into components
 * Provides fail-safe sound playback with volume/mute controls
 */
export function useSoundEffects() {
    const [volume, setVolumeState] = useState(soundManager.getVolume());
    const [isMuted, setIsMutedState] = useState(soundManager.isMutedState());
    const initRef = useRef(false);

    // Initialize sound manager on mount (requires user interaction)
    useEffect(() => {
        if (!initRef.current) {
            initRef.current = true;
            // Initialize lazily on first interaction
            soundManager.initialize().catch(err => {
                console.warn('Sound initialization failed:', err.message);
            });
        }
    }, []);

    /**
     * Play a sound effect
     */
    const playSound = (soundKey, options = {}) => {
        soundManager.play(soundKey, options).catch(err => {
            // Silent fail - already handled in SoundManager
            console.debug('Sound play failed:', err.message);
        });
    };

    /**
     * Set master volume
     */
    const setVolume = (level) => {
        soundManager.setVolume(level);
        setVolumeState(level);
    };

    /**
     * Toggle mute
     */
    const setMute = (muted) => {
        soundManager.setMute(muted);
        setIsMutedState(muted);
    };

    /**
     * Toggle mute on/off
     */
    const toggleMute = () => {
        const newMuted = !isMuted;
        setMute(newMuted);
    };

    return {
        playSound,
        volume,
        setVolume,
        isMuted,
        setMute,
        toggleMute,
    };
}
