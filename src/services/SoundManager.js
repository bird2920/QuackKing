/**
 * SoundManager - Fail-safe audio management system
 * 
 * All methods are designed to fail gracefully and never throw exceptions.
 * Errors are logged but do not interrupt application flow.
 */

class SoundManager {
    constructor() {
        this.sounds = new Map();
        this.audioContext = null;
        this.masterGain = null;
        this.isMuted = false;
        this.volume = 0.5; // Default 50%
        this.initialized = false;

        // Load settings from localStorage
        this.loadSettings();
    }

    /**
     * Initialize Web Audio API context (lazy initialization)
     */
    async initialize() {
        if (this.initialized) return;

        try {
            // Modern browsers require user interaction before creating AudioContext
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextClass) {
                console.warn('🔇 Web Audio API not supported, sounds disabled');
                return;
            }

            this.audioContext = new AudioContextClass();
            this.masterGain = this.audioContext.createGain();
            this.masterGain.connect(this.audioContext.destination);
            this.masterGain.gain.value = this.isMuted ? 0 : this.volume;

            this.initialized = true;
            console.log('🔊 SoundManager initialized');
        } catch (err) {
            console.warn('🔇 Failed to initialize audio context:', err.message);
        }
    }

    /**
     * Load volume/mute settings from localStorage
     */
    loadSettings() {
        try {
            const settings = localStorage.getItem('quackking:soundSettings');
            if (settings) {
                const parsed = JSON.parse(settings);
                this.volume = parsed.volume ?? 0.5;
                this.isMuted = parsed.isMuted ?? false;
            }
        } catch (err) {
            console.warn('Failed to load sound settings:', err.message);
        }
    }

    /**
     * Save settings to localStorage
     */
    saveSettings() {
        try {
            localStorage.setItem('quackking:soundSettings', JSON.stringify({
                volume: this.volume,
                isMuted: this.isMuted,
            }));
        } catch (err) {
            console.warn('Failed to save sound settings:', err.message);
        }
    }

    /**
     * Generate a procedural beep tone
     */
    generateBeep(frequency = 440, duration = 0.2, type = 'sine') {
        if (!this.audioContext || !this.initialized) return null;

        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.masterGain);

            oscillator.frequency.value = frequency;
            oscillator.type = type;

            // Envelope: fade in and out to avoid clicks
            const now = this.audioContext.currentTime;
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.3, now + 0.01);
            gainNode.gain.linearRampToValueAtTime(0.3, now + duration - 0.01);
            gainNode.gain.linearRampToValueAtTime(0, now + duration);

            oscillator.start(now);
            oscillator.stop(now + duration);

            return oscillator;
        } catch (err) {
            console.warn('Failed to generate beep:', err.message);
            return null;
        }
    }

    /**
     * Generate a multi-tone chord
     */
    generateChord(frequencies = [262, 330, 392], duration = 0.5) {
        if (!this.audioContext || !this.initialized) return;

        try {
            frequencies.forEach((freq, index) => {
                setTimeout(() => {
                    this.generateBeep(freq, duration, 'sine');
                }, index * 50); // Slight delay for cascading effect
            });
        } catch (err) {
            console.warn('Failed to generate chord:', err.message);
        }
    }

    /**
     * Play a predefined sound effect
     */
    async play(soundKey, options = {}) {
        try {
            // Initialize on first play (requires user interaction)
            if (!this.initialized) {
                await this.initialize();
            }

            if (!this.audioContext || !this.initialized) {
                return; // Silent fail
            }

            // Resume context if suspended (browser autoplay policy)
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }

            // Play predefined sounds
            switch (soundKey) {
                case 'timer-10s':
                    this.generateBeep(800, 0.15, 'sine');
                    break;

                case 'timer-5s':
                    this.generateBeep(1000, 0.2, 'square');
                    break;

                case 'timer-end':
                    // Two-tone buzzer
                    this.generateBeep(400, 0.3, 'sawtooth');
                    setTimeout(() => this.generateBeep(350, 0.4, 'sawtooth'), 100);
                    break;

                case 'player-answer':
                    this.generateBeep(600, 0.1, 'sine');
                    break;

                case 'all-answered':
                    this.generateChord([523, 659, 784], 0.3); // C major chord
                    break;

                case 'reveal':
                    // Whoosh effect
                    this.generateSweep(200, 800, 0.4);
                    break;

                case 'correct':
                    this.generateChord([523, 659, 784, 1047], 0.4); // C major arpeggio
                    break;

                case 'results':
                    this.generateFanfare();
                    break;

                case 'winner':
                    this.generateVictory();
                    break;

                case 'countdown':
                    this.generateBeep(700, 0.15, 'sine');
                    break;

                default:
                    console.warn(`Unknown sound key: ${soundKey}`);
            }
        } catch (err) {
            // Silent fail - log but don't throw
            console.warn(`🔇 Failed to play sound "${soundKey}":`, err.message);
        }
    }

    /**
     * Generate frequency sweep effect
     */
    generateSweep(startFreq, endFreq, duration) {
        if (!this.audioContext || !this.initialized) return;

        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.masterGain);

            const now = this.audioContext.currentTime;

            oscillator.frequency.setValueAtTime(startFreq, now);
            oscillator.frequency.exponentialRampToValueAtTime(endFreq, now + duration);

            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.2, now + 0.01);
            gainNode.gain.linearRampToValueAtTime(0, now + duration);

            oscillator.start(now);
            oscillator.stop(now + duration);
        } catch (err) {
            console.warn('Failed to generate sweep:', err.message);
        }
    }

    /**
     * Generate fanfare for results screen
     */
    generateFanfare() {
        if (!this.audioContext || !this.initialized) return;

        try {
            const notes = [
                { freq: 523, time: 0, duration: 0.2 },    // C
                { freq: 659, time: 0.2, duration: 0.2 },  // E
                { freq: 784, time: 0.4, duration: 0.2 },  // G
                { freq: 1047, time: 0.6, duration: 0.5 }, // C high
            ];

            notes.forEach(note => {
                setTimeout(() => {
                    this.generateBeep(note.freq, note.duration, 'triangle');
                }, note.time * 1000);
            });
        } catch (err) {
            console.warn('Failed to generate fanfare:', err.message);
        }
    }

    /**
     * Generate victory sound for winner
     */
    generateVictory() {
        if (!this.audioContext || !this.initialized) return;

        try {
            const melody = [
                { freq: 523, time: 0, duration: 0.15 },
                { freq: 659, time: 0.15, duration: 0.15 },
                { freq: 784, time: 0.3, duration: 0.15 },
                { freq: 1047, time: 0.45, duration: 0.15 },
                { freq: 1319, time: 0.6, duration: 0.4 },
            ];

            melody.forEach(note => {
                setTimeout(() => {
                    this.generateBeep(note.freq, note.duration, 'sine');
                }, note.time * 1000);
            });
        } catch (err) {
            console.warn('Failed to generate victory:', err.message);
        }
    }

    /**
     * Set master volume (0-1)
     */
    setVolume(level) {
        try {
            this.volume = Math.max(0, Math.min(1, level));
            if (this.masterGain && !this.isMuted) {
                this.masterGain.gain.value = this.volume;
            }
            this.saveSettings();
        } catch (err) {
            console.warn('Failed to set volume:', err.message);
        }
    }

    /**
     * Toggle mute
     */
    setMute(muted) {
        try {
            this.isMuted = muted;
            if (this.masterGain) {
                this.masterGain.gain.value = muted ? 0 : this.volume;
            }
            this.saveSettings();
        } catch (err) {
            console.warn('Failed to set mute:', err.message);
        }
    }

    /**
     * Get current volume
     */
    getVolume() {
        return this.volume;
    }

    /**
     * Get mute state
     */
    isMutedState() {
        return this.isMuted;
    }
}

// Singleton instance
const soundManager = new SoundManager();

export default soundManager;
