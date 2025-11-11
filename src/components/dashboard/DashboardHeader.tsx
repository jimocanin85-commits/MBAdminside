import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import mbLogo from "@/assets/mb-logo.png";

interface DashboardHeaderProps {
  onLogout: () => void;
}

const DashboardHeader = ({ onLogout }: DashboardHeaderProps) => {
  return (
    <header className="border-b-2 bg-card shadow-sm">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 md:gap-4 min-w-0">
          <img src={mbLogo} alt="Måløv Boldklub Logo" className="w-10 h-10 md:w-12 md:h-12 flex-shrink-0" />
          <div className="min-w-0">
            <h1 className="text-lg md:text-2xl font-bold truncate">Måløv Boldklub</h1>
          </div>
        </div>
        <Button variant="outline" onClick={onLogout} className="gap-2 flex-shrink-0 min-h-[44px]">
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Log ud</span>
        </Button>
      </div>
    </header>
  );
};

export default DashboardHeader;
