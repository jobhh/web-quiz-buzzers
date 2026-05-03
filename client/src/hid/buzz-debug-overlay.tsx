import { useEffect, useState } from "react";
import { BUTTON_NAMES, CONTROLLERS_PER_DONGLE } from "@shared/buzz-constants";
import { useBuzzManagerStatus } from "@client/hooks/use-buzz-events";
import type { BuzzController } from "./buzz-controller";
import type { ButtonIndex, ControllerSlot } from "./buzz-types";

// Available at /?debug=hid. Lets the operator confirm WebHID + bit layout
// + LED control without needing the rest of the game built.
export function BuzzDebugOverlay() {
  const { manager, dongleCount, isSupported } = useBuzzManagerStatus();
  const [error, setError] = useState<string | null>(null);
  const [, force] = useState(0);

  useEffect(() => {
    if (!isSupported) return;
    manager.restoreAttached().catch((e) => setError(String(e)));
    // Re-render whenever any button changes so the live grid updates.
    return manager.on(() => force((n) => (n + 1) % 1_000_000));
  }, [manager, isSupported]);

  if (!isSupported) {
    return (
      <div className="min-h-screen bg-black text-red-400 p-8 font-mono">
        <h1 className="text-2xl font-bold">WebHID not supported</h1>
        <p className="mt-2 opacity-80">
          Open this page in Chrome or Edge. Firefox / Safari do not implement WebHID.
        </p>
      </div>
    );
  }

  const onAddDongle = async () => {
    setError(null);
    try {
      await manager.requestDongle();
    } catch (e) {
      setError(String(e));
    }
  };

  return (
    <div className="min-h-screen bg-black text-cyan-300 p-6 font-mono">
      <header className="flex items-baseline gap-4">
        <h1 className="text-2xl font-bold tracking-wider">BUZZ HID DEBUG</h1>
        <span className="text-sm opacity-60">
          {dongleCount} dongle{dongleCount === 1 ? "" : "s"} attached
        </span>
      </header>
      <button
        type="button"
        onClick={onAddDongle}
        className="mt-4 px-5 py-2 bg-cyan-700 hover:bg-cyan-600 text-black font-bold rounded"
      >
        + Add Dongle (grant via browser)
      </button>
      {error && <p className="mt-3 text-red-400 text-sm">{error}</p>}
      {dongleCount === 0 && (
        <p className="mt-6 opacity-60 text-sm">
          No dongles yet. Plug in a Buzz USB receiver, then click <em>Add Dongle</em>.
        </p>
      )}
      <div className="mt-6 space-y-6">
        {manager.dongles.map((dongle, di) => (
          <DongleRow key={dongle.dongleId} dongle={dongle} listIndex={di} />
        ))}
      </div>
    </div>
  );
}

function DongleRow({ dongle, listIndex }: { dongle: BuzzController; listIndex: number }) {
  return (
    <section className="border border-cyan-800 rounded p-3">
      <h2 className="font-bold mb-2">
        Dongle #{listIndex} <span className="opacity-50 text-sm">(id {dongle.dongleId})</span>
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: CONTROLLERS_PER_DONGLE }, (_, ci) => (
          <ControllerCell key={ci} dongle={dongle} controllerIndex={ci as ControllerSlot} />
        ))}
      </div>
    </section>
  );
}

function ControllerCell({
  dongle,
  controllerIndex,
}: {
  dongle: BuzzController;
  controllerIndex: ControllerSlot;
}) {
  const [, force] = useState(0);
  const [ledOn, setLedOn] = useState(dongle.isLedOn(controllerIndex));

  useEffect(() => {
    return dongle.on((p) => {
      if (p.controllerIndex === controllerIndex) force((n) => (n + 1) % 1_000_000);
    });
  }, [dongle, controllerIndex]);

  const onToggleLed = async () => {
    const next = !ledOn;
    setLedOn(next);
    await dongle.setLed(controllerIndex, next);
  };

  return (
    <div className="border border-cyan-900 rounded p-2 text-sm">
      <div className="font-bold mb-2">Ctrl {controllerIndex}</div>
      <div className="grid grid-cols-5 gap-1 mb-2">
        {BUTTON_NAMES.map((name, bi) => {
          const pressed = dongle.isPressed(controllerIndex, bi as ButtonIndex);
          const colorClass = pressed
            ? buttonColor(name, true)
            : buttonColor(name, false);
          return (
            <div
              key={bi}
              title={name}
              className={`h-6 rounded text-[10px] flex items-center justify-center ${colorClass}`}
            >
              {name[0].toUpperCase()}
            </div>
          );
        })}
      </div>
      <button
        type="button"
        onClick={onToggleLed}
        className={`w-full text-xs py-1 rounded font-bold ${
          ledOn ? "bg-red-500 text-white" : "bg-gray-800 text-gray-300"
        }`}
      >
        LED {ledOn ? "ON" : "OFF"}
      </button>
    </div>
  );
}

function buttonColor(name: string, pressed: boolean): string {
  if (!pressed) return "bg-cyan-950 text-cyan-700";
  switch (name) {
    case "red":
      return "bg-red-500 text-white";
    case "yellow":
      return "bg-yellow-400 text-black";
    case "green":
      return "bg-green-500 text-black";
    case "orange":
      return "bg-orange-500 text-black";
    case "blue":
      return "bg-blue-500 text-white";
    default:
      return "bg-cyan-300 text-black";
  }
}

