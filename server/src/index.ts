import { networkInterfaces } from "node:os";
import { websocketHandler } from "./websocket-handler";

const PORT = Number(process.env.PORT ?? 3000);
const IS_PROD = process.env.NODE_ENV === "production";
const DIST_DIR = "client/dist";

const server = Bun.serve({
  port: PORT,
  hostname: "0.0.0.0",
  fetch(req, server) {
    const url = new URL(req.url);
    if (url.pathname === "/ws") {
      // `data` is required by @types/bun's upgrade() signature even though it's logically optional.
      if (server.upgrade(req, { data: undefined })) return;
      return new Response("WebSocket upgrade failed", { status: 400 });
    }
    return handleHttp(url);
  },
  websocket: websocketHandler,
});

logBootInfo(server.port ?? PORT);

async function handleHttp(url: URL): Promise<Response> {
  if (!IS_PROD) {
    return new Response(
      "Dev mode: open http://localhost:5173 (Vite serves the client)",
      { status: 200 },
    );
  }
  const path = url.pathname === "/" ? "/index.html" : url.pathname;
  // Reject path traversal attempts before touching the filesystem.
  if (path.includes("..")) return new Response("not found", { status: 404 });
  const file = Bun.file(`${DIST_DIR}${path}`);
  if (await file.exists()) return new Response(file);
  // SPA fallback only for routes that look like HTML pages (no file extension).
  // A missing /assets/foo.js must 404, not silently return index.html with the wrong MIME.
  const lastSegment = path.split("/").pop() ?? "";
  if (lastSegment.includes(".")) return new Response("not found", { status: 404 });
  return new Response(Bun.file(`${DIST_DIR}/index.html`));
}

function logBootInfo(port: number) {
  const lanIps = getLanIps();
  console.log("");
  console.log("  Buzz Quiz server running");
  console.log("");
  console.log(`    Local:    http://localhost:${port}`);
  for (const ip of lanIps) {
    console.log(`    Network:  http://${ip}:${port}`);
  }
  console.log("");
  if (!IS_PROD) {
    console.log("    Dev: open Vite at http://localhost:5173 (HTTP) — WS proxied to this server");
    console.log("");
  }
}

function getLanIps(): string[] {
  const out: string[] = [];
  const ifaces = networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name] ?? []) {
      if (iface.family === "IPv4" && !iface.internal) out.push(iface.address);
    }
  }
  return out;
}
