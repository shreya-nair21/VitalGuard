// Web Audio API Synthesizer for Clinical Telemetry Alerts
// Zero external media files needed; synthesizes authentic medical telemetry tones.

let audioCtx: AudioContext | null = null;
const playedAssignmentSet = new Set<string>();

const getAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtxClass) {
      audioCtx = new AudioCtxClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
};

// Global unlock listener for browser autoplay policy
if (typeof window !== 'undefined') {
  const unlock = () => {
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });
}

export const isAudioEnabled = (): boolean => {
  if (typeof window === 'undefined') return false;
  const saved = localStorage.getItem('vitalguard_audio_alerts');
  return saved === null ? true : saved === 'true';
};

export const setAudioEnabled = (enabled: boolean): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('vitalguard_audio_alerts', enabled ? 'true' : 'false');
  window.dispatchEvent(new CustomEvent('vitalguard-audio-toggle', { detail: { enabled } }));
  if (enabled) {
    getAudioContext();
  }
};

/**
 * Play standard clinical emergency dispatch chime (two-tone melodic hospital telemetry)
 * Tone 1: 880Hz (A5) -> Tone 2: 1046.5Hz (C6)
 */
export const playEmergencyChime = (): void => {
  if (!isAudioEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    // Tone 1: 880 Hz
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now);
    gain1.gain.setValueAtTime(0.001, now);
    gain1.gain.exponentialRampToValueAtTime(0.25, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.15);

    // Tone 2: 1046.5 Hz (starts slightly before tone 1 ends for smooth legato)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1046.5, now + 0.12);
    gain2.gain.setValueAtTime(0.001, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.35, now + 0.14);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.36);
  } catch (err) {
    console.warn('Audio chime playback inhibited:', err);
  }
};

/**
 * Play high-priority escalation alarm (three-tone urgent clinical siren)
 * 988 Hz -> 1319 Hz -> 1568 Hz
 */
export const playEscalationAlert = (): void => {
  if (!isAudioEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const tones = [
      { freq: 987.77, start: 0, duration: 0.10 },
      { freq: 1318.51, start: 0.10, duration: 0.10 },
      { freq: 1567.98, start: 0.20, duration: 0.22 }
    ];

    tones.forEach(({ freq, start, duration }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle'; // Crisp, attention-grabbing medical timbre
      osc.frequency.setValueAtTime(freq, now + start);
      gain.gain.setValueAtTime(0.001, now + start);
      gain.gain.exponentialRampToValueAtTime(0.35, now + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + start);
      osc.stop(now + start + duration + 0.02);
    });
  } catch (err) {
    console.warn('Escalation alert playback inhibited:', err);
  }
};

/**
 * Ensures an audio chime is only sounded ONCE per unique assignment event,
 * preventing continuous sound during polling cycles.
 */
export const shouldChimeForAssignment = (assignmentId: number, status: string): boolean => {
  const key = `${assignmentId}:${status}`;
  if (playedAssignmentSet.has(key)) {
    return false;
  }
  playedAssignmentSet.add(key);
  // Keep set memory bounded
  if (playedAssignmentSet.size > 100) {
    const firstKey = playedAssignmentSet.values().next().value;
    if (firstKey) playedAssignmentSet.delete(firstKey);
  }
  return true;
};
