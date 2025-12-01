import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  password: string;
  permissions: string[];
  createdAt: Date;
}

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserCreated: (user: User) => void;
}

const PERMISSION_OPTIONS = [
  { value: 'frivillig', label: 'Frivillig (Opret, Exit, Cloud Filer)' },
  { value: 'aarshjul', label: 'Årshjul' },
  { value: 'referater', label: 'Referater fra Bestyrelsesmøder' },
  { value: 'frivilligfest', label: 'Frivilligfest 2026' },
];

export const CreateUserDialog = ({ open, onOpenChange, onUserCreated }: CreateUserDialogProps) => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!firstName.trim() || !lastName.trim() || !username.trim() || !password.trim()) {
      toast.error("Alle felter skal udfyldes");
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

    // Check if username already exists
    const existingUsers = JSON.parse(localStorage.getItem('customUsers') || '[]');
    const hardcodedUsers = ['admin', 'Karina', 'Brian'];
    
    if (existingUsers.some((u: User) => u.username === username.trim()) || 
        hardcodedUsers.includes(username.trim())) {
      toast.error("Brugernavn findes allerede");
      return;
    }

    // Create new user
    const newUser: User = {
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      username: username.trim(),
      password: password.trim(),
      permissions: selectedPermissions,
      createdAt: new Date()
    };

    // Save to localStorage
    existingUsers.push(newUser);
    localStorage.setItem('customUsers', JSON.stringify(existingUsers));

    toast.success(`Bruger "${newUser.username}" oprettet!`);

    // Reset form
    setFirstName("");
    setLastName("");
    setUsername("");
    setPassword("");
    setSelectedPermissions([]);

    // Notify parent
    onUserCreated(newUser);
    onOpenChange(false);
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Opret ny bruger</DialogTitle>
          <DialogDescription>
            Opret en ny bruger med valgte adgangsrettigheder
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">Fornavn</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Fornavn"
                required
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
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="username">Brugernavn</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Brugernavn"
              required
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
                  />
                  <span className="text-sm">{option.label}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Vælg hvilke funktioner brugeren skal have adgang til
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuller
            </Button>
            <Button type="submit">
              Opret bruger
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
