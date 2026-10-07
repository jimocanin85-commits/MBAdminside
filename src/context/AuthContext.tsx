import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { apiFetch, setAdminToken } from "@/lib/api";

/**
 * Login, session and admin-mode state for the whole app.
 *
 * This used to live inline in pages/AdminPortal.tsx next to the UI. The
 * behaviour is the same - one session per user, bound to one tab, ended
 * when the tab closes - but it is now in one place and every request
 * carries the session token.
 */

// Kept in sync with ADMIN_USERS in api/_lib/auth.ts. Only used to decide
// what to show; the server makes the real decision on every request.
const ADMIN_USERS = ["admin", "Brian"];

export const ALL_PERMISSIONS = ["frivillig", "referater", "frivilligfest", "aarshjul"] as const;
export type Permission = (typeof ALL_PERMISSIONS)[number];

type AuthStatus = "loading" | "anonymous" | "authenticated";

export type LoginResult =
  | { ok: true }
  | { ok: false; reason: "INVALID" | "DISABLED" | "SESSION_EXISTS" | "NETWORK"; message: string };

export type AdminUnlockResult = { ok: true } | { ok: false; message: string };

interface AuthContextValue {
  status: AuthStatus;
  username: string | null;
  /** One of the built-in admin accounts (server-verified role). */
  isAdmin: boolean;
  permissions: string[];
  hasPermission: (permission: string) => boolean;
  /** Message to show above the login form (expired session, other tab...). */
  sessionMessage: string | null;
  login: (username: string, password: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
  isAdminMode: boolean;
  unlockAdminMode: (code?: string) => Promise<AdminUnlockResult>;
  lockAdminMode: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// sessionStorage is per tab, so this id tells tabs apart.
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

const clearStoredSession = () => {
  localStorage.removeItem("currentUser");
  localStorage.removeItem("sessionId");
  localStorage.removeItem("browserId");
  localStorage.removeItem("isAdminMode");
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [username, setUsername] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [sessionMessage, setSessionMessage] = useState<string | null>(null);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const adminTimer = useRef<number | null>(null);

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

  // Restore and validate a stored session on first load.
  useEffect(() => {
    let cancelled = false;

    const restore = async () => {
      // Admin mode never survives a reload.
      localStorage.removeItem("isAdminMode");

      let storedUser: string | null = null;
      let storedSession: string | null = null;
      let storedBrowserId: string | null = null;
      try {
        storedUser = localStorage.getItem("currentUser");
        storedSession = localStorage.getItem("sessionId");
        storedBrowserId = localStorage.getItem("browserId");
      } catch {
        // Storage unavailable - treat as logged out.
      }

      if (!storedUser || !storedSession) {
        if (storedUser) localStorage.removeItem("currentUser");
        if (!cancelled) setStatus("anonymous");
        return;
      }

      const browserId = getBrowserId();

      // A different tab is trying to reuse the session. Leave the stored
      // session alone (the original tab still needs it) and ask for login.
      if (storedBrowserId && storedBrowserId !== browserId) {
        if (!cancelled) {
          setSessionMessage("Log ud fra den anden fane/browser først for at kunne logge ind her.");
          setStatus("anonymous");
        }
        return;
      }

      let adminFromServer: boolean | null = null;
      try {
        const response = await apiFetch("/sessions", {
          method: "POST",
          body: JSON.stringify({
            action: "validate",
            sessionId: storedSession,
            browserId,
            username: storedUser,
          }),
        });
        const result = await response.json();
        if (!result.valid) {
          if (!cancelled) endSessionLocally(result.message || "Din session er udløbet. Log venligst ind igen.");
          return;
        }
        if (typeof result.isAdmin === "boolean") adminFromServer = result.isAdmin;
      } catch {
        // The server could not be reached. Keep the user signed in rather
        // than locking them out; every later request is still checked.
      }

      if (cancelled) return;
      setUsername(storedUser);
      setIsAdmin(adminFromServer ?? ADMIN_USERS.includes(storedUser));
      setStatus("authenticated");
    };

    restore();
    return () => {
      cancelled = true;
    };
  }, [endSessionLocally]);

  // Heartbeat: keeps the session alive and notices when it was ended
  // elsewhere (for example an admin unlocked it).
  useEffect(() => {
    if (status !== "authenticated") return;

    const sendHeartbeat = async () => {
      const sessionId = localStorage.getItem("sessionId");
      if (!sessionId) return;
      try {
        const response = await apiFetch("/sessions", {
          method: "PUT",
          body: JSON.stringify({ sessionId, browserId: getBrowserId() }),
        });
        if (response.status === 404) {
          // Double-check before signing the user out, so a brief database
          // hiccup on the server does not end a session that is still valid.
          const check = await apiFetch("/sessions", {
            method: "POST",
            body: JSON.stringify({
              action: "validate",
              sessionId,
              browserId: getBrowserId(),
              username: localStorage.getItem("currentUser"),
            }),
          });
          const result = await check.json();
          if (check.ok && result.valid === false) {
            endSessionLocally("Din session er blevet afsluttet. Muligvis har du logget ind et andet sted.");
          }
        }
      } catch {
        // Offline for a moment - try again on the next tick.
      }
    };

    sendHeartbeat();
    const interval = window.setInterval(sendHeartbeat, 5 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, [status, endSessionLocally]);

  // End the session when the tab is closed.
  useEffect(() => {
    const handleBeforeUnload = () => {
      const sessionId = localStorage.getItem("sessionId");
      if (sessionId) {
        // sendBeacon can only POST. Sending a JSON blob (not a bare string)
        // lets the server parse the body and actually delete the session.
        const payload = new Blob([JSON.stringify({ _method: "DELETE", sessionId })], {
          type: "application/json",
        });
        navigator.sendBeacon("/api/sessions", payload);
      }
      clearStoredSession();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

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

  const login = useCallback(async (rawUsername: string, rawPassword: string): Promise<LoginResult> => {
    const name = rawUsername.trim();
    const password = rawPassword.trim();

    // Step 1: are the credentials right? Checked entirely on the server.
    let adminAccount = false;
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: name, password }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        if (result.error === "USER_DISABLED") {
          return { ok: false, reason: "DISABLED", message: result.message || "Denne bruger er deaktiveret" };
        }
        return { ok: false, reason: "INVALID", message: "Forkert brugernavn eller adgangskode" };
      }
      adminAccount = result.isAdmin === true;
    } catch {
      return { ok: false, reason: "NETWORK", message: "Kunne ikke forbinde til serveren. Prøv igen." };
    }

    // Step 2: create the session. Without one no other request would be
    // accepted, so a failure here is a failed login.
    const sessionId = generateSessionId();
    const browserId = getBrowserId();
    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: name,
          password,
          sessionId,
          browserId,
          userAgent: navigator.userAgent,
          forceLogin: adminAccount,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        if (result.error === "SESSION_EXISTS") {
          return {
            ok: false,
            reason: "SESSION_EXISTS",
            message: result.message || "Log ud fra den anden fane/browser først for at kunne logge ind her.",
          };
        }
        return { ok: false, reason: "NETWORK", message: "Kunne ikke oprette en session. Prøv igen." };
      }

      // The same tab reconnecting gets its existing session back.
      const activeSessionId = (result.data && result.data.session_id) || sessionId;
      localStorage.setItem("currentUser", name);
      localStorage.setItem("sessionId", activeSessionId);
      localStorage.setItem("browserId", browserId);
    } catch {
      return { ok: false, reason: "NETWORK", message: "Kunne ikke forbinde til serveren. Prøv igen." };
    }

    setSessionMessage(null);
    setUsername(name);
    setIsAdmin(adminAccount);
    setStatus("authenticated");
    return { ok: true };
  }, []);

  const logout = useCallback(async () => {
    const sessionId = localStorage.getItem("sessionId");
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
