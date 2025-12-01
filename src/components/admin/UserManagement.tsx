import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";

interface UserManagementProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const HARDCODED_USERS = ['admin', 'Brian'];

export const UserManagement = ({ open, onOpenChange }: UserManagementProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Brugerstyring</DialogTitle>
          <DialogDescription>
            Oversigt over systembrugere i portalen
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Hardcoded Users Section */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">
              Systembrugere
            </h3>
            <div className="space-y-2">
              {HARDCODED_USERS.map((username) => (
                <Card key={username}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{username}</p>
                        <p className="text-sm text-muted-foreground">
                          {username === 'admin' || username === 'Brian' 
                            ? 'Alle rettigheder' 
                            : 'Standard bruger'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground bg-green-100 text-green-800 px-2 py-1 rounded">
                          Aktiv
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
