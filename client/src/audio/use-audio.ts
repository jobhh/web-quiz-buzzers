import { useEffect } from "react";
import { audioManager } from "./audio-manager";
import { useSettings } from "@client/lib/settings-context";

// Loads the audio manifest on first mount and keeps the AudioManager
// volume sliders in sync with SettingsContext.
export function useAudio() {
  const { musicVolume, sfxVolume } = useSettings();

  useEffect(() => {
    audioManager.load();
  }, []);

  useEffect(() => {
    audioManager.setMusicVolume(musicVolume);
  }, [musicVolume]);

  useEffect(() => {
    audioManager.setSfxVolume(sfxVolume);
  }, [sfxVolume]);

  return audioManager;
}
