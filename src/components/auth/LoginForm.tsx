import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import mbLogo from "@/assets/mb-logo.png";

interface LoginFormProps {
  onLogin: (username: string) => void;
}

const USERS = {
  admin: "Monne1935",
  Brian: "Monne1935"
  // Karina is now handled as a custom user
};

interface CustomUser {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  password: string;
  permissions: string[];
  createdAt: Date;
  isActive?: boolean;
}

const LoginForm = ({ onLogin }: LoginFormProps) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
      const trimmedUsername = username.trim();
      const trimmedPassword = password.trim();
      
      // Check hardcoded users first
      if (USERS[trimmedUsername as keyof typeof USERS] === trimmedPassword) {
        toast.success("Login successful!");
        onLogin(trimmedUsername);
        setIsLoading(false);
        return;
      }
      
      // Check custom users from localStorage
      try {
        const customUsersJson = localStorage.getItem('customUsers');
        if (customUsersJson) {
          const customUsers: CustomUser[] = JSON.parse(customUsersJson);
          const customUser = customUsers.find(
            u => u.username === trimmedUsername && u.password === trimmedPassword
          );
          
          if (customUser) {
            // Check if user is active (default to true if not set)
            if (customUser.isActive === false) {
              toast.error("Denne bruger er deaktiveret");
              setIsLoading(false);
              return;
            }
            
            toast.success("Login successful!");
            onLogin(trimmedUsername);
            setIsLoading(false);
            return;
          }
        }
      } catch (error) {
        console.error('Error reading custom users:', error);
      }
      
      // No match found
      toast.error("Forkert brugernavn eller adgangskode");
      setIsLoading(false);
    }, 500);
  };

  return (
    <Card className="w-full max-w-md shadow-lg border-2">
      <CardHeader className="space-y-4 text-center">
        <div className="flex justify-center">
          <img src={mbLogo} alt="Måløv Boldklub Logo" className="w-24 h-24" />
        </div>
        <div>
          <CardTitle className="text-3xl font-bold">Måløv Boldklub</CardTitle>
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
