import { useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Play } from "lucide-react";
import { PageBody, PageHeader, Panel } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";

interface CheckStep {
  id: string;
  label: string;
  ok: boolean;
  detail: string;
}

interface CheckResult {
  success: boolean;
  steps: CheckStep[];
}

/**
 * "Fillager": proves that files can be saved, fetched and removed in
 * Backblaze with the keys that are set right now. Use it after changing a
 * key. The check saves one small test file in its own folder and removes
 * it again; it never changes volunteers' files or minutes.
 */
const Fillager = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [ranAt, setRanAt] = useState<Date | null>(null);

  const runCheck = async () => {
    setIsRunning(true);
    setFailure(null);
    try {
      const response = await apiFetch("/storage-check", { method: "POST" });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data || !Array.isArray(data.steps)) {
        setResult(null);
        setFailure((data && data.message) || "Tjekket kunne ikke køres. Prøv igen.");
      } else {
        setResult(data);
        setRanAt(new Date());
      }
    } catch {
      setResult(null);
      setFailure("Kunne ikke forbinde til serveren. Prøv igen.");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Tjek at filer kan gemmes og hentes"
        title="Fillager"
        actions={
          <Button variant="inverse" size="lg" onClick={runCheck} disabled={isRunning}>
            {isRunning ? <Loader2 className="animate-spin" /> : <Play />}
            {isRunning ? "Tjekker..." : "Kør tjek"}
          </Button>
        }
      />

      <PageBody>
        <Panel title="Tjek af fillageret">
          <p className="mb-5 max-w-2xl text-muted-foreground">
            Tjekket gemmer en lille testfil hos Backblaze, henter den igen, sammenligner indholdet og sletter den. Det
            bruger samme kode som resten af portalen, så et grønt resultat betyder, at frivilliges filer og referater kan
            gemmes og åbnes. Rigtige filer bliver kun talt, ikke ændret.
          </p>

          {failure && (
            <div role="alert" className="flex items-start gap-3 rounded-lg border border-primary/40 bg-accent p-4 text-accent-foreground">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <p className="font-medium">{failure}</p>
            </div>
          )}

          {!result && !failure && (
            <div className="rounded-lg border border-dashed px-4 py-10 text-center text-muted-foreground">
              Tryk på "Kør tjek" for at afprøve fillageret.
            </div>
          )}

          {result && (
            <div aria-live="polite">
              <div
                className={`mb-4 flex items-center gap-3 rounded-lg p-4 font-semibold ${
                  result.success ? "bg-success/15 text-success" : "bg-accent text-accent-foreground"
                }`}
              >
                {result.success ? <CheckCircle2 className="h-6 w-6 shrink-0" /> : <AlertCircle className="h-6 w-6 shrink-0" />}
                <span>
                  {result.success
                    ? "Fillageret virker: filer kan gemmes, hentes og slettes."
                    : "Der er et problem med fillageret. Se det røde trin herunder."}
                </span>
              </div>

              <ol className="divide-y rounded-lg border">
                {result.steps.map((step) => (
                  <li key={step.id} className="flex items-start gap-3 p-3.5 sm:p-4">
                    {step.ok ? (
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-label="OK" />
                    ) : (
                      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-label="Fejl" />
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold">{step.label}</p>
                      <p className="break-words text-sm text-muted-foreground">{step.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>

              {ranAt && (
                <p className="mt-3 text-sm text-muted-foreground">
                  Kørt kl. {ranAt.toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" })}
                </p>
              )}
            </div>
          )}
        </Panel>

        <Panel title="Sådan skifter du nøgle">
          <ol className="max-w-2xl list-decimal space-y-2 pl-5">
            <li>
              Log ind på Backblaze, gå til <strong>Application Keys</strong>, og opret en ny nøgle. Giv den adgang til
              klubbens fillager med ret til at læse, skrive og slette filer (Read and Write), og lad feltet "File name
              prefix" stå tomt.
            </li>
            <li>
              Åbn projektet i Vercel under <strong>Settings → Environment Variables</strong>, og sæt{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-sm">BACKBLAZE_KEY_ID</code> og{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-sm">BACKBLAZE_APPLICATION_KEY</code> til den nye nøgles
              to værdier.
            </li>
            <li>Udrul siden igen i Vercel (Deployments → Redeploy), så den nye nøgle tages i brug.</li>
            <li>Kom tilbage hertil, og tryk på "Kør tjek". Når alt er grønt, kan den gamle nøgle slettes i Backblaze.</li>
          </ol>
          <p className="mt-4 max-w-2xl text-sm text-muted-foreground">
            Skriv aldrig en nøgle ind i en fil, en mail eller en besked. Den hører kun hjemme i Vercel.
          </p>
        </Panel>
      </PageBody>
    </>
  );
};

export default Fillager;
