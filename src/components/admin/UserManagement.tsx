import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { User, CreateUserDialog } from "./CreateUserDialog";
import { EditUserDialog } from "./EditUserDialog";
import { Trash2, UserX, UserCheck, Plus, Edit, RefreshCw, Cloud, Database, Mail, Unlock, Monitor, Clock } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface UserManagementProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SystemUserEmails {
  [username: string]: string;
}

interface ActiveSession {
  id: string;
  username: string;
  session_id: string;
  created_at: string;
  last_activity: string;
  user_agent?: string;
  is_locked: boolean;
}

const HARDCODED_USERS = ['admin', 'Brian']; // Admin and Brian are system users
const SYSTEM_EMAILS_KEY = 'systemUserEmails';

// API base URL
const API_BASE = '/api';

export const UserManagement = ({ open, onOpenChange }: UserManagementProps) => {
  const [users, setUsers] = useState<User[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [userToDeactivate, setUserToDeactivate] = useState<User | null>(null);
  const [userToActivate, setUserToActivate] = useState<User | null>(null);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [useCloud, setUseCloud] = useState(true); // Default to cloud/Supabase
  const [cloudError, setCloudError] = useState<string | null>(null);
  
  // System user email editing
  const [systemUserEmails, setSystemUserEmails] = useState<SystemUserEmails>({});
  const [systemUserToEdit, setSystemUserToEdit] = useState<string | null>(null);
  const [editingSystemEmail, setEditingSystemEmail] = useState("");
  
  // Active sessions management
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionToUnlock, setSessionToUnlock] = useState<ActiveSession | null>(null);
  const [activeTab, setActiveTab] = useState("users");

  // Load users from API (Supabase)
  const loadUsersFromCloud = async () => {
    try {
      setIsLoading(true);
      setCloudError(null);
      
      const response = await fetch(`${API_BASE}/users`);
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to load users from cloud');
      }
      
      if (result.success && result.data) {
        const usersWithDates = result.data.map((user: any) => ({
          ...user,
          createdAt: new Date(user.createdAt)
        }));
        setUsers(usersWithDates);
        
        // Also sync to localStorage as backup
        localStorage.setItem('customUsers', JSON.stringify(result.data));
      }
    } catch (error) {
      console.error('Error loading users from cloud:', error);
      setCloudError(error instanceof Error ? error.message : 'Unknown error');
      // Fallback to localStorage
      loadUsersFromLocalStorage();
    } finally {
      setIsLoading(false);
    }
  };

  // Load users from localStorage (fallback)
  const loadUsersFromLocalStorage = () => {
    try {
      const customUsersJson = localStorage.getItem('customUsers');
      if (customUsersJson) {
        const customUsers: User[] = JSON.parse(customUsersJson);
        const usersWithDates = customUsers.map(user => ({
          ...user,
          createdAt: new Date(user.createdAt)
        }));
        setUsers(usersWithDates);
      } else {
        setUsers([]);
      }
    } catch (error) {
      console.error('Error loading users from localStorage:', error);
      setUsers([]);
    }
  };

  // Main load function
  const loadUsers = async () => {
    if (useCloud) {
      await loadUsersFromCloud();
    } else {
      loadUsersFromLocalStorage();
    }
  };

  const handleUserCreated = async (newUser: User) => {
    if (useCloud && !cloudError) {
      // User was already created via API in CreateUserDialog
      await loadUsers();
    } else {
      // Fallback: reload from localStorage
      loadUsersFromLocalStorage();
    }
    setShowCreateDialog(false);
  };

  const handleDeleteUser = async (user: User) => {
    try {
      if (useCloud && !cloudError) {
        const response = await fetch(`${API_BASE}/users`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: user.id })
        });
        
        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.error || 'Failed to delete user');
        }
      }
      
      // Also update localStorage
      const customUsersJson = localStorage.getItem('customUsers');
      if (customUsersJson) {
        const customUsers: User[] = JSON.parse(customUsersJson);
        const updatedUsers = customUsers.filter(u => u.id !== user.id);
        localStorage.setItem('customUsers', JSON.stringify(updatedUsers));
      }
      
      await loadUsers();
      toast.success(`Bruger "${user.username}" er slettet`);
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Kunne ikke slette bruger');
    }
    setUserToDelete(null);
  };

  const handleDeactivateUser = async (user: User) => {
    try {
      if (useCloud && !cloudError) {
        const response = await fetch(`${API_BASE}/users`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: user.id, isActive: false })
        });
        
        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.error || 'Failed to deactivate user');
        }
      }
      
      // Also update localStorage
      const customUsersJson = localStorage.getItem('customUsers');
      if (customUsersJson) {
        const customUsers: User[] = JSON.parse(customUsersJson);
        const updatedUsers = customUsers.map(u => 
          u.id === user.id ? { ...u, isActive: false } : u
        );
        localStorage.setItem('customUsers', JSON.stringify(updatedUsers));
      }
      
      await loadUsers();
      toast.success(`Bruger "${user.username}" er deaktiveret`);
    } catch (error) {
      console.error('Error deactivating user:', error);
      toast.error('Kunne ikke deaktivere bruger');
    }
    setUserToDeactivate(null);
  };

  const handleActivateUser = async (user: User) => {
    try {
      if (useCloud && !cloudError) {
        const response = await fetch(`${API_BASE}/users`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: user.id, isActive: true })
        });
        
        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.error || 'Failed to activate user');
        }
      }
      
      // Also update localStorage
      const customUsersJson = localStorage.getItem('customUsers');
      if (customUsersJson) {
        const customUsers: User[] = JSON.parse(customUsersJson);
        const updatedUsers = customUsers.map(u => 
          u.id === user.id ? { ...u, isActive: true } : u
        );
        localStorage.setItem('customUsers', JSON.stringify(updatedUsers));
      }
      
      await loadUsers();
      toast.success(`Bruger "${user.username}" er aktiveret`);
    } catch (error) {
      console.error('Error activating user:', error);
      toast.error('Kunne ikke aktivere bruger');
    }
    setUserToActivate(null);
  };

  const isUserActive = (user: User) => {
    return user.isActive !== false; // Default to active if not set
  };

  // Sync localStorage users to cloud
  const syncToCloud = async () => {
    try {
      setIsLoading(true);
      const customUsersJson = localStorage.getItem('customUsers');
      if (!customUsersJson) {
        toast.info('Ingen lokale brugere at synkronisere');
        return;
      }
      
      const localUsers: User[] = JSON.parse(customUsersJson);
      let syncedCount = 0;
      
      for (const user of localUsers) {
        try {
          const response = await fetch(`${API_BASE}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              firstName: user.firstName,
              lastName: user.lastName,
              username: user.username,
              password: user.password,
              permissions: user.permissions,
              isActive: user.isActive
            })
          });
          
          if (response.ok) {
            syncedCount++;
          }
        } catch (e) {
          // User might already exist, continue
        }
      }
      
      await loadUsersFromCloud();
      toast.success(`${syncedCount} brugere synkroniseret til cloud`);
    } catch (error) {
      console.error('Error syncing to cloud:', error);
      toast.error('Kunne ikke synkronisere til cloud');
    } finally {
      setIsLoading(false);
    }
  };

  // Load system user emails from localStorage
  const loadSystemUserEmails = () => {
    try {
      const stored = localStorage.getItem(SYSTEM_EMAILS_KEY);
      if (stored) {
        setSystemUserEmails(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading system user emails:', error);
    }
  };

  // Load active sessions
  const loadActiveSessions = async () => {
    try {
      setSessionsLoading(true);
      const response = await fetch(`${API_BASE}/sessions`);
      const result = await response.json();
      
      if (result.success && result.data) {
        setActiveSessions(result.data);
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
      toast.error('Kunne ikke indlæse aktive sessioner');
    } finally {
      setSessionsLoading(false);
    }
  };

  // Unlock (end) a session
  const handleUnlockSession = async (session: ActiveSession) => {
    try {
      const response = await fetch(`${API_BASE}/sessions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'unlock',
          targetUsername: session.username
        })
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`Session for "${session.username}" er låst op`);
        await loadActiveSessions();
      } else {
        throw new Error(result.error || 'Failed to unlock session');
      }
    } catch (error) {
      console.error('Error unlocking session:', error);
      toast.error('Kunne ikke låse session op');
    }
    setSessionToUnlock(null);
  };

  // Format relative time
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Lige nu';
    if (diffMins < 60) return `${diffMins} min siden`;
    if (diffHours < 24) return `${diffHours} timer siden`;
    return `${diffDays} dage siden`;
  };

  // Save system user email
  const saveSystemUserEmail = (username: string, email: string) => {
    const updated = { ...systemUserEmails, [username]: email };
    setSystemUserEmails(updated);
    localStorage.setItem(SYSTEM_EMAILS_KEY, JSON.stringify(updated));
    toast.success(`Email for "${username}" er gemt!`);
  };

  // Handle system user email edit
  const handleEditSystemUserEmail = (username: string) => {
    setSystemUserToEdit(username);
    setEditingSystemEmail(systemUserEmails[username] || "");
  };

  // Handle save system user email
  const handleSaveSystemUserEmail = () => {
    if (!systemUserToEdit) return;
    
    // Email validation (allow empty)
    if (editingSystemEmail.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(editingSystemEmail.trim())) {
        toast.error("Indtast en gyldig email adresse");
        return;
      }
    }
    
    saveSystemUserEmail(systemUserToEdit, editingSystemEmail.trim());
    setSystemUserToEdit(null);
    setEditingSystemEmail("");
  };

  // Load users and sessions when dialog opens
  useEffect(() => {
    if (open) {
      loadUsers();
      loadSystemUserEmails();
      loadActiveSessions();
    }
  }, [open, useCloud]);
  
  // Refresh sessions when tab changes to sessions
  useEffect(() => {
    if (open && activeTab === 'sessions') {
      loadActiveSessions();
    }
  }, [activeTab, open]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] sm:max-w-4xl h-[85vh] sm:h-auto max-h-[85vh] flex flex-col p-4 sm:p-6">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              Brugerstyring
              {useCloud && !cloudError && (
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded flex items-center gap-1">
                  <Cloud className="h-3 w-3" /> Cloud
                </span>
              )}
              {cloudError && (
                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded flex items-center gap-1">
                  <Database className="h-3 w-3" /> Lokal
                </span>
              )}
            </DialogTitle>
            <DialogDescription>
              Administrer brugere i portalen - opret, rediger, deaktiver eller slet brugere
              {cloudError && (
                <span className="block text-yellow-600 text-xs mt-1">
                  ⚠️ Cloud ikke tilgængelig - bruger lokal lagring
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid w-full grid-cols-2 flex-shrink-0">
              <TabsTrigger value="users">Brugere</TabsTrigger>
              <TabsTrigger value="sessions">
                Aktive Sessioner
                {activeSessions.length > 0 && (
                  <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">
                    {activeSessions.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="users" className="flex-1 overflow-y-auto space-y-4 min-h-0 py-2 -mx-4 px-4 sm:-mx-6 sm:px-6 mt-4">
              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 justify-between">
                <Button 
                  onClick={() => setShowCreateDialog(true)} 
                  className="gap-2 w-full sm:w-auto"
                >
                  <Plus className="h-4 w-4" />
                  Opret ny bruger
                </Button>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => loadUsers()}
                    disabled={isLoading}
                    className="gap-2"
                  >
                    <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">Genindlæs</span>
                  </Button>
                  {cloudError && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={syncToCloud}
                      disabled={isLoading}
                      className="gap-2"
                    >
                      <Cloud className="h-4 w-4" />
                      <span className="hidden sm:inline">Sync til cloud</span>
                    </Button>
                  )}
                </div>
              </div>

              {/* Loading indicator */}
              {isLoading && (
                <div className="flex justify-center py-4">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              )}

              {/* Hardcoded Users Section */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                  Systembrugere
                </h3>
                <div className="space-y-2">
                  {HARDCODED_USERS.map((username) => (
                    <Card key={username}>
                      <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="flex-1">
                            <p className="font-medium">{username}</p>
                            <p className="text-sm text-muted-foreground">
                              {username === 'admin' || username === 'Brian' 
                                ? 'Alle rettigheder' 
                                : 'Standard bruger'}
                            </p>
                            {systemUserEmails[username] ? (
                              <p className="text-sm text-muted-foreground truncate">
                                Email: {systemUserEmails[username]}
                              </p>
                            ) : (
                              <p className="text-sm text-muted-foreground italic">
                                Ingen email
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditSystemUserEmail(username)}
                              className="gap-2"
                            >
                              <Mail className="h-4 w-4" />
                              <span className="hidden sm:inline">
                                {systemUserEmails[username] ? 'Rediger email' : 'Tilføj email'}
                              </span>
                            </Button>
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
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
              <div className="mt-6 pb-8 sm:pb-4">
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 sticky top-0 bg-background py-2 -mt-2">
                  Almindelige brugere ({users.length})
                </h3>
                
                {!isLoading && users.length === 0 && (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <p className="text-muted-foreground">Ingen brugere oprettet endnu</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Klik på "Opret ny bruger" for at tilføje en bruger
                      </p>
                    </CardContent>
                  </Card>
                )}
                
                {users.length > 0 && (
                  <div className="space-y-3 pb-4">
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
                                {user.email && (
                                  <p className="text-sm text-muted-foreground truncate">
                                    Email: {user.email}
                                  </p>
                                )}
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
                                          {perm === 'referater' && 'Referater'}
                                          {perm === 'frivilligfest' && 'Frivilligfest'}
                                          {perm === 'aarshjul' && 'Årshjul'}
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
            </TabsContent>
            
            <TabsContent value="sessions" className="flex-1 overflow-y-auto space-y-4 min-h-0 py-2 -mx-4 px-4 sm:-mx-6 sm:px-6 mt-4">
              {/* Sessions Header */}
              <div className="flex flex-col sm:flex-row gap-2 justify-between items-start sm:items-center">
                <div>
                  <h3 className="text-sm font-semibold">Aktive Login Sessioner</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Kun én session tilladt per bruger. Lås op for at tillade nyt login.
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => loadActiveSessions()}
                  disabled={sessionsLoading}
                  className="gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${sessionsLoading ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Opdater</span>
                </Button>
              </div>

              {/* Loading indicator */}
              {sessionsLoading && (
                <div className="flex justify-center py-4">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              )}

              {/* Sessions List */}
              {!sessionsLoading && activeSessions.length === 0 && (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Monitor className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Ingen aktive sessioner</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Der er ingen brugere logget ind i øjeblikket
                    </p>
                  </CardContent>
                </Card>
              )}

              {activeSessions.length > 0 && (
                <div className="space-y-3 pb-4">
                  {activeSessions.map((session) => (
                    <Card key={session.session_id}>
                      <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium">{session.username}</p>
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                Aktiv
                              </span>
                            </div>
                            <div className="mt-2 space-y-1">
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                <span>Logget ind: {new Date(session.created_at).toLocaleString('da-DK')}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <RefreshCw className="h-3 w-3" />
                                <span>Sidste aktivitet: {formatRelativeTime(session.last_activity)}</span>
                              </div>
                              {session.user_agent && (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Monitor className="h-3 w-3" />
                                  <span className="truncate max-w-[300px]">{session.user_agent}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSessionToUnlock(session)}
                              className="gap-2"
                            >
                              <Unlock className="h-4 w-4" />
                              <span>Lås op</span>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Create User Dialog */}
      <CreateUserDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onUserCreated={handleUserCreated}
        useCloud={useCloud && !cloudError}
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
        useCloud={useCloud && !cloudError}
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

      {/* Edit System User Email Dialog */}
      <Dialog open={!!systemUserToEdit} onOpenChange={(open) => !open && setSystemUserToEdit(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-md p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Rediger email for {systemUserToEdit}</DialogTitle>
            <DialogDescription>
              Indtast email adresse for systembrugeren. Denne bruges til notifikationer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="system-email">Email</Label>
              <Input
                id="system-email"
                type="email"
                value={editingSystemEmail}
                onChange={(e) => setEditingSystemEmail(e.target.value)}
                placeholder="bruger@email.dk"
              />
              <p className="text-xs text-muted-foreground">
                Bruges til notifikationer når opgaver tildeles i Årshjul
              </p>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setSystemUserToEdit(null)}
              className="w-full sm:w-auto"
            >
              Annuller
            </Button>
            <Button 
              type="button" 
              onClick={handleSaveSystemUserEmail}
              className="w-full sm:w-auto"
            >
              Gem email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unlock Session Confirmation */}
      <AlertDialog open={!!sessionToUnlock} onOpenChange={() => setSessionToUnlock(null)}>
        <AlertDialogContent className="max-w-[95vw] sm:max-w-md p-4 sm:p-6">
          <AlertDialogHeader>
            <AlertDialogTitle>Lås session op?</AlertDialogTitle>
            <AlertDialogDescription>
              Dette vil afslutte sessionen for "{sessionToUnlock?.username}" og tillade dem at logge ind igen fra en anden enhed eller browser.
              <br /><br />
              <strong>Bemærk:</strong> Brugeren vil blive logget ud og skal logge ind igen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <AlertDialogCancel className="w-full sm:w-auto">Annuller</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => sessionToUnlock && handleUnlockSession(sessionToUnlock)}
              className="w-full sm:w-auto"
            >
              <Unlock className="h-4 w-4 mr-2" />
              Lås op
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
