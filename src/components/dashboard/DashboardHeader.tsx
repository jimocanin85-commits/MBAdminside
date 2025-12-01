import { Button } from "@/components/ui/button";
import { LogOut, FileText } from "lucide-react";
import mbLogo from "@/assets/mb-logo.png";

interface DashboardHeaderProps {
  onLogout: () => void;
  onOpenForm: () => void;
  onOpenExitForm: () => void;
  onShowCloudFiles: () => void;
  onOpenAdminDialog: () => void;
  onOpenLogs?: () => void;
  currentUser?: string | null;
}

const DashboardHeader = ({ 
  onLogout, 
  onOpenForm, 
  onOpenExitForm, 
  onShowCloudFiles, 
  onOpenAdminDialog,
  onOpenLogs,
  currentUser
}: DashboardHeaderProps) => {
  return (
    <header className="sticky top-0 z-40 border-b-2 bg-card shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/95">
      <div className="container mx-auto px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
          <img 
            src={mbLogo} 
            alt="Måløv Boldklub Logo" 
            className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 flex-shrink-0" 
          />
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg md:text-2xl font-bold truncate">Måløv Boldklub</h1>
            {currentUser && (
              <p className="text-xs sm:text-sm text-muted-foreground truncate">
                Logget ind som: {currentUser}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {onOpenLogs && (
            <Button 
              variant="outline" 
              onClick={onOpenLogs} 
              className="gap-2 min-h-[44px] px-3 sm:px-4"
              title="Vis Logs (Ctrl+Shift+L)"
            >
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Logs</span>
            </Button>
          )}
          <Button 
            variant="outline" 
            onClick={onLogout} 
            className="gap-2 min-h-[44px] px-3 sm:px-4"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Log ud</span>
          </Button>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
