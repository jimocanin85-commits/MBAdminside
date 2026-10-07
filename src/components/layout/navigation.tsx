import { useMemo } from "react";
import {
  CircleDot,
  FileText,
  FolderOpen,
  Home,
  Link2,
  PartyPopper,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { usePortal } from "@/context/PortalContext";
import { safeExternalUrl } from "@/lib/api";

/** The regneark the "Frivilligfest 2026" section opens. */
export const FRIVILLIGFEST_URL =
  "https://docs.google.com/spreadsheets/d/15QhvIYCNhci2N-oBbEGIpRgeevWe42L0kjhNyfTjkjQ/edit?usp=sharing_eil&ts=67288c42";

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Internal route. */
  to?: string;
  /** External link, opened in a new tab. */
  href?: string;
}

export interface Navigation {
  /** Forside plus every section the user may see, in the chosen order. */
  main: NavItem[];
  /** Only filled while admin mode is on. */
  admin: NavItem[];
}

/**
 * The navigation for the signed-in user: sections an admin has switched on
 * ("Tilpas portal"), filtered by what this user has access to.
 */
export const useNavigation = (): Navigation => {
  const { hasPermission, isAdmin, isAdminMode } = useAuth();
  const { sectionOrder, customSections } = usePortal();

  return useMemo(() => {
    const main: NavItem[] = [{ id: "home", label: "Forside", icon: Home, to: "/" }];

    sectionOrder.forEach((id) => {
      if (id === "frivillig" && hasPermission("frivillig")) {
        main.push({ id: "frivillige", label: "Frivillige", icon: Users, to: "/frivillige" });
        main.push({ id: "filer", label: "Filer", icon: FolderOpen, to: "/filer" });
      } else if (id === "aarshjul" && hasPermission("aarshjul")) {
        main.push({ id: "aarshjul", label: "Årshjul", icon: CircleDot, to: "/aarshjul" });
      } else if (id === "referater" && hasPermission("referater")) {
        main.push({ id: "referater", label: "Referater", icon: FileText, to: "/referater" });
      } else if (id === "frivilligfest" && hasPermission("frivilligfest")) {
        main.push({ id: "frivilligfest", label: "Frivilligfest", icon: PartyPopper, href: FRIVILLIGFEST_URL });
      } else if (id.startsWith("custom_")) {
        const section = customSections.find((s) => s.id === id);
        const href = section ? safeExternalUrl(section.url) : null;
        if (section && href) {
          main.push({ id, label: section.name, icon: Link2, href });
        }
      }
    });

    const admin: NavItem[] = [];
    if (isAdminMode) {
      if (isAdmin) {
        admin.push({ id: "brugere", label: "Brugere", icon: ShieldCheck, to: "/admin/brugere" });
      }
      admin.push({ id: "tilpas", label: "Tilpas portal", icon: SlidersHorizontal, to: "/admin/tilpas" });
    }

    return { main, admin };
  }, [sectionOrder, customSections, hasPermission, isAdmin, isAdminMode]);
};
