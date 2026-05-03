import { useSettings } from "@client/lib/settings-context";

// Renders the fixed-position scanline overlay. Reads from SettingsContext
// so a future settings menu can toggle it instantly.
export function ScanlineOverlay() {
  const { scanlines } = useSettings();
  if (!scanlines) return null;
  return <div className="scanlines" aria-hidden />;
}
