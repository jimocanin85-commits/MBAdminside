import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RefreshCw, CircleDot, List, Plus, AlertCircle } from "lucide-react";
import YearWheel from "@/components/aarshjul/YearWheel";
import TaskDetailsPanel from "@/components/aarshjul/TaskDetailsPanel";
import TaskListView from "@/components/aarshjul/TaskListView";
import AddTaskModal from "@/components/aarshjul/AddTaskModal";
import { PageBody, PageHeader, Panel } from "@/components/layout/PageHeader";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

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

type ViewMode = 'wheel' | 'list';

const Aarshjul = () => {
  const { isAdmin } = useAuth();
  // Only the admin accounts can see timestamps and the list view
  const canSeeTimestamps = isAdmin;
  const canSeeListView = isAdmin;

  // The wheel and the month's tasks sit side by side, so a month is always
  // selected - starting with the current one.
  const [selectedMonth, setSelectedMonth] = useState<number>(() => new Date().getMonth());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [useCloud] = useState(true);
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('wheel');
  const [addTaskMonth, setAddTaskMonth] = useState<number>(0); // Month for adding task in list view

  // Load tasks when the page opens. Everyone starts on the wheel; the admin
  // accounts can switch to the list with the toggle in the header.
  useEffect(() => {
    loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadTasks = async () => {
    setIsLoading(true);
    try {
      if (useCloud) {
        // Try to load from API
        const response = await apiFetch('/tasks');
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
        const response = await apiFetch('/tasks', {
          method: 'PUT',
          body: JSON.stringify({ tasks: newTasks })
        });
        
        if (!response.ok) {
          console.error('Failed to save to cloud');
          toast.error("Ændringen kunne ikke gemmes for alle - den ligger kun på denne enhed");
        }
      } catch (error) {
        console.error('Error saving to cloud:', error);
        toast.error("Ændringen kunne ikke gemmes for alle - den ligger kun på denne enhed");
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

  const handleEditSubtask = (taskId: string, subtaskId: string, newTitle: string) => {
    const newTasks = tasks.map(t => {
      if (t.id === taskId) {
        const newSubtasks = t.subtasks.map(s => {
          if (s.id === subtaskId) {
            return { ...s, title: newTitle };
          }
          return s;
        });
        return { ...t, subtasks: newSubtasks, updatedAt: new Date().toISOString() };
      }
      return t;
    });
    saveTasks(newTasks);
  };

  const handleDeleteSubtask = (taskId: string, subtaskId: string) => {
    const newTasks = tasks.map(t => {
      if (t.id === taskId) {
        const newSubtasks = t.subtasks.filter(s => s.id !== subtaskId);
        return { ...t, subtasks: newSubtasks, updatedAt: new Date().toISOString() };
      }
      return t;
    });
    saveTasks(newTasks);
  };

  const handleAddSubtask = (taskId: string, title: string) => {
    const newTasks = tasks.map(t => {
      if (t.id === taskId) {
        const newSubtask: Subtask = {
          id: `subtask_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          title,
          completed: false,
        };
        return { ...t, subtasks: [...t.subtasks, newSubtask], updatedAt: new Date().toISOString() };
      }
      return t;
    });
    saveTasks(newTasks);
  };

  const handleMonthSelect = (month: number) => {
    setSelectedMonth(month);
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

  const year = new Date().getFullYear();
  const showList = viewMode === 'list' && canSeeListView;

  return (
    <>
      <PageHeader
        eyebrow="Opgavestyring"
        title={`Årshjul ${year}`}
        actions={
          <>
            {/* View toggle - only for the admin accounts */}
            {canSeeListView && (
              <div role="group" aria-label="Visning" className="flex rounded-xl bg-sidebar p-1">
                <button
                  type="button"
                  aria-pressed={!showList}
                  onClick={() => setViewMode('wheel')}
                  className={cn(
                    "flex h-10 items-center gap-2 rounded-lg px-4 text-[15px] font-semibold text-primary-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground",
                    !showList && "bg-primary-foreground text-primary"
                  )}
                >
                  <CircleDot className="h-4 w-4" />
                  Hjul
                </button>
                <button
                  type="button"
                  aria-pressed={showList}
                  onClick={() => setViewMode('list')}
                  className={cn(
                    "flex h-10 items-center gap-2 rounded-lg px-4 text-[15px] font-semibold text-primary-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground",
                    showList && "bg-primary-foreground text-primary"
                  )}
                >
                  <List className="h-4 w-4" />
                  Liste
                </button>
              </div>
            )}
            <Button
              variant="inverseOutline"
              size="icon"
              className="h-12 w-12"
              onClick={loadTasks}
              disabled={isLoading}
              aria-label="Genindlæs opgaver"
            >
              <RefreshCw className={isLoading ? 'animate-spin' : ''} />
            </Button>
            <Button
              variant="inverse"
              size="lg"
              onClick={() => (showList ? handleAddTaskForMonth(new Date().getMonth()) : handleAddTask())}
            >
              <Plus />
              Ny opgave
            </Button>
          </>
        }
      />

      <PageBody>
        {cloudError && (
          <div role="status" className="flex items-start gap-3 rounded-xl border border-warning/40 bg-card p-4 text-sm">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
            <p>
              <strong>Opgaverne kunne ikke hentes fra serveren.</strong> Du ser den kopi, der ligger på denne enhed, og
              ændringer deles ikke med andre, før forbindelsen virker igen.
            </p>
          </div>
        )}

        {showList ? (
          // List view (admin accounts only)
          <Panel>
            <TaskListView
              tasks={tasks}
              onAddTask={handleAddTaskForMonth}
              onEditTask={handleEditTask}
              onDeleteTask={handleDeleteTask}
              onToggleTask={handleToggleTask}
              onToggleSubtask={handleToggleSubtask}
              onEditSubtask={handleEditSubtask}
              onDeleteSubtask={handleDeleteSubtask}
              onAddSubtask={handleAddSubtask}
              showTimestamps={canSeeTimestamps}
            />
          </Panel>
        ) : (
          // Wheel with the selected month's tasks next to it
          <div className="grid items-start gap-6 lg:grid-cols-5">
            <Panel title="Året rundt" className="lg:col-span-2">
              <YearWheel
                selectedMonth={selectedMonth}
                onMonthSelect={handleMonthSelect}
                tasks={tasks}
              />
            </Panel>
            <Panel className="lg:col-span-3">
              <TaskDetailsPanel
                month={selectedMonth}
                tasks={tasks}
                onAddTask={handleAddTask}
                onEditTask={handleEditTask}
                onDeleteTask={handleDeleteTask}
                onToggleTask={handleToggleTask}
                onToggleSubtask={handleToggleSubtask}
                onEditSubtask={handleEditSubtask}
                onDeleteSubtask={handleDeleteSubtask}
                onAddSubtask={handleAddSubtask}
                showTimestamps={canSeeTimestamps}
                showAddButton={false}
              />
            </Panel>
          </div>
        )}
      </PageBody>

      {/* Add/Edit Task Modal */}
      <AddTaskModal
        open={showAddTaskModal}
        onOpenChange={setShowAddTaskModal}
        month={showList || editingTask ? addTaskMonth : selectedMonth}
        onTaskCreated={handleTaskCreated}
        editingTask={editingTask}
        onTaskUpdated={handleTaskUpdated}
      />
    </>
  );
};

export default Aarshjul;
