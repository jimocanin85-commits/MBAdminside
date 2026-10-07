import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Link2, Plus, Save, Trash2, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { PageBody, PageHeader, Panel } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  BUILT_IN_SECTIONS,
  SECTION_LABELS,
  usePortal,
  type BuiltInSectionId,
  type CustomSection,
} from "@/context/PortalContext";
import { safeExternalUrl } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Row {
  id: string;
  enabled: boolean;
}

const isBuiltIn = (id: string): id is BuiltInSectionId => (BUILT_IN_SECTIONS as readonly string[]).includes(id);

/** Everything that can be shown: what is switched on (in order), then the rest. */
const buildRows = (sectionOrder: string[], customSections: CustomSection[]): Row[] => {
  const rows: Row[] = sectionOrder.map((id) => ({ id, enabled: true }));
  BUILT_IN_SECTIONS.forEach((id) => {
    if (!sectionOrder.includes(id)) rows.push({ id, enabled: false });
  });
  customSections.forEach((section) => {
    if (!sectionOrder.includes(section.id)) rows.push({ id: section.id, enabled: false });
  });
  return rows;
};

/**
 * "Tilpas portal": an admin chooses which sections every user sees, in
 * which order, and adds the club's own links. Nothing changes for anyone
 * until "Gem for alle" is pressed.
 */
const Tilpas = () => {
  const { sectionOrder, customSections, isLoading, saveLayout } = usePortal();

  const [rows, setRows] = useState<Row[]>(() => buildRows(sectionOrder, customSections));
  const [links, setLinks] = useState<CustomSection[]>(customSections);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const savedSnapshot = useMemo(
    () => JSON.stringify({ rows: buildRows(sectionOrder, customSections), links: customSections }),
    [sectionOrder, customSections],
  );
  const isDirty = JSON.stringify({ rows, links }) !== savedSnapshot;

  const reset = () => {
    setRows(buildRows(sectionOrder, customSections));
    setLinks(customSections);
  };

  // Pick up the stored setup once it has loaded (or after a save).
  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedSnapshot]);

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= rows.length) return;
    const next = [...rows];
    [next[index], next[target]] = [next[target], next[index]];
    setRows(next);
  };

  const toggle = (id: string, enabled: boolean) => {
    setRows(rows.map((row) => (row.id === id ? { ...row, enabled } : row)));
  };

  const removeLink = (id: string) => {
    setRows(rows.filter((row) => row.id !== id));
    setLinks(links.filter((link) => link.id !== id));
  };

  const addLink = (event: React.FormEvent) => {
    event.preventDefault();
    const name = newName.trim();
    const url = safeExternalUrl(newUrl);
    if (!name) {
      toast.error("Giv linket et navn");
      return;
    }
    if (!url) {
      toast.error("Indtast en gyldig webadresse, f.eks. https://eksempel.dk");
      return;
    }
    const id = `custom_${Date.now()}`;
    setLinks([...links, { id, name, url }]);
    setRows([...rows, { id, enabled: true }]);
    setNewName("");
    setNewUrl("");
  };

  const save = async () => {
    setIsSaving(true);
    const result = await saveLayout({
      sectionOrder: rows.filter((row) => row.enabled).map((row) => row.id),
      customSections: links,
    });
    setIsSaving(false);

    if (result.ok === false) {
      toast.error(result.message);
    } else if (result.sharedWithEveryone) {
      toast.success("Gemt - opsætningen gælder nu for alle brugere");
    } else {
      toast.warning("Gemt på denne enhed. Serveren har ingen database sat op, så andre brugere ser det ikke.");
    }
  };

  const describe = (id: string) => {
    if (isBuiltIn(id)) return { ...SECTION_LABELS[id], isLink: false };
    const link = links.find((candidate) => candidate.id === id);
    return {
      name: link ? link.name : id,
      description: link && link.url ? link.url : "Mangler webadresse - vises ikke",
      isLink: true,
    };
  };

  return (
    <>
      <PageHeader
        eyebrow="Vælg hvad der vises, når man er logget ind"
        title="Tilpas portal"
        actions={
          <>
            <Button variant="inverseOutline" size="lg" onClick={reset} disabled={!isDirty || isSaving}>
              <Undo2 />
              Fortryd
            </Button>
            <Button variant="inverse" size="lg" onClick={save} disabled={!isDirty || isSaving || isLoading}>
              <Save />
              {isSaving ? "Gemmer..." : "Gem for alle"}
            </Button>
          </>
        }
      />

      <PageBody>
        <Panel title="Sektioner og links">
          <p className="mb-5 max-w-2xl text-muted-foreground">
            Slå til og fra, hvad der vises i menuen og på forsiden, og flyt rundt på rækkefølgen. Det gælder for alle
            brugere, men hver bruger ser stadig kun de sektioner, vedkommende har adgang til.
          </p>

          <ul className="divide-y rounded-lg border">
            {rows.map((row, index) => {
              const info = describe(row.id);
              return (
                <li key={row.id} className={cn("flex items-center gap-3 p-3 sm:gap-4 sm:p-4", !row.enabled && "bg-muted/60")}>
                  <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10"
                      onClick={() => move(index, -1)}
                      disabled={index === 0}
                      aria-label={`Flyt ${info.name} op`}
                    >
                      <ArrowUp />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10"
                      onClick={() => move(index, 1)}
                      disabled={index === rows.length - 1}
                      aria-label={`Flyt ${info.name} ned`}
                    >
                      <ArrowDown />
                    </Button>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className={cn("flex items-center gap-2 font-semibold", !row.enabled && "text-muted-foreground")}>
                      {info.isLink && <Link2 className="h-4 w-4 shrink-0 text-primary" />}
                      <span className="truncate">{info.name}</span>
                    </p>
                    <p className="truncate text-sm text-muted-foreground">{info.description}</p>
                  </div>

                  {info.isLink && (
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 shrink-0 text-destructive hover:text-destructive"
                      onClick={() => removeLink(row.id)}
                      aria-label={`Slet linket ${info.name}`}
                    >
                      <Trash2 />
                    </Button>
                  )}

                  <div className="flex shrink-0 items-center gap-2">
                    <span className="hidden text-sm text-muted-foreground sm:inline">{row.enabled ? "Vises" : "Skjult"}</span>
                    <Switch
                      checked={row.enabled}
                      onCheckedChange={(checked) => toggle(row.id, checked)}
                      aria-label={`Vis ${info.name}`}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </Panel>

        <Panel title="Tilføj link">
          <p className="mb-5 max-w-2xl text-muted-foreground">
            Et link vises i menuen og på forsiden og åbner i en ny fane, f.eks. et regneark eller klubbens hjemmeside.
          </p>
          <form onSubmit={addLink} className="grid gap-4 md:grid-cols-[1fr_1.4fr_auto] md:items-end">
            <div className="space-y-2">
              <Label htmlFor="link-name">Navn</Label>
              <Input
                id="link-name"
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                maxLength={40}
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="link-url">Webadresse</Label>
              <Input
                id="link-url"
                type="text"
                inputMode="url"
                autoCapitalize="none"
                autoCorrect="off"
                value={newUrl}
                onChange={(event) => setNewUrl(event.target.value)}
                placeholder="https://"
                className="h-12"
              />
            </div>
            <Button type="submit" variant="secondary" size="lg">
              <Plus />
              Tilføj
            </Button>
          </form>
        </Panel>
      </PageBody>
    </>
  );
};

export default Tilpas;
