import { useState, useEffect } from "react";
import LoginForm from "@/components/auth/LoginForm";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import BottomNavigation from "@/components/dashboard/BottomNavigation";
import TrainerForm from "@/components/trainer/TrainerForm";
import TrainerSpreadsheet from "@/components/trainer/TrainerSpreadsheet";
import ExitForm from "@/components/trainer/ExitForm";
import { CloudFiles } from "@/components/dashboard/CloudFiles";
import FrivilligfestDialog from "@/components/dashboard/FrivilligfestDialog";
import LogsViewer from "@/components/admin/LogsViewer";
import ReferaterViewer from "@/components/admin/ReferaterViewer";
import { User } from "@/components/admin/CreateUserDialog";
import { UserManagement } from "@/components/admin/UserManagement";
// import AarshjulView from "@/components/aarshjul/AarshjulView"; // Temporarily disabled
import { logger } from "@/lib/logger";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UserPlus, Cloud, Settings, Trash2, GripVertical, DoorOpen, Disc, ChevronDown, Sparkles, ExternalLink, RefreshCw, FileText, Users } from "lucide-react";
// Removed Supabase import - no longer needed
import { toast } from "sonner";
import { format } from "date-fns";
import { da } from "date-fns/locale";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Trainer = {
  navn: string;
  email: string;
  telefon: string;
  foedselsdato: Date;
  aargang: string;
  rolle: string;
  kontaktperson: string;
  createdAt: Date;
  excelData?: any;
};

const AdminPortal = () => {
  const [currentUser, setCurrentUser] = useState<string | null>(() => {
    return localStorage.getItem('currentUser');
  });
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return !!localStorage.getItem('currentUser');
  });
  
  // Get user permissions from localStorage
  const [userPermissions, setUserPermissions] = useState<string[]>(() => {
    if (!currentUser) return [];
    
    // Admin and Brian have all permissions
    if (currentUser === 'admin' || currentUser === 'Brian') {
      return ['frivillig', 'aarshjul', 'referater', 'frivilligfest'];
    }
    
    // Check custom users (including Karina and Kyhl)
    try {
      const customUsersJson = localStorage.getItem('customUsers');
      if (customUsersJson) {
        const customUsers: User[] = JSON.parse(customUsersJson);
        const customUser = customUsers.find(u => u.username === currentUser);
        if (customUser && customUser.isActive !== false) {
          return customUser.permissions || [];
        }
      }
    } catch (error) {
      console.error('Error reading user permissions:', error);
    }
    
    return [];
  });

  const isBrianUser = currentUser === 'Brian';
  
  // Helper functions to check permissions
  const hasPermission = (permission: string) => {
    return userPermissions.includes(permission);
  };
  
  const hasFrivilligAccess = hasPermission('frivillig') || currentUser === 'admin' || currentUser === 'Brian';
  // Årshjul: Alle brugere undtagen Karina har adgang
  const hasAarshjulAccess = currentUser !== 'Karina' && currentUser !== null;
  const hasReferaterAccess = hasPermission('referater') || currentUser === 'admin' || currentUser === 'Brian';
  const hasFrivilligfestAccess = hasPermission('frivilligfest') || currentUser === 'admin' || currentUser === 'Brian';
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isExitFormOpen, setIsExitFormOpen] = useState(false);
  const [isSpreadsheetOpen, setIsSpreadsheetOpen] = useState(false);
  const [showCloudFiles, setShowCloudFiles] = useState(false);
  const [refreshCloudFiles, setRefreshCloudFiles] = useState(0);
  const [selectedTrainer, setSelectedTrainer] = useState<Trainer | null>(null);
  const [isEditingCloudFile, setIsEditingCloudFile] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(() => {
    return localStorage.getItem('isAdminMode') === 'true';
  });
  const [showAdminDialog, setShowAdminDialog] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [showLogsViewer, setShowLogsViewer] = useState(false);
  const [logsPassword, setLogsPassword] = useState("");
  const [showLogsPasswordDialog, setShowLogsPasswordDialog] = useState(false);
  const [showClearCacheDialog, setShowClearCacheDialog] = useState(false);
  const [showReferaterViewer, setShowReferaterViewer] = useState(false);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [showAarshjul, setShowAarshjul] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [currentView, setCurrentView] = useState<"home" | "cloud" | "form" | "settings">("home");
  const [showFrivilligfestDialog, setShowFrivilligfestDialog] = useState(false);
  const [trainers, setTrainers] = useState<Trainer[]>(() => {
    const saved = localStorage.getItem('trainers');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Convert date strings back to Date objects
        return parsed.map((trainer: any) => ({
          ...trainer,
          foedselsdato: new Date(trainer.foedselsdato),
          createdAt: new Date(trainer.createdAt)
        }));
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  useEffect(() => {
    console.log('Saving trainers to localStorage:', trainers);
    localStorage.setItem('trainers', JSON.stringify(trainers));
  }, [trainers]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('currentUser', currentUser);
      setIsAuthenticated(true);
      
      // Update user permissions based on current user
      if (currentUser === 'admin' || currentUser === 'Brian') {
        setUserPermissions(['frivillig', 'aarshjul', 'referater', 'frivilligfest']);
      } else {
        // Check custom users (including Karina and Kyhl)
        try {
          const customUsersJson = localStorage.getItem('customUsers');
          if (customUsersJson) {
            const customUsers: User[] = JSON.parse(customUsersJson);
            const customUser = customUsers.find(u => u.username === currentUser);
            if (customUser && customUser.isActive !== false) {
              setUserPermissions(customUser.permissions || []);
            } else {
              setUserPermissions([]);
            }
          } else {
            setUserPermissions([]);
          }
        } catch (error) {
          console.error('Error reading user permissions:', error);
          setUserPermissions([]);
        }
      }
    } else {
      localStorage.removeItem('currentUser');
      setIsAuthenticated(false);
      setUserPermissions([]);
    }
  }, [currentUser]);

  // Logout when browser tab/window is closed
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Clear authentication on page unload
      localStorage.removeItem('currentUser');
      setIsAuthenticated(false);
      setCurrentUser(null);
      setIsAdminMode(false);
    };

    const handleVisibilityChange = () => {
      // Also handle when tab becomes hidden (optional - more aggressive)
      if (document.hidden) {
        // Don't logout on tab switch, only on close
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Debug: Log admin mode changes
  useEffect(() => {
    console.log('AdminPortal - isAdminMode changed to:', isAdminMode);
    console.log('AdminPortal - localStorage isAdminMode:', localStorage.getItem('isAdminMode'));
  }, [isAdminMode]);

  // Update current view based on state - MUST be before early return
  useEffect(() => {
    if (!isAuthenticated) return; // Don't update view if not authenticated
    if (showCloudFiles) {
      setCurrentView("cloud");
    } else if (isFormOpen || isExitFormOpen || isSpreadsheetOpen) {
      setCurrentView("form");
    } else {
      setCurrentView("home");
    }
  }, [isAuthenticated, showCloudFiles, isFormOpen, isExitFormOpen, isSpreadsheetOpen]);

  const handleLogin = (username: string) => {
    setCurrentUser(username);
    logger.logLogin(username);
    // Permissions will be updated automatically by useEffect when currentUser changes
  };

  const handleLogout = () => {
    if (currentUser) {
      logger.logLogout(currentUser);
    }
    setCurrentUser(null);
    setIsAdminMode(false);
    localStorage.removeItem('currentUser');
    localStorage.removeItem('isAdminMode');
  };

  const handleTrainerSubmit = (data: Omit<Trainer, 'createdAt'>) => {
    const trainerWithDate = {
      ...data,
      createdAt: new Date()
    };
    console.log('Adding trainer:', trainerWithDate);
    console.log('Current trainers:', trainers);
    const newTrainers = [...trainers, trainerWithDate];
    setTrainers(newTrainers);
    console.log('New trainers array:', newTrainers);
    toast.success(`${trainerWithDate.navn} tilføjet til oversigten`);
  };

  const handleTrainerUpdate = (updatedTrainer: Trainer) => {
    setTrainers(trainers.map(t => 
      t.createdAt === updatedTrainer.createdAt ? updatedTrainer : t
    ));
    
    // If this was a cloud file edit, go back to cloud files view
    if (isEditingCloudFile) {
      setIsEditingCloudFile(false);
      setShowCloudFiles(true);
    }
  };

  const handleEditCloudFile = (fileData: any) => {
    setSelectedTrainer(fileData);
    setIsEditingCloudFile(true);
    setShowCloudFiles(false);
    setIsSpreadsheetOpen(true);
  };

  const handleAdminLogin = () => {
    console.log('handleAdminLogin called, adminPassword:', adminPassword, 'isAdminMode:', isAdminMode);
    if (adminPassword === "1523") {
      if (isAdminMode) {
        // Deactivate admin mode
        console.log('Deactivating admin mode');
        setIsAdminMode(false);
        localStorage.setItem('isAdminMode', 'false');
        setShowAdminDialog(false);
        setAdminPassword("");
        setShowLogsViewer(false); // Also close logs viewer if open
        toast.success("Admin mode deaktiveret");
      } else {
        // Activate admin mode
        console.log('Activating admin mode');
        setIsAdminMode(true);
        localStorage.setItem('isAdminMode', 'true');
        setShowAdminDialog(false);
        setAdminPassword("");
        toast.success("Admin mode aktiveret");
        // Force a small delay to ensure state updates
        setTimeout(() => {
          console.log('Admin mode should now be active, isAdminMode state:', localStorage.getItem('isAdminMode'));
        }, 100);
      }
    } else {
      toast.error("Forkert adgangskode");
      setAdminPassword("");
    }
  };

  const handleLogsPassword = () => {
    if (logsPassword === "1523") {
      setShowLogsViewer(true);
      setShowLogsPasswordDialog(false);
      setLogsPassword("");
    } else {
      toast.error("Forkert adgangskode");
    }
  };

  // Keyboard shortcut to open logs (Ctrl+Shift+L or Cmd+Shift+L)
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'L') {
        e.preventDefault();
        if (isAdminMode) {
          // If already in admin mode, open logs directly
          setShowLogsViewer(true);
        } else {
          // Otherwise, show password dialog
          setShowLogsPasswordDialog(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAuthenticated, isAdminMode]);

  const handleDeleteTrainer = (trainer: Trainer) => {
    setTrainers(trainers.filter(t => t.createdAt !== trainer.createdAt));
    toast.success("Træner slettet");
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newTrainers = [...trainers];
    const draggedTrainer = newTrainers[draggedIndex];
    newTrainers.splice(draggedIndex, 1);
    newTrainers.splice(index, 0, draggedTrainer);
    
    setTrainers(newTrainers);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const getTrainersByMonth = () => {
    const grouped: Record<string, Trainer[]> = {};
    trainers.forEach(trainer => {
      const monthKey = format(trainer.createdAt, "MMMM yyyy", { locale: da });
      if (!grouped[monthKey]) {
        grouped[monthKey] = [];
      }
      grouped[monthKey].push(trainer);
    });
    return grouped;
  };

  const handleNavigate = (view: "home" | "cloud" | "form" | "settings") => {
    setCurrentView(view);
    if (view === "home" && showCloudFiles) {
      setShowCloudFiles(false);
    }
  };

  // Early return for unauthenticated users - AFTER all hooks
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-muted p-4">
        <LoginForm onLogin={handleLogin} />
      </div>
    );
  }

  return (
    <>
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <DashboardHeader 
        onLogout={handleLogout}
        onOpenForm={() => setIsFormOpen(true)}
        onOpenExitForm={() => setIsExitFormOpen(true)}
        onShowCloudFiles={() => setShowCloudFiles(true)}
        onOpenAdminDialog={() => setShowAdminDialog(true)}
        currentUser={currentUser}
      />
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8">
        <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
          {showCloudFiles ? (
            <CloudFiles 
              key={refreshCloudFiles} 
              onTrainerDeleted={() => {
                // Reload trainers from localStorage after deletion
                const saved = localStorage.getItem('trainers');
                if (saved) {
                  try {
                    const parsed = JSON.parse(saved);
                    setTrainers(parsed.map((trainer: any) => ({
                      ...trainer,
                      foedselsdato: new Date(trainer.foedselsdato),
                      createdAt: new Date(trainer.createdAt)
                    })));
                  } catch (e) {
                    console.error('Error reloading trainers:', e);
                  }
                }
              }}
              onBack={() => {
                setShowCloudFiles(false);
                setCurrentView("home");
              }}
            />
          ) : (
            <Card className="shadow-lg border-2">
              <CardContent className="pt-4 sm:pt-6 md:pt-8 space-y-4 sm:space-y-6">
                {/* Action Buttons - Visible on all screen sizes */}
                <div className="flex flex-col sm:flex-row gap-3">
                  {/* Frivillig dropdown - Show for users with frivillig permission */}
                  {hasFrivilligAccess && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          size="lg" 
                          className="gap-2 text-base px-6 py-6 flex-1 min-h-[60px]"
                        >
                          Frivillig
                          <ChevronDown className="h-5 w-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-56">
                        <DropdownMenuItem onClick={() => setIsFormOpen(true)} className="gap-2 py-3 cursor-pointer min-h-[44px]">
                          <UserPlus className="h-4 w-4" />
                          Opret
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setIsExitFormOpen(true)} className="gap-2 py-3 cursor-pointer min-h-[44px]">
                          <DoorOpen className="h-4 w-4" />
                          Exit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setShowCloudFiles(true)} className="gap-2 py-3 cursor-pointer min-h-[44px]">
                          <Cloud className="h-4 w-4" />
                          Cloud Filer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  
                  {/* Årshjul - Show for all users except Karina - Temporarily disabled */}
                  {hasAarshjulAccess && (
                    <Button 
                      size="lg" 
                      className="gap-2 text-base px-6 py-6 flex-1 min-h-[60px]"
                      onClick={() => {
                        // setShowAarshjul(true);
                        toast.info("Årshjul funktionen er midlertidigt deaktiveret");
                      }}
                    >
                      <Disc className="h-5 w-5" />
                      Opgaver / Årshjul
                    </Button>
                  )}
                  
                  {/* Referater fra Bestyrelsesmøder - Show for users with referater permission */}
                  {hasReferaterAccess && (
                    <Button 
                      size="lg" 
                      className="gap-2 text-base px-6 py-6 flex-1 min-h-[60px]"
                      onClick={() => setShowReferaterViewer(true)}
                    >
                      <FileText className="h-5 w-5" />
                      Referater fra Bestyrelsesmøder
                    </Button>
                  )}
                  
                  {/* Frivilligfest - Show for users with frivilligfest permission */}
                  {hasFrivilligfestAccess && (
                  <Button 
                    size="lg" 
                    className="gap-2 text-base px-6 py-6 flex-1 min-h-[60px]"
                    onClick={() => {
                      console.log('Frivilligfest button clicked');
                      window.open('https://docs.google.com/spreadsheets/d/15QhvIYCNhci2N-oBbEGIpRgeevWe42L0kjhNyfTjkjQ/edit?usp=sharing_eil&ts=67288c42', '_blank');
                    }}
                  >
                    <UserPlus className="h-5 w-5" />
                    Frivilligfest 2026
                  </Button>
                  )}
                </div>

              {!isBrianUser && trainers.length > 0 ? (
                <div className="pt-6 border-t">
                  <div className="space-y-4">
                    {isAdminMode ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm text-muted-foreground">Admin tilstand - Træk for at omorganisere</p>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setIsAdminMode(false)}
                          >
                            Afslut admin tilstand
                          </Button>
                        </div>
                        {trainers.map((trainer, index) => (
                          <div
                            key={index}
                            draggable
                            onDragStart={() => handleDragStart(index)}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDragEnd={handleDragEnd}
                            className="flex items-center gap-2 p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors cursor-move"
                          >
                            <GripVertical className="h-5 w-5 text-muted-foreground" />
                            <div className="flex-1">
                              <p className="font-medium">{trainer.navn}</p>
                              <p className="text-sm text-muted-foreground">
                                {format(trainer.createdAt, "d. MMMM yyyy 'kl.' HH:mm", { locale: da })}
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2"
                              onClick={() => {
                                setSelectedTrainer(trainer);
                                setIsSpreadsheetOpen(true);
                              }}
                            >
                              Åbn
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteTrainer(trainer)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      Object.entries(getTrainersByMonth()).map(([month, monthTrainers]) => (
                        <div key={month} className="mb-6 last:mb-0">
                          <h3 className="text-lg font-semibold mb-3 capitalize">{month}</h3>
                          <div className="space-y-2">
                            {monthTrainers.map((trainer, index) => (
                               <div
                                 key={index}
                                 className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 bg-muted/50 rounded-lg hover:bg-muted active:bg-muted transition-colors gap-3 touch-manipulation"
                               >
                                 <div className="flex-1 min-w-0">
                                   <p className="font-medium text-base sm:text-lg truncate">{trainer.navn}</p>
                                   <p className="text-xs sm:text-sm text-muted-foreground">
                                     {format(trainer.createdAt, "d. MMMM yyyy 'kl.' HH:mm", { locale: da })}
                                   </p>
                                 </div>
                                 <Button
                                   variant="outline"
                                   size="sm"
                                   className="gap-2 w-full sm:w-auto min-h-[44px] text-sm sm:text-base"
                                   onClick={() => {
                                     setSelectedTrainer(trainer);
                                     setIsSpreadsheetOpen(true);
                                   }}
                                 >
                                   Åbn
                                 </Button>
                               </div>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
          )}
        </div>
      </main>

      <TrainerForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleTrainerSubmit}
      />

      <ExitForm
        open={isExitFormOpen}
        onOpenChange={setIsExitFormOpen}
        onSuccess={() => setRefreshCloudFiles(prev => prev + 1)}
      />

      <TrainerSpreadsheet
        open={isSpreadsheetOpen}
        onOpenChange={setIsSpreadsheetOpen}
        trainer={selectedTrainer}
        onSave={handleTrainerUpdate}
      />

      {/* Desktop Settings Button - Hidden on Mobile */}
      {isAuthenticated && (
        <div className="hidden md:flex fixed bottom-4 left-4 gap-2 z-50">
          <Button
            size="icon"
            variant="outline"
            className="h-12 w-12 rounded-full shadow-lg min-h-[48px] min-w-[48px]"
            onClick={() => setShowAdminDialog(true)}
            aria-label="Settings"
          >
            <Settings className="h-5 w-5" />
          </Button>
          {isAdminMode && (
            <>
              <Button
                variant="outline"
                size="icon"
                className="h-12 w-12 rounded-full shadow-lg min-h-[48px] min-w-[48px]"
                onClick={() => setShowUserManagement(true)}
                aria-label="Brugerstyring"
                title="Brugerstyring - Administrer brugere"
              >
                <Users className="h-5 w-5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-12 w-12 rounded-full shadow-lg min-h-[48px] min-w-[48px]"
                onClick={() => setShowLogsViewer(true)}
                aria-label="View Logs"
                title="View Logs (Ctrl+Shift+L)"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-12 w-12 rounded-full shadow-lg min-h-[48px] min-w-[48px]"
                onClick={() => setShowClearCacheDialog(true)}
                aria-label="Clear Cache"
                title="Clear Cache - Sletter cookies, cache og historik"
              >
                <RefreshCw className="h-5 w-5" />
              </Button>
            </>
          )}
        </div>
      )}

      {isAuthenticated && (
        <Dialog open={showAdminDialog} onOpenChange={setShowAdminDialog}>
          <DialogContent className="max-w-[95vw] sm:max-w-md p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle>{isAdminMode ? 'Deaktiver Admin' : 'Admin adgang'}</DialogTitle>
              <DialogDescription>
                {isAdminMode 
                  ? 'Indtast adgangskode for at deaktivere admin tilstand'
                  : 'Indtast adgangskode for at aktivere admin tilstand'
                }
              </DialogDescription>
            </DialogHeader>
            <Input
              type="password"
              placeholder="Adgangskode"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()}
            />
            <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
              <Button onClick={handleAdminLogin} className="w-full sm:w-auto">
                {isAdminMode ? 'Deaktiver' : 'Aktiver'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <FrivilligfestDialog
        open={showFrivilligfestDialog}
        onOpenChange={setShowFrivilligfestDialog}
      />

      {/* Logs Password Dialog */}
      {isAuthenticated && (
        <Dialog open={showLogsPasswordDialog} onOpenChange={setShowLogsPasswordDialog}>
          <DialogContent className="max-w-[95vw] sm:max-w-md p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle>Logs Adgang</DialogTitle>
              <DialogDescription>Indtast adgangskode for at se frontend logs</DialogDescription>
            </DialogHeader>
            <Input
              type="password"
              placeholder="Adgangskode"
              value={logsPassword}
              onChange={(e) => setLogsPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogsPassword()}
            />
            <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
              <Button onClick={handleLogsPassword} className="w-full sm:w-auto">Åbn Logs</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Logs Viewer */}
      <LogsViewer
        open={showLogsViewer}
        onOpenChange={setShowLogsViewer}
      />

      {/* Referater Viewer */}
      <ReferaterViewer
        open={showReferaterViewer}
        onOpenChange={setShowReferaterViewer}
      />

      {/* Clear Cache Confirmation Dialog */}
      <AlertDialog open={showClearCacheDialog} onOpenChange={setShowClearCacheDialog}>
        <AlertDialogContent className="max-w-[95vw] sm:max-w-md p-4 sm:p-6">
          <AlertDialogHeader>
            <AlertDialogTitle>Er du sikker?</AlertDialogTitle>
            <AlertDialogDescription>
              Dette vil slette alle cookies, localStorage og sessionStorage. Denne fane vil blive redirected til login siden. 
              <br />
              <strong>Bemærk:</strong> Af sikkerhedsmæssige årsager kan vi kun lukke faner som er åbnet af JavaScript. Du skal manuelt lukke andre åbne faner hvis nødvendigt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <AlertDialogCancel className="w-full sm:w-auto">Nej</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                // Clear all cookies
                document.cookie.split(";").forEach((c) => {
                  document.cookie = c
                    .replace(/^ +/, "")
                    .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
                });
                
                // Clear localStorage
                localStorage.clear();
                
                // Clear sessionStorage
                sessionStorage.clear();
                
                // Try to close all windows/tabs that this page opened
                // Note: We can only close windows that were opened by JavaScript
                // Manually opened tabs cannot be closed for security reasons
                try {
                  // Try to close current window
                  window.close();
                  
                  // If we have references to other windows opened by this page, close them too
                  // (This would require storing window references when opening them)
                  
                  // If window.close() doesn't work (manually opened tab), redirect instead
                  setTimeout(() => {
                    if (!window.closed) {
                      // Open login in new tab first
                      window.open('/', '_blank');
                      // Then redirect current tab
                      window.location.replace('/');
                    }
                  }, 100);
                } catch (e) {
                  // Fallback: open login in new tab and redirect current
                  window.open('/', '_blank');
                  window.location.replace('/');
                }
              }}
              className="w-full sm:w-auto"
            >
              Ja
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* User Management Dialog */}
      <UserManagement
        open={showUserManagement}
        onOpenChange={setShowUserManagement}
      />

      {/* Årshjul Dialog - Temporarily disabled */}
      {/* <AarshjulView
        open={showAarshjul}
        onOpenChange={setShowAarshjul}
        currentUserId={currentUser || undefined}
      /> */}
    </div>
    
    {/* Always render BottomNavigation to maintain hook order - hidden when not authenticated */}
    {isAuthenticated && (
      <BottomNavigation
        key={`bottom-nav-${isAdminMode}`}
        currentView={currentView}
        onNavigate={handleNavigate}
        onOpenForm={() => setIsFormOpen(true)}
        onShowCloudFiles={() => setShowCloudFiles(true)}
        onOpenAdminDialog={() => setShowAdminDialog(true)}
        isAdminMode={isAdminMode}
        onOpenUserManagement={() => {
          console.log('Opening user management from BottomNavigation');
          setShowUserManagement(true);
        }}
        onOpenLogsViewer={() => {
          console.log('Opening logs viewer from BottomNavigation');
          setShowLogsViewer(true);
        }}
        onOpenClearCache={() => {
          console.log('Opening clear cache from BottomNavigation');
          setShowClearCacheDialog(true);
        }}
      />
    )}
    </>
  );
};

export default AdminPortal;
