import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Task, CreateTaskInput } from "@/types/task";
import { Section } from "@/types/section";
import { toast } from "sonner";

interface AddTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sections: Section[];
  onTaskCreated: (task: Task) => void;
  currentUserId?: string;
}

const COLORS = [
  { name: "Rød", value: "#ef4444" },
  { name: "Blå", value: "#3b82f6" },
  { name: "Grøn", value: "#10b981" },
  { name: "Gul", value: "#f59e0b" },
  { name: "Lilla", value: "#8b5cf6" },
  { name: "Pink", value: "#ec4899" },
  { name: "Orange", value: "#f97316" },
  { name: "Cyan", value: "#06b6d4" },
];

export default function AddTaskModal({
  open,
  onOpenChange,
  sections,
  onTaskCreated,
  currentUserId,
}: AddTaskModalProps) {
  const [formData, setFormData] = useState<CreateTaskInput>({
    titel: "",
    beskrivelse: "",
    start_dato: new Date().toISOString().split("T")[0],
    slut_dato: new Date().toISOString().split("T")[0],
    spor_id: sections[0]?.id || "",
    farve: COLORS[0].value,
    ansvarlig_id: currentUserId || "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.titel.trim()) {
      toast.error("Titel er påkrævet");
      return;
    }

    if (!formData.spor_id) {
      toast.error("Vælg en kategori");
      return;
    }

    if (new Date(formData.start_dato) > new Date(formData.slut_dato)) {
      toast.error("Slutdato skal være efter startdato");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          oprettet_af: currentUserId || "",
        }),
      });

      if (!response.ok) {
        throw new Error("Kunne ikke oprette opgave");
      }

      const newTask = await response.json();
      toast.success("Opgave oprettet!");
      onTaskCreated(newTask);
      handleReset();
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating task:", error);
      toast.error("Kunne ikke oprette opgave");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({
      titel: "",
      beskrivelse: "",
      start_dato: new Date().toISOString().split("T")[0],
      slut_dato: new Date().toISOString().split("T")[0],
      spor_id: sections[0]?.id || "",
      farve: COLORS[0].value,
      ansvarlig_id: currentUserId || "",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Tilføj opgave</DialogTitle>
          <DialogDescription>
            Opret en ny opgave til årshjulet
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titel">Titel *</Label>
            <Input
              id="titel"
              value={formData.titel}
              onChange={(e) => setFormData({ ...formData, titel: e.target.value })}
              placeholder="Indtast opgavens titel"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="beskrivelse">Beskrivelse</Label>
            <Textarea
              id="beskrivelse"
              value={formData.beskrivelse}
              onChange={(e) => setFormData({ ...formData, beskrivelse: e.target.value })}
              placeholder="Indtast beskrivelse af opgaven"
              rows={4}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_dato">Startdato *</Label>
              <Input
                id="start_dato"
                type="date"
                value={formData.start_dato}
                onChange={(e) => setFormData({ ...formData, start_dato: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slut_dato">Slutdato *</Label>
              <Input
                id="slut_dato"
                type="date"
                value={formData.slut_dato}
                onChange={(e) => setFormData({ ...formData, slut_dato: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="spor_id">Kategori / Spor *</Label>
            <Select
              value={formData.spor_id}
              onValueChange={(value) => setFormData({ ...formData, spor_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Vælg kategori" />
              </SelectTrigger>
              <SelectContent>
                {sections.map((section) => (
                  <SelectItem key={section.id} value={section.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: section.farve }}
                      />
                      {section.navn}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="farve">Farve</Label>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
              {COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, farve: color.value })}
                  className={`w-10 h-10 rounded-full border-2 transition-all ${
                    formData.farve === color.value
                      ? "border-foreground scale-110"
                      : "border-transparent hover:scale-105"
                  }`}
                  style={{ backgroundColor: color.value }}
                  aria-label={color.name}
                />
              ))}
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                handleReset();
                onOpenChange(false);
              }}
              className="w-full sm:w-auto"
            >
              Annuller
            </Button>
            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
              {loading ? "Opretter..." : "Gem"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
