import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import YearWheel from "./YearWheel";
import AddTaskModal from "./AddTaskModal";
import TaskDetailsPanel from "./TaskDetailsPanel";
import YearWheelLegend from "./YearWheelLegend";
import { Task } from "@/types/task";
import { Section } from "@/types/section";
import { Plus, List, Calendar } from "lucide-react";
import { formatDate } from "@/lib/dateHelpers";

interface AarshjulViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId?: string;
}

// Mock data - skal erstattes med API calls
const mockSections: Section[] = [
  { id: "1", navn: "Bestyrelse", farve: "#ef4444", aar: 2025 },
  { id: "2", navn: "Sport", farve: "#3b82f6", aar: 2025 },
  { id: "3", navn: "Frivillige", farve: "#10b981", aar: 2025 },
  { id: "4", navn: "Drift & Anlæg", farve: "#f59e0b", aar: 2025 },
  { id: "5", navn: "Kommunikation & Events", farve: "#8b5cf6", aar: 2025 },
];

export default function AarshjulView({ open, onOpenChange, currentUserId }: AarshjulViewProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sections] = useState<Section[]>(mockSections);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailsPanel, setShowDetailsPanel] = useState(false);
  const [viewMode, setViewMode] = useState<"wheel" | "list">("wheel");
  const [currentYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadTasks();
    } else {
      // Reset state when dialog closes
      setTasks([]);
      setSelectedTask(null);
      setShowAddModal(false);
      setShowDetailsPanel(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const loadTasks = async () => {
    if (!open) return; // Don't load if dialog is closed
    
    setLoading(true);
    try {
      const response = await fetch(`/api/tasks?year=${currentYear}`);
      if (response.ok) {
        const data = await response.json();
        setTasks(Array.isArray(data) ? data : []);
      } else {
        console.error("Failed to load tasks");
        setTasks([]);
      }
    } catch (error) {
      console.error("Error loading tasks:", error);
      // Don't crash if API fails - just use empty array
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setShowDetailsPanel(true);
  };

  const handleTaskCreated = (task: Task) => {
    setTasks([...tasks, task]);
    loadTasks(); // Reload to get full task data
  };

  const handleTaskDeleted = (taskId: string) => {
    setTasks(tasks.filter((t) => t.id !== taskId));
    setSelectedTask(null);
  };

  const handleTaskEdit = (task: Task) => {
    setSelectedTask(task);
    setShowDetailsPanel(false);
    // TODO: Open edit modal
    setShowAddModal(true);
  };

  // Don't render anything if dialog is closed
  if (!open) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-6xl max-h-[90vh] flex flex-col p-4 sm:p-6">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Opgaver / Årshjul {currentYear}</DialogTitle>
          <DialogDescription>
            Oversigt over opgaver og aktiviteter på tværs af året
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 space-y-4">
          {/* View Mode Toggle */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex gap-2">
              <Button
                variant={viewMode === "wheel" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("wheel")}
                className="gap-2"
              >
                <Calendar className="h-4 w-4" />
                Årshjul
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("list")}
                className="gap-2"
              >
                <List className="h-4 w-4" />
                Liste
              </Button>
            </div>
            <Button className="gap-2" onClick={() => setShowAddModal(true)}>
              <Plus className="h-4 w-4" />
              Tilføj opgave
            </Button>
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Indlæser opgaver...</p>
            </div>
          ) : viewMode === "wheel" ? (
            <div>
              {open && (
                <>
                  <div className="flex justify-center">
                    <YearWheel
                      tasks={tasks}
                      sections={sections}
                      year={currentYear}
                      onTaskClick={handleTaskClick}
                    />
                  </div>
                  <YearWheelLegend sections={sections} />
                </>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {tasks.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground">Ingen opgaver oprettet endnu</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Klik på "Tilføj opgave" for at oprette en ny opgave
                    </p>
                  </CardContent>
                </Card>
              ) : (
                tasks.map((task) => (
                  <Card key={task.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleTaskClick(task)}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium">{task.titel}</h3>
                          <p className="text-sm text-muted-foreground mt-1">{task.beskrivelse}</p>
                          <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                            <span>Start: {formatDate(task.start_dato)}</span>
                            <span>Slut: {formatDate(task.slut_dato)}</span>
                          </div>
                        </div>
                        <div
                          className="w-4 h-4 rounded-full shrink-0"
                          style={{ backgroundColor: task.farve }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>

        {/* Add Task Modal */}
        {open && (
          <AddTaskModal
            open={showAddModal}
            onOpenChange={setShowAddModal}
            sections={sections}
            onTaskCreated={handleTaskCreated}
            currentUserId={currentUserId}
          />
        )}

        {/* Task Details Panel */}
        {open && (
          <TaskDetailsPanel
            task={selectedTask}
            open={showDetailsPanel}
            onOpenChange={setShowDetailsPanel}
            sections={sections}
            onEdit={handleTaskEdit}
            onDelete={handleTaskDeleted}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
