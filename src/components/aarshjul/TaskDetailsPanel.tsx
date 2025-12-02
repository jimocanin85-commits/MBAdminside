import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Task } from "@/types/task";
import { Section } from "@/types/section";
import { formatDate } from "@/lib/dateHelpers";
import { Edit, Trash2, X } from "lucide-react";
import { toast } from "sonner";

interface TaskDetailsPanelProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sections: Section[];
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
}

export default function TaskDetailsPanel({
  task,
  open,
  onOpenChange,
  sections,
  onEdit,
  onDelete,
}: TaskDetailsPanelProps) {
  if (!task) return null;

  const section = sections.find((s) => s.id === task.spor_id);

  const handleDelete = async () => {
    if (!confirm("Er du sikker på at du vil slette denne opgave?")) {
      return;
    }

    try {
      const response = await fetch("/api/tasks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: task.id }),
      });

      if (!response.ok) {
        throw new Error("Kunne ikke slette opgave");
      }

      toast.success("Opgave slettet");
      onDelete(task.id);
      onOpenChange(false);
    } catch (error) {
      console.error("Error deleting task:", error);
      toast.error("Kunne ikke slette opgave");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className="w-4 h-4 rounded-full shrink-0"
              style={{ backgroundColor: task.farve }}
            />
            <DialogTitle className="flex-1">{task.titel}</DialogTitle>
          </div>
          <DialogDescription>
            Opgave detaljer
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {section && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: section.farve }}
                  />
                  <span className="text-sm font-medium">{section.navn}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {task.beskrivelse && (
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold mb-2">Beskrivelse</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {task.beskrivelse}
                </p>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold mb-1">Startdato</h3>
                <p className="text-sm text-muted-foreground">
                  {formatDate(task.start_dato)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold mb-1">Slutdato</h3>
                <p className="text-sm text-muted-foreground">
                  {formatDate(task.slut_dato)}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold mb-1">Oprettet</h3>
              <p className="text-sm text-muted-foreground">
                {formatDate(task.oprettet_dato)}
              </p>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onEdit(task)}
            className="gap-2 w-full sm:w-auto"
          >
            <Edit className="h-4 w-4" />
            Rediger
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            className="gap-2 w-full sm:w-auto"
          >
            <Trash2 className="h-4 w-4" />
            Slet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
