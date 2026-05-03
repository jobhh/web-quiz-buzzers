import type { WSMessage } from "@shared/messages";

type MessageHandler = (msg: WSMessage) => void;
type StatusHandler = (status: "connected" | "disconnected") => void;

// Auto-reconnecting typed WebSocket wrapper. Connects to ws(s)://<host>/ws by default.
// Backoff doubles on each failure up to 30s; resets on successful open.
export class WSClient {
  private ws: WebSocket | null = null;
  private messageHandlers = new Set<MessageHandler>();
  private statusHandlers = new Set<StatusHandler>();
  private reconnectDelayMs = 1000;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly url: string;
  private closedByUser = false;

  constructor(url?: string) {
    this.url =
      url ??
      `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`;
  }

  connect() {
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
      try {
        const msg = JSON.parse(String(e.data)) as WSMessage;
        for (const h of this.messageHandlers) h(msg);
      } catch {
        console.warn("[ws] invalid JSON from server");
      }
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

  send(msg: WSMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
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

  close() {
    this.closedByUser = true;
    this.clearReconnectTimer();
    this.ws?.close();
  }

  private clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}
