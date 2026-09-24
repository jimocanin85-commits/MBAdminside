import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  password: string;
  permissions: string[];
  createdAt: Date;
  isActive?: boolean; // Optional - defaults to true
}

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserCreated: (user: User) => void;
  useCloud?: boolean;
}

const PERMISSION_OPTIONS = [
  { value: 'frivillig', label: 'Frivillig (Opret, Exit, Cloud Filer)' },
  { value: 'referater', label: 'Referater fra Bestyrelsesmøder' },
  { value: 'frivilligfest', label: 'Frivilligfest 2026' },
  { value: 'aarshjul', label: 'Årshjul (Opgavestyring)' },
];

const API_BASE = '/api';

export const CreateUserDialog = ({ open, onOpenChange, onUserCreated, useCloud = true }: CreateUserDialogProps) => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !username.trim() || !password.trim()) {
      toast.error("Alle felter skal udfyldes");
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast.error("Indtast en gyldig email adresse");
      return;
    }

    if (password.length < 4) {
      toast.error("Adgangskode skal være mindst 4 tegn");
      return;
    }

    if (selectedPermissions.length === 0) {
      toast.error("Vælg mindst én adgangsrettighed");
      return;
    }

    // Check reserved usernames
    const reservedUsers = ['admin', 'Brian'];
    if (reservedUsers.includes(username.trim())) {
      toast.error("Brugernavn er reserveret");
      return;
    }

    setIsSubmitting(true);

    try {
      let newUser: User;

      if (useCloud) {
        // Create via API (Supabase)
        const response = await fetch(`${API_BASE}/users`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('sessionId')}`
          },
          body: JSON.stringify({
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: email.trim(),
            username: username.trim(),
            password: password.trim(),
            permissions: selectedPermissions,
            isActive: true
          })
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to create user');
        }

        newUser = {
          ...result.data,
          createdAt: new Date(result.data.createdAt)
        };

        // Also save to localStorage as backup
        const existingUsers = JSON.parse(localStorage.getItem('customUsers') || '[]');
        existingUsers.push({
          ...newUser,
          createdAt: newUser.createdAt.toISOString()
        });
        localStorage.setItem('customUsers', JSON.stringify(existingUsers));
      } else {
        // Create locally only
        const existingUsers = JSON.parse(localStorage.getItem('customUsers') || '[]');
        
        if (existingUsers.some((u: User) => u.username === username.trim())) {
          toast.error("Brugernavn findes allerede");
          setIsSubmitting(false);
          return;
        }

        newUser = {
          id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          username: username.trim(),
          password: password.trim(),
          permissions: selectedPermissions,
          createdAt: new Date(),
          isActive: true
        };

        existingUsers.push({
          ...newUser,
          createdAt: newUser.createdAt.toISOString()
        });
        localStorage.setItem('customUsers', JSON.stringify(existingUsers));
      }

      toast.success(`Bruger "${newUser.username}" oprettet!`);

      // Reset form
      setFirstName("");
      setLastName("");
      setEmail("");
      setUsername("");
      setPassword("");
      setSelectedPermissions([]);

      // Notify parent
      onUserCreated(newUser);
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error(error instanceof Error ? error.message : 'Kunne ikke oprette bruger');
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Opret ny bruger</DialogTitle>
          <DialogDescription>
            Opret en ny bruger med valgte adgangsrettigheder
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">Fornavn</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Fornavn"
                required
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Efternavn</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Efternavn"
                required
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="bruger@email.dk"
              required
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              Bruges til notifikationer når opgaver tildeles
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="username">Brugernavn</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Brugernavn"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Adgangskode</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Adgangskode"
              required
              minLength={4}
              disabled={isSubmitting}
            />
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
                  Opretter...
                </>
              ) : (
                'Opret bruger'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
