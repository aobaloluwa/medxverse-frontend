"use client";

/**
 * Native Web Audio API Emergency Beeper & Siren Synthesizer.
 * Generates realistic emergency audio alerts directly in browser without external mp3 dependencies.
 */

let audioCtx: AudioContext | null = null;
let activeOscillator: OscillatorNode | null = null;
let activeGain: GainNode | null = null;
let sirenInterval: number | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    void audioCtx.resume();
  }
  return audioCtx;
}

export function stopEmergencyAudio() {
  if (sirenInterval) {
    window.clearInterval(sirenInterval);
    sirenInterval = null;
  }
  if (activeGain && audioCtx) {
    try {
      activeGain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.1);
    } catch {
      // ignore
    }
  }
  setTimeout(() => {
    if (activeOscillator) {
      try {
        activeOscillator.stop();
        activeOscillator.disconnect();
      } catch {
        // ignore
      }
      activeOscillator = null;
    }
    if (activeGain) {
      try {
        activeGain.disconnect();
      } catch {
        // ignore
      }
      activeGain = null;
    }
  }, 120);
}

export function playEmergencyBeeper(
  type: "SOS_ALERT" | "DISPATCH_BEEP" | "SIREN" | "ON_SCENE",
  durationSeconds = 2.5
) {
  const ctx = getAudioContext();
  if (!ctx) return;

  stopEmergencyAudio();

  const now = ctx.currentTime;
  const gain = ctx.createGain();
  const osc = ctx.createOscillator();

  activeGain = gain;
  activeOscillator = osc;

  gain.connect(ctx.destination);

  if (type === "SOS_ALERT") {
    // High-pitched pulsing emergency alert (1200Hz / 1600Hz)
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.setValueAtTime(1600, now + 0.15);
    osc.frequency.setValueAtTime(1200, now + 0.3);
    osc.frequency.setValueAtTime(1600, now + 0.45);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + Math.min(durationSeconds, 3));

    osc.connect(gain);
    osc.start(now);
    osc.stop(now + Math.min(durationSeconds, 3));
  } else if (type === "DISPATCH_BEEP") {
    // 2-tone confirmation chime (880Hz -> 1175Hz)
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.setValueAtTime(1174.66, now + 0.15);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    osc.connect(gain);
    osc.start(now);
    osc.stop(now + 0.6);
  } else if (type === "ON_SCENE") {
    // Triple pulse arrival beep
    osc.type = "triangle";
    osc.frequency.setValueAtTime(950, now);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.setValueAtTime(0.01, now + 0.1);
    gain.gain.setValueAtTime(0.25, now + 0.2);
    gain.gain.setValueAtTime(0.01, now + 0.3);
    gain.gain.setValueAtTime(0.25, now + 0.4);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

    osc.connect(gain);
    osc.start(now);
    osc.stop(now + 0.8);
  } else if (type === "SIREN") {
    // Oscillating dual-tone ambulance siren (750Hz <-> 950Hz)
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(750, now);

    gain.gain.setValueAtTime(0.15, now);

    osc.connect(gain);
    osc.start(now);

    let high = false;
    sirenInterval = window.setInterval(() => {
      if (!audioCtx || !activeOscillator) return;
      const t = audioCtx.currentTime;
      high = !high;
      activeOscillator.frequency.setTargetAtTime(high ? 950 : 750, t, 0.15);
    }, 450);

    setTimeout(() => {
      stopEmergencyAudio();
    }, durationSeconds * 1000);
  }
}
