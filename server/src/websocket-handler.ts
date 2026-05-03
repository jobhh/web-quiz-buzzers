import type { ServerWebSocket, WebSocketHandler } from "bun";
import type { WSMessage } from "@shared/messages";

export const websocketHandler: WebSocketHandler<unknown> = {
  open(ws) {
    console.log("[ws] open");
  },
  message(ws, raw) {
    let parsed: unknown;
    try {
      const text = typeof raw === "string" ? raw : new TextDecoder().decode(raw);
      parsed = JSON.parse(text);
    } catch {
      console.warn("[ws] dropping invalid JSON");
      return;
    }
    if (!isWSMessage(parsed)) {
      console.warn("[ws] dropping malformed message (not an object with string `type`)");
      return;
    }
    routeMessage(ws, parsed);
  },
  close(ws, code, reason) {
    console.log(`[ws] close (${code}) ${reason}`);
  },
};

function routeMessage(ws: ServerWebSocket<unknown>, msg: WSMessage) {
  switch (msg.type) {
    case "PING":
      send(ws, { type: "PONG", at: Date.now() });
      return;
    default:
      console.warn(`[ws] unknown message type: ${(msg as { type: string }).type}`);
  }
}

function send(ws: ServerWebSocket<unknown>, msg: WSMessage) {
  ws.send(JSON.stringify(msg));
}

function isWSMessage(v: unknown): v is WSMessage {
  return (
    typeof v === "object" &&
    v !== null &&
    typeof (v as { type?: unknown }).type === "string"
  );
}
