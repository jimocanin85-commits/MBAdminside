/**
 * One place for talking to /api.
 *
 * Every route except logging in needs the caller's session as a bearer
 * token (see api/_lib/auth.ts). Several call sites used to call fetch()
 * directly and forgot the header, so the server answered 401 and the UI
 * silently fell back to stale data. Use apiFetch() instead of fetch() for
 * anything under /api and the header is always there.
 */

const SESSION_KEY = "sessionId";
const USER_KEY = "currentUser";

/**
 * The login is kept in sessionStorage: it survives a reload of the page,
 * belongs to this one tab, and is gone when the tab is closed. (It used to
 * be in localStorage and was wiped on every page unload, so pressing
 * reload - or a phone putting the browser to sleep - logged the user out.)
 */
export function getSessionId(): string | null {
  try {
    return sessionStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

export function getStoredUser(): string | null {
  try {
    return sessionStorage.getItem(USER_KEY);
  } catch {
    return null;
  }
}

export function storeSession(username: string, sessionId: string) {
  try {
    sessionStorage.setItem(USER_KEY, username);
    sessionStorage.setItem(SESSION_KEY, sessionId);
  } catch {
    // Without storage the login simply does not survive a reload.
  }
}

export function clearStoredSession() {
  try {
    sessionStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    // Copies left behind by the previous version of the portal.
    ["currentUser", "sessionId", "browserId", "isAdminMode"].forEach((key) => localStorage.removeItem(key));
  } catch {
    // Nothing to clear.
  }
}

/** Fired when the server says the session is no longer valid (HTTP 401). */
export const UNAUTHORIZED_EVENT = "mb:unauthorized";

/** Tell the app that a request was refused as "not logged in". */
export function reportUnauthorized() {
  try {
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
  } catch {
    // Not in a browser.
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

  const response = await fetch(url, { ...init, headers });
  // A 401 on a request that carried a session means the session has ended
  // (timed out, or taken over from another device).
  if (response.status === 401 && auth["Authorization"]) reportUnauthorized();
  return response;
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
