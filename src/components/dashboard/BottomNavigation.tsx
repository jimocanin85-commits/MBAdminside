import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomNavigationProps {
  currentView: "home" | "cloud" | "form" | "settings";
  onNavigate: (view: "home" | "cloud" | "form" | "settings") => void;
  onOpenForm: () => void;
  onShowCloudFiles: () => void;
  onOpenAdminDialog: () => void;
}

const BottomNavigation = ({
  currentView,
  onNavigate,
  onOpenForm,
  onShowCloudFiles,
  onOpenAdminDialog,
}: BottomNavigationProps) => {
  const navItems = [
    {
      id: "settings" as const,
      label: "Indstillinger",
      icon: Settings,
      onClick: () => {
        onOpenAdminDialog();
        onNavigate("settings");
      },
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t-2 z-50 md:hidden safe-area-bottom">
      <div className="flex justify-end h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={item.onClick}
              className={cn(
                "flex flex-col items-center justify-center gap-1 transition-colors min-h-[44px] px-6",
                isActive
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
              aria-label={item.label}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNavigation;

