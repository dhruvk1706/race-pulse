import { createServer, type ServerResponse } from "node:http";
import { loadDashboard } from "./dashboard.js";
import { loadWeekend } from "./weekend.js";

const PORT = Number(process.env.PORT ?? 4000);

function send(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  res.end(JSON.stringify(body));
}

function positiveInt(value: string | null): number | undefined | "invalid" {
  if (value === null) return undefined;
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : "invalid";
}

createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  try {
    if (req.method !== "GET") return send(res, 405, { error: "Method not allowed" });
    if (url.pathname === "/api/f1/weekend") {
      const meetingKey = positiveInt(url.searchParams.get("meetingKey"));
      if (meetingKey === "invalid") return send(res, 400, { error: "Invalid meeting key" });
      const data = await loadWeekend(meetingKey);
      return data ? send(res, 200, data) : send(res, 404, { error: "Race not found" });
    }
    if (url.pathname === "/api/f1/dashboard") {
      const sessionKey = positiveInt(url.searchParams.get("sessionKey"));
      if (sessionKey === "invalid") return send(res, 400, { error: "Invalid session key" });
      return send(res, 200, await loadDashboard(sessionKey));
    }
    send(res, 404, { error: "Not found" });
  } catch (error) {
    console.error(`${url.pathname} failed:`, error);
    send(res, 502, { error: "Race data unavailable" });
  }
// Loopback only: the Next.js server proxies to it, browsers never call it directly.
}).listen(PORT, "127.0.0.1", () => console.log(`Backend listening on http://127.0.0.1:${PORT}`));
