import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

/**
 * Which sections the portal shows, in which order, plus the club's own
 * links. Chosen by an admin on the "Tilpas portal" page and shared by every
 * user (stored through /api/layout, same record the old drag-and-drop
 * layout used, so existing choices carry over).
 */

export const BUILT_IN_SECTIONS = ["frivillig", "referater", "frivilligfest", "aarshjul"] as const;
export type BuiltInSectionId = (typeof BUILT_IN_SECTIONS)[number];

export const SECTION_LABELS: Record<BuiltInSectionId, { name: string; description: string }> = {
  frivillig: { name: "Frivillige", description: "Opret frivillig, exit-formular og filer" },
  referater: { name: "Referater", description: "Referater fra bestyrelsesmøder" },
  frivilligfest: { name: "Frivilligfest 2026", description: "Åbner regnearket for frivilligfesten" },
  aarshjul: { name: "Årshjul", description: "Opgaver fordelt på årets måneder" },
};

export interface CustomSection {
  id: string;
  name: string;
  url?: string;
  icon?: string;
}

interface PortalLayout {
  sectionOrder: string[];
  customSections: CustomSection[];
}

type SaveResult = { ok: true; sharedWithEveryone: boolean } | { ok: false; message: string };

interface PortalContextValue {
  /** Ids of the sections that are switched on, in display order. */
  sectionOrder: string[];
  customSections: CustomSection[];
  isLoading: boolean;
  isSectionEnabled: (id: string) => boolean;
  saveLayout: (layout: PortalLayout) => Promise<SaveResult>;
  reload: () => Promise<void>;
}

const DEFAULT_LAYOUT: PortalLayout = {
  sectionOrder: [...BUILT_IN_SECTIONS],
  customSections: [],
};

const LOCAL_KEY = "sectionLayout";

const PortalContext = createContext<PortalContextValue | null>(null);

// Accept whatever shape was stored before and keep only what is usable.
const normalize = (raw: unknown): PortalLayout | null => {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as { sectionOrder?: unknown; customSections?: unknown };
  if (!Array.isArray(data.sectionOrder)) return null;

  const customSections: CustomSection[] = Array.isArray(data.customSections)
    ? data.customSections
        .filter((s): s is CustomSection => !!s && typeof s.id === "string" && typeof s.name === "string")
        .map((s) => ({ id: s.id, name: s.name, url: typeof s.url === "string" ? s.url : undefined }))
    : [];

  const known = new Set<string>([...BUILT_IN_SECTIONS, ...customSections.map((s) => s.id)]);
  const seen = new Set<string>();
  const sectionOrder = data.sectionOrder.filter((id): id is string => {
    if (typeof id !== "string" || !known.has(id) || seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  return { sectionOrder, customSections };
};

export const PortalProvider = ({ children }: { children: ReactNode }) => {
  const { status } = useAuth();
  const [layout, setLayout] = useState<PortalLayout>(DEFAULT_LAYOUT);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    setIsLoading(true);
    try {
      // The timestamp defeats aggressive caching on mobile browsers.
      const response = await apiFetch(`/layout?_t=${Date.now()}`, { cache: "no-store" });
      const result = await response.json();
      const fromServer = response.ok && result.success ? normalize(result.data) : null;
      if (fromServer) {
        setLayout(fromServer);
        return;
      }
      throw new Error("No layout returned");
    } catch {
      try {
        const cached = normalize(JSON.parse(localStorage.getItem(LOCAL_KEY) || "null"));
        if (cached) setLayout(cached);
      } catch {
        // Keep the default layout.
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      reload();
    } else if (status === "anonymous") {
      setLayout(DEFAULT_LAYOUT);
      setIsLoading(true);
    }
  }, [status, reload]);

  const saveLayout = useCallback(async (next: PortalLayout): Promise<SaveResult> => {
    const payload = {
      sectionOrder: next.sectionOrder,
      customSections: next.customSections,
      // Kept so the stored record stays compatible with the previous version.
      position: { x: 0, y: 0 },
      isLocked: true,
    };

    try {
      const response = await apiFetch("/layout", { method: "POST", body: JSON.stringify(payload) });
      const result = await response.json().catch(() => ({}));

      if (response.ok && result.success) {
        localStorage.setItem(LOCAL_KEY, JSON.stringify(payload));
        setLayout(next);
        // Without a database the server accepts the save but stores nothing.
        const sharedWithEveryone = !String(result.message || "").includes("localStorage only");
        return { ok: true, sharedWithEveryone };
      }
      if (response.status === 403) {
        return { ok: false, message: result.message || "Slå admin-tilstand til for at gemme." };
      }
      return { ok: false, message: result.details || result.error || "Kunne ikke gemme opsætningen" };
    } catch {
      return { ok: false, message: "Kunne ikke forbinde til serveren. Prøv igen." };
    }
  }, []);

  const isSectionEnabled = useCallback((id: string) => layout.sectionOrder.includes(id), [layout.sectionOrder]);

  const value = useMemo<PortalContextValue>(
    () => ({
      sectionOrder: layout.sectionOrder,
      customSections: layout.customSections,
      isLoading,
      isSectionEnabled,
      saveLayout,
      reload,
    }),
    [layout, isLoading, isSectionEnabled, saveLayout, reload],
  );

  return <PortalContext.Provider value={value}>{children}</PortalContext.Provider>;
};

export const usePortal = (): PortalContextValue => {
  const context = useContext(PortalContext);
  if (!context) throw new Error("usePortal must be used inside <PortalProvider>");
  return context;
};
