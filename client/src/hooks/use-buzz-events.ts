import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { buzzManager } from "@client/hid/buzz-manager";
import type {
  BuzzEventListener,
  BuzzEventPayload,
} from "@client/hid/buzz-types";

// Subscribes to dongle attach/detach so the component re-renders when the
// list of attached dongles changes.
export function useBuzzManagerStatus() {
  const dongleCount = useSyncExternalStore(
    (cb) => buzzManager.onChange(cb),
    () => buzzManager.dongles.length,
    () => 0,
  );
  return { manager: buzzManager, dongleCount, isSupported: buzzManager.isSupported() };
}

// Subscribe to all press/release events. The latest callback always runs;
// no re-subscription on render.
export function useBuzzEvent(callback: BuzzEventListener): void {
  const ref = useRef(callback);
  ref.current = callback;
  useEffect(() => {
    return buzzManager.on((p, k) => ref.current(p, k));
  }, []);
}

// Convenience: keeps the most recent press event in state (releases ignored).
export function useLastBuzzPress(): BuzzEventPayload | null {
  const [last, setLast] = useState<BuzzEventPayload | null>(null);
  useBuzzEvent((p, kind) => {
    if (kind === "press") setLast(p);
  });
  return last;
}
