import { useCallback, useEffect, useMemo, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { ExternalLink, LogOut, MoreHorizontal, RefreshCw, ScrollText, ShieldCheck, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import mbLogo from "@/assets/mb-logo.png";
import LogsViewer from "@/components/admin/LogsViewer";
import { ShellContext, type ShellActions } from "@/components/layout/ShellContext";
import UserMenu from "@/components/layout/UserMenu";
import { useNavigation, type NavItem } from "@/components/layout/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

const sidebarLink =
  "flex min-h-[44px] items-center gap-3 rounded-lg px-3 text-[15px] font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring";
const sidebarLinkActive =
  "bg-sidebar-primary font-semibold text-sidebar-primary-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground";

const sheetLink =
  "flex min-h-[48px] items-center gap-3 rounded-lg px-3 text-base font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground";
const sheetLinkActive = "bg-primary font-semibold text-primary-foreground hover:bg-primary hover:text-primary-foreground";

interface NavEntryProps {
  item: NavItem;
  baseClass: string;
  activeClass: string;
  onNavigate?: () => void;
}

/** One navigation row: a route link, or an external link in a new tab. */
const NavEntry = ({ item, baseClass, activeClass, onNavigate }: NavEntryProps) => {
  const Icon = item.icon;

  if (item.href) {
    return (
      <a href={item.href} target="_blank" rel="noopener noreferrer" className={baseClass} onClick={onNavigate}>
        <Icon className="h-5 w-5 shrink-0" />
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        <ExternalLink className="h-4 w-4 shrink-0 opacity-80" aria-label="åbner i ny fane" />
      </a>
    );
  }

  return (
    <NavLink
      to={item.to || "/"}
      end={item.to === "/"}
      onClick={onNavigate}
      className={({ isActive }) => cn(baseClass, isActive && activeClass)}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
    </NavLink>
  );
};

/**
 * The frame around every signed-in page: sidebar on larger screens, bottom
 * bar on phones, plus the dialogs that belong to the frame itself (admin
 * mode, logs, clear cache).
 */
const AppShell = () => {
  const { isAdmin, isAdminMode, unlockAdminMode, lockAdminMode, logout } = useAuth();
  const navigation = useNavigation();

  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const [adminCode, setAdminCode] = useState("");
  const [adminBusy, setAdminBusy] = useState(false);
  const [logsOpen, setLogsOpen] = useState(false);
  const [clearCacheOpen, setClearCacheOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const toggleAdminMode = useCallback(async () => {
    if (isAdminMode) {
      lockAdminMode();
      setLogsOpen(false);
      toast.success("Admin-tilstand slået fra");
      return;
    }
    // The built-in admin accounts are already verified by their password.
    if (isAdmin) {
      const result = await unlockAdminMode();
      if (result.ok === true) toast.success("Admin-tilstand slået til");
      else toast.error(result.message);
      return;
    }
    setAdminCode("");
    setAdminDialogOpen(true);
  }, [isAdmin, isAdminMode, lockAdminMode, unlockAdminMode]);

  const submitAdminCode = async () => {
    if (!adminCode.trim() || adminBusy) return;
    setAdminBusy(true);
    const result = await unlockAdminMode(adminCode);
    setAdminBusy(false);
    setAdminCode("");
    if (result.ok === true) {
      setAdminDialogOpen(false);
      toast.success("Admin-tilstand slået til");
    } else {
      toast.error(result.message);
    }
  };

  // Ctrl/Cmd + Shift + L opens the logs while admin mode is on.
  useEffect(() => {
    if (!isAdminMode) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "l") {
        event.preventDefault();
        setLogsOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAdminMode]);

  const clearCache = async () => {
    const sessionId = localStorage.getItem("sessionId");
    if (sessionId) {
      try {
        await apiFetch("/sessions", { method: "DELETE", body: JSON.stringify({ sessionId }) });
      } catch {
        // The session expires on its own if this fails.
      }
    }

    document.cookie.split(";").forEach((cookie) => {
      document.cookie = cookie
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
    localStorage.clear();
    window.location.replace("/");
  };

  const shellActions = useMemo<ShellActions>(
    () => ({
      toggleAdminMode,
      openLogs: () => setLogsOpen(true),
      openClearCache: () => setClearCacheOpen(true),
    }),
    [toggleAdminMode],
  );

  // Phones: Forside plus the next three pages; everything else under "Mere".
  const bottomItems = navigation.main.filter((item) => item.to).slice(0, 4);
  const closeMore = () => setMoreOpen(false);

  return (
    <ShellContext.Provider value={shellActions}>
      <div className="min-h-screen md:flex">
        {/* Sidebar (tablet and up) */}
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-7 overflow-y-auto bg-sidebar p-4 text-sidebar-foreground md:flex">
          <div className="flex items-center gap-3 px-2 pt-2">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white">
              <img src={mbLogo} alt="Måløv Boldklub logo" className="h-10 w-10 object-contain" />
            </span>
            <span className="min-w-0">
              <span className="heading-display block text-[1.35rem] text-white">Måløv Boldklub</span>
              <span className="mt-1 block text-[13px]">Administrationsportal</span>
            </span>
          </div>

          <nav aria-label="Hovedmenu" className="flex flex-col gap-1">
            {navigation.main.map((item) => (
              <NavEntry key={item.id} item={item} baseClass={sidebarLink} activeClass={sidebarLinkActive} />
            ))}
          </nav>

          {isAdminMode && (
            <nav aria-label="Admin" className="flex flex-col gap-1">
              <p className="eyebrow px-3 pb-1.5">Admin</p>
              {navigation.admin.map((item) => (
                <NavEntry key={item.id} item={item} baseClass={sidebarLink} activeClass={sidebarLinkActive} />
              ))}
              <button type="button" className={cn(sidebarLink, "w-full text-left")} onClick={() => setLogsOpen(true)}>
                <ScrollText className="h-5 w-5 shrink-0" />
                Logs
              </button>
              <button
                type="button"
                className={cn(sidebarLink, "w-full text-left")}
                onClick={() => setClearCacheOpen(true)}
              >
                <RefreshCw className="h-5 w-5 shrink-0" />
                Ryd cache
              </button>
            </nav>
          )}

          <div className="mt-auto">
            <UserMenu variant="block" />
          </div>
        </aside>

        {/* Page */}
        <div className="min-w-0 flex-1 pb-24 md:pb-0">
          {isAdminMode && (
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 bg-secondary px-4 py-2 text-sm text-secondary-foreground md:px-10">
              <span className="flex items-center gap-2 font-medium">
                <ShieldCheck className="h-4 w-4" />
                Admin-tilstand er slået til
              </span>
              <button
                type="button"
                onClick={toggleAdminMode}
                className="min-h-[32px] rounded font-semibold underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary-foreground"
              >
                Slå fra
              </button>
            </div>
          )}
          <Outlet />
        </div>

        {/* Bottom bar (phones) */}
        <nav
          aria-label="Bundmenu"
          className="safe-area-bottom fixed inset-x-0 bottom-0 z-40 flex border-t bg-card md:hidden"
        >
          {bottomItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.id}
                to={item.to || "/"}
                end={item.to === "/"}
                className={({ isActive }) =>
                  cn(
                    "-mt-px flex min-h-[60px] min-w-0 flex-1 flex-col items-center justify-center gap-1 border-t-[3px] border-transparent px-1 text-xs font-semibold text-muted-foreground",
                    isActive && "border-primary text-primary",
                  )
                }
              >
                <Icon className="h-[22px] w-[22px]" />
                <span className="max-w-full truncate">{item.label}</span>
              </NavLink>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className="-mt-px flex min-h-[60px] min-w-0 flex-1 flex-col items-center justify-center gap-1 border-t-[3px] border-transparent px-1 text-xs font-semibold text-muted-foreground"
          >
            <MoreHorizontal className="h-[22px] w-[22px]" />
            Mere
          </button>
        </nav>

        {/* "Mere" (phones): the whole menu */}
        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl bg-card p-4 pb-8">
            <SheetHeader className="mb-3 text-left">
              <SheetTitle className="heading-display text-2xl">Menu</SheetTitle>
              <SheetDescription className="sr-only">Alle sider og indstillinger</SheetDescription>
            </SheetHeader>
            <nav aria-label="Alle sider" className="flex flex-col gap-1">
              {navigation.main.map((item) => (
                <NavEntry
                  key={item.id}
                  item={item}
                  baseClass={sheetLink}
                  activeClass={sheetLinkActive}
                  onNavigate={closeMore}
                />
              ))}
            </nav>

            {isAdminMode && (
              <nav aria-label="Admin" className="mt-4 flex flex-col gap-1 border-t pt-4">
                <p className="eyebrow px-3 pb-1.5 text-muted-foreground">Admin</p>
                {navigation.admin.map((item) => (
                  <NavEntry
                    key={item.id}
                    item={item}
                    baseClass={sheetLink}
                    activeClass={sheetLinkActive}
                    onNavigate={closeMore}
                  />
                ))}
                <button
                  type="button"
                  className={cn(sheetLink, "w-full text-left")}
                  onClick={() => {
                    closeMore();
                    setLogsOpen(true);
                  }}
                >
                  <ScrollText className="h-5 w-5 shrink-0" />
                  Logs
                </button>
                <button
                  type="button"
                  className={cn(sheetLink, "w-full text-left")}
                  onClick={() => {
                    closeMore();
                    setClearCacheOpen(true);
                  }}
                >
                  <RefreshCw className="h-5 w-5 shrink-0" />
                  Ryd cache
                </button>
              </nav>
            )}

            <div className="mt-4 flex flex-col gap-1 border-t pt-4">
              <button
                type="button"
                className={cn(sheetLink, "w-full text-left")}
                onClick={() => {
                  closeMore();
                  toggleAdminMode();
                }}
              >
                {isAdminMode ? <ShieldOff className="h-5 w-5 shrink-0" /> : <ShieldCheck className="h-5 w-5 shrink-0" />}
                {isAdminMode ? "Slå admin-tilstand fra" : "Slå admin-tilstand til"}
              </button>
              <button
                type="button"
                className={cn(sheetLink, "w-full text-left")}
                onClick={() => {
                  closeMore();
                  logout();
                }}
              >
                <LogOut className="h-5 w-5 shrink-0" />
                Log ud
              </button>
            </div>
          </SheetContent>
        </Sheet>

        {/* Admin code (for users who are not one of the admin accounts) */}
        <Dialog open={adminDialogOpen} onOpenChange={setAdminDialogOpen}>
          <DialogContent className="max-w-[95vw] p-5 sm:max-w-md sm:p-6">
            <DialogHeader>
              <DialogTitle>Admin-tilstand</DialogTitle>
              <DialogDescription>Indtast admin-koden for at slå admin-tilstand til.</DialogDescription>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                submitAdminCode();
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="admin-code">Admin-kode</Label>
                <Input
                  id="admin-code"
                  type="password"
                  autoComplete="off"
                  value={adminCode}
                  onChange={(event) => setAdminCode(event.target.value)}
                  className="h-12"
                  autoFocus
                />
              </div>
              <DialogFooter>
                <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={adminBusy || !adminCode.trim()}>
                  {adminBusy ? "Tjekker..." : "Slå til"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <LogsViewer open={logsOpen} onOpenChange={setLogsOpen} />

        <AlertDialog open={clearCacheOpen} onOpenChange={setClearCacheOpen}>
          <AlertDialogContent className="max-w-[95vw] p-5 sm:max-w-md sm:p-6">
            <AlertDialogHeader>
              <AlertDialogTitle>Ryd cache?</AlertDialogTitle>
              <AlertDialogDescription>
                Det sletter cookies og alt, der er gemt i denne browser, og du bliver logget ud. Har du portalen åben
                i andre faner, skal du selv lukke dem.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col gap-2 sm:flex-row sm:gap-0">
              <AlertDialogCancel className="w-full sm:w-auto">Annuller</AlertDialogCancel>
              <AlertDialogAction onClick={clearCache} className="w-full sm:w-auto">
                Ryd og log ud
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </ShellContext.Provider>
  );
};

export default AppShell;
