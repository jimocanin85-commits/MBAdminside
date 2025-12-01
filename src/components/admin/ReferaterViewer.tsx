import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, Upload, Loader2, Eye } from "lucide-react";
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
  const [selectedYear, setSelectedYear] = useState<string>('2025');
  const [files, setFiles] = useState<ReferatFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      loadFiles();
    }
  }, [open, selectedYear]);

  const loadFiles = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await functions.invoke('list-referater-files', {
        method: 'POST',
        body: { year: selectedYear }
      });
      
      if (error) {
        throw error;
      }
      
      if (data?.files) {
        setFiles(data.files);
      } else {
        setFiles([]);
      }
    } catch (error) {
      console.error('Error loading referater files:', error);
      toast.error('Kunne ikke indlæse referater');
      setFiles([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const loadingToast = toast.loading('Uploader fil...');

    try {
      // Read file as base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64String = reader.result as string;
          const base64Data = base64String.split(',')[1] || base64String;

          if (!base64Data || base64Data.length === 0) {
            throw new Error('Kunne ikke læse fil data');
          }

          const fileDataUrl = `data:${file.type || 'application/octet-stream'};base64,${base64Data}`;
          
          console.log('Uploading file:', {
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            folder: `Referater/${selectedYear}`,
            base64Length: base64Data.length,
            fileDataUrlLength: fileDataUrl.length,
            fileDataUrlPreview: fileDataUrl.substring(0, 100)
          });

          // Upload to Backblaze
          const requestBody = {
            fileName: file.name,
            fileData: fileDataUrl,
            folder: `Referater/${selectedYear}`
          };
          
          console.log('Request body prepared:', {
            fileName: requestBody.fileName,
            hasFileData: !!requestBody.fileData,
            fileDataLength: requestBody.fileData?.length,
            fileDataStart: requestBody.fileData?.substring(0, 50),
            folder: requestBody.folder
          });

          // Use fetch directly to ensure proper JSON serialization
          const response = await fetch('/api/upload-to-backblaze', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
          });

          if (!response.ok) {
            let errorData;
            try {
              const text = await response.text();
              console.error('Upload error response text:', text);
              errorData = JSON.parse(text);
            } catch (e) {
              errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
            }
            
            console.error('Upload error response:', {
              status: response.status,
              statusText: response.statusText,
              errorData,
              errorMessage: errorData.error,
              errorDetails: errorData.received || errorData.details
            });
            
            const errorMessage = errorData.error || errorData.message || `Upload fejlede: ${response.status}`;
            throw new Error(errorMessage);
          }

          const data = await response.json();

          toast.dismiss(loadingToast);

          toast.success('Fil uploadet!');
          setIsUploading(false);
          // Reload files
          loadFiles();
          // Reset file input
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        } catch (error) {
          toast.dismiss(loadingToast);
          setIsUploading(false);
          console.error('Error uploading file:', error);
          const errorMessage = error instanceof Error ? error.message : 'Kunne ikke uploade fil';
          toast.error(errorMessage);
        }
      };

      reader.onerror = () => {
        toast.dismiss(loadingToast);
        setIsUploading(false);
        toast.error('Kunne ikke læse fil');
      };

      reader.readAsDataURL(file);
    } catch (error) {
      toast.dismiss(loadingToast);
      setIsUploading(false);
      console.error('Error uploading file:', error);
      toast.error('Kunne ikke uploade fil');
    }
  };

  const handleViewFile = (file: ReferatFile) => {
    // Open file in new tab using download URL
    window.open(file.downloadUrl, '_blank');
  };

  // Only show years 2024 and 2025
  const years = ['2024', '2025'];

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
          <div className="space-y-6">
            {/* Year Selection */}
            <div className="flex flex-wrap gap-2">
              {years.map((year) => (
                <Button
                  key={year}
                  variant={selectedYear === year ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedYear(year)}
                >
                  {year}
                </Button>
              ))}
            </div>

            {/* Selected Year Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">{selectedYear}</h2>
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    id="referat-upload"
                    className="hidden"
                    onChange={handleFileSelect}
                    disabled={isUploading}
                    accept="*/*"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="gap-2"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Uploader...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        Upload
                      </>
                    )}
                  </Button>
                </div>
              </div>
              
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Indlæser referater...</span>
                </div>
              ) : files.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border rounded-lg">
                  <p>Ingen referater fundet for {selectedYear}</p>
                  <p className="text-sm mt-2">Brug Upload knappen for at tilføje referater</p>
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
                        onClick={() => handleViewFile(file)}
                        className="gap-2 shrink-0"
                      >
                        <Eye className="h-4 w-4" />
                        Vis
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
