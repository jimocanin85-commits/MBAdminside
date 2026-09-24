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

// Admin users who can always log in / force login (kept in sync with api/_lib/auth.ts)
const ADMIN_USERS = ['admin', 'Brian'];

// Generate a unique session ID
const generateSessionId = () => {
  return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${Math.random().toString(36).substr(2, 9)}`;
};

// Generate or get unique browser/tab ID
// This is stored in sessionStorage which is unique per tab
// This ensures each tab has its own identifier
const getBrowserId = () => {
  let browserId = sessionStorage.getItem('browserId');
  if (!browserId) {
    browserId = `browser_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('browserId', browserId);
  }
  return browserId;
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

    // Credentials are now checked entirely server-side in /api/login.
    // The browser never sees the password list or the hardcoded admin
    // password, and never fetches the full user list just to compare
    // passwords locally.
    let loginResult: { success: boolean; isAdmin?: boolean; error?: string; message?: string };
    try {
      const loginResponse = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: trimmedUsername, password: trimmedPassword })
      });
      loginResult = await loginResponse.json();

      if (!loginResponse.ok || !loginResult.success) {
        if (loginResult.error === 'USER_DISABLED') {
          toast.error(loginResult.message || "Denne bruger er deaktiveret");
        } else {
          toast.error("Forkert brugernavn eller adgangskode");
        }
        setIsLoading(false);
        return;
      }
    } catch (error) {
      console.error('Login request failed:', error);
      toast.error("Kunne ikke forbinde til serveren. Prøv igen.");
      setIsLoading(false);
      return;
    }

    // Credentials are valid, now check for existing session
    const sessionId = generateSessionId();
    const browserId = getBrowserId();
    const isAdmin = ADMIN_USERS.includes(trimmedUsername);

    try {
      const sessionResponse = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: trimmedUsername,
          password: trimmedPassword,
          sessionId,
          browserId,
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
      localStorage.setItem('browserId', browserId);
      toast.success("Login successful!");
      onLogin(trimmedUsername, sessionId);
    } catch (error) {
      console.error('Session error:', error);
      // If session API fails, still allow login (graceful fallback)
      // but store session locally
      localStorage.setItem('sessionId', sessionId);
      localStorage.setItem('browserId', browserId);
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
            <div className="bg-red-50 border border-red-300 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="h-6 w-6 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-red-700">
                <p className="font-semibold text-red-800">Adgang nægtet</p>
                <p className="mt-1">Log ud fra den anden fane/browser først for at kunne logge ind her.</p>
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
