import { useState, useEffect } from "react";
import { functions } from "@/integrations/api/client";
import { Button } from "@/components/ui/button";
import { FileText, Loader2, Eye, Trash2, ArrowLeft, RefreshCw } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
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
  const { isAdminMode } = useAuth();
  const [files, setFiles] = useState<CloudFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{ name: string; data: string } | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<CloudFile | null>(null);
  // Why the list could not be fetched - shown instead of "no files", which
  // would wrongly suggest that the storage is empty.
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadFiles = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      
      const { data, error } = await functions.invoke('list-backblaze-files');

      if (error) {
        console.error('CloudFiles: Error loading files:', error);
        setFiles([]);
        setLoadError(
          typeof error === 'object' && error !== null && 'message' in error
            ? String(error.message)
            : 'Ukendt fejl'
        );
        return;
      }

      setFiles(data?.success ? data.files || [] : []);
    } catch (error) {
      console.error('CloudFiles: Exception loading files:', error);
      setFiles([]);
      setLoadError('Kunne ikke forbinde til serveren');
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
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!fileToDelete) return;

    // Deleting needs admin mode. The server enforces this too (see
    // api/delete-backblaze-file.ts); this check just explains why.
    if (!isAdminMode) {
      toast.error("Slå admin-tilstand til for at slette filer");
      return;
    }

    const loadingToast = toast.loading("Sletter fil...");
    
    try {
      
      const { data, error } = await functions.invoke('delete-backblaze-file', {
        method: 'POST',
        body: { fileName: fileToDelete.fileName, fileId: fileToDelete.fileId }
      });

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
      <div className="flex items-center justify-center py-12" role="status" aria-label="Indlæser filer">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {loadError ? "Prøv igen om lidt" : files.length === 1 ? "1 fil" : `${files.length} filer`}
          {!isAdminMode && files.length > 0 && " · Sletning kræver admin-tilstand"}
        </p>
        <div className="flex gap-2">
          {onBack && (
            <Button variant="outline" size="sm" onClick={onBack} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Tilbage
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={loadFiles} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Opdater
          </Button>
        </div>
      </div>

      {loadError ? (
        <div role="alert" className="rounded-lg border border-warning/40 px-4 py-8 text-center">
          <p className="font-semibold">Filerne kunne ikke hentes</p>
          <p className="mt-1 text-sm text-muted-foreground">{loadError}</p>
          <p className="mt-1 text-sm text-muted-foreground">Det betyder ikke, at filerne er væk - de kan bare ikke vises lige nu.</p>
        </div>
      ) : files.length === 0 ? (
        <div className="rounded-lg border border-dashed px-4 py-12 text-center text-muted-foreground">
          <FileText className="mx-auto mb-4 h-12 w-12 opacity-50" />
          <p>Ingen filer uploadet endnu</p>
        </div>
      ) : (
        <ul className="divide-y rounded-lg border">
          {files.map((file) => (
            <li key={file.fileId} className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center sm:p-4">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <FileText className="h-5 w-5 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{file.fileName}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(file.size)} · {formatDate(file.uploadTimestamp)}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="min-h-[44px] flex-1 gap-2 sm:flex-initial"
                  onClick={() => handleEditFile(file)}
                >
                  <Eye className="h-4 w-4" />
                  Åbn
                </Button>
                {isAdminMode && (
                  <Button
                    variant="outline"
                    className="min-h-[44px] flex-1 gap-2 text-destructive hover:text-destructive sm:flex-initial"
                    onClick={() => handleDeleteClick(file)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Slet
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

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
        <AlertDialogContent className="max-w-[95vw] p-5 sm:max-w-md sm:p-6">
          <AlertDialogHeader>
            <AlertDialogTitle>Slet fil?</AlertDialogTitle>
            <AlertDialogDescription>
              Er du sikker på, at du vil slette <strong>{fileToDelete?.fileName}</strong>? Filen og den frivilliges
              oplysninger fjernes for alle, og det kan ikke fortrydes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row sm:gap-0">
            <AlertDialogCancel className="w-full sm:w-auto">Annuller</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                // Keep the dialog open until the delete has finished or failed.
                event.preventDefault();
                handleDeleteConfirm();
              }}
              className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90 sm:w-auto"
            >
              Slet
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
