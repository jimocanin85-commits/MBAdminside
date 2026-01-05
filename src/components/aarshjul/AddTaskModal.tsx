import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { User } from "@/components/admin/CreateUserDialog";

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

interface AddTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  month: number;
  onTaskCreated: (task: Task) => void;
  editingTask?: Task | null;
  onTaskUpdated?: (task: Task) => void;
}

const MONTHS = [
  "Januar", "Februar", "Marts", "April", "Maj", "Juni",
  "Juli", "August", "September", "Oktober", "November", "December"
];

interface SystemUserEmails {
  [username: string]: string;
}

const SYSTEM_EMAILS_KEY = 'systemUserEmails';

const AddTaskModal = ({ 
  open, 
  onOpenChange, 
  month, 
  onTaskCreated, 
  editingTask,
  onTaskUpdated 
}: AddTaskModalProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtask, setNewSubtask] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [systemUserEmails, setSystemUserEmails] = useState<SystemUserEmails>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load available users
  useEffect(() => {
    if (open) {
      loadUsers();
      
      // If editing, populate fields
      if (editingTask) {
        setTitle(editingTask.title);
        setDescription(editingTask.description || "");
        setSubtasks(editingTask.subtasks || []);
        setSelectedUsers(editingTask.assignedUsers || []);
      } else {
        // Reset form
        setTitle("");
        setDescription("");
        setSubtasks([]);
        setSelectedUsers([]);
      }
    }
  }, [open, editingTask]);

  const loadUsers = async () => {
    try {
      // First try to load from API
      const response = await fetch('/api/users');
      const result = await response.json();
      
      if (result.success && result.data) {
        setAvailableUsers(result.data);
      } else {
        // Fallback to localStorage
        const customUsersJson = localStorage.getItem('customUsers');
        if (customUsersJson) {
          setAvailableUsers(JSON.parse(customUsersJson));
        }
      }
    } catch (error) {
      // Fallback to localStorage
      const customUsersJson = localStorage.getItem('customUsers');
      if (customUsersJson) {
        setAvailableUsers(JSON.parse(customUsersJson));
      }
    }

    // Load system user emails
    try {
      const storedEmails = localStorage.getItem(SYSTEM_EMAILS_KEY);
      if (storedEmails) {
        setSystemUserEmails(JSON.parse(storedEmails));
      }
    } catch (error) {
      console.error('Error loading system user emails:', error);
    }
  };

  const handleAddSubtask = () => {
    if (!newSubtask.trim()) return;
    
    const subtask: Subtask = {
      id: `subtask_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: newSubtask.trim(),
      completed: false
    };
    
    setSubtasks([...subtasks, subtask]);
    setNewSubtask("");
  };

  const handleRemoveSubtask = (id: string) => {
    setSubtasks(subtasks.filter(s => s.id !== id));
  };

  const toggleUserSelection = (username: string) => {
    setSelectedUsers(prev => 
      prev.includes(username)
        ? prev.filter(u => u !== username)
        : [...prev, username]
    );
  };

  // Send email notifications to assigned users
  const sendNotifications = async (taskTitle: string, taskDescription: string | undefined, newlyAssignedUsers: string[]) => {
    if (newlyAssignedUsers.length === 0) return;

    // Build recipient list with emails
    const recipients: { email: string; name: string }[] = [];

    for (const username of newlyAssignedUsers) {
      // Check if it's a system user with email
      if (systemUsers.includes(username) && systemUserEmails[username]) {
        recipients.push({
          email: systemUserEmails[username],
          name: username
        });
        continue;
      }

      // Check custom users for email
      const customUser = availableUsers.find(u => u.username === username);
      if (customUser && customUser.email) {
        recipients.push({
          email: customUser.email,
          name: `${customUser.firstName} ${customUser.lastName}`
        });
      }
    }

    if (recipients.length === 0) return;

    try {
      const response = await fetch('/api/send-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'task_assigned',
          recipients,
          data: {
            taskTitle,
            taskDescription,
            month: MONTHS[month]
          }
        })
      });

      const result = await response.json();
      
      if (result.sent) {
        toast.success(`Email notifikation sendt til ${recipients.length} bruger(e)`);
      }
    } catch (error) {
      console.error('Error sending notifications:', error);
      // Don't show error to user - task was still created
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Titel er påkrævet");
      return;
    }

    setIsSubmitting(true);

    try {
      // Determine newly assigned users (for notifications)
      const previouslyAssigned = editingTask?.assignedUsers || [];
      const newlyAssignedUsers = selectedUsers.filter(u => !previouslyAssigned.includes(u));

      if (editingTask && onTaskUpdated) {
        // Update existing task
        const updatedTask: Task = {
          ...editingTask,
          title: title.trim(),
          description: description.trim() || undefined,
          subtasks,
          assignedUsers: selectedUsers,
        };
        onTaskUpdated(updatedTask);
        toast.success("Opgave opdateret!");

        // Send notifications to newly assigned users
        if (newlyAssignedUsers.length > 0) {
          await sendNotifications(title.trim(), description.trim() || undefined, newlyAssignedUsers);
        }
      } else {
        // Create new task
        const newTask: Task = {
          id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          title: title.trim(),
          description: description.trim() || undefined,
          subtasks,
          assignedUsers: selectedUsers,
          completed: false,
          month,
          createdAt: new Date().toISOString()
        };
        onTaskCreated(newTask);
        toast.success("Opgave oprettet!");

        // Send notifications to all assigned users
        if (selectedUsers.length > 0) {
          await sendNotifications(title.trim(), description.trim() || undefined, selectedUsers);
        }
      }

      onOpenChange(false);
    } catch (error) {
      console.error('Error saving task:', error);
      toast.error("Kunne ikke gemme opgave");
    } finally {
      setIsSubmitting(false);
    }
  };

  // System users that are always available
  const systemUsers = ['admin', 'Brian'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>
            {editingTask ? "Rediger opgave" : "Ny opgave"} - {MONTHS[month]}
          </DialogTitle>
          <DialogDescription>
            {editingTask 
              ? "Opdater opgavens detaljer"
              : "Opret en ny opgave for denne måned"
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Titel *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Opgavens titel"
              required
              disabled={isSubmitting}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Beskrivelse</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Valgfri beskrivelse af opgaven"
              rows={3}
              disabled={isSubmitting}
            />
          </div>

          {/* Subtasks */}
          <div className="space-y-2">
            <Label>Underopgaver</Label>
            <div className="flex gap-2">
              <Input
                value={newSubtask}
                onChange={(e) => setNewSubtask(e.target.value)}
                placeholder="Tilføj underopgave"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSubtask())}
                disabled={isSubmitting}
              />
              <Button 
                type="button" 
                variant="outline" 
                size="icon"
                onClick={handleAddSubtask}
                disabled={isSubmitting || !newSubtask.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {subtasks.length > 0 && (
              <div className="space-y-2 mt-2 max-h-32 overflow-y-auto">
                {subtasks.map((subtask) => (
                  <div 
                    key={subtask.id} 
                    className="flex items-center justify-between p-2 bg-muted rounded-md"
                  >
                    <span className="text-sm truncate flex-1">{subtask.title}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={() => handleRemoveSubtask(subtask.id)}
                      disabled={isSubmitting}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Assign Users */}
          <div className="space-y-2">
            <Label>Tildel til brugere</Label>
            <div className="border rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
              {/* System users */}
              {systemUsers.map((username) => (
                <label
                  key={username}
                  className="flex items-center space-x-2 cursor-pointer hover:bg-muted/50 p-2 rounded"
                >
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(username)}
                    onChange={() => toggleUserSelection(username)}
                    className="rounded"
                    disabled={isSubmitting}
                  />
                  <span className="text-sm">{username}</span>
                  <span className="text-xs text-muted-foreground">(System)</span>
                </label>
              ))}
              
              {/* Custom users */}
              {availableUsers
                .filter(u => u.isActive !== false)
                .map((user) => (
                  <label
                    key={user.id}
                    className="flex items-center space-x-2 cursor-pointer hover:bg-muted/50 p-2 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.username)}
                      onChange={() => toggleUserSelection(user.username)}
                      className="rounded"
                      disabled={isSubmitting}
                    />
                    <span className="text-sm">
                      {user.firstName} {user.lastName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({user.username})
                    </span>
                  </label>
                ))}

              {availableUsers.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-2">
                  Ingen brugere oprettet endnu
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
              Annuller
            </Button>
            <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Gemmer...
                </>
              ) : editingTask ? (
                "Gem ændringer"
              ) : (
                "Opret opgave"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddTaskModal;
