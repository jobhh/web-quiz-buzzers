// Procedurally-generated SFX using the Web Audio API. Used as a fallback
// when an MP3 file is missing from /public/audio/sfx/. Sounds reasonable
// out-of-the-box without requiring the host to download and curate samples.
//
// All sounds are synthesized from oscillators + gain envelopes. They're
// deliberately short (<500ms) and low-CPU.

import type { SfxName } from "./audio-manager";

let cachedCtx: AudioContext | null = null;

function ctx(): AudioContext | null {
  if (cachedCtx) return cachedCtx;
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Ctor = (window.AudioContext ?? (window as any).webkitAudioContext) as typeof AudioContext | undefined;
  if (!Ctor) return null;
  cachedCtx = new Ctor();
  return cachedCtx;
}

// Plays one of the named SFX procedurally. Returns true if the sound was
// played, false if Web Audio is unavailable.
export function playSynthesizedSfx(name: SfxName, volume: number): boolean {
  const ac = ctx();
  if (!ac) return false;
  // Some browsers suspend the context until a user gesture; trying to resume
  // is harmless in any case.
  if (ac.state === "suspended") void ac.resume();
  const v = Math.max(0, Math.min(1, volume));
  switch (name) {
    case "honk":
      return playHonk(ac, v);
    case "ding":
      return playDing(ac, v);
    case "swoosh":
      return playSwoosh(ac, v);
    case "drumroll":
      return playDrumroll(ac, v);
    case "tick":
      return playTick(ac, v);
    case "claim":
      return playClaim(ac, v);
    case "buzzerPress":
      return playBuzzerPress(ac, v);
  }
}

// === individual sounds ====================================================

// Wrong-answer "honk": square wave at low freq, brief downward pitch sweep.
function playHonk(ac: AudioContext, vol: number): boolean {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(220, ac.currentTime);
  osc.frequency.exponentialRampToValueAtTime(110, ac.currentTime + 0.35);
  gain.gain.setValueAtTime(0.0001, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.4 * vol, ac.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.4);
  osc.connect(gain).connect(ac.destination);
  osc.start();
  osc.stop(ac.currentTime + 0.42);
  return true;
}

// Correct-answer "ding": high sine, exponential decay, slight FM via second osc.
function playDing(ac: AudioContext, vol: number): boolean {
  const t = ac.currentTime;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(1320, t);
  osc.frequency.exponentialRampToValueAtTime(1760, t + 0.05);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.5 * vol, t + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
  osc.connect(gain).connect(ac.destination);
  osc.start();
  osc.stop(t + 0.5);
  return true;
}

// Swoosh transition: filtered white noise with rapid low-pass sweep.
function playSwoosh(ac: AudioContext, vol: number): boolean {
  const t = ac.currentTime;
  const buffer = ac.createBuffer(1, ac.sampleRate * 0.3, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const filter = ac.createBiquadFilter();
  filter.type = "bandpass";
  filter.Q.value = 1.5;
  filter.frequency.setValueAtTime(200, t);
  filter.frequency.exponentialRampToValueAtTime(4000, t + 0.25);
  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.5 * vol, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
  src.connect(filter).connect(gain).connect(ac.destination);
  src.start();
  src.stop(t + 0.32);
  return true;
}

// Drumroll: short pink-ish noise burst, swelling then cutting.
function playDrumroll(ac: AudioContext, vol: number): boolean {
  const t = ac.currentTime;
  const buffer = ac.createBuffer(1, ac.sampleRate * 0.6, ac.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    // Cheap pinkish: low-pass-ish smoothed noise.
    const w = Math.random() * 2 - 1;
    last = (last + 0.02 * w) / 1.02;
    data[i] = last * 8;
  }
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.linearRampToValueAtTime(0.6 * vol, t + 0.4);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
  src.connect(gain).connect(ac.destination);
  src.start();
  src.stop(t + 0.62);
  return true;
}

// Tick: very short high blip.
function playTick(ac: AudioContext, vol: number): boolean {
  const t = ac.currentTime;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = "triangle";
  osc.frequency.value = 2400;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.4 * vol, t + 0.002);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
  osc.connect(gain).connect(ac.destination);
  osc.start();
  osc.stop(t + 0.08);
  return true;
}

// Claim: cheerful 2-note rising blip.
function playClaim(ac: AudioContext, vol: number): boolean {
  const t = ac.currentTime;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(660, t);
  osc.frequency.setValueAtTime(990, t + 0.08);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.35 * vol, t + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
  osc.connect(gain).connect(ac.destination);
  osc.start();
  osc.stop(t + 0.2);
  return true;
}

// Arcade-style button press: brief square + pitch drop.
function playBuzzerPress(ac: AudioContext, vol: number): boolean {
  const t = ac.currentTime;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(550, t);
  osc.frequency.exponentialRampToValueAtTime(330, t + 0.08);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.35 * vol, t + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
  osc.connect(gain).connect(ac.destination);
  osc.start();
  osc.stop(t + 0.14);
  return true;
}
