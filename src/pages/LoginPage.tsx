import { useState } from "react";
import { AlertCircle } from "lucide-react";
import mbLogo from "@/assets/mb-logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";

const LoginPage = () => {
  const { login, sessionMessage } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    const result = await login(username, password);
    if (result.ok === false) {
      setError(result.message);
      setIsSubmitting(false);
    }
    // On success this page is replaced by the portal.
  };

  const notice = error || sessionMessage;

  return (
    <div className="flex min-h-screen flex-col bg-background md:flex-row">
      {/* Club panel */}
      <div className="relative flex flex-col justify-between gap-10 overflow-hidden bg-primary p-8 text-primary-foreground md:flex-1 md:p-14">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-56 -right-56 h-[40rem] w-[40rem] rounded-full border-[56px] border-sidebar"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-20 -right-20 h-[22rem] w-[22rem] rounded-full border-[40px] border-sidebar"
        />

        <span className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-white md:h-24 md:w-24">
          <img src={mbLogo} alt="Måløv Boldklub logo" className="h-16 w-16 object-contain md:h-[4.75rem] md:w-[4.75rem]" />
        </span>

        <div className="relative space-y-4">
          <h1 className="heading-display text-6xl leading-[0.92] md:text-8xl">
            Måløv
            <br />
            Boldklub
          </h1>
          <p className="text-xl font-medium">Administrationsportal</p>
        </div>
      </div>

      {/* Form */}
      <div className="flex flex-1 items-center justify-center px-4 py-10 md:px-8">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-md space-y-6 rounded-2xl border bg-card p-6 text-card-foreground sm:p-10"
        >
          <div className="space-y-1.5">
            <h2 className="heading-display text-4xl">Log ind</h2>
            <p className="text-muted-foreground">Brug dit brugernavn og din adgangskode.</p>
          </div>

          {notice && (
            <div role="alert" className="flex items-start gap-3 rounded-lg border border-primary/40 bg-accent p-4 text-accent-foreground">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <p className="text-sm font-medium">{notice}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="username" className="text-[15px] font-semibold">
              Brugernavn
            </Label>
            <Input
              id="username"
              name="username"
              type="text"
              placeholder="Indtast brugernavn"
              value={username}
              onChange={(event) => {
                setUsername(event.target.value);
                setError(null);
              }}
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              required
              className="h-[52px] px-4 text-base md:text-base"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-[15px] font-semibold">
              Adgangskode
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="Indtast adgangskode"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setError(null);
              }}
              autoComplete="current-password"
              required
              className="h-[52px] px-4 text-base md:text-base"
            />
          </div>

          <Button type="submit" size="lg" className="h-[52px] w-full text-[17px]" disabled={isSubmitting}>
            {isSubmitting ? "Logger ind..." : "Log ind"}
          </Button>

          <p className="text-center text-sm text-muted-foreground">Glemt adgangskoden? Kontakt en administrator.</p>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
