import { useEffect, useState } from "react";
import { WSClient } from "./lib/ws-client";
import type { WSMessage } from "@shared/messages";

export function App() {
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
    // Initial PING shortly after connect; then heartbeat every 2s
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
      <p className="mt-1 text-sm opacity-50">phase 1 — foundation</p>
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
    </div>
  );
}
