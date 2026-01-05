import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RefreshCw, ArrowLeft, Cloud, Database, CircleDot, List } from "lucide-react";
import YearWheel from "./YearWheel";
import TaskDetailsPanel from "./TaskDetailsPanel";
import TaskListView from "./TaskListView";
import AddTaskModal from "./AddTaskModal";

interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  subtasks: Subtask[];
  assignedUsers: string[];
  completed: boolean;
  month: number;
  createdAt: string;
  updatedAt?: string;
}

interface AarshjulViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUser?: string | null;
}

type ViewMode = 'wheel' | 'list';

const AarshjulView = ({ open, onOpenChange, currentUser }: AarshjulViewProps) => {
  // Check if user can see timestamps (admin and Brian only)
  const canSeeTimestamps = currentUser === 'admin' || currentUser === 'Brian';
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [useCloud, setUseCloud] = useState(true);
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list'); // Default to list for better overview
  const [addTaskMonth, setAddTaskMonth] = useState<number>(0); // Month for adding task in list view

  // Load tasks when dialog opens
  useEffect(() => {
    if (open) {
      loadTasks();
    }
  }, [open]);

  const loadTasks = async () => {
    setIsLoading(true);
    try {
      if (useCloud) {
        // Try to load from API
        const response = await fetch('/api/tasks');
        const result = await response.json();
        
        if (response.ok && result.success) {
          setTasks(result.data || []);
          setCloudError(null);
          // Sync to localStorage
          localStorage.setItem('aarshjul_tasks', JSON.stringify(result.data || []));
        } else {
          throw new Error(result.error || 'Failed to load tasks');
        }
      } else {
        loadFromLocalStorage();
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
      setCloudError(error instanceof Error ? error.message : 'Unknown error');
      // Fallback to localStorage
      loadFromLocalStorage();
    } finally {
      setIsLoading(false);
    }
  };

  const loadFromLocalStorage = () => {
    try {
      const saved = localStorage.getItem('aarshjul_tasks');
      if (saved) {
        setTasks(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Error loading from localStorage:', e);
    }
  };

  const saveTasks = async (newTasks: Task[]) => {
    // Always save to localStorage first
    localStorage.setItem('aarshjul_tasks', JSON.stringify(newTasks));
    setTasks(newTasks);

    if (useCloud && !cloudError) {
      try {
        const response = await fetch('/api/tasks', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tasks: newTasks })
        });
        
        if (!response.ok) {
          console.error('Failed to save to cloud');
        }
      } catch (error) {
        console.error('Error saving to cloud:', error);
      }
    }
  };

  const handleTaskCreated = (task: Task) => {
    const newTasks = [...tasks, task];
    saveTasks(newTasks);
  };

  const handleTaskUpdated = (updatedTask: Task) => {
    const taskWithTimestamp = { ...updatedTask, updatedAt: new Date().toISOString() };
    const newTasks = tasks.map(t => t.id === updatedTask.id ? taskWithTimestamp : t);
    saveTasks(newTasks);
    setEditingTask(null);
  };

  const handleDeleteTask = (taskId: string) => {
    const newTasks = tasks.filter(t => t.id !== taskId);
    saveTasks(newTasks);
    toast.success("Opgave slettet");
  };

  const handleToggleTask = (taskId: string) => {
    const newTasks = tasks.map(t => {
      if (t.id === taskId) {
        return { ...t, completed: !t.completed, updatedAt: new Date().toISOString() };
      }
      return t;
    });
    saveTasks(newTasks);
  };

  const handleToggleSubtask = (taskId: string, subtaskId: string) => {
    const newTasks = tasks.map(t => {
      if (t.id === taskId) {
        const newSubtasks = t.subtasks.map(s => {
          if (s.id === subtaskId) {
            return { ...s, completed: !s.completed };
          }
          return s;
        });
        
        // Auto-complete task if all subtasks are done
        const allSubtasksComplete = newSubtasks.every(s => s.completed);
        
        return { 
          ...t, 
          subtasks: newSubtasks,
          completed: allSubtasksComplete && newSubtasks.length > 0 ? true : t.completed,
          updatedAt: new Date().toISOString()
        };
      }
      return t;
    });
    saveTasks(newTasks);
  };

  const handleMonthSelect = (month: number) => {
    setSelectedMonth(month);
  };

  const handleBackToWheel = () => {
    setSelectedMonth(null);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setAddTaskMonth(task.month); // Set month for the modal
    setShowAddTaskModal(true);
  };

  const handleAddTask = () => {
    setEditingTask(null);
    setShowAddTaskModal(true);
  };

  // For list view - add task to specific month
  const handleAddTaskForMonth = (month: number) => {
    setAddTaskMonth(month);
    setEditingTask(null);
    setShowAddTaskModal(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] sm:max-w-4xl h-[90vh] sm:h-[85vh] flex flex-col p-4 sm:p-6">
          <DialogHeader className="flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {selectedMonth !== null && viewMode === 'wheel' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleBackToWheel}
                    className="h-8 w-8"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                )}
                <DialogTitle className="flex items-center gap-2">
                  Årshjul {new Date().getFullYear()}
                  {useCloud && !cloudError && (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded flex items-center gap-1">
                      <Cloud className="h-3 w-3" /> Cloud
                    </span>
                  )}
                  {cloudError && (
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded flex items-center gap-1">
                      <Database className="h-3 w-3" /> Lokal
                    </span>
                  )}
                </DialogTitle>
              </div>
              <div className="flex items-center gap-2">
                {/* View toggle */}
                <div className="flex items-center border rounded-lg p-0.5">
                  <Button
                    variant={viewMode === 'wheel' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => {
                      setViewMode('wheel');
                      setSelectedMonth(null);
                    }}
                    className="h-7 px-2 gap-1"
                  >
                    <CircleDot className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline text-xs">Hjul</span>
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className="h-7 px-2 gap-1"
                  >
                    <List className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline text-xs">Liste</span>
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={loadTasks}
                  disabled={isLoading}
                  className="h-8 w-8"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
            <DialogDescription>
              {viewMode === 'list' 
                ? "Oversigt over alle opgaver - klik på en måned for at se detaljer"
                : selectedMonth === null 
                  ? "Klik på en måned for at se og administrere opgaver"
                  : "Administrer opgaver for den valgte måned"
              }
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-4 min-h-0">
            {viewMode === 'list' ? (
              // Show list view
              <TaskListView
                tasks={tasks}
                onAddTask={handleAddTaskForMonth}
                onEditTask={handleEditTask}
                onDeleteTask={handleDeleteTask}
                onToggleTask={handleToggleTask}
                onToggleSubtask={handleToggleSubtask}
                showTimestamps={canSeeTimestamps}
              />
            ) : selectedMonth === null ? (
              // Show wheel
              <div className="h-full flex items-center justify-center">
                <YearWheel
                  selectedMonth={selectedMonth}
                  onMonthSelect={handleMonthSelect}
                  tasks={tasks}
                />
              </div>
            ) : (
              // Show task details for selected month
              <TaskDetailsPanel
                month={selectedMonth}
                tasks={tasks}
                onAddTask={handleAddTask}
                onEditTask={handleEditTask}
                onDeleteTask={handleDeleteTask}
                onToggleTask={handleToggleTask}
                onToggleSubtask={handleToggleSubtask}
                showTimestamps={canSeeTimestamps}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Task Modal */}
      <AddTaskModal
        open={showAddTaskModal}
        onOpenChange={setShowAddTaskModal}
        month={viewMode === 'list' ? addTaskMonth : (selectedMonth ?? 0)}
        onTaskCreated={handleTaskCreated}
        editingTask={editingTask}
        onTaskUpdated={handleTaskUpdated}
      />
    </>
  );
};

export default AarshjulView;
