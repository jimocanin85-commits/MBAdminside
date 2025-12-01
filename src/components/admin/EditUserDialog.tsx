import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { User } from "./CreateUserDialog";

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  onUserUpdated: () => void;
}

const PERMISSION_OPTIONS = [
  { value: 'frivillig', label: 'Frivillig (Opret, Exit, Cloud Filer)' },
  { value: 'aarshjul', label: 'Årshjul' },
  { value: 'referater', label: 'Referater fra Bestyrelsesmøder' },
  { value: 'frivilligfest', label: 'Frivilligfest 2026' },
];

export const EditUserDialog = ({ open, onOpenChange, user, onUserUpdated }: EditUserDialogProps) => {
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  useEffect(() => {
    if (user && open) {
      setSelectedPermissions(user.permissions || []);
    }
  }, [user, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;

    if (selectedPermissions.length === 0) {
      toast.error("Vælg mindst én adgangsrettighed");
      return;
    }

    try {
      const customUsersJson = localStorage.getItem('customUsers');
      if (customUsersJson) {
        const customUsers: User[] = JSON.parse(customUsersJson);
        const updatedUsers = customUsers.map(u => 
          u.id === user.id 
            ? { ...u, permissions: selectedPermissions }
            : u
        );
        localStorage.setItem('customUsers', JSON.stringify(updatedUsers));
        toast.success(`Rettigheder for "${user.username}" er opdateret!`);
        onUserUpdated();
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Kunne ikke opdatere bruger');
    }
  };

  const togglePermission = (permission: string) => {
    setSelectedPermissions(prev => 
      prev.includes(permission)
        ? prev.filter(p => p !== permission)
        : [...prev, permission]
    );
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Rediger rettigheder</DialogTitle>
          <DialogDescription>
            Opdater adgangsrettigheder for {user.firstName} {user.lastName} ({user.username})
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Adgangsrettigheder</Label>
            <div className="space-y-2 border rounded-lg p-3 max-h-48 overflow-y-auto">
              {PERMISSION_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center space-x-2 cursor-pointer hover:bg-muted/50 p-2 rounded"
                >
                  <input
                    type="checkbox"
                    checked={selectedPermissions.includes(option.value)}
                    onChange={() => togglePermission(option.value)}
                    className="rounded"
                  />
                  <span className="text-sm">{option.label}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Vælg hvilke funktioner brugeren skal have adgang til
            </p>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
              Annuller
            </Button>
            <Button type="submit" className="w-full sm:w-auto">
              Gem ændringer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
