import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import mbLogo from "@/assets/mb-logo.png";
import { AlertCircle } from "lucide-react";

interface LoginFormProps {
  onLogin: (username: string, sessionId: string) => void;
}

const USERS = {
  admin: "Monne1935",
  Brian: "Monne1935"
  // Karina is now handled as a custom user
};

// Admin users who can always log in
const ADMIN_USERS = ['admin', 'Brian'];

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

// Generate a unique session ID
const generateSessionId = () => {
  return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${Math.random().toString(36).substr(2, 9)}`;
};

const LoginForm = ({ onLogin }: LoginFormProps) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSessionError(null);

    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();
    
    // First validate credentials
    let isValidUser = false;
    
    // Check hardcoded users first
    if (USERS[trimmedUsername as keyof typeof USERS] === trimmedPassword) {
      isValidUser = true;
    } else {
      // Check custom users from localStorage or API
      try {
        // Try API first
        const response = await fetch('/api/users');
        const result = await response.json();
        
        if (result.success && result.data) {
          const cloudUser = result.data.find(
            (u: CustomUser) => u.username === trimmedUsername && u.password === trimmedPassword
          );
          
          if (cloudUser) {
            if (cloudUser.isActive === false) {
              toast.error("Denne bruger er deaktiveret");
              setIsLoading(false);
              return;
            }
            isValidUser = true;
          }
        }
        
        // Fallback to localStorage
        if (!isValidUser) {
          const customUsersJson = localStorage.getItem('customUsers');
          if (customUsersJson) {
            const customUsers: CustomUser[] = JSON.parse(customUsersJson);
            const customUser = customUsers.find(
              u => u.username === trimmedUsername && u.password === trimmedPassword
            );
            
            if (customUser) {
              if (customUser.isActive === false) {
                toast.error("Denne bruger er deaktiveret");
                setIsLoading(false);
                return;
              }
              isValidUser = true;
            }
          }
        }
      } catch (error) {
        console.error('Error checking users:', error);
        // Fallback to localStorage only
        try {
          const customUsersJson = localStorage.getItem('customUsers');
          if (customUsersJson) {
            const customUsers: CustomUser[] = JSON.parse(customUsersJson);
            const customUser = customUsers.find(
              u => u.username === trimmedUsername && u.password === trimmedPassword
            );
            
            if (customUser && customUser.isActive !== false) {
              isValidUser = true;
            }
          }
        } catch (e) {
          console.error('Error reading localStorage:', e);
        }
      }
    }

    if (!isValidUser) {
      toast.error("Forkert brugernavn eller adgangskode");
      setIsLoading(false);
      return;
    }

    // User is valid, now check for existing session
    const sessionId = generateSessionId();
    const isAdmin = ADMIN_USERS.includes(trimmedUsername);
    
    try {
      const sessionResponse = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: trimmedUsername,
          sessionId,
          userAgent: navigator.userAgent,
          forceLogin: isAdmin // Admin users can force login
        })
      });

      const sessionResult = await sessionResponse.json();

      if (!sessionResponse.ok) {
        if (sessionResult.error === 'SESSION_EXISTS') {
          setSessionError(sessionResult.message);
          setIsLoading(false);
          return;
        }
        throw new Error(sessionResult.error || 'Failed to create session');
      }

      // Session created successfully
      localStorage.setItem('sessionId', sessionId);
      toast.success("Login successful!");
      onLogin(trimmedUsername, sessionId);
    } catch (error) {
      console.error('Session error:', error);
      // If session API fails, still allow login (graceful fallback)
      // but store session locally
      localStorage.setItem('sessionId', sessionId);
      toast.success("Login successful!");
      onLogin(trimmedUsername, sessionId);
    }
    
    setIsLoading(false);
  };

  return (
    <Card className="w-full max-w-md shadow-lg border-2 mx-4">
      <CardHeader className="space-y-4 text-center p-6 sm:p-8">
        <div className="flex justify-center">
          <img src={mbLogo} alt="Måløv Boldklub Logo" className="w-20 h-20 sm:w-24 sm:h-24" />
        </div>
        <div>
          <CardTitle className="text-2xl sm:text-3xl font-bold">Måløv Boldklub</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-6 sm:p-8 pt-0 sm:pt-0">
        <form onSubmit={handleSubmit} className="space-y-5">
          {sessionError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-red-700">
                <p className="font-medium">Session aktiv</p>
                <p className="mt-1">{sessionError}</p>
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="username" className="text-base">Brugernavn</Label>
            <Input
              id="username"
              name="username"
              type="text"
              placeholder="Indtast brugernavn"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setSessionError(null);
              }}
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              required
              className="h-12 text-base px-4"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-base">Adgangskode</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="Indtast adgangskode"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="h-12 text-base px-4"
            />
          </div>
          <Button type="submit" className="w-full h-12 text-base font-medium" disabled={isLoading}>
            {isLoading ? "Logger ind..." : "Log ind"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default LoginForm;
