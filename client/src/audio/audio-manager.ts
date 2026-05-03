import { Howl, Howler } from "howler";

export type MusicTrack = "lobby" | "gameplay" | "tension" | "win";
export type SfxName =
  | "honk"
  | "ding"
  | "swoosh"
  | "drumroll"
  | "tick"
  | "claim"
  | "buzzerPress";

interface MusicEntry {
  src: string;
  loop: boolean;
  source: string;
}
interface SfxEntry {
  src: string;
  source: string;
}
interface Manifest {
  music: Record<MusicTrack, MusicEntry>;
  sfx: Record<SfxName, SfxEntry>;
}

// Singleton AudioManager. Resilient to missing files (logs warning, no-ops).
// Designed to be unlock()ed on first user gesture to satisfy autoplay policies.
class AudioManager {
  private manifest: Manifest | null = null;
  private musicHowls = new Map<MusicTrack, Howl>();
  private sfxHowls = new Map<SfxName, Howl>();
  private currentMusic: { track: MusicTrack; howl: Howl; id: number } | null = null;
  private musicVolume = 0.6;
  private sfxVolume = 0.9;
  private unlocked = false;

  async load(): Promise<void> {
    if (this.manifest) return;
    try {
      const res = await fetch("/audio/manifest.json");
      if (!res.ok) throw new Error(`manifest fetch ${res.status}`);
      this.manifest = (await res.json()) as Manifest;
    } catch (err) {
      console.warn("[audio] manifest load failed; audio disabled", err);
    }
  }

  // Plays a silent buffer to unlock the audio context on first interaction.
  unlock(): void {
    if (this.unlocked) return;
    this.unlocked = true;
    // Howler's `safari` lock is auto-handled, but creating a Howl in a
    // user-gesture context is enough to satisfy modern policies.
    void Howler.ctx?.resume?.();
  }

  setMusicVolume(v: number): void {
    this.musicVolume = clamp01(v);
    if (this.currentMusic) {
      this.currentMusic.howl.volume(this.musicVolume, this.currentMusic.id);
    }
  }

  setSfxVolume(v: number): void {
    this.sfxVolume = clamp01(v);
  }

  playMusic(track: MusicTrack, opts: { fadeMs?: number } = {}): void {
    if (!this.manifest) return;
    const fadeMs = opts.fadeMs ?? 800;
    const next = this.musicHowls.get(track) ?? this.createMusic(track);
    if (!next) return;
    // Fade out any current.
    if (this.currentMusic && this.currentMusic.track !== track) {
      const { howl: prev, id: prevId } = this.currentMusic;
      prev.fade(this.musicVolume, 0, fadeMs, prevId);
      setTimeout(() => prev.stop(prevId), fadeMs + 50);
    } else if (this.currentMusic && this.currentMusic.track === track) {
      return; // already playing this track
    }
    const id = next.play();
    next.volume(0, id);
    next.fade(0, this.musicVolume, fadeMs, id);
    this.currentMusic = { track, howl: next, id };
  }

  stopMusic(fadeMs = 600): void {
    if (!this.currentMusic) return;
    const { howl, id } = this.currentMusic;
    howl.fade(this.musicVolume, 0, fadeMs, id);
    setTimeout(() => howl.stop(id), fadeMs + 50);
    this.currentMusic = null;
  }

  playSfx(name: SfxName): void {
    if (!this.manifest) return;
    const howl = this.sfxHowls.get(name) ?? this.createSfx(name);
    if (!howl) return;
    howl.volume(this.sfxVolume);
    howl.play();
  }

  private createMusic(track: MusicTrack): Howl | null {
    const entry = this.manifest?.music[track];
    if (!entry) return null;
    const howl = new Howl({
      src: [entry.src],
      loop: entry.loop,
      volume: this.musicVolume,
      onloaderror: (_id, err) => console.warn(`[audio] music ${track} load failed:`, err),
    });
    this.musicHowls.set(track, howl);
    return howl;
  }

  private createSfx(name: SfxName): Howl | null {
    const entry = this.manifest?.sfx[name];
    if (!entry) return null;
    const howl = new Howl({
      src: [entry.src],
      volume: this.sfxVolume,
      onloaderror: (_id, err) => console.warn(`[audio] sfx ${name} load failed:`, err),
    });
    this.sfxHowls.set(name, howl);
    return howl;
  }
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

export const audioManager = new AudioManager();
