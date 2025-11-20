import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ASSIGNABLE_PERSONS = ["Brian", "Karina", "Jas"];

interface ChecklistItem {
  id: string;
  label: string;
  note: string;
}

interface FrivilligfestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FrivilligfestDialog = ({ open, onOpenChange }: FrivilligfestDialogProps) => {
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([
    {
      id: "dj",
      label: "DJ",
      note: ""
    }
  ]);
  const [checklist, setChecklist] = useState<Record<string, { status: boolean; date: Date | null; note: string; assignedTo: string }>>({});
  const [checklistDateInputs, setChecklistDateInputs] = useState<Record<string, string>>({});
  const [newTaskLabel, setNewTaskLabel] = useState("");

  // Debug: Log when dialog opens
  useEffect(() => {
    if (open) {
      console.log('Frivilligfest dialog opened, checklistItems:', checklistItems);
    }
  }, [open, checklistItems]);

  useEffect(() => {
    // Load from localStorage on mount
    const saved = localStorage.getItem('frivilligfest2026');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        
        // Load checklist items - only if there are items, otherwise keep default
        if (parsed.items && Array.isArray(parsed.items) && parsed.items.length > 0) {
          setChecklistItems(parsed.items);
        } else {
          // Ensure we always have at least the default DJ item
          setChecklistItems([{
            id: "dj",
            label: "DJ",
            note: ""
          }]);
        }
        
        // Load checklist data
        const restoredChecklist: Record<string, { status: boolean; date: Date | null; note: string; assignedTo: string }> = {};
        const restoredDateInputs: Record<string, string> = {};
        
        Object.keys(parsed.checklist || {}).forEach(key => {
          restoredChecklist[key] = {
            status: parsed.checklist[key].status,
            date: parsed.checklist[key].date ? new Date(parsed.checklist[key].date) : null,
            note: parsed.checklist[key].note || "",
            assignedTo: parsed.checklist[key].assignedTo || ""
          };
          if (parsed.checklist[key].date) {
            restoredDateInputs[key] = format(new Date(parsed.checklist[key].date), "dd/MM/yyyy");
          }
        });
        
        setChecklist(restoredChecklist);
        setChecklistDateInputs(restoredDateInputs);
      } catch (e) {
        console.error('Error loading Frivilligfest data:', e);
        // On error, ensure we have at least the default item
        setChecklistItems([{
          id: "dj",
          label: "DJ",
          note: ""
        }]);
      }
    }
  }, []);

  useEffect(() => {
    // Ensure we always have at least one item
    if (checklistItems.length === 0) {
      setChecklistItems([{
        id: "dj",
        label: "DJ",
        note: ""
      }]);
      return;
    }
    
    // Save to localStorage whenever checklist or items change
    localStorage.setItem('frivilligfest2026', JSON.stringify({
      items: checklistItems,
      checklist
    }));
  }, [checklist, checklistItems]);

  const addNewTask = () => {
    if (!newTaskLabel.trim()) return;
    
    const newId = `task_${Date.now()}`;
    const newItem: ChecklistItem = {
      id: newId,
      label: newTaskLabel.trim(),
      note: ""
    };
    
    setChecklistItems([...checklistItems, newItem]);
    setNewTaskLabel("");
  };

  const removeTask = (itemId: string) => {
    setChecklistItems(checklistItems.filter(item => item.id !== itemId));
    setChecklist((prev) => {
      const newChecklist = { ...prev };
      delete newChecklist[itemId];
      return newChecklist;
    });
    setChecklistDateInputs((prev) => {
      const newDateInputs = { ...prev };
      delete newDateInputs[itemId];
      return newDateInputs;
    });
  };

  const updateTaskLabel = (itemId: string, newLabel: string) => {
    setChecklistItems(checklistItems.map(item => 
      item.id === itemId ? { ...item, label: newLabel } : item
    ));
  };

  const updateTaskNote = (itemId: string, note: string) => {
    setChecklist((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        note: note || "",
        assignedTo: prev[itemId]?.assignedTo || ""
      }
    }));
  };

  const updateTaskAssignment = (itemId: string, assignedTo: string) => {
    setChecklist((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        assignedTo: assignedTo || "",
        status: prev[itemId]?.status ?? false,
        date: prev[itemId]?.date ?? null,
        note: prev[itemId]?.note || ""
      }
    }));
  };

  const updateChecklistStatus = (itemId: string, status: boolean) => {
    setChecklist((prev) => {
      const newChecklist = {
        ...prev,
        [itemId]: {
          status,
          date: status ? (prev[itemId]?.date || new Date()) : null,
          note: prev[itemId]?.note || "",
          assignedTo: prev[itemId]?.assignedTo || ""
        }
      };
      
      setChecklistDateInputs((prevInputs) => {
        const newDateInputs = { ...prevInputs };
        if (status && !newDateInputs[itemId]) {
          newDateInputs[itemId] = format(new Date(), "dd/MM/yyyy");
        } else if (!status) {
          delete newDateInputs[itemId];
        }
        return newDateInputs;
      });
      
      return newChecklist;
    });
  };

  const updateChecklistDateInput = (itemId: string, dateString: string) => {
    setChecklistDateInputs((prev) => ({
      ...prev,
      [itemId]: dateString
    }));
  };

  const validateAndSaveDate = (itemId: string) => {
    const dateString = checklistDateInputs[itemId];
    if (!dateString) return;
    
    // Parse DD/MM/YYYY format
    const parts = dateString.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1;
      const year = parseInt(parts[2]);
      const date = new Date(year, month, day);
      
      // Validate the date
      if (!isNaN(date.getTime()) && 
          date.getDate() === day && 
          date.getMonth() === month &&
          year >= 1900 && year <= 2100) {
        setChecklist((prev) => ({
          ...prev,
          [itemId]: {
            ...prev[itemId],
            date
          }
        }));
        setChecklistDateInputs((prev) => ({
          ...prev,
          [itemId]: format(date, "dd/MM/yyyy")
        }));
      } else {
        // Invalid date - reset to previous valid date or current date
        const validDate = checklist[itemId]?.date || new Date();
        setChecklistDateInputs((prev) => ({
          ...prev,
          [itemId]: format(validDate, "dd/MM/yyyy")
        }));
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto z-50 p-3 sm:p-6 w-full sm:w-auto">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">Frivilligfest 2026 - Tjekliste</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 sm:space-y-6 py-2 sm:py-4">
          {/* Checklist Section */}
          <div className="border rounded-lg p-3 sm:p-6 bg-muted/30">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
              <h3 className="font-semibold text-base sm:text-lg">Tjekliste</h3>
              <div className="flex gap-2 w-full sm:w-auto">
                <Input
                  placeholder="Tilføj ny opgave..."
                  value={newTaskLabel}
                  onChange={(e) => setNewTaskLabel(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addNewTask()}
                  className="flex-1 sm:w-48 h-9 sm:h-9 min-h-[44px]"
                />
                <Button 
                  onClick={addNewTask} 
                  size="sm"
                  className="gap-2 min-h-[44px]"
                  disabled={!newTaskLabel.trim()}
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Tilføj</span>
                </Button>
              </div>
            </div>
            <div className="space-y-4">
              {/* Desktop Header - Hidden on Mobile */}
              <div className="hidden md:grid grid-cols-[2fr,1fr,1fr,3fr,auto] gap-4 font-semibold text-sm border-b pb-2">
                <div>Opgave</div>
                <div>Status / Dato</div>
                <div>Tildelt til</div>
                <div>Noter</div>
                <div></div>
              </div>
              {checklistItems.map((item) => {
                const checklistItem = checklist[item.id];
                const isChecked = checklistItem?.status === true;
                const dateInputValue = checklistDateInputs[item.id] || "";
                const noteValue = checklistItem?.note || "";
                const assignedTo = checklistItem?.assignedTo || "";

                return (
                  <div key={item.id} className="border-b pb-4 space-y-3">
                    {/* Mobile Layout - Stacked */}
                    <div className="md:hidden space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <Input
                          value={item.label}
                          onChange={(e) => updateTaskLabel(item.id, e.target.value)}
                          className="h-9 text-sm flex-1 min-h-[44px]"
                          placeholder="Opgave navn"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTask(item.id)}
                          className="text-destructive hover:text-destructive min-h-[44px] min-w-[44px]"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-medium text-muted-foreground">Status</label>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-2 cursor-pointer min-h-[44px]">
                            <input
                              type="radio"
                              name={item.id}
                              checked={checklistItem?.status === true}
                              onChange={() => updateChecklistStatus(item.id, true)}
                              className="h-5 w-5"
                            />
                            <span className="text-sm">Ja</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer min-h-[44px]">
                            <input
                              type="radio"
                              name={item.id}
                              checked={checklistItem?.status === false}
                              onChange={() => updateChecklistStatus(item.id, false)}
                              className="h-5 w-5"
                            />
                            <span className="text-sm">Nej</span>
                          </label>
                        </div>
                        {isChecked && (
                          <Input
                            placeholder="DD/MM/ÅÅÅÅ"
                            value={dateInputValue}
                            onChange={(e) => updateChecklistDateInput(item.id, e.target.value)}
                            onBlur={() => validateAndSaveDate(item.id)}
                            className="h-9 text-sm min-h-[44px]"
                          />
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-medium text-muted-foreground">Tildelt til</label>
                        <Select
                          value={assignedTo}
                          onValueChange={(value) => updateTaskAssignment(item.id, value)}
                        >
                          <SelectTrigger className="h-9 text-sm min-h-[44px]">
                            <SelectValue placeholder="Vælg person" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Ingen</SelectItem>
                            {ASSIGNABLE_PERSONS.map((person) => (
                              <SelectItem key={person} value={person}>
                                {person}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-medium text-muted-foreground">Noter</label>
                        <Textarea
                          value={noteValue}
                          onChange={(e) => updateTaskNote(item.id, e.target.value)}
                          placeholder="Tilføj kommentar..."
                          className="min-h-[80px] text-sm resize-none"
                        />
                      </div>
                    </div>

                    {/* Desktop Layout - Grid */}
                    <div className="hidden md:grid grid-cols-[2fr,1fr,1fr,3fr,auto] gap-4 items-start">
                      <Input
                        value={item.label}
                        onChange={(e) => updateTaskLabel(item.id, e.target.value)}
                        className="h-8 text-sm"
                        placeholder="Opgave navn"
                      />
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-4">
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="radio"
                              name={item.id}
                              checked={checklistItem?.status === true}
                              onChange={() => updateChecklistStatus(item.id, true)}
                              className="h-4 w-4"
                            />
                            <span className="text-sm">Ja</span>
                          </label>
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="radio"
                              name={item.id}
                              checked={checklistItem?.status === false}
                              onChange={() => updateChecklistStatus(item.id, false)}
                              className="h-4 w-4"
                            />
                            <span className="text-sm">Nej</span>
                          </label>
                        </div>
                        {isChecked && (
                          <Input
                            placeholder="DD/MM/ÅÅÅÅ"
                            value={dateInputValue}
                            onChange={(e) => updateChecklistDateInput(item.id, e.target.value)}
                            onBlur={() => validateAndSaveDate(item.id)}
                            className="h-8 text-xs"
                          />
                        )}
                      </div>
                      <Select
                        value={assignedTo}
                        onValueChange={(value) => updateTaskAssignment(item.id, value)}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Vælg person" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Ingen</SelectItem>
                          {ASSIGNABLE_PERSONS.map((person) => (
                            <SelectItem key={person} value={person}>
                              {person}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Textarea
                        value={noteValue}
                        onChange={(e) => updateTaskNote(item.id, e.target.value)}
                        placeholder="Tilføj kommentar..."
                        className="min-h-[60px] text-sm resize-none"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTask(item.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
              {checklistItems.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Ingen opgaver endnu. Tilføj en opgave for at komme i gang.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FrivilligfestDialog;
