import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Plus, 
  Edit, 
  Trash2, 
  ChevronDown, 
  ChevronRight,
  User,
  CheckCircle2,
  Circle,
  ChevronsUpDown,
  Clock,
  CalendarPlus
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

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

interface TaskListViewProps {
  tasks: Task[];
  onAddTask: (month: number) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onToggleTask: (taskId: string) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
}

const MONTHS = [
  "Januar", "Februar", "Marts", "April", "Maj", "Juni",
  "Juli", "August", "September", "Oktober", "November", "December"
];

// Format date to Danish locale
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('da-DK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Format relative time (e.g., "2 timer siden", "i går")
const formatRelativeTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Lige nu';
  if (diffMins < 60) return `${diffMins} min siden`;
  if (diffHours < 24) return `${diffHours} time${diffHours > 1 ? 'r' : ''} siden`;
  if (diffDays === 1) return 'I går';
  if (diffDays < 7) return `${diffDays} dage siden`;
  return formatDate(dateString);
};

const TaskListView = ({
  tasks,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onToggleTask,
  onToggleSubtask
}: TaskListViewProps) => {
  const [expandedMonths, setExpandedMonths] = useState<Set<number>>(() => {
    // Start with months that have tasks expanded
    const monthsWithTasks = new Set<number>();
    tasks.forEach(t => monthsWithTasks.add(t.month));
    return monthsWithTasks;
  });
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  const currentMonth = new Date().getMonth();

  const toggleMonth = (month: number) => {
    const newExpanded = new Set(expandedMonths);
    if (newExpanded.has(month)) {
      newExpanded.delete(month);
    } else {
      newExpanded.add(month);
    }
    setExpandedMonths(newExpanded);
  };

  const toggleAllMonths = () => {
    if (expandedMonths.size === 12) {
      setExpandedMonths(new Set());
    } else {
      setExpandedMonths(new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]));
    }
  };

  const toggleTaskExpanded = (taskId: string) => {
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

  const getTasksForMonth = (month: number) => {
    return tasks.filter(t => t.month === month);
  };

  const getMonthStats = (month: number) => {
    const monthTasks = getTasksForMonth(month);
    const completed = monthTasks.filter(t => t.completed).length;
    return { total: monthTasks.length, completed };
  };

  // Summary stats
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.completed).length;
  const pendingTasks = totalTasks - completedTasks;

  const renderTask = (task: Task) => {
    const isExpanded = expandedTasks.has(task.id);
    const completedSubtasks = task.subtasks.filter(s => s.completed).length;
    const totalSubtasks = task.subtasks.length;

    return (
      <div 
        key={task.id} 
        className={cn(
          "border rounded-lg p-3 bg-card transition-all",
          task.completed && "opacity-60"
        )}
      >
        <div className="flex items-start gap-3">
          {/* Completion toggle */}
          <button
            onClick={() => onToggleTask(task.id)}
            className="mt-0.5 shrink-0"
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
                  "font-medium text-sm",
                  task.completed && "line-through text-muted-foreground"
                )}>
                  {task.title}
                </h4>
                
                {task.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                    {task.description}
                  </p>
                )}

                {/* Assigned users */}
                {task.assignedUsers.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {task.assignedUsers.map(user => (
                      <span 
                        key={user}
                        className="inline-flex items-center gap-0.5 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full"
                      >
                        <User className="h-2.5 w-2.5" />
                        {user}
                      </span>
                    ))}
                  </div>
                )}

                {/* Subtasks summary */}
                {totalSubtasks > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {completedSubtasks}/{totalSubtasks} underopgaver
                  </p>
                )}

                {/* Timestamps */}
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-0.5" title={`Oprettet: ${formatDate(task.createdAt)}`}>
                    <CalendarPlus className="h-2.5 w-2.5" />
                    {formatRelativeTime(task.createdAt)}
                  </span>
                  {task.updatedAt && task.updatedAt !== task.createdAt && (
                    <span className="flex items-center gap-0.5" title={`Opdateret: ${formatDate(task.updatedAt)}`}>
                      <Clock className="h-2.5 w-2.5" />
                      Opdateret {formatRelativeTime(task.updatedAt)}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-0.5 shrink-0">
                {totalSubtasks > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => toggleTaskExpanded(task.id)}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5" />
                    )}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onEditTask(task)}
                >
                  <Edit className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => setTaskToDelete(task)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Expanded subtasks */}
            {isExpanded && task.subtasks.length > 0 && (
              <div className="mt-2 ml-1 space-y-1.5 border-l-2 border-muted pl-2">
                {task.subtasks.map(subtask => (
                  <div 
                    key={subtask.id}
                    className="flex items-center gap-2"
                  >
                    <Checkbox
                      checked={subtask.completed}
                      onCheckedChange={() => onToggleSubtask(task.id, subtask.id)}
                      className="h-4 w-4"
                    />
                    <span className={cn(
                      "text-xs",
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
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Summary header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-sm">
            <span className="font-medium">{totalTasks}</span>
            <span className="text-muted-foreground"> opgaver total</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-orange-500" />
              {pendingTasks} igangværende
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              {completedTasks} færdige
            </span>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={toggleAllMonths}
          className="gap-1.5 text-xs"
        >
          <ChevronsUpDown className="h-3.5 w-3.5" />
          {expandedMonths.size === 12 ? 'Luk alle' : 'Åbn alle'}
        </Button>
      </div>

      {/* Month sections */}
      <div className="space-y-2">
        {MONTHS.map((monthName, monthIndex) => {
          const stats = getMonthStats(monthIndex);
          const monthTasks = getTasksForMonth(monthIndex);
          const isExpanded = expandedMonths.has(monthIndex);
          const isCurrentMonth = monthIndex === currentMonth;

          return (
            <Collapsible
              key={monthIndex}
              open={isExpanded}
              onOpenChange={() => toggleMonth(monthIndex)}
            >
              <Card className={cn(
                "overflow-hidden",
                isCurrentMonth && "ring-2 ring-primary/30"
              )}>
                <CollapsibleTrigger asChild>
                  <button className="w-full">
                    <CardContent className="p-3 flex items-center justify-between hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className={cn(
                          "font-medium",
                          isCurrentMonth && "text-primary"
                        )}>
                          {monthName}
                        </span>
                        {isCurrentMonth && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                            Nu
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {stats.total > 0 ? (
                          <div className="flex items-center gap-1.5">
                            <span className={cn(
                              "text-xs font-medium px-2 py-0.5 rounded-full",
                              stats.completed === stats.total
                                ? "bg-green-100 text-green-700"
                                : "bg-orange-100 text-orange-700"
                            )}>
                              {stats.completed}/{stats.total}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Ingen opgaver
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </button>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="px-3 pb-3 pt-1 space-y-2 border-t">
                    {monthTasks.length > 0 ? (
                      <>
                        {/* Pending tasks first */}
                        {monthTasks
                          .filter(t => !t.completed)
                          .map(renderTask)}
                        {/* Then completed tasks */}
                        {monthTasks
                          .filter(t => t.completed)
                          .map(renderTask)}
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-2">
                        Ingen opgaver
                      </p>
                    )}
                    
                    {/* Add task button */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-1.5 mt-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddTask(monthIndex);
                      }}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Tilføj opgave
                    </Button>
                  </div>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })}
      </div>

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

export default TaskListView;
