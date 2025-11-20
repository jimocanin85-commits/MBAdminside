import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const FRIVILLIGFEST_CHECKLIST_ITEMS = [
  {
    id: "dj",
    label: "DJ",
    note: ""
  }
];

interface FrivilligfestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FrivilligfestDialog = ({ open, onOpenChange }: FrivilligfestDialogProps) => {
  const [checklist, setChecklist] = useState<Record<string, { status: boolean; date: Date | null }>>({});
  const [checklistDateInputs, setChecklistDateInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    // Load from localStorage on mount
    const saved = localStorage.getItem('frivilligfest2026');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const restoredChecklist: Record<string, { status: boolean; date: Date | null }> = {};
        const restoredDateInputs: Record<string, string> = {};
        
        Object.keys(parsed.checklist || {}).forEach(key => {
          restoredChecklist[key] = {
            status: parsed.checklist[key].status,
            date: parsed.checklist[key].date ? new Date(parsed.checklist[key].date) : null
          };
          if (parsed.checklist[key].date) {
            restoredDateInputs[key] = format(new Date(parsed.checklist[key].date), "dd/MM/yyyy");
          }
        });
        
        setChecklist(restoredChecklist);
        setChecklistDateInputs(restoredDateInputs);
      } catch (e) {
        console.error('Error loading Frivilligfest data:', e);
      }
    }
  }, []);

  useEffect(() => {
    // Save to localStorage whenever checklist changes
    localStorage.setItem('frivilligfest2026', JSON.stringify({
      checklist
    }));
  }, [checklist]);

  const updateChecklistStatus = (itemId: string, status: boolean) => {
    setChecklist((prev) => {
      const newChecklist = {
        ...prev,
        [itemId]: {
          status,
          date: status ? (prev[itemId]?.date || new Date()) : null
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Frivilligfest 2026 - Tjekliste</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          {/* Checklist Section */}
          <div className="border rounded-lg p-6 bg-muted/30">
            <h3 className="font-semibold mb-4 text-lg">Tjekliste</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-[2fr,1fr,3fr] gap-4 font-semibold text-sm border-b pb-2">
                <div>Opgave</div>
                <div>Status / Dato</div>
                <div>Noter</div>
              </div>
              {FRIVILLIGFEST_CHECKLIST_ITEMS.map((item) => {
                const checklistItem = checklist[item.id];
                const isChecked = checklistItem?.status === true;
                const dateInputValue = checklistDateInputs[item.id] || "";

                return (
                  <div key={item.id} className="grid grid-cols-[2fr,1fr,3fr] gap-4 items-start border-b pb-4">
                    <div className="text-sm">{item.label}</div>
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
                    <div className="text-sm text-muted-foreground">{item.note}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FrivilligfestDialog;
