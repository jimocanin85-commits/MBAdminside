import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { User } from "./CreateUserDialog";
import { Loader2 } from "lucide-react";

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  onUserUpdated: () => void;
  useCloud?: boolean;
}

const PERMISSION_OPTIONS = [
  { value: 'frivillig', label: 'Frivillig (Opret, Exit, Cloud Filer)' },
  { value: 'referater', label: 'Referater fra Bestyrelsesmøder' },
  { value: 'frivilligfest', label: 'Frivilligfest 2026' },
  { value: 'aarshjul', label: 'Årshjul (Opgavestyring)' },
];

const API_BASE = '/api';

export const EditUserDialog = ({ open, onOpenChange, user, onUserUpdated, useCloud = true }: EditUserDialogProps) => {
  const [email, setEmail] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user && open) {
      setEmail(user.email || "");
      setSelectedPermissions(user.permissions || []);
    }
  }, [user, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;

    // Email validation
    if (email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        toast.error("Indtast en gyldig email adresse");
        return;
      }
    }

    if (selectedPermissions.length === 0) {
      toast.error("Vælg mindst én adgangsrettighed");
      return;
    }

    setIsSubmitting(true);

    try {
      if (useCloud) {
        // Update via API (Supabase)
        const response = await fetch(`${API_BASE}/users`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: user.id,
            email: email.trim(),
            permissions: selectedPermissions
          })
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to update user');
        }
      }

      // Also update localStorage
      const customUsersJson = localStorage.getItem('customUsers');
      if (customUsersJson) {
        const customUsers: User[] = JSON.parse(customUsersJson);
        const updatedUsers = customUsers.map(u => 
          u.id === user.id 
            ? { ...u, email: email.trim(), permissions: selectedPermissions }
            : u
        );
        localStorage.setItem('customUsers', JSON.stringify(updatedUsers));
      }

      toast.success(`Bruger "${user.username}" er opdateret!`);
      onUserUpdated();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error(error instanceof Error ? error.message : 'Kunne ikke opdatere bruger');
    } finally {
      setIsSubmitting(false);
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
            <Label htmlFor="edit-email">Email</Label>
            <Input
              id="edit-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="bruger@email.dk"
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              Bruges til notifikationer når opgaver tildeles
            </p>
          </div>

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
                    disabled={isSubmitting}
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
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)} 
              className="w-full sm:w-auto"
              disabled={isSubmitting}
            >
              Annuller
            </Button>
            <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Gemmer...
                </>
              ) : (
                'Gem ændringer'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
