import { useState, useEffect } from "react";
import LoginForm from "@/components/auth/LoginForm";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import TrainerForm from "@/components/trainer/TrainerForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus, FileText, Download } from "lucide-react";
import { format } from "date-fns";
import { da } from "date-fns/locale";

type Trainer = {
  navn: string;
  email: string;
  telefon: string;
  foedselsdato: Date;
  aargangRolle: string;
  kontaktperson: string;
  createdAt: Date;
  excelData?: any;
};

const AdminPortal = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
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
    localStorage.setItem('trainers', JSON.stringify(trainers));
  }, [trainers]);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
  };

  const handleTrainerSubmit = (data: Trainer) => {
    const trainerWithDate = {
      ...data,
      createdAt: new Date()
    };
    setTrainers([...trainers, trainerWithDate]);
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
        <div className="max-w-4xl mx-auto">
          <Card className="shadow-lg border-2">
            <CardContent className="pt-8 space-y-6">
              <Button 
                size="lg" 
                className="gap-2 text-base px-6 py-6"
                onClick={() => setIsFormOpen(true)}
              >
                <UserPlus className="h-5 w-5" />
                Oprettelse af ny træner
              </Button>

              {trainers.length > 0 && (
                <div className="pt-6 border-t">
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Oprettelser
                  </h2>
                  <div className="space-y-4">
                    {Object.entries(getTrainersByMonth()).map(([month, monthTrainers]) => (
                      <div key={month} className="mb-6 last:mb-0">
                        <h3 className="text-lg font-semibold mb-3 capitalize">{month}</h3>
                        <div className="space-y-2">
                          {monthTrainers.map((trainer, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                            >
                              <div>
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
                                  // Re-generate and download the Excel
                                  const event = new CustomEvent('downloadTrainerExcel', { detail: trainer });
                                  window.dispatchEvent(event);
                                }}
                              >
                                <Download className="h-4 w-4" />
                                Download
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <TrainerForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleTrainerSubmit}
      />
    </div>
  );
};

export default AdminPortal;
