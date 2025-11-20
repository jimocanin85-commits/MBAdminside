import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
const STORAGE_VERSION = "1.0.0";
const STORAGE_KEY = 'frivilligfest2026';
const STORAGE_VERSION_KEY = 'frivilligfest2026_version';

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

  // Debug: Log state changes
  useEffect(() => {
    console.log('[FrivilligfestDialog] checklistItems changed:', checklistItems);
    console.log('[FrivilligfestDialog] checklistItems length:', checklistItems.length);
  }, [checklistItems]);

  // Load from localStorage when dialog opens - use ref to track if we've loaded
  const hasLoadedRef = useRef(false);
  
  // Check and migrate localStorage if version changed
  useEffect(() => {
    const storedVersion = localStorage.getItem(STORAGE_VERSION_KEY);
    if (storedVersion !== STORAGE_VERSION) {
      console.log('[CACHE] Version mismatch, clearing old cache. Old:', storedVersion, 'New:', STORAGE_VERSION);
      // Optionally migrate data here, or clear if breaking changes
      localStorage.setItem(STORAGE_VERSION_KEY, STORAGE_VERSION);
    }
  }, []);
  
  useEffect(() => {
    console.log('[LOAD] useEffect triggered, open:', open, 'hasLoadedRef.current:', hasLoadedRef.current);
    console.log('[LOAD] Current checklistItems before load:', checklistItems);
    
    if (!open) {
      // Reset the ref when dialog closes so we reload next time
      console.log('[LOAD] Dialog closed, resetting hasLoadedRef');
      hasLoadedRef.current = false;
      return;
    }
    
    // Only load once when dialog opens, not on every open change
    if (hasLoadedRef.current) {
      console.log('[LOAD] Already loaded, skipping - current items:', checklistItems.length);
      return;
    }
    
    console.log('[LOAD] Loading from localStorage...');
    const saved = localStorage.getItem(STORAGE_KEY);
    console.log('[LOAD] Raw localStorage data:', saved);
    
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        console.log('[LOAD] Parsed data:', parsed);
        console.log('[LOAD] Items in parsed data:', parsed.items);
        console.log('[LOAD] Items array check:', Array.isArray(parsed.items));
        console.log('[LOAD] Items length:', parsed.items?.length);
        
        // Load checklist items - only if there are items, otherwise keep default
        if (parsed.items && Array.isArray(parsed.items) && parsed.items.length > 0) {
          console.log('[LOAD] Loading', parsed.items.length, 'items from localStorage:', parsed.items);
          console.log('[LOAD] Current state has', checklistItems.length, 'items, will replace with', parsed.items.length);
          setChecklistItems(parsed.items);
          console.log('[LOAD] State updated with items');
        } else {
          console.log('[LOAD] No valid items in localStorage, keeping current state with', checklistItems.length, 'items');
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
        hasLoadedRef.current = true;
        console.log('[LOAD] Load complete, hasLoadedRef set to true');
      } catch (e) {
        console.error('[LOAD] Error loading Frivilligfest data:', e);
        // On error, keep the default item that's already in state
        hasLoadedRef.current = true;
      }
    } else {
      console.log('[LOAD] No saved data in localStorage, keeping current state with', checklistItems.length, 'items');
      hasLoadedRef.current = true;
    }
  }, [open]);

  useEffect(() => {
    // Don't save if items array is empty (shouldn't happen, but safety check)
    if (checklistItems.length === 0) {
      console.log('[SAVE] Skipping save - checklistItems is empty');
      return;
    }
    
    // Save to localStorage whenever checklist or items change
    const dataToSave = {
      items: checklistItems,
      checklist,
      version: STORAGE_VERSION,
      timestamp: Date.now()
    };
    console.log('[SAVE] Saving to localStorage, items count:', checklistItems.length);
    console.log('[SAVE] Data:', JSON.stringify(dataToSave, null, 2));
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
      localStorage.setItem(STORAGE_VERSION_KEY, STORAGE_VERSION);
      console.log('[SAVE] Successfully saved to localStorage');
      
      // Verify it was saved
      const verify = localStorage.getItem(STORAGE_KEY);
      if (verify) {
        const parsed = JSON.parse(verify);
        console.log('[SAVE] Verification - saved items count:', parsed.items?.length);
      }
    } catch (e) {
      console.error('[SAVE] Error saving to localStorage:', e);
      // If quota exceeded, try to clear old data
      if (e instanceof Error && e.name === 'QuotaExceededError') {
        console.warn('[SAVE] Storage quota exceeded, clearing old data');
        try {
          localStorage.removeItem(STORAGE_KEY);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
        } catch (clearError) {
          console.error('[SAVE] Failed to clear and retry:', clearError);
        }
      }
    }
  }, [checklist, checklistItems]);

  const addNewTask = () => {
    const trimmedLabel = newTaskLabel.trim();
    console.log('[addNewTask] Called with label:', trimmedLabel);
    
    if (!trimmedLabel) {
      console.log('[addNewTask] Empty label, returning');
      return;
    }
    
    const newId = `task_${Date.now()}`;
    const newItem: ChecklistItem = {
      id: newId,
      label: trimmedLabel,
      note: ""
    };
    
    console.log('[addNewTask] Creating new item:', newItem);
    
    // Use functional update to ensure we have the latest state
    setChecklistItems((prevItems) => {
      console.log('[addNewTask] Previous items:', prevItems);
      const updated = [...prevItems, newItem];
      console.log('[addNewTask] Updated items:', updated);
      console.log('[addNewTask] Updated items length:', updated.length);
      return updated;
    });
    
    console.log('[addNewTask] Clearing input field');
    setNewTaskLabel("");
  };

  const removeTask = (itemId: string) => {
    const newItems = checklistItems.filter(item => item.id !== itemId);
    // Prevent removing the last item - always keep at least one
    if (newItems.length === 0) {
      return;
    }
    setChecklistItems(newItems);
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
    setChecklistItems((prevItems) => 
      prevItems.map(item => 
        item.id === itemId ? { ...item, label: newLabel } : item
      )
    );
  };

  const updateTaskNote = (itemId: string, note: string) => {
    setChecklist((prev) => ({
      ...prev,
      [itemId]: {
        status: prev[itemId]?.status ?? false,
        date: prev[itemId]?.date ?? null,
        note: note || "",
        assignedTo: prev[itemId]?.assignedTo || ""
      }
    }));
  };

  const updateTaskAssignment = (itemId: string, assignedTo: string | undefined) => {
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

  // Ensure we always have items to display
  const displayItems = checklistItems.length > 0 ? checklistItems : [{
    id: "dj",
    label: "DJ",
    note: ""
  }];
  
  // Debug: Log display items and rendering
  useEffect(() => {
    console.log('[FrivilligfestDialog] Dialog open:', open);
    console.log('[FrivilligfestDialog] checklistItems:', checklistItems);
    console.log('[FrivilligfestDialog] checklistItems.length:', checklistItems.length);
    console.log('[FrivilligfestDialog] displayItems:', displayItems);
    console.log('[FrivilligfestDialog] displayItems.length:', displayItems.length);
    console.log('[FrivilligfestDialog] Will render', displayItems.length, 'items');
  }, [open, checklistItems, displayItems]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] z-50 p-4 sm:p-6 w-full sm:w-auto flex flex-col">
        <DialogHeader className="flex-shrink-0 pb-2">
          <DialogTitle className="text-base sm:text-lg">Frivilligfest 2026</DialogTitle>
          <DialogDescription className="sr-only">
            Administrer opgaver og tildel dem til personer
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-4 sm:space-y-6 py-2 sm:py-4 -mx-3 sm:-mx-6 px-3 sm:px-6 min-h-0">
          {/* Checklist Section */}
          <div className="border rounded-lg p-4 sm:p-6 bg-background">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
              <h3 className="font-semibold text-base sm:text-lg">Tjekliste</h3>
              <div className="flex gap-2 w-full sm:w-auto items-center">
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    console.log('[REFRESH] Manual refresh triggered');
                    hasLoadedRef.current = false;
                    const saved = localStorage.getItem(STORAGE_KEY);
                    if (saved) {
                      try {
                        const parsed = JSON.parse(saved);
                        if (parsed.items && Array.isArray(parsed.items) && parsed.items.length > 0) {
                          setChecklistItems(parsed.items);
                          console.log('[REFRESH] Reloaded', parsed.items.length, 'items');
                        }
                      } catch (e) {
                        console.error('[REFRESH] Error reloading:', e);
                      }
                    }
                  }}
                  className="min-h-[44px] px-2 sm:px-3"
                  title="Opdater liste"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span className="hidden sm:inline ml-1">Opdater</span>
                </Button>
              </div>
            </div>
            <div className="space-y-3 md:space-y-2">
              {/* Desktop Header - Hidden on Mobile */}
              <div className="hidden md:grid grid-cols-[2fr,1fr,1fr,3fr,auto] gap-4 font-semibold text-sm border-b pb-2">
                <div>Opgave</div>
                <div>Udført</div>
                <div>Tildelt til</div>
                <div>Noter</div>
                <div></div>
              </div>
              {(() => {
                console.log('[RENDER] Rendering displayItems, count:', displayItems.length);
                console.log('[RENDER] displayItems:', displayItems);
                
                if (displayItems.length === 0) {
                  console.log('[RENDER] Showing empty state');
                  return (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>Ingen opgaver endnu. Tilføj en opgave ovenfor.</p>
                    </div>
                  );
                }
                
                console.log('[RENDER] Mapping', displayItems.length, 'items');
                return displayItems.map((item, index) => {
                  console.log(`[RENDER] Rendering item ${index}:`, item);
                  const checklistItem = checklist[item.id];
                  const isChecked = checklistItem?.status === true;
                  const dateInputValue = checklistDateInputs[item.id] || "";
                  const noteValue = checklistItem?.note || "";
                  const assignedTo = checklistItem?.assignedTo || "";

                  return (
                    <div key={item.id} className={`${index < displayItems.length - 1 ? 'border-b pb-4 mb-4' : ''} md:border-b md:pb-2 md:mb-0`}>
                      {/* Mobile Layout - Stacked and Touch-Friendly */}
                      <div className="md:hidden space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <Input
                            value={item.label}
                            onChange={(e) => updateTaskLabel(item.id, e.target.value)}
                            className="h-10 text-base flex-1 min-h-[44px] font-medium"
                            placeholder="Opgave navn"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeTask(item.id)}
                            className="text-muted-foreground hover:text-destructive h-10 w-10 p-0"
                          >
                            <Trash2 className="h-5 w-5" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-medium text-muted-foreground mb-2 block">Udført</label>
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
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted-foreground mb-2 block">Tildelt til</label>
                            <Select
                              value={assignedTo || undefined}
                              onValueChange={(value) => updateTaskAssignment(item.id, value)}
                            >
                              <SelectTrigger className="h-10 text-sm min-h-[44px]">
                                <SelectValue placeholder="Vælg" />
                              </SelectTrigger>
                              <SelectContent>
                                {ASSIGNABLE_PERSONS.map((person) => (
                                  <SelectItem key={person} value={person}>
                                    {person}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground mb-2 block">Noter</label>
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
                        </div>
                        <div className="flex gap-2">
                          <Select
                            value={assignedTo || undefined}
                            onValueChange={(value) => updateTaskAssignment(item.id, value)}
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue placeholder="Vælg person" />
                            </SelectTrigger>
                            <SelectContent>
                              {ASSIGNABLE_PERSONS.map((person) => (
                                <SelectItem key={person} value={person}>
                                  {person}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {assignedTo && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateTaskAssignment(item.id, undefined)}
                              className="px-2"
                              title="Fjern tildeling"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
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
                });
              })()}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FrivilligfestDialog;
