import { useState } from "react";
import LoginForm from "@/components/auth/LoginForm";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus } from "lucide-react";

const AdminPortal = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
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
            <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
              <CardTitle className="text-2xl">Velkommen til administrationen</CardTitle>
              <CardDescription className="text-base">
                Håndter trænere og klubbens informationer
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-8">
              <Button size="lg" className="gap-2 text-base px-6 py-6">
                <UserPlus className="h-5 w-5" />
                Oprettelse af ny træner
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default AdminPortal;
