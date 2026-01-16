export const runtime = "nodejs";

import { backendFetch } from "../_backendFetch";

export async function POST(req) {
  try {
    const backendUrl = req.headers.get("x-backend-url");
    const body = await req.json();
    const data = await backendFetch(
      "/feedback",
      {
        method: "POST",
        body: JSON.stringify(body || {}),
      },
      backendUrl
    );
    return Response.json(data);
  } catch (e) {
    return Response.json(
      { error: e.message || "Proxy error", detail: e.payload || null },
      { status: e.status || 500 }
    );
  }
}

