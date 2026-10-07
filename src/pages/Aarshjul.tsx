import { useState, useEffect, useRef } from "react";
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

// Copy of the last list fetched from the server, shown (read-only) when it cannot be reached.
const CACHE_KEY = 'aarshjul_tasks';

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
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('wheel');
  const [addTaskMonth, setAddTaskMonth] = useState<number>(0); // Month for adding task in list view
  // Saves run one after another, in the order the changes were made.
  const saveQueue = useRef<Promise<void>>(Promise.resolve());

  // Load tasks when the page opens. Everyone starts on the wheel; the admin
  // accounts can switch to the list with the toggle in the header.
  useEffect(() => {
    loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadTasks = async () => {
    setIsLoading(true);
    try {
      const response = await apiFetch('/tasks');
      const result = await response.json();

      if (response.ok && result.success) {
        setTasks(result.data || []);
        setCloudError(null);
        // Keep a copy to show if the server cannot be reached next time.
        localStorage.setItem(CACHE_KEY, JSON.stringify(result.data || []));
      } else {
        throw new Error(result.error || 'Failed to load tasks');
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
      setCloudError(error instanceof Error ? error.message : 'Unknown error');
      loadCachedCopy();
    } finally {
      setIsLoading(false);
    }
  };

  const loadCachedCopy = () => {
    try {
      const saved = localStorage.getItem(CACHE_KEY);
      if (saved) {
        setTasks(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Error loading cached tasks:', e);
    }
  };

  /**
   * Apply one change: show it at once, then save exactly that change on the
   * server.
   *
   * Every change used to be saved by sending the whole year's tasks, which
   * the server stored by deleting everything and inserting the list again.
   * Two people working at the same time overwrote each other, and a failed
   * insert emptied the year. Now each change is one small request, sent in
   * the order it was made. If one fails, the list is fetched again so the
   * screen never shows something the server does not have.
   */
  const commit = (nextTasks: Task[], send: () => Promise<Response>) => {
    if (cloudError) {
      toast.error("Opgaverne kan ikke ændres, før forbindelsen til serveren virker igen");
      return false;
    }

    setTasks(nextTasks);
    localStorage.setItem(CACHE_KEY, JSON.stringify(nextTasks));

    saveQueue.current = saveQueue.current.then(async () => {
      try {
        const response = await send();
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
      } catch (error) {
        console.error('Error saving task change:', error);
        toast.error("Ændringen blev ikke gemt. Årshjulet er hentet igen fra serveren.");
        await loadTasks();
      }
    });
    return true;
  };

  /** Change one task and save only the fields that changed. */
  const updateTask = (taskId: string, change: (task: Task) => Task, changedFields: (task: Task) => object) => {
    const current = tasks.find(t => t.id === taskId);
    if (!current) return;

    const updated = { ...change(current), updatedAt: new Date().toISOString() };
    commit(
      tasks.map(t => (t.id === taskId ? updated : t)),
      () => apiFetch('/tasks', { method: 'PUT', body: JSON.stringify({ id: taskId, ...changedFields(updated) }) })
    );
  };

  const handleTaskCreated = (task: Task) => {
    commit(
      [...tasks, task],
      () => apiFetch('/tasks', { method: 'POST', body: JSON.stringify(task) })
    );
  };

  const handleTaskUpdated = (updatedTask: Task) => {
    updateTask(
      updatedTask.id,
      () => updatedTask,
      (task) => ({
        title: task.title,
        // null (not undefined) so an emptied description is cleared on the server too
        description: task.description ?? null,
        subtasks: task.subtasks,
        assignedUsers: task.assignedUsers,
        completed: task.completed,
        month: task.month,
      })
    );
    setEditingTask(null);
  };

  const handleDeleteTask = (taskId: string) => {
    const saved = commit(
      tasks.filter(t => t.id !== taskId),
      () => apiFetch('/tasks', { method: 'DELETE', body: JSON.stringify({ id: taskId }) })
    );
    if (saved) toast.success("Opgave slettet");
  };

  const handleToggleTask = (taskId: string) => {
    updateTask(
      taskId,
      (task) => ({ ...task, completed: !task.completed }),
      (task) => ({ completed: task.completed })
    );
  };

  /** Change a task's subtasks and save them (plus `completed`, which can follow). */
  const updateSubtasks = (taskId: string, change: (task: Task) => Task) => {
    updateTask(taskId, change, (task) => ({ subtasks: task.subtasks, completed: task.completed }));
  };

  const handleToggleSubtask = (taskId: string, subtaskId: string) => {
    updateSubtasks(taskId, (task) => {
      const subtasks = task.subtasks.map(s => (s.id === subtaskId ? { ...s, completed: !s.completed } : s));
      // Auto-complete task if all subtasks are done
      const allDone = subtasks.length > 0 && subtasks.every(s => s.completed);
      return { ...task, subtasks, completed: allDone ? true : task.completed };
    });
  };

  const handleEditSubtask = (taskId: string, subtaskId: string, newTitle: string) => {
    updateSubtasks(taskId, (task) => ({
      ...task,
      subtasks: task.subtasks.map(s => (s.id === subtaskId ? { ...s, title: newTitle } : s)),
    }));
  };

  const handleDeleteSubtask = (taskId: string, subtaskId: string) => {
    updateSubtasks(taskId, (task) => ({
      ...task,
      subtasks: task.subtasks.filter(s => s.id !== subtaskId),
    }));
  };

  const handleAddSubtask = (taskId: string, title: string) => {
    const newSubtask: Subtask = {
      id: `subtask_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title,
      completed: false,
    };
    updateSubtasks(taskId, (task) => ({ ...task, subtasks: [...task.subtasks, newSubtask] }));
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
          <div role="status" className="flex flex-wrap items-center gap-3 rounded-xl border border-warning/40 bg-card p-4 text-sm">
            <AlertCircle className="h-5 w-5 shrink-0 text-warning" />
            <p className="min-w-0 flex-1">
              <strong>Opgaverne kunne ikke hentes fra serveren.</strong> Du ser den seneste kopi fra denne enhed, og
              den kan ikke ændres, før forbindelsen virker igen.
            </p>
            <Button variant="outline" onClick={loadTasks} disabled={isLoading}>
              Prøv igen
            </Button>
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
