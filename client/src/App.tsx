import { useEffect, useState } from "react";
import { WSClient } from "./lib/ws-client";
import type { WSMessage } from "@shared/messages";
import { BuzzDebugOverlay } from "./hid/buzz-debug-overlay";

function isDebugHidRoute(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("debug") === "hid";
}

export function App() {
  // Keep routing dead simple: a single ?debug=hid query param swaps in the HID overlay.
  // Phase 5 introduces the real router (host vs phone); for now a guard suffices.
  if (isDebugHidRoute()) return <BuzzDebugOverlay />;
  return <MainApp />;
}

function MainApp() {
  const [connected, setConnected] = useState(false);
  const [lastPongAt, setLastPongAt] = useState<number | null>(null);
  const [pingsSent, setPingsSent] = useState(0);

  useEffect(() => {
    const client = new WSClient();
    const offStatus = client.onStatus((s) => setConnected(s === "connected"));
    const offMsg = client.onMessage((msg: WSMessage) => {
      if (msg.type === "PONG") setLastPongAt(msg.at);
    });
    client.connect();
    const seed = setTimeout(() => {
      client.send({ type: "PING" });
      setPingsSent((n) => n + 1);
    }, 200);
    const interval = setInterval(() => {
      client.send({ type: "PING" });
      setPingsSent((n) => n + 1);
    }, 2000);
    return () => {
      offMsg();
      offStatus();
      clearTimeout(seed);
      clearInterval(interval);
      client.close();
    };
  }, []);

  return (
    <div className="min-h-screen bg-black text-cyan-300 p-8 font-mono">
      <h1 className="text-4xl font-bold tracking-wider">BUZZ QUIZ</h1>
      <p className="mt-1 text-sm opacity-50">phase 1+2 — foundation & HID</p>
      <div className="mt-8 space-y-2">
        <p>
          WS Connected:{" "}
          <span className={connected ? "text-green-400" : "text-red-400"}>
            {String(connected)}
          </span>
        </p>
        <p className="text-sm opacity-70">PINGs sent: {pingsSent}</p>
        {lastPongAt && (
          <p className="text-sm opacity-70">
            Last PONG: {new Date(lastPongAt).toISOString()}
          </p>
        )}
      </div>
      <p className="mt-8 text-xs opacity-40">
        WebHID debug overlay: <a className="underline" href="?debug=hid">/?debug=hid</a>
      </p>
    </div>
  );
}
