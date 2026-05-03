import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

interface Settings {
  scanlines: boolean;
  reducedMotion: boolean;
  musicVolume: number; // 0..1
  sfxVolume: number; // 0..1
}

const DEFAULTS: Settings = {
  scanlines: true,
  reducedMotion: false,
  musicVolume: 0.6,
  sfxVolume: 0.9,
};

const STORAGE_KEY = "buzz-quiz:settings";

interface Ctx extends Settings {
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
}

const SettingsCtx = createContext<Ctx | null>(null);

function loadFromStorage(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return { ...DEFAULTS, ...parsed };
  } catch {
    return DEFAULTS;
  }
}

function saveToStorage(s: Settings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* swallow */
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(loadFromStorage);

  useEffect(() => {
    saveToStorage(settings);
  }, [settings]);

  const set = useCallback<Ctx["set"]>((key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  return (
    <SettingsCtx.Provider value={{ ...settings, set }}>{children}</SettingsCtx.Provider>
  );
}

export function useSettings(): Ctx {
  const ctx = useContext(SettingsCtx);
  if (!ctx) throw new Error("useSettings must be used inside <SettingsProvider>");
  return ctx;
}
