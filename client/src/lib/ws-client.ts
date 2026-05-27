import type { ClientMessage, ServerMessage } from "@shared/messages";

type MessageHandler = (msg: ServerMessage) => void;
type StatusHandler = (status: "connected" | "disconnected") => void;

// Auto-reconnecting typed WebSocket wrapper. Connects to ws(s)://<host>/ws by default.
// Backoff doubles on each failure up to 30s; resets on successful open.
//
// The transport itself doesn't validate message shapes — game-level routing
// + Zod-equivalent guards live in the upper layers (server-side router,
// client-side game-session).
export class WSClient {
  private ws: WebSocket | null = null;
  private messageHandlers = new Set<MessageHandler>();
  private statusHandlers = new Set<StatusHandler>();
  private reconnectDelayMs = 1000;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly url: string;
  private closedByUser = false;

  constructor(url?: string) {
    if (url) {
      this.url = url;
    } else {
      // In dev mode (Vite on :5173), connect WS directly to the Bun server
      // on :3000 because Vite's WS proxy is unreliable under Bun on Windows.
      const host = location.port === "5173" ? `${location.hostname}:3000` : location.host;
      const proto = location.protocol === "https:" ? "wss" : "ws";
      this.url = `${proto}://${host}/ws`;
    }
  }

  connect(): void {
    this.closedByUser = false;
    this.clearReconnectTimer();
    const ws = new WebSocket(this.url);
    this.ws = ws;
    ws.addEventListener("open", () => {
      console.log("[ws] connected");
      this.reconnectDelayMs = 1000;
      for (const h of this.statusHandlers) h("connected");
    });
    ws.addEventListener("message", (e) => {
      let msg: ServerMessage;
      try {
        msg = JSON.parse(String(e.data)) as ServerMessage;
      } catch {
        console.warn("[ws] invalid JSON from server");
        return;
      }
      console.log("[ws] received:", msg.type, msg.type === "STATE_UPDATE" ? "phase=" + (msg as any).payload?.state?.phase : JSON.stringify((msg as any).payload));
      for (const h of this.messageHandlers) h(msg);
    });
    ws.addEventListener("close", () => {
      for (const h of this.statusHandlers) h("disconnected");
      if (this.closedByUser) return;
      const delay = this.reconnectDelayMs;
      console.log(`[ws] closed; reconnecting in ${delay}ms`);
      this.reconnectDelayMs = Math.min(this.reconnectDelayMs * 2, 30_000);
      this.reconnectTimer = setTimeout(() => this.connect(), delay);
    });
    ws.addEventListener("error", (e) => {
      console.warn("[ws] error", e);
    });
  }

  send(msg: ClientMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log("[ws] sending:", msg.type, msg);
      this.ws.send(JSON.stringify(msg));
    } else {
      console.warn("[ws] send failed, readyState:", this.ws?.readyState);
    }
  }

  onMessage(h: MessageHandler): () => void {
    this.messageHandlers.add(h);
    return () => {
      this.messageHandlers.delete(h);
    };
  }

  onStatus(h: StatusHandler): () => void {
    this.statusHandlers.add(h);
    return () => {
      this.statusHandlers.delete(h);
    };
  }

  close(): void {
    this.closedByUser = true;
    this.clearReconnectTimer();
    this.ws?.close();
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}
