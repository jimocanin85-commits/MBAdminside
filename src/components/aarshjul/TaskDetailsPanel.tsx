import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Plus, 
  Edit, 
  Trash2, 
  ChevronDown, 
  ChevronUp,
  User,
  CheckCircle2,
  Circle
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
}

interface TaskDetailsPanelProps {
  month: number;
  tasks: Task[];
  onAddTask: () => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onToggleTask: (taskId: string) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
}

const MONTHS = [
  "Januar", "Februar", "Marts", "April", "Maj", "Juni",
  "Juli", "August", "September", "Oktober", "November", "December"
];

const TaskDetailsPanel = ({
  month,
  tasks,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onToggleTask,
  onToggleSubtask
}: TaskDetailsPanelProps) => {
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  const monthTasks = tasks.filter(t => t.month === month);
  const completedTasks = monthTasks.filter(t => t.completed);
  const pendingTasks = monthTasks.filter(t => !t.completed);

  const toggleExpanded = (taskId: string) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };

  const handleDeleteConfirm = () => {
    if (taskToDelete) {
      onDeleteTask(taskToDelete.id);
      setTaskToDelete(null);
    }
  };

  const renderTask = (task: Task) => {
    const isExpanded = expandedTasks.has(task.id);
    const completedSubtasks = task.subtasks.filter(s => s.completed).length;
    const totalSubtasks = task.subtasks.length;

    return (
      <Card key={task.id} className={cn(
        "transition-all duration-200",
        task.completed && "opacity-60"
      )}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Completion checkbox */}
            <button
              onClick={() => onToggleTask(task.id)}
              className="mt-1 shrink-0"
            >
              {task.completed ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground hover:text-primary" />
              )}
            </button>

            {/* Task content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h4 className={cn(
                    "font-medium truncate",
                    task.completed && "line-through text-muted-foreground"
                  )}>
                    {task.title}
                  </h4>
                  
                  {task.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {task.description}
                    </p>
                  )}

                  {/* Subtasks summary */}
                  {totalSubtasks > 0 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {completedSubtasks}/{totalSubtasks} underopgaver færdige
                    </p>
                  )}

                  {/* Assigned users */}
                  {task.assignedUsers.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {task.assignedUsers.map(user => (
                        <span 
                          key={user}
                          className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full"
                        >
                          <User className="h-3 w-3" />
                          {user}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {totalSubtasks > 0 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => toggleExpanded(task.id)}
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onEditTask(task)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => setTaskToDelete(task)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Expanded subtasks */}
              {isExpanded && task.subtasks.length > 0 && (
                <div className="mt-3 ml-2 space-y-2 border-l-2 border-muted pl-3">
                  {task.subtasks.map(subtask => (
                    <div 
                      key={subtask.id}
                      className="flex items-center gap-2"
                    >
                      <Checkbox
                        checked={subtask.completed}
                        onCheckedChange={() => onToggleSubtask(task.id, subtask.id)}
                        className="shrink-0"
                      />
                      <span className={cn(
                        "text-sm",
                        subtask.completed && "line-through text-muted-foreground"
                      )}>
                        {subtask.title}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{MONTHS[month]}</h2>
          <p className="text-sm text-muted-foreground">
            {monthTasks.length} {monthTasks.length === 1 ? 'opgave' : 'opgaver'}
            {completedTasks.length > 0 && ` • ${completedTasks.length} færdig`}
          </p>
        </div>
        <Button onClick={onAddTask} className="gap-2">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Ny opgave</span>
        </Button>
      </div>

      {/* Task lists */}
      {monthTasks.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Ingen opgaver for {MONTHS[month]}</p>
            <p className="text-sm text-muted-foreground mt-2">
              Klik på "Ny opgave" for at tilføje en opgave
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Pending tasks */}
          {pendingTasks.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">
                Igangværende ({pendingTasks.length})
              </h3>
              <div className="space-y-2">
                {pendingTasks.map(renderTask)}
              </div>
            </div>
          )}

          {/* Completed tasks */}
          {completedTasks.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">
                Færdige ({completedTasks.length})
              </h3>
              <div className="space-y-2">
                {completedTasks.map(renderTask)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!taskToDelete} onOpenChange={() => setTaskToDelete(null)}>
        <AlertDialogContent className="max-w-[95vw] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Slet opgave?</AlertDialogTitle>
            <AlertDialogDescription>
              Er du sikker på, at du vil slette "{taskToDelete?.title}"? 
              Denne handling kan ikke fortrydes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <AlertDialogCancel className="w-full sm:w-auto">Annuller</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 w-full sm:w-auto"
            >
              Slet
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TaskDetailsPanel;
