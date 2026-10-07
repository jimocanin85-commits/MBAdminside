import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  UNAUTHORIZED_EVENT,
  apiFetch,
  clearStoredSession,
  getSessionId,
  getStoredUser,
  setAdminToken,
  storeSession,
} from "@/lib/api";

/**
 * Login, session and admin-mode state for the whole app.
 *
 * How a session behaves:
 *  - It belongs to one tab and survives a reload of the page.
 *  - Closing the tab forgets it on this device; the server ends it after 30
 *    minutes without activity.
 *  - One session per user. Logging in somewhere else ends the old one -
 *    after the user has confirmed it (admin accounts: straight away).
 *  - When the server stops accepting the session, the user is sent back to
 *    the login page with an explanation.
 */

// Kept in sync with ADMIN_USERS in api/_lib/auth.ts. Only used to decide
// what to show; the server makes the real decision on every request.
const ADMIN_USERS = ["admin", "Brian"];

export const ALL_PERMISSIONS = ["frivillig", "referater", "frivilligfest", "aarshjul"] as const;
export type Permission = (typeof ALL_PERMISSIONS)[number];

type AuthStatus = "loading" | "anonymous" | "authenticated";

export type LoginResult =
  | { ok: true }
  | {
      ok: false;
      reason: "INVALID" | "DISABLED" | "SESSION_EXISTS" | "LOCKED" | "NETWORK";
      message: string;
      /** For SESSION_EXISTS: when the other session was last used (ISO time). */
      otherSessionLastActive?: string;
    };

export type AdminUnlockResult = { ok: true } | { ok: false; message: string };

interface AuthContextValue {
  status: AuthStatus;
  username: string | null;
  /** One of the built-in admin accounts (server-verified role). */
  isAdmin: boolean;
  permissions: string[];
  hasPermission: (permission: string) => boolean;
  /** Message to show above the login form (expired session, taken over...). */
  sessionMessage: string | null;
  /** `takeOver` ends the user's session elsewhere and continues here. */
  login: (username: string, password: string, options?: { takeOver?: boolean }) => Promise<LoginResult>;
  logout: () => Promise<void>;
  isAdminMode: boolean;
  unlockAdminMode: (code?: string) => Promise<AdminUnlockResult>;
  lockAdminMode: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// One id per tab (sessionStorage), sent with the session so the server can
// tell "the same tab coming back" from "another tab or device".
const getBrowserId = () => {
  let browserId = sessionStorage.getItem("browserId");
  if (!browserId) {
    browserId = `browser_${crypto.randomUUID()}`;
    sessionStorage.setItem("browserId", browserId);
  }
  return browserId;
};

// The session id doubles as the bearer token, so it must be unguessable.
const generateSessionId = () => `sess_${crypto.randomUUID()}`;

/** Ask the server whether this tab's session is still good. null = could not ask. */
const validateSession = async (sessionId: string, username: string): Promise<{ valid: boolean; isAdmin?: boolean; message?: string } | null> => {
  try {
    const response = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "validate", sessionId, browserId: getBrowserId(), username }),
    });
    const result = await response.json();
    if (typeof result.valid !== "boolean") return null;
    return result;
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [username, setUsername] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [sessionMessage, setSessionMessage] = useState<string | null>(null);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const adminTimer = useRef<number | null>(null);
  const checkingSession = useRef(false);

  const lockAdminMode = useCallback(() => {
    if (adminTimer.current !== null) {
      window.clearTimeout(adminTimer.current);
      adminTimer.current = null;
    }
    setAdminToken(null);
    setIsAdminMode(false);
  }, []);

  const endSessionLocally = useCallback(
    (message: string | null) => {
      lockAdminMode();
      clearStoredSession();
      setUsername(null);
      setIsAdmin(false);
      setPermissions([]);
      setSessionMessage(message);
      setStatus("anonymous");
    },
    [lockAdminMode],
  );

  // Restore this tab's session on first load (for example after a reload).
  useEffect(() => {
    let cancelled = false;

    const restore = async () => {
      const storedUser = getStoredUser();
      const storedSession = getSessionId();

      if (!storedUser || !storedSession) {
        clearStoredSession();
        if (!cancelled) setStatus("anonymous");
        return;
      }

      const check = await validateSession(storedSession, storedUser);
      if (cancelled) return;

      if (check && check.valid === false) {
        endSessionLocally(check.message || "Din session er udløbet. Log venligst ind igen.");
        return;
      }

      // Valid - or the server could not be reached. In the second case keep
      // the user signed in rather than locking them out; every later
      // request is still checked by the server.
      setUsername(storedUser);
      setIsAdmin(check && typeof check.isAdmin === "boolean" ? check.isAdmin : ADMIN_USERS.includes(storedUser));
      setStatus("authenticated");
    };

    restore();
    return () => {
      cancelled = true;
    };
  }, [endSessionLocally]);

  /**
   * The server refused a request, or a heartbeat failed: find out whether
   * the session really has ended, and if so return to the login page.
   */
  const confirmSessionEnded = useCallback(async () => {
    if (checkingSession.current) return;
    const sessionId = getSessionId();
    const user = getStoredUser();
    if (!sessionId || !user) return;

    checkingSession.current = true;
    try {
      const check = await validateSession(sessionId, user);
      // Only act on a clear "no". A brief server hiccup must not end a
      // session that is still fine.
      if (check && check.valid === false) {
        endSessionLocally("Din session er afsluttet. Den er udløbet, eller du er logget ind et andet sted.");
      }
    } finally {
      checkingSession.current = false;
    }
  }, [endSessionLocally]);

  // Heartbeat: keeps the session alive while the tab is open.
  useEffect(() => {
    if (status !== "authenticated") return;

    const sendHeartbeat = async () => {
      const sessionId = getSessionId();
      if (!sessionId) return;
      try {
        const response = await apiFetch("/sessions", {
          method: "PUT",
          body: JSON.stringify({ sessionId, browserId: getBrowserId() }),
        });
        if (response.status === 404) confirmSessionEnded();
      } catch {
        // Offline for a moment - try again on the next tick.
      }
    };

    sendHeartbeat();
    const interval = window.setInterval(sendHeartbeat, 5 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, [status, confirmSessionEnded]);

  // Any request answered with 401 while signed in.
  useEffect(() => {
    if (status !== "authenticated") return;
    const handleUnauthorized = () => {
      confirmSessionEnded();
    };
    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
  }, [status, confirmSessionEnded]);

  // Load what the signed-in user may see.
  useEffect(() => {
    if (status !== "authenticated" || !username) {
      setPermissions([]);
      return;
    }
    if (isAdmin) {
      setPermissions([...ALL_PERMISSIONS]);
      return;
    }

    let cancelled = false;

    const readCachedPermissions = (): string[] => {
      try {
        const cached = JSON.parse(localStorage.getItem("customUsers") || "[]");
        const match = Array.isArray(cached) ? cached.find((u) => u && u.username === username) : null;
        return match && match.isActive !== false ? match.permissions || [] : [];
      } catch {
        return [];
      }
    };

    const load = async () => {
      try {
        const response = await apiFetch("/users");
        const result = await response.json();
        if (response.ok && result.success && Array.isArray(result.data)) {
          const me = result.data.find((u: { username: string }) => u.username === username);
          if (!cancelled) setPermissions(me && me.isActive !== false ? me.permissions || [] : []);
          return;
        }
      } catch {
        // Fall through to the cached copy below.
      }
      if (!cancelled) setPermissions(readCachedPermissions());
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [status, username, isAdmin]);

  const login = useCallback(
    async (rawUsername: string, rawPassword: string, options?: { takeOver?: boolean }): Promise<LoginResult> => {
      const name = rawUsername.trim();
      const password = rawPassword.trim();

      // One request: the server checks the credentials and, if they are
      // right, creates the session. A failure here is a failed login -
      // without a session no other request would be accepted anyway.
      const sessionId = generateSessionId();
      let adminAccount = false;
      try {
        const response = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: name,
            password,
            sessionId,
            browserId: getBrowserId(),
            userAgent: navigator.userAgent,
            takeOver: options?.takeOver === true,
          }),
        });
        const result = await response.json().catch(() => ({}));

        if (!response.ok || !result.success) {
          if (result.error === "SESSION_EXISTS") {
            return {
              ok: false,
              reason: "SESSION_EXISTS",
              message: result.message || "Du er allerede logget ind i en anden fane eller på en anden enhed.",
              otherSessionLastActive: result.existingSession?.lastActivity,
            };
          }
          if (result.error === "USER_DISABLED") {
            return { ok: false, reason: "DISABLED", message: result.message || "Denne bruger er deaktiveret" };
          }
          if (response.status === 429) {
            return { ok: false, reason: "LOCKED", message: result.message || "For mange forkerte forsøg. Prøv igen senere." };
          }
          if (response.status === 400 || response.status === 401) {
            return { ok: false, reason: "INVALID", message: "Forkert brugernavn eller adgangskode" };
          }
          return { ok: false, reason: "NETWORK", message: "Serveren kunne ikke logge dig ind lige nu. Prøv igen." };
        }

        adminAccount = typeof result.isAdmin === "boolean" ? result.isAdmin : ADMIN_USERS.includes(name);
        // The same tab reconnecting gets its existing session back.
        storeSession(name, (result.data && result.data.session_id) || sessionId);
      } catch {
        return { ok: false, reason: "NETWORK", message: "Kunne ikke forbinde til serveren. Prøv igen." };
      }

      setSessionMessage(null);
      setUsername(name);
      setIsAdmin(adminAccount);
      setStatus("authenticated");
      return { ok: true };
    },
    [],
  );

  const logout = useCallback(async () => {
    const sessionId = getSessionId();
    if (sessionId) {
      try {
        await apiFetch("/sessions", { method: "DELETE", body: JSON.stringify({ sessionId }) });
      } catch {
        // The session will expire on its own.
      }
    }
    endSessionLocally(null);
  }, [endSessionLocally]);

  const unlockAdminMode = useCallback(
    async (code?: string): Promise<AdminUnlockResult> => {
      try {
        const response = await apiFetch("/sessions", {
          method: "POST",
          body: JSON.stringify({ action: "admin-unlock", code: code || "" }),
        });
        const result = await response.json();
        if (!response.ok || !result.success || !result.token) {
          return { ok: false, message: result.message || "Kunne ikke slå admin-tilstand til" };
        }

        setAdminToken(result.token, result.expiresAt);
        setIsAdminMode(true);
        if (adminTimer.current !== null) window.clearTimeout(adminTimer.current);
        adminTimer.current = window.setTimeout(
          () => {
            lockAdminMode();
            toast.info("Admin-tilstand er udløbet");
          },
          Math.max(0, result.expiresAt - Date.now()),
        );
        return { ok: true };
      } catch {
        return { ok: false, message: "Kunne ikke forbinde til serveren. Prøv igen." };
      }
    },
    [lockAdminMode],
  );

  const hasPermission = useCallback(
    (permission: string) => isAdmin || permissions.includes(permission),
    [isAdmin, permissions],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      username,
      isAdmin,
      permissions,
      hasPermission,
      sessionMessage,
      login,
      logout,
      isAdminMode,
      unlockAdminMode,
      lockAdminMode,
    }),
    [status, username, isAdmin, permissions, hasPermission, sessionMessage, login, logout, isAdminMode, unlockAdminMode, lockAdminMode],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
};
