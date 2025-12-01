import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, Download, Loader2 } from "lucide-react";
import { functions } from "@/integrations/api/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface ReferaterViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ReferatFile {
  fileName: string;
  fullPath: string;
  fileId: string;
  size: number;
  uploadTimestamp: number;
  downloadUrl: string;
}

const ReferaterViewer = ({ open, onOpenChange }: ReferaterViewerProps) => {
  const [files, setFiles] = useState<ReferatFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadFiles();
    }
  }, [open]);

  const loadFiles = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await functions.invoke('list-referater-files');
      
      if (error) {
        throw error;
      }
      
      if (data?.files) {
        setFiles(data.files);
      }
    } catch (error) {
      console.error('Error loading referater files:', error);
      toast.error('Kunne ikke indlæse referater');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (file: ReferatFile) => {
    try {
      const { data, error } = await functions.invoke('download-backblaze-file', {
        method: 'POST',
        body: {
          fileName: file.fileName,
          fileId: file.fileId
        }
      });

      if (error) {
        throw error;
      }

      // Convert base64 to blob and download
      const base64 = typeof data === 'string' ? data : data?.data;
      if (!base64) {
        throw new Error('Kunne ikke hente fil data');
      }

      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const blob = new Blob([bytes], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Fil downloadet');
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Kunne ikke downloade fil');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Referater fra Bestyrelsesmøder</DialogTitle>
          <DialogDescription>
            Oversigt over alle referater fra bestyrelsesmøder
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold mb-4">2025</h2>
              
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Indlæser referater...</span>
                </div>
              ) : files.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Ingen referater fundet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {files.map((file) => (
                    <div
                      key={file.fileId}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{file.fileName}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(file.uploadTimestamp), 'dd/MM/yyyy HH:mm')}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(file)}
                        className="gap-2 shrink-0"
                      >
                        <Download className="h-4 w-4" />
                        Download
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReferaterViewer;
