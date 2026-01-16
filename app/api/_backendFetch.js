const DEFAULT_BACKEND_URL = "http://127.0.0.1:8000";

function getBackendUrl() {
  return process.env.BACKEND_URL || DEFAULT_BACKEND_URL;
}

function isSafeLocalUrl(url) {
  try {
    const u = new URL(url);
    return (
      (u.hostname === "127.0.0.1" || u.hostname === "localhost") &&
      (u.protocol === "http:" || u.protocol === "https:")
    );
  } catch {
    return false;
  }
}

export async function backendFetch(path, options = {}, backendUrlOverride) {
  const base = backendUrlOverride && isSafeLocalUrl(backendUrlOverride) ? backendUrlOverride : getBackendUrl();
  const url = `${base}${path}`;

  let res;
  try {
    res = await fetch(url, {
      ...options,
      headers: {
        "content-type": "application/json",
        ...(options.headers || {}),
      },
    });
  } catch (e) {
    const err = new Error(`Cannot reach backend at ${url}. ${e?.message || ""}`.trim());
    err.status = 502;
    err.payload = { url, message: e?.message || "fetch failed" };
    throw err;
  }

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }

  if (!res.ok) {
    const message =
      (json && (json.detail || json.message || json.error)) ||
      `Backend error (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    err.payload = { url, response: json };
    throw err;
  }

  return json;
}

