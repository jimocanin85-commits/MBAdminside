import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, X, UserPlus, Cloud, Disc, Settings, DoorOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileMenuProps {
  onOpenForm: () => void;
  onOpenExitForm: () => void;
  onShowCloudFiles: () => void;
  onOpenAdminDialog: () => void;
}

const MobileMenu = ({
  onOpenForm,
  onOpenExitForm,
  onShowCloudFiles,
  onOpenAdminDialog,
}: MobileMenuProps) => {
  const [open, setOpen] = useState(false);

  const menuItems = [
    {
      label: "Opret Frivillig",
      icon: UserPlus,
      onClick: () => {
        onOpenForm();
        setOpen(false);
      },
    },
    {
      label: "Exit Form",
      icon: DoorOpen,
      onClick: () => {
        onOpenExitForm();
        setOpen(false);
      },
    },
    {
      label: "Cloud Filer",
      icon: Cloud,
      onClick: () => {
        onShowCloudFiles();
        setOpen(false);
      },
    },
    {
      label: "Årshjul",
      icon: Disc,
      onClick: () => {
        setOpen(false);
      },
    },
    {
      label: "Indstillinger",
      icon: Settings,
      onClick: () => {
        onOpenAdminDialog();
        setOpen(false);
      },
    },
  ];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden min-h-[44px] min-w-[44px]"
          aria-label="Open menu"
        >
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] sm:w-[320px] p-0">
        <div className="flex flex-col h-full">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Menu</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
                className="min-h-[44px] min-w-[44px]"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
          <nav className="flex-1 overflow-y-auto p-4">
            <ul className="space-y-2">
              {menuItems.map((item, index) => {
                const Icon = item.icon;
                return (
                  <li key={index}>
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-3 h-12 text-base"
                      onClick={item.onClick}
                    >
                      <Icon className="h-5 w-5" />
                      {item.label}
                    </Button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MobileMenu;

