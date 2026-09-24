import { useEffect, type ComponentType } from "react";
import { Button } from "@/components/ui/button";
import { Settings, Users, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomNavigationProps {
  currentView: "home" | "cloud" | "form" | "settings";
  onNavigate: (view: "home" | "cloud" | "form" | "settings") => void;
  onOpenForm: () => void;
  onShowCloudFiles: () => void;
  onOpenAdminDialog: () => void;
  isAdminMode?: boolean;
  onOpenUserManagement?: () => void;
  onOpenLogsViewer?: () => void;
  onOpenClearCache?: () => void;
}

const BottomNavigation = ({
  currentView,
  onNavigate,
  onOpenForm,
  onShowCloudFiles,
  onOpenAdminDialog,
  isAdminMode = false,
  onOpenUserManagement,
  onOpenLogsViewer,
  onOpenClearCache,
}: BottomNavigationProps) => {
  const baseNavItems = [
    {
      id: "settings" as const,
      label: "Admin",
      icon: Settings,
      onClick: () => {
        onOpenAdminDialog();
        onNavigate("settings");
      },
    },
  ];

  // Removed debug logging

  const adminNavItems = isAdminMode ? [
    {
      id: "users" as const,
      label: "Brugere",
      icon: Users,
      onClick: () => {
        if (onOpenUserManagement) {
          onOpenUserManagement();
        }
      },
    },
    {
      id: "logs" as const,
      label: "Logs",
      icon: ({ className }: { className?: string }) => (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      onClick: () => {
        if (onOpenLogsViewer) {
          onOpenLogsViewer();
        }
      },
    },
    {
      id: "cache" as const,
      label: "Cache",
      icon: RefreshCw,
      onClick: () => {
        if (onOpenClearCache) {
          onOpenClearCache();
        }
      },
    },
  ] : [];

  const navItems = [...baseNavItems, ...adminNavItems];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t-2 z-50 md:hidden safe-area-bottom">
      {isAdminMode && (
        <div className="px-4 py-1 bg-primary/10 border-b border-primary/20">
          <p className="text-xs font-medium text-primary text-center">Admin Mode Aktiveret</p>
        </div>
      )}
      <div className="flex justify-end h-16 overflow-x-auto">
        {navItems.length === 0 && (
          <div className="flex items-center justify-center px-4 text-xs text-muted-foreground">
            No nav items (isAdminMode: {String(isAdminMode)})
          </div>
        )}
        {navItems.map((item) => {
          const Icon: ComponentType<{ className?: string }> = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={item.onClick}
              className={cn(
                "flex flex-col items-center justify-center gap-1 transition-colors min-h-[44px] px-4 sm:px-6 shrink-0",
                isActive
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
              aria-label={item.label}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium whitespace-nowrap">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNavigation;

