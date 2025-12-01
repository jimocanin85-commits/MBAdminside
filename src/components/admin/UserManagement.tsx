import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { User, CreateUserDialog } from "./CreateUserDialog";
import { EditUserDialog } from "./EditUserDialog";
import { Trash2, UserX, UserCheck, Plus, Edit } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent } from "@/components/ui/card";

interface UserManagementProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const HARDCODED_USERS = ['admin', 'Brian']; // Admin and Brian are system users

export const UserManagement = ({ open, onOpenChange }: UserManagementProps) => {
  const [users, setUsers] = useState<User[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [userToDeactivate, setUserToDeactivate] = useState<User | null>(null);
  const [userToActivate, setUserToActivate] = useState<User | null>(null);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);

  const loadUsers = () => {
    try {
      const customUsersJson = localStorage.getItem('customUsers');
      console.log('UserManagement - Loading users from localStorage:', customUsersJson);
      if (customUsersJson) {
        const customUsers: User[] = JSON.parse(customUsersJson);
        console.log('UserManagement - Parsed customUsers:', customUsers);
        // Convert createdAt strings back to Date objects
        // Show all users including Karina and Kyhl
        const usersWithDates = customUsers.map(user => ({
          ...user,
          createdAt: new Date(user.createdAt)
        }));
        console.log('UserManagement - Setting users:', usersWithDates);
        setUsers(usersWithDates);
      } else {
        console.log('UserManagement - No customUsers found in localStorage');
        setUsers([]);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      setUsers([]);
    }
  };

  useEffect(() => {
    if (open) {
      console.log('UserManagement - Dialog opened, loading users...');
      loadUsers();
    }
  }, [open]);

  // Debug: Log users when they change
  useEffect(() => {
    console.log('UserManagement - Users state changed:', users.length, 'users');
    users.forEach((user, index) => {
      console.log(`UserManagement - User ${index}:`, user.username, user.firstName, user.lastName);
    });
  }, [users]);

  const handleUserCreated = (newUser: User) => {
    loadUsers();
    setShowCreateDialog(false);
  };

  const handleDeleteUser = (user: User) => {
    try {
      const customUsersJson = localStorage.getItem('customUsers');
      if (customUsersJson) {
        const customUsers: User[] = JSON.parse(customUsersJson);
        const updatedUsers = customUsers.filter(u => u.id !== user.id);
        localStorage.setItem('customUsers', JSON.stringify(updatedUsers));
        loadUsers();
        toast.success(`Bruger "${user.username}" er slettet`);
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Kunne ikke slette bruger');
    }
    setUserToDelete(null);
  };

  const handleDeactivateUser = (user: User) => {
    try {
      const customUsersJson = localStorage.getItem('customUsers');
      if (customUsersJson) {
        const customUsers: User[] = JSON.parse(customUsersJson);
        const updatedUsers = customUsers.map(u => 
          u.id === user.id ? { ...u, isActive: false } : u
        );
        localStorage.setItem('customUsers', JSON.stringify(updatedUsers));
        loadUsers();
        toast.success(`Bruger "${user.username}" er deaktiveret`);
      }
    } catch (error) {
      console.error('Error deactivating user:', error);
      toast.error('Kunne ikke deaktivere bruger');
    }
    setUserToDeactivate(null);
  };

  const handleActivateUser = (user: User) => {
    try {
      const customUsersJson = localStorage.getItem('customUsers');
      if (customUsersJson) {
        const customUsers: User[] = JSON.parse(customUsersJson);
        const updatedUsers = customUsers.map(u => 
          u.id === user.id ? { ...u, isActive: true } : u
        );
        localStorage.setItem('customUsers', JSON.stringify(updatedUsers));
        loadUsers();
        toast.success(`Bruger "${user.username}" er aktiveret`);
      }
    } catch (error) {
      console.error('Error activating user:', error);
      toast.error('Kunne ikke aktivere bruger');
    }
    setUserToActivate(null);
  };

  const isUserActive = (user: User) => {
    return user.isActive !== false; // Default to active if not set
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] flex flex-col p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Brugerstyring</DialogTitle>
            <DialogDescription>
              Administrer brugere i portalen - opret, rediger, deaktiver eller slet brugere
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4">
            {/* Create User Button */}
            <div className="flex justify-end">
              <Button onClick={() => setShowCreateDialog(true)} className="gap-2 w-full sm:w-auto">
                <Plus className="h-4 w-4" />
                Opret ny bruger
              </Button>
            </div>

            {/* Hardcoded Users Section */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                Systembrugere (kan ikke redigeres)
              </h3>
              <div className="space-y-2">
                {HARDCODED_USERS.map((username) => (
                  <Card key={username}>
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex-1">
                          <p className="font-medium">{username}</p>
                          <p className="text-sm text-muted-foreground">
                            {username === 'admin' || username === 'Brian' 
                              ? 'Alle rettigheder' 
                              : 'Standard bruger'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-muted-foreground bg-green-100 text-green-800 px-2 py-1 rounded">
                            Aktiv
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Custom Users Section */}
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                Almindelige brugere ({users.length})
              </h3>
              {users.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground">Ingen brugere oprettet endnu</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Klik på "Opret ny bruger" for at tilføje en bruger
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {users.map((user) => {
                    const active = isUserActive(user);
                    return (
                      <Card key={user.id} className={!active ? 'opacity-60' : ''}>
                        <CardContent className="p-4">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-medium truncate">
                                  {user.firstName} {user.lastName}
                                </p>
                                {!active && (
                                  <span className="text-xs text-muted-foreground bg-gray-100 text-gray-800 px-2 py-1 rounded shrink-0">
                                    Deaktiveret
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground truncate">
                                Brugernavn: {user.username}
                              </p>
                              <div className="mt-2">
                                <p className="text-xs text-muted-foreground mb-1">Adgangsrettigheder:</p>
                                <div className="flex flex-wrap gap-1">
                                  {user.permissions.length > 0 ? (
                                    user.permissions.map((perm) => (
                                      <span
                                        key={perm}
                                        className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded"
                                      >
                                        {perm === 'frivillig' && 'Frivillig'}
                                        {perm === 'aarshjul' && 'Årshjul'}
                                        {perm === 'referater' && 'Referater'}
                                        {perm === 'frivilligfest' && 'Frivilligfest'}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-xs text-muted-foreground">Ingen rettigheder</span>
                                  )}
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground mt-2">
                                Oprettet: {new Date(user.createdAt).toLocaleDateString('da-DK')}
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 shrink-0">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setUserToEdit(user)}
                                className="gap-2 flex-1 sm:flex-initial"
                              >
                                <Edit className="h-4 w-4" />
                                <span className="sm:hidden">Red.</span>
                                <span className="hidden sm:inline">Rediger</span>
                              </Button>
                              {active ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setUserToDeactivate(user)}
                                  className="gap-2 flex-1 sm:flex-initial"
                                >
                                  <UserX className="h-4 w-4" />
                                  <span className="hidden sm:inline">Deaktiver</span>
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setUserToActivate(user)}
                                  className="gap-2 flex-1 sm:flex-initial"
                                >
                                  <UserCheck className="h-4 w-4" />
                                  <span className="hidden sm:inline">Aktiver</span>
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setUserToDelete(user)}
                                className="gap-2 text-destructive hover:text-destructive flex-1 sm:flex-initial"
                              >
                                <Trash2 className="h-4 w-4" />
                                <span className="hidden sm:inline">Slet</span>
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create User Dialog */}
      <CreateUserDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onUserCreated={handleUserCreated}
      />

      {/* Edit User Dialog */}
      <EditUserDialog
        open={!!userToEdit}
        onOpenChange={(open) => !open && setUserToEdit(null)}
        user={userToEdit}
        onUserUpdated={() => {
          loadUsers();
          setUserToEdit(null);
        }}
      />

      {/* Delete User Confirmation */}
      <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <AlertDialogContent className="max-w-[95vw] sm:max-w-md p-4 sm:p-6">
          <AlertDialogHeader>
            <AlertDialogTitle>Er du sikker?</AlertDialogTitle>
            <AlertDialogDescription>
              Dette vil permanent slette brugeren "{userToDelete?.username}". 
              Denne handling kan ikke fortrydes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <AlertDialogCancel className="w-full sm:w-auto">Annuller</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => userToDelete && handleDeleteUser(userToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 w-full sm:w-auto"
            >
              Slet
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Deactivate User Confirmation */}
      <AlertDialog open={!!userToDeactivate} onOpenChange={() => setUserToDeactivate(null)}>
        <AlertDialogContent className="max-w-[95vw] sm:max-w-md p-4 sm:p-6">
          <AlertDialogHeader>
            <AlertDialogTitle>Deaktiver bruger?</AlertDialogTitle>
            <AlertDialogDescription>
              Brugeren "{userToDeactivate?.username}" vil ikke længere kunne logge ind. 
              Du kan aktivere brugeren igen senere.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <AlertDialogCancel className="w-full sm:w-auto">Annuller</AlertDialogCancel>
            <AlertDialogAction onClick={() => userToDeactivate && handleDeactivateUser(userToDeactivate)} className="w-full sm:w-auto">
              Deaktiver
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Activate User Confirmation */}
      <AlertDialog open={!!userToActivate} onOpenChange={() => setUserToActivate(null)}>
        <AlertDialogContent className="max-w-[95vw] sm:max-w-md p-4 sm:p-6">
          <AlertDialogHeader>
            <AlertDialogTitle>Aktiver bruger?</AlertDialogTitle>
            <AlertDialogDescription>
              Brugeren "{userToActivate?.username}" vil igen kunne logge ind.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <AlertDialogCancel className="w-full sm:w-auto">Annuller</AlertDialogCancel>
            <AlertDialogAction onClick={() => userToActivate && handleActivateUser(userToActivate)} className="w-full sm:w-auto">
              Aktiver
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
