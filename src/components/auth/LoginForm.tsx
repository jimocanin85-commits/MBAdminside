import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import mbLogo from "@/assets/mb-logo.png";

interface LoginFormProps {
  onLogin: (email: string, password: string) => Promise<void>;
}

const LoginForm = ({ onLogin }: LoginFormProps) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await onLogin(username, password);
      toast.success("Login successful!");
    } catch (error: any) {
      console.error("Login error:", error);
      toast.error(error.message || "Forkert brugernavn eller adgangskode");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md shadow-lg border-2">
      <CardHeader className="space-y-4 text-center">
        <div className="flex justify-center">
          <img src={mbLogo} alt="Måløv Boldklub Logo" className="w-24 h-24" />
        </div>
        <div>
          <CardTitle className="text-3xl font-bold">Måløv Boldklub</CardTitle>
          <CardDescription className="text-base mt-2">Administrations Portal</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Brugernavn</Label>
            <Input
              id="username"
              name="username"
              type="text"
              placeholder="Indtast brugernavn"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Adgangskode</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="Indtast adgangskode"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Logger ind..." : "Log ind"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default LoginForm;
