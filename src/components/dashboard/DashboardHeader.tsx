import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import mbLogo from "@/assets/mb-logo.png";

interface DashboardHeaderProps {
  onLogout: () => void;
}

const DashboardHeader = ({ onLogout }: DashboardHeaderProps) => {
  return (
    <header className="border-b-2 bg-card shadow-sm">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img src={mbLogo} alt="Måløv Boldklub Logo" className="w-12 h-12" />
          <div>
            <h1 className="text-2xl font-bold">Måløv Boldklub</h1>
            <p className="text-sm text-muted-foreground">Administrations Portal</p>
          </div>
        </div>
        <Button variant="outline" onClick={onLogout} className="gap-2">
          <LogOut className="h-4 w-4" />
          Log ud
        </Button>
      </div>
    </header>
  );
};

export default DashboardHeader;
