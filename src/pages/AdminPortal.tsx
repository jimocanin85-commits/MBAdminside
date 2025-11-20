import { useState, useEffect } from "react";
import LoginForm from "@/components/auth/LoginForm";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import BottomNavigation from "@/components/dashboard/BottomNavigation";
import TrainerForm from "@/components/trainer/TrainerForm";
import TrainerSpreadsheet from "@/components/trainer/TrainerSpreadsheet";
import ExitForm from "@/components/trainer/ExitForm";
import { CloudFiles } from "@/components/dashboard/CloudFiles";
import FrivilligfestDialog from "@/components/dashboard/FrivilligfestDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UserPlus, Cloud, Settings, Trash2, GripVertical, DoorOpen, Disc, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { da } from "date-fns/locale";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  
  // Check if user is restricted (Karina - only Frivilligfest, Brian - Frivilligfest + Årshjul + Frivillig)
  const isRestrictedUser = currentUser === 'Karina';
  const isBrianUser = currentUser === 'Brian';
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isExitFormOpen, setIsExitFormOpen] = useState(false);
  const [isSpreadsheetOpen, setIsSpreadsheetOpen] = useState(false);
  const [showCloudFiles, setShowCloudFiles] = useState(false);
  const [refreshCloudFiles, setRefreshCloudFiles] = useState(0);
  const [selectedTrainer, setSelectedTrainer] = useState<Trainer | null>(null);
  const [isEditingCloudFile, setIsEditingCloudFile] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [showAdminDialog, setShowAdminDialog] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
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
    } else {
      localStorage.removeItem('currentUser');
      setIsAuthenticated(false);
    }
  }, [currentUser]);

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
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setIsAdminMode(false);
    localStorage.removeItem('currentUser');
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
    if (adminPassword === "1523") {
      setIsAdminMode(true);
      setShowAdminDialog(false);
      setAdminPassword("");
      toast.success("Admin mode aktiveret");
    } else {
      toast.error("Forkert adgangskode");
    }
  };

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
          {isRestrictedUser ? (
            // Karina - Only Frivilligfest access
            <Card className="shadow-lg border-2">
              <CardContent className="pt-4 sm:pt-6 md:pt-8 space-y-4 sm:space-y-6">
                <div className="text-center py-8">
                  <h2 className="text-2xl font-bold mb-6">Velkommen, {currentUser}!</h2>
                  <Button 
                    size="lg" 
                    className="gap-2 text-base px-8 py-6 min-h-[60px]"
                    onClick={() => setShowFrivilligfestDialog(true)}
                  >
                    <UserPlus className="h-5 w-5" />
                    Frivilligfest2026
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : showCloudFiles ? (
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
                  {/* Frivillig dropdown - Show for admin and Brian (Brian has full access to all menu items) */}
                  {!isRestrictedUser && (
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
                  
                  {/* Årshjul - Show for admin and Brian */}
                  {!isRestrictedUser && (
                    <Button 
                      size="lg" 
                      className="gap-2 text-base px-6 py-6 flex-1 min-h-[60px]"
                      onClick={() => {}}
                    >
                      <Disc className="h-5 w-5" />
                      Årshjul
                    </Button>
                  )}
                  
                  {/* Frivilligfest - Show for all authenticated users */}
                  <Button 
                    size="lg" 
                    className="gap-2 text-base px-6 py-6 flex-1 min-h-[60px]"
                    onClick={() => {
                      console.log('Frivilligfest button clicked');
                      setShowFrivilligfestDialog(true);
                    }}
                  >
                    <UserPlus className="h-5 w-5" />
                    {isBrianUser ? "Frivilligfest2026" : "Frivilligfest 2026"}
                  </Button>
                </div>

              {!isRestrictedUser && !isBrianUser && trainers.length > 0 ? (
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
              ) : !isRestrictedUser && !isBrianUser ? (
                <div className="pt-6 border-t">
                  <div className="text-center py-8 sm:py-12">
                    <UserPlus className="h-12 w-12 sm:h-16 sm:w-16 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg sm:text-xl font-semibold mb-2">Ingen frivillige endnu</h3>
                    <p className="text-sm sm:text-base text-muted-foreground mb-6">
                      Brug menuen eller knapperne nedenfor for at tilføje din første frivillige
                    </p>
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

      {/* Desktop Settings Button - Hidden on Mobile and for restricted users */}
      {!isRestrictedUser && (
        <Button
          size="icon"
          variant="outline"
          className="hidden md:flex fixed bottom-4 left-4 h-12 w-12 rounded-full shadow-lg z-50 min-h-[48px] min-w-[48px]"
          onClick={() => setShowAdminDialog(true)}
          aria-label="Settings"
        >
          <Settings className="h-5 w-5" />
        </Button>
      )}

      {!isRestrictedUser && (
        <Dialog open={showAdminDialog} onOpenChange={setShowAdminDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Admin adgang</DialogTitle>
              <DialogDescription>Indtast adgangskode for at aktivere admin tilstand</DialogDescription>
            </DialogHeader>
            <Input
              type="password"
              placeholder="Adgangskode"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()}
            />
            <DialogFooter>
              <Button onClick={handleAdminLogin}>Log ind</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <FrivilligfestDialog
        open={showFrivilligfestDialog}
        onOpenChange={setShowFrivilligfestDialog}
      />
    </div>
    
    {/* Always render BottomNavigation to maintain hook order - hidden when not authenticated or restricted user */}
    {isAuthenticated && !isRestrictedUser && (
      <BottomNavigation
        currentView={currentView}
        onNavigate={handleNavigate}
        onOpenForm={() => setIsFormOpen(true)}
        onShowCloudFiles={() => setShowCloudFiles(true)}
        onOpenAdminDialog={() => setShowAdminDialog(true)}
      />
    )}
    </>
  );
};

export default AdminPortal;
