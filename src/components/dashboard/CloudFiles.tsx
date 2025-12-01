import { useState, useEffect } from "react";
import { functions } from "@/integrations/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FileText, Loader2, Eye, Trash2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ExcelViewer } from "./ExcelViewer";
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

interface CloudFile {
  fileName: string;
  fullPath: string;
  fileId: string;
  size: number;
  uploadTimestamp: number;
  downloadUrl: string;
}

interface CloudFilesProps {
  onTrainerDeleted?: () => void;
  onBack?: () => void;
}

export const CloudFiles = ({ onTrainerDeleted, onBack }: CloudFilesProps = {}) => {
  const [files, setFiles] = useState<CloudFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{ name: string; data: string } | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<CloudFile | null>(null);
  const [password, setPassword] = useState("");

  const loadFiles = async () => {
    try {
      setLoading(true);
      console.log('CloudFiles: Loading files from Backblaze...');
      
      const { data, error } = await functions.invoke('list-backblaze-files');

      console.log('CloudFiles: Response:', { data, error });

      if (error) {
        console.error('CloudFiles: Error loading files:', error);
        toast.error("Kunne ikke indlæse filer", {
          description: typeof error === 'object' && error !== null && 'message' in error 
            ? String(error.message) 
            : String(error)
        });
        return;
      }

      if (data?.success) {
        console.log('CloudFiles: Setting files:', data.files);
        setFiles(data.files || []);
        
        // Show warning if Backblaze is not configured (but don't show toast - it's expected)
        if (data.error && data.message) {
          console.warn('CloudFiles:', data.message);
        }
      } else {
        console.log('CloudFiles: No success flag or no files returned');
        setFiles([]);
      }
    } catch (error) {
      console.error('CloudFiles: Exception loading files:', error);
      toast.error("Kunne ikke indlæse filer");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
  }, []);

  const handleEditFile = async (file: CloudFile) => {
    try {
      toast.loading("Henter fil...");
      
      // Download file through API function
      const { data: downloadData, error } = await functions.invoke('download-backblaze-file', {
        method: 'POST',
        body: { fileName: file.fileName, fileId: file.fileId }
      });

      if (error) {
        throw new Error(error.message);
      }

      // API client extracts response.data, so downloadData might be the base64 string directly
      // or an object with data property
      let fileData: string;
      
      if (typeof downloadData === 'string') {
        fileData = downloadData;
      } else if (downloadData?.data && typeof downloadData.data === 'string') {
        fileData = downloadData.data;
      } else {
        throw new Error('Failed to download file - unexpected response format');
      }

      if (!fileData || fileData.length === 0) {
        throw new Error('Failed to download file - no data received');
      }

      toast.dismiss();
      
      // Open viewer with file data
      setSelectedFile({
        name: file.fileName,
        data: fileData
      });
      setViewerOpen(true);
      
    } catch (error) {
      toast.dismiss();
      console.error('Error loading file:', error);
      toast.error("Kunne ikke indlæse fil", {
        description: error instanceof Error ? error.message : "Ukendt fejl"
      });
    }
  };

  const handleViewerSaved = () => {
    // Reload file list after saving
    loadFiles();
  };

  const handleDeleteClick = (file: CloudFile) => {
    setFileToDelete(file);
    setPassword("");
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!fileToDelete) return;

    // Validate password
    if (password !== "1523") {
      toast.error("Forkert adgangskode");
      return;
    }

    const loadingToast = toast.loading("Sletter fil...");
    
    try {
      console.log('Attempting to delete file:', fileToDelete.fileName);
      
      const { data, error } = await functions.invoke('delete-backblaze-file', {
        method: 'POST',
        body: { fileName: fileToDelete.fileName, fileId: fileToDelete.fileId }
      });

      console.log('Delete response:', { data, error });

      if (error) {
        throw new Error(error.message);
      }

      if (!data?.success) {
        throw new Error(data?.message || 'Kunne ikke slette filen');
      }

      // Also remove from localStorage trainers if it exists
      const saved = localStorage.getItem('trainers');
      if (saved) {
        try {
          const trainers = JSON.parse(saved);
          const fileName = fileToDelete.fileName.replace('.xlsx', '');
          const filtered = trainers.filter((t: any) => t.navn !== fileName);
          localStorage.setItem('trainers', JSON.stringify(filtered));
          
          // Notify parent component to refresh trainers state
          if (onTrainerDeleted) {
            onTrainerDeleted();
          }
        } catch (e) {
          console.error('Error updating localStorage:', e);
        }
      }

      toast.success("Fil og træner slettet!", { id: loadingToast });
      
      // Close dialog first
      setDeleteDialogOpen(false);
      setFileToDelete(null);
      setPassword("");
      
      // Then refresh the list
      await loadFiles();
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error("Kunne ikke slette fil", {
        id: loadingToast,
        description: error instanceof Error ? error.message : "Ukendt fejl"
      });
      // Don't close dialog on error so user can see what happened
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (timestamp: number) => {
    return format(new Date(timestamp), "dd/MM/yyyy HH:mm");
  };

  if (loading) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Cloud Filer</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardContent className="pt-6">
        {files.length === 0 ? (
          <>
            {onBack && (
              <div className="mb-4">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={onBack}
                  className="gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Tilbage
                </Button>
              </div>
            )}
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Ingen filer uploadet endnu</p>
            </div>
          </>
        ) : (
          <>
            <div className="flex justify-between items-center mb-4">
              {onBack && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={onBack}
                  className="gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Tilbage
                </Button>
              )}
              {!onBack && <div></div>}
              <Button variant="outline" size="sm" onClick={loadFiles}>
                Opdater
              </Button>
            </div>
            <div className="space-y-3">
             {files.map((file) => (
              <div
                key={file.fileId}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors gap-3"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0 w-full sm:w-auto">
                  <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{file.fileName}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(file.size)} • {formatDate(file.uploadTimestamp)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 flex-1 sm:flex-initial min-h-[44px]"
                    onClick={() => handleEditFile(file)}
                  >
                    <Eye className="h-4 w-4" />
                    Åbn
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 text-destructive hover:text-destructive flex-1 sm:flex-initial min-h-[44px]"
                    onClick={() => handleDeleteClick(file)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Slet
                  </Button>
                </div>
              </div>
            ))}
            </div>
          </>
        )}
      </CardContent>

      {selectedFile && (
        <ExcelViewer
          open={viewerOpen}
          onOpenChange={setViewerOpen}
          fileName={selectedFile.name}
          fileData={selectedFile.data}
          onSaved={handleViewerSaved}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="max-w-[95vw] sm:max-w-md p-4 sm:p-6">
          <AlertDialogHeader>
            <AlertDialogTitle>Slet træner</AlertDialogTitle>
            <AlertDialogDescription>
              Er du sikker på, at du vil slette <strong>{fileToDelete?.fileName}</strong>?
              Denne handling kan ikke fortrydes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">Indtast adgangskode</label>
            <Input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={password}
              onChange={(e) => setPassword(e.target.value.replace(/\D/g, ''))}
              placeholder="4-cifret kode"
              className="max-w-[200px]"
            />
          </div>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <AlertDialogCancel onClick={() => setPassword("")} className="w-full sm:w-auto">Annuller</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 w-full sm:w-auto"
            >
              Slet
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
