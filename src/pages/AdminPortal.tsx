import { useState, useEffect } from "react";
import LoginForm from "@/components/auth/LoginForm";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import TrainerForm from "@/components/trainer/TrainerForm";
import TrainerSpreadsheet from "@/components/trainer/TrainerSpreadsheet";
import ExitForm from "@/components/trainer/ExitForm";
import { CloudFiles } from "@/components/dashboard/CloudFiles";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UserPlus, Cloud, Settings, Trash2, GripVertical, DoorOpen, Disc } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { da } from "date-fns/locale";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

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
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('isAuthenticated') === 'true';
  });
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
    localStorage.setItem('isAuthenticated', isAuthenticated.toString());
  }, [isAuthenticated]);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setIsAdminMode(false);
    localStorage.removeItem('isAuthenticated');
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

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-muted p-4">
        <LoginForm onLogin={handleLogin} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader onLogout={handleLogout} />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {showCloudFiles ? (
            <CloudFiles key={refreshCloudFiles} />
          ) : (
            <Card className="shadow-lg border-2">
              <CardContent className="pt-8 space-y-6">
                <div className="flex flex-col md:flex-row gap-3">
                  <Button 
                    size="lg" 
                    className="gap-2 text-base px-6 py-6 flex-1 min-h-[60px]"
                    onClick={() => setIsFormOpen(true)}
                  >
                    <UserPlus className="h-5 w-5" />
                    Opret ny frivillig
                  </Button>
                  
                  <Button 
                    size="lg" 
                    className="gap-2 text-base px-6 py-6 flex-1 min-h-[60px]"
                    onClick={() => setIsExitFormOpen(true)}
                  >
                    <DoorOpen className="h-5 w-5" />
                    Exit af frivillig
                  </Button>
                  
                  <Button 
                    size="lg" 
                    className="gap-2 text-base px-6 py-6 flex-1 min-h-[60px]"
                    onClick={() => {}}
                  >
                    <Disc className="h-5 w-5" />
                    Årshjul
                  </Button>
                  
                  <Button 
                    size="lg" 
                    className="gap-2 text-base px-6 py-6 flex-1 min-h-[60px]"
                    onClick={() => {}}
                  >
                    <UserPlus className="h-5 w-5" />
                    Frivilligfest 2026
                  </Button>
                  
                  <Button 
                    size="lg" 
                    variant="outline"
                    className="gap-2 text-base px-6 py-6 flex-1 min-h-[60px]"
                    onClick={() => setShowCloudFiles(true)}
                  >
                    <Cloud className="h-5 w-5" />
                    Cloud Filer
                  </Button>
                </div>

              {trainers.length > 0 && (
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
                                 className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors gap-3"
                               >
                                 <div className="flex-1">
                                   <p className="font-medium">{trainer.navn}</p>
                                   <p className="text-sm text-muted-foreground">
                                     {format(trainer.createdAt, "d. MMMM yyyy 'kl.' HH:mm", { locale: da })}
                                   </p>
                                 </div>
                                 <Button
                                   variant="outline"
                                   size="sm"
                                   className="gap-2 w-full sm:w-auto min-h-[44px]"
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
              )}
            </CardContent>
          </Card>
          )}
          
          {showCloudFiles && (
            <Button 
              variant="outline" 
              onClick={() => setShowCloudFiles(false)}
              className="w-full"
            >
              Tilbage
            </Button>
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

      <Button
        size="icon"
        variant="outline"
        className="fixed bottom-4 left-4 h-12 w-12 rounded-full shadow-lg z-50"
        onClick={() => setShowAdminDialog(true)}
      >
        <Settings className="h-5 w-5" />
      </Button>

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
    </div>
  );
};

export default AdminPortal;
