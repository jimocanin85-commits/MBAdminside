import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Loader2, Eye } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ExcelViewer } from "./ExcelViewer";

interface CloudFile {
  fileName: string;
  fullPath: string;
  fileId: string;
  size: number;
  uploadTimestamp: number;
  downloadUrl: string;
}

export const CloudFiles = () => {
  const [files, setFiles] = useState<CloudFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{ name: string; data: string } | null>(null);

  const loadFiles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('list-backblaze-files');

      if (error) {
        console.error('Error loading files:', error);
        toast.error("Kunne ikke indlæse filer", {
          description: error.message
        });
        return;
      }

      if (data?.success) {
        setFiles(data.files);
      }
    } catch (error) {
      console.error('Error loading files:', error);
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
      
      // Download file through edge function
      const { data: downloadData, error } = await supabase.functions.invoke('download-backblaze-file', {
        body: { fileName: file.fileName }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!downloadData?.success) {
        throw new Error('Failed to download file');
      }

      toast.dismiss();
      
      // Open viewer with file data
      setSelectedFile({
        name: file.fileName,
        data: downloadData.fileData
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
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Cloud Filer</CardTitle>
        <Button variant="outline" size="sm" onClick={loadFiles}>
          Opdater
        </Button>
      </CardHeader>
      <CardContent>
        {files.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Ingen filer uploadet endnu</p>
          </div>
        ) : (
          <div className="space-y-3">
            {files.map((file) => (
              <div
                key={file.fileId}
                className="flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{file.fileName}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(file.size)} • {formatDate(file.uploadTimestamp)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => handleEditFile(file)}
                  >
                    <Eye className="h-4 w-4" />
                    Åbn
                  </Button>
                </div>
              </div>
            ))}
          </div>
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
    </Card>
  );
};
