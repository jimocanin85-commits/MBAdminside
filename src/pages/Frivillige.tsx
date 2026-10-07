import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { da } from "date-fns/locale";
import { DoorOpen, FolderOpen, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { EmptyState, PageBody, PageHeader, Panel } from "@/components/layout/PageHeader";
import ExitForm from "@/components/trainer/ExitForm";
import TrainerForm from "@/components/trainer/TrainerForm";
import TrainerSpreadsheet from "@/components/trainer/TrainerSpreadsheet";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useLocalTrainers, type LocalTrainer } from "@/hooks/useLocalTrainers";

const Frivillige = () => {
  const { isAdminMode, username } = useAuth();
  // Brian works from the shared files only, as before.
  const showLocalList = username !== "Brian";
  const { trainers, addTrainer, updateTrainer, removeTrainer } = useLocalTrainers();
  const [searchParams, setSearchParams] = useSearchParams();

  const [formOpen, setFormOpen] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const [spreadsheetOpen, setSpreadsheetOpen] = useState(false);
  const [selectedTrainer, setSelectedTrainer] = useState<LocalTrainer | null>(null);

  // The front page links here with ?ny=1 / ?exit=1 to open a form directly.
  useEffect(() => {
    const wantsNew = searchParams.has("ny");
    const wantsExit = searchParams.has("exit");
    if (!wantsNew && !wantsExit) return;
    if (wantsNew) setFormOpen(true);
    if (wantsExit) setExitOpen(true);
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  // Newest month first, newest volunteer first within the month.
  const byMonth = useMemo(() => {
    const sorted = [...trainers].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const groups: { month: string; items: LocalTrainer[] }[] = [];
    sorted.forEach((trainer) => {
      const month = format(trainer.createdAt, "MMMM yyyy", { locale: da });
      const group = groups.find((candidate) => candidate.month === month);
      if (group) group.items.push(trainer);
      else groups.push({ month, items: [trainer] });
    });
    return groups;
  }, [trainers]);

  const openSpreadsheet = (trainer: LocalTrainer) => {
    setSelectedTrainer(trainer);
    setSpreadsheetOpen(true);
  };

  return (
    <>
      <PageHeader
        eyebrow="Trænere, holdledere og hjælpere"
        title="Frivillige"
        actions={
          <>
            <Button variant="inverseOutline" size="lg" onClick={() => setExitOpen(true)}>
              <DoorOpen />
              Exit-formular
            </Button>
            <Button variant="inverse" size="lg" onClick={() => setFormOpen(true)}>
              <UserPlus />
              Opret frivillig
            </Button>
          </>
        }
      />

      <PageBody>
        <Panel
          title={showLocalList ? "Oprettet på denne enhed" : "Frivilliges filer"}
          action={
            <Link
              to="/filer"
              className="inline-flex items-center gap-2 text-[15px] font-semibold text-primary underline-offset-4 hover:underline"
            >
              <FolderOpen className="h-4 w-4" />
              Se alle filer
            </Link>
          }
        >
          {!showLocalList ? (
            <EmptyState>
              Alle frivilliges filer ligger under{" "}
              <Link to="/filer" className="font-semibold text-primary underline underline-offset-4">
                Filer
              </Link>
              .
            </EmptyState>
          ) : trainers.length === 0 ? (
            <EmptyState>
              <p>Der er ikke oprettet nogen frivillige fra denne enhed.</p>
              <p className="mt-1 text-sm">
                Alle frivilliges filer, uanset hvor de er oprettet, ligger under{" "}
                <Link to="/filer" className="font-semibold text-primary underline underline-offset-4">
                  Filer
                </Link>
                .
              </p>
            </EmptyState>
          ) : (
            <div className="space-y-6">
              {byMonth.map((group) => (
                <div key={group.month}>
                  <h3 className="eyebrow mb-2 text-muted-foreground">{group.month}</h3>
                  <ul className="divide-y rounded-lg border">
                    {group.items.map((trainer) => (
                      <li
                        key={trainer.createdAt.getTime()}
                        className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center sm:p-4"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[17px] font-semibold">{trainer.navn}</p>
                          <p className="text-sm text-muted-foreground">
                            {[trainer.rolle, trainer.aargang].filter(Boolean).join(" · ")}
                            {(trainer.rolle || trainer.aargang) && " · "}
                            {format(trainer.createdAt, "d. MMMM yyyy 'kl.' HH:mm", { locale: da })}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            className="min-h-[44px] flex-1 sm:flex-initial"
                            onClick={() => openSpreadsheet(trainer)}
                          >
                            Åbn
                          </Button>
                          {isAdminMode && (
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-11 w-11 shrink-0 text-destructive hover:text-destructive"
                              aria-label={`Fjern ${trainer.navn} fra listen`}
                              onClick={() => {
                                removeTrainer(trainer);
                                toast.success("Fjernet fra listen på denne enhed");
                              }}
                            >
                              <Trash2 />
                            </Button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </PageBody>

      <TrainerForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={(data) => {
          const trainer = addTrainer(data as Omit<LocalTrainer, "createdAt">);
          toast.success(`${trainer.navn} tilføjet til oversigten`);
        }}
      />

      <ExitForm open={exitOpen} onOpenChange={setExitOpen} />

      <TrainerSpreadsheet
        open={spreadsheetOpen}
        onOpenChange={setSpreadsheetOpen}
        trainer={selectedTrainer}
        onSave={(updated) => updateTrainer(updated as LocalTrainer)}
      />
    </>
  );
};

export default Frivillige;
