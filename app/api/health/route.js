export const runtime = "nodejs";

import { backendFetch } from "../_backendFetch";

export async function GET(req) {
  try {
    const backendUrl = req.headers.get("x-backend-url");
    const data = await backendFetch("/health", { method: "GET", headers: {} }, backendUrl);
    return Response.json({ ok: true, backend: backendUrl || null, data });
  } catch (e) {
    return Response.json(
      { error: e.message || "Proxy error", detail: e.payload || null },
      { status: e.status || 500 }
    );
  }
}

