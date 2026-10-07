import { LogOut, Moon, RefreshCw, ScrollText, ShieldCheck, ShieldOff, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/AuthContext";
import { useShell } from "@/components/layout/ShellContext";
import { cn } from "@/lib/utils";

interface UserMenuProps {
  /** "block" shows name and status (sidebar); "compact" is just the avatar. */
  variant?: "block" | "compact";
  className?: string;
}

const initials = (name: string | null) => (name || "?").trim().slice(0, 2).toUpperCase();

const UserMenu = ({ variant = "compact", className }: UserMenuProps) => {
  const { username, isAdminMode, logout } = useAuth();
  const { toggleAdminMode, openLogs, openClearCache } = useShell();
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const avatar = (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sidebar-primary font-display text-lg font-bold text-sidebar-primary-foreground">
      {initials(username)}
    </span>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {variant === "block" ? (
          <button
            type="button"
            className={cn(
              "flex w-full items-center gap-3 rounded-xl bg-sidebar-accent p-3 text-left text-sidebar-accent-foreground transition-colors hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
              className,
            )}
          >
            {avatar}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-semibold">{username}</span>
              <span className="block text-[13px] text-sidebar-foreground">
                {isAdminMode ? "Admin-tilstand" : "Logget ind"}
              </span>
            </span>
          </button>
        ) : (
          <button
            type="button"
            aria-label="Åbn brugermenu"
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground",
              className,
            )}
          >
            {avatar}
          </button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side={variant === "block" ? "top" : "bottom"} className="w-60">
        <DropdownMenuLabel className="font-normal">
          <span className="block text-xs text-muted-foreground">Logget ind som</span>
          <span className="block truncate font-semibold">{username}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={toggleAdminMode} className="min-h-[44px] cursor-pointer gap-3">
          {isAdminMode ? <ShieldOff className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
          {isAdminMode ? "Slå admin-tilstand fra" : "Slå admin-tilstand til"}
        </DropdownMenuItem>
        {isAdminMode && (
          <>
            <DropdownMenuItem onSelect={openLogs} className="min-h-[44px] cursor-pointer gap-3">
              <ScrollText className="h-4 w-4" />
              Logs
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={openClearCache} className="min-h-[44px] cursor-pointer gap-3">
              <RefreshCw className="h-4 w-4" />
              Ryd cache
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuItem
          onSelect={() => setTheme(isDark ? "light" : "dark")}
          className="min-h-[44px] cursor-pointer gap-3"
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {isDark ? "Lyst tema" : "Mørkt tema"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => logout()} className="min-h-[44px] cursor-pointer gap-3">
          <LogOut className="h-4 w-4" />
          Log ud
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserMenu;
