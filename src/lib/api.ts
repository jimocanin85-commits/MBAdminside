/**
 * One place for talking to /api.
 *
 * Every route except /api/login needs the caller's session as a bearer
 * token (see api/_lib/auth.ts). Several call sites used to call fetch()
 * directly and forgot the header, so the server answered 401 and the UI
 * silently fell back to stale data. Use apiFetch() instead of fetch() for
 * anything under /api and the header is always there.
 */

const SESSION_KEY = "sessionId";

export function getSessionId(): string | null {
  try {
    return localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

// Admin mode is deliberately kept in memory only: it always starts switched
// off after a reload, and the token never touches localStorage.
let adminToken: string | null = null;
let adminTokenExpiresAt = 0;

export function setAdminToken(token: string | null, expiresAt = 0) {
  adminToken = token;
  adminTokenExpiresAt = token ? expiresAt : 0;
}

export function getAdminToken(): string | null {
  if (adminToken && Date.now() < adminTokenExpiresAt) return adminToken;
  return null;
}

/** Headers that identify the caller: session + admin mode (when active). */
export function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  const sessionId = getSessionId();
  if (sessionId) headers["Authorization"] = `Bearer ${sessionId}`;
  const token = getAdminToken();
  if (token) headers["X-Admin-Token"] = token;
  return headers;
}

/**
 * fetch() for /api routes. `path` is relative to /api ("/users") or
 * absolute ("/api/users"). JSON bodies get a Content-Type automatically.
 */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const url = path.startsWith("/api") ? path : `/api${path.startsWith("/") ? "" : "/"}${path}`;
  const headers = new Headers(init.headers);

  const auth = authHeaders();
  Object.keys(auth).forEach((key) => {
    if (!headers.has(key)) headers.set(key, auth[key]);
  });
  if (typeof init.body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(url, { ...init, headers });
}

/** Only http(s) links may be opened from data that users can edit. */
export function safeExternalUrl(raw?: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

/** Escape text before placing it inside generated HTML. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
