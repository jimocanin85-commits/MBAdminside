import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { da } from "date-fns/locale";
import {
  ChevronRight,
  Plus,
  DoorOpen,
  ExternalLink,
  FileText,
  Link2,
  Upload,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import { EmptyState, PageBody, PageHeader, Panel } from "@/components/layout/PageHeader";
import { FRIVILLIGFEST_URL } from "@/components/layout/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { usePortal } from "@/context/PortalContext";
import { safeExternalUrl } from "@/lib/api";
import { displayNameFromFile, fetchReferater, fetchTasks, fetchVolunteerFiles, MONTH_NAMES } from "@/lib/portalData";

const formatDay = (timestamp: number) => format(new Date(timestamp), "d. MMM yyyy", { locale: da });

interface ShortcutProps {
  to: string;
  icon: LucideIcon;
  title: string;
  text: string;
}

const Shortcut = ({ to, icon: Icon, title, text }: ShortcutProps) => (
  <Link
    to={to}
    className="flex items-center gap-3.5 rounded-xl border bg-card p-4 text-card-foreground transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:p-[18px]"
  >
    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
      <Icon className="h-[22px] w-[22px]" />
    </span>
    <span className="min-w-0">
      <span className="block text-[17px] font-semibold leading-tight">{title}</span>
      <span className="mt-0.5 block text-sm text-muted-foreground">{text}</span>
    </span>
  </Link>
);

const PanelLink = ({ to, children }: { to: string; children: ReactNode }) => (
  <Link to={to} className="text-[15px] font-semibold text-primary underline-offset-4 hover:underline">
    {children}
  </Link>
);

/** Rows that are still loading: quiet placeholders instead of a spinner. */
const LoadingRows = () => (
  <div className="space-y-3" aria-hidden="true">
    {[0, 1, 2].map((row) => (
      <div key={row} className="h-12 animate-pulse rounded-lg bg-muted" />
    ))}
  </div>
);

const Dashboard = () => {
  const { username, hasPermission } = useAuth();
  const { isSectionEnabled, customSections, sectionOrder } = usePortal();

  const showFrivillig = isSectionEnabled("frivillig") && hasPermission("frivillig");
  const showAarshjul = isSectionEnabled("aarshjul") && hasPermission("aarshjul");
  const showReferater = isSectionEnabled("referater") && hasPermission("referater");
  const showFrivilligfest = isSectionEnabled("frivilligfest") && hasPermission("frivilligfest");

  const now = new Date();
  const thisMonth = now.getMonth();
  const year = String(now.getFullYear());

  const tasks = useQuery({ queryKey: ["tasks"], queryFn: fetchTasks, enabled: showAarshjul });
  const referater = useQuery({
    queryKey: ["referater", year],
    queryFn: () => fetchReferater(year),
    enabled: showReferater,
  });
  const volunteers = useQuery({ queryKey: ["volunteer-files"], queryFn: fetchVolunteerFiles, enabled: showFrivillig });

  // Open tasks for this month and the next, nearest first.
  const upcomingTasks = (tasks.data || [])
    .filter((task) => !task.completed)
    .map((task) => ({ ...task, distance: (task.month - thisMonth + 12) % 12 }))
    .filter((task) => task.distance <= 1)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 5);

  // The club's own links, in the order chosen on "Tilpas portal".
  const links: { id: string; name: string; href: string }[] = [];
  sectionOrder.forEach((id) => {
    const section = customSections.find((candidate) => candidate.id === id);
    const href = section ? safeExternalUrl(section.url) : null;
    if (section && href) links.push({ id: section.id, name: section.name, href });
  });

  const hasAnything = showFrivillig || showAarshjul || showReferater || showFrivilligfest || links.length > 0;

  return (
    <>
      <PageHeader
        eyebrow={`Velkommen tilbage, ${username}`}
        title="Forside"
        actions={
          showFrivillig && (
            <Button asChild variant="inverse" size="lg">
              <Link to="/frivillige?ny=1">
                <UserPlus />
                Opret frivillig
              </Link>
            </Button>
          )
        }
      />

      <PageBody>
        {!hasAnything && (
          <Panel>
            <EmptyState>
              Du har ikke adgang til nogen sektioner endnu. Kontakt en administrator for at få tildelt adgang.
            </EmptyState>
          </Panel>
        )}

        {(showFrivillig || showAarshjul || showReferater) && (
          <section aria-label="Genveje" className="grid gap-3 sm:grid-cols-2 md:gap-4 xl:grid-cols-4">
            {showFrivillig && (
              <Shortcut to="/frivillige?ny=1" icon={UserPlus} title="Opret frivillig" text="Ny træner eller hjælper" />
            )}
            {showFrivillig && (
              <Shortcut to="/frivillige?exit=1" icon={DoorOpen} title="Exit-formular" text="Når en frivillig stopper" />
            )}
            {showAarshjul && (
              <Shortcut to="/aarshjul" icon={Plus} title="Ny opgave" text="Tilføj til årshjulet" />
            )}
            {showReferater && (
              <Shortcut to="/referater" icon={Upload} title="Upload referat" text="Fra bestyrelsesmøde" />
            )}
          </section>
        )}

        {(showAarshjul || showReferater) && (
          <div className="grid gap-6 lg:grid-cols-5">
            {showAarshjul && (
              <Panel
                title="Kommende opgaver"
                action={<PanelLink to="/aarshjul">Se årshjulet</PanelLink>}
                className={showReferater ? "lg:col-span-3" : "lg:col-span-5"}
              >
                {tasks.isLoading ? (
                  <LoadingRows />
                ) : tasks.isError ? (
                  <EmptyState>Opgaverne kunne ikke hentes lige nu.</EmptyState>
                ) : upcomingTasks.length === 0 ? (
                  <EmptyState>
                    Ingen åbne opgaver i {MONTH_NAMES[thisMonth].toLowerCase()} eller{" "}
                    {MONTH_NAMES[(thisMonth + 1) % 12].toLowerCase()}.
                  </EmptyState>
                ) : (
                  <ul className="divide-y">
                    {upcomingTasks.map((task) => (
                      <li key={task.id} className="flex items-center gap-3.5 py-3.5 first:pt-0 last:pb-0">
                        <span
                          aria-hidden="true"
                          className={`h-3 w-3 shrink-0 rounded-full ${task.distance === 0 ? "bg-primary" : "bg-muted-foreground"}`}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold">{task.title}</span>
                          <span className="block truncate text-sm text-muted-foreground">
                            {MONTH_NAMES[task.month]}
                            {task.assignedUsers.length > 0 && ` · ${task.assignedUsers.join(", ")}`}
                          </span>
                        </span>
                        {task.distance === 0 ? (
                          <span className="whitespace-nowrap rounded-full bg-secondary px-3 py-1 text-[13px] font-semibold text-secondary-foreground">
                            Denne måned
                          </span>
                        ) : (
                          <span className="whitespace-nowrap rounded-full border border-foreground px-3 py-[3px] text-[13px] font-semibold">
                            Næste måned
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            )}

            {showReferater && (
              <Panel
                title="Seneste referater"
                action={<PanelLink to="/referater">Se alle</PanelLink>}
                className={showAarshjul ? "lg:col-span-2" : "lg:col-span-5"}
              >
                {referater.isLoading ? (
                  <LoadingRows />
                ) : referater.isError ? (
                  <EmptyState>Referaterne kunne ikke hentes lige nu.</EmptyState>
                ) : (referater.data || []).length === 0 ? (
                  <EmptyState>Ingen referater for {year} endnu.</EmptyState>
                ) : (
                  <ul className="divide-y">
                    {(referater.data || []).slice(0, 4).map((file) => (
                      <li key={file.fileId}>
                        <Link
                          to="/referater"
                          className="flex items-center gap-3.5 py-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <FileText className="h-[22px] w-[22px] shrink-0 text-primary" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-semibold">{file.fileName}</span>
                            <span className="block text-sm text-muted-foreground">{formatDay(file.uploadTimestamp)}</span>
                          </span>
                          <ChevronRight className="h-[18px] w-[18px] shrink-0 text-muted-foreground" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            )}
          </div>
        )}

        {(showFrivillig || showFrivilligfest || links.length > 0) && (
          <div className="grid gap-6 lg:grid-cols-5">
            {showFrivillig && (
              <Panel
                title="Seneste frivillige"
                action={<PanelLink to="/filer">Se alle</PanelLink>}
                className={showFrivilligfest || links.length > 0 ? "lg:col-span-3" : "lg:col-span-5"}
              >
                {volunteers.isLoading ? (
                  <LoadingRows />
                ) : volunteers.isError ? (
                  <EmptyState>Listen kunne ikke hentes lige nu.</EmptyState>
                ) : (volunteers.data || []).length === 0 ? (
                  <EmptyState>Ingen frivillige er oprettet endnu.</EmptyState>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[320px] border-collapse text-[15px]">
                      <thead>
                        <tr className="text-left">
                          <th scope="col" className="eyebrow rounded-l-lg bg-muted px-3 py-2.5 text-muted-foreground">
                            Navn
                          </th>
                          <th scope="col" className="eyebrow rounded-r-lg bg-muted px-3 py-2.5 text-muted-foreground">
                            Senest opdateret
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {(volunteers.data || []).slice(0, 4).map((file) => (
                          <tr key={file.fileId}>
                            <td className="px-3 py-3.5 font-semibold">{displayNameFromFile(file.fileName)}</td>
                            <td className="whitespace-nowrap px-3 py-3.5 text-muted-foreground">
                              {formatDay(file.uploadTimestamp)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Panel>
            )}

            {(showFrivilligfest || links.length > 0) && (
              <div className={`space-y-6 ${showFrivillig ? "lg:col-span-2" : "lg:col-span-5"}`}>
                {showFrivilligfest && (
                  <Panel title="Frivilligfest 2026" tone="ink">
                    <p className="mb-4 text-[15px] text-secondary-foreground/85">
                      Planlægningen ligger i et fælles regneark, som åbner i en ny fane.
                    </p>
                    <Button asChild variant="inverse">
                      <a href={FRIVILLIGFEST_URL} target="_blank" rel="noopener noreferrer">
                        Åbn regnearket
                        <ExternalLink />
                      </a>
                    </Button>
                  </Panel>
                )}

                {links.length > 0 && (
                  <Panel title="Links">
                    <ul className="divide-y">
                      {links.map((link) => (
                        <li key={link.id}>
                          <a
                            href={link.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex min-h-[48px] items-center gap-3.5 py-2 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <Link2 className="h-5 w-5 shrink-0 text-primary" />
                            <span className="min-w-0 flex-1 truncate">{link.name}</span>
                            <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" aria-label="åbner i ny fane" />
                          </a>
                        </li>
                      ))}
                    </ul>
                  </Panel>
                )}
              </div>
            )}
          </div>
        )}
      </PageBody>
    </>
  );
};

export default Dashboard;
