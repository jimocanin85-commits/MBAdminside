import { useState } from "react";
import LoginForm from "@/components/auth/LoginForm";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import TrainerForm from "@/components/trainer/TrainerForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UserPlus } from "lucide-react";
import { format } from "date-fns";

type Trainer = {
  navn: string;
  email: string;
  telefon: string;
  foedselsdato: Date;
  aargangRolle: string;
  kontaktperson: string;
};

const AdminPortal = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [trainers, setTrainers] = useState<Trainer[]>([]);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
  };

  const handleTrainerSubmit = (data: Trainer) => {
    setTrainers([...trainers, data]);
    console.log("Trainers data:", [...trainers, data]);
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
            <CardContent className="pt-8">
              <Button 
                size="lg" 
                className="gap-2 text-base px-6 py-6"
                onClick={() => setIsFormOpen(true)}
              >
                <UserPlus className="h-5 w-5" />
                Oprettelse af ny træner
              </Button>
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
