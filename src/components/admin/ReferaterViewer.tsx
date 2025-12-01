import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, Upload, Loader2, Eye } from "lucide-react";
import { functions } from "@/integrations/api/client";
import { toast } from "sonner";
import mammoth from "mammoth";
import * as XLSX from "xlsx";

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
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [viewingFileId, setViewingFileId] = useState<string | null>(null);
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

  const uploadSingleFile = async (file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onloadend = async () => {
        try {
          const base64String = reader.result as string;
          const base64Data = base64String.split(',')[1] || base64String;

          if (!base64Data || base64Data.length === 0) {
            throw new Error('Kunne ikke læse fil data');
          }

          const fileDataUrl = `data:${file.type || 'application/octet-stream'};base64,${base64Data}`;

          // Upload to Backblaze
          const requestBody = {
            fileName: file.name,
            fileData: fileDataUrl,
            folder: `Referater/${selectedYear}`
          };

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
              errorData = JSON.parse(text);
            } catch (e) {
              errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
            }
            
            const errorMessage = errorData.error || errorData.message || `Upload fejlede: ${response.status}`;
            throw new Error(errorMessage);
          }

          resolve();
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => {
        reject(new Error('Kunne ikke læse fil'));
      };

      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    setUploadProgress({ current: 0, total: selectedFiles.length });
    
    const totalFiles = selectedFiles.length;
    const fileCountText = totalFiles === 1 ? 'fil' : 'filer';
    const loadingToast = toast.loading(`Uploader ${totalFiles} ${fileCountText}...`);

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    try {
      // Upload files sequentially to avoid overwhelming the server
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        setUploadProgress({ current: i + 1, total: totalFiles });
        
        try {
          await uploadSingleFile(file);
          successCount++;
        } catch (error) {
          errorCount++;
          const errorMessage = error instanceof Error ? error.message : 'Ukendt fejl';
          errors.push(`${file.name}: ${errorMessage}`);
          console.error(`Error uploading ${file.name}:`, error);
        }
      }

      toast.dismiss(loadingToast);

      // Show success/error messages
      if (successCount > 0 && errorCount === 0) {
        toast.success(`${successCount} ${successCount === 1 ? 'fil' : 'filer'} uploadet!`);
      } else if (successCount > 0 && errorCount > 0) {
        toast.warning(`${successCount} ${successCount === 1 ? 'fil' : 'filer'} uploadet, ${errorCount} ${errorCount === 1 ? 'fil' : 'filer'} fejlede`);
        console.error('Upload errors:', errors);
      } else {
        toast.error(`Alle ${totalFiles} ${fileCountText} fejlede`);
        console.error('All uploads failed:', errors);
      }

      // Reload files if at least one succeeded
      if (successCount > 0) {
        loadFiles();
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error('Error uploading files:', error);
      toast.error('Kunne ikke uploade filer');
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleViewFile = async (file: ReferatFile) => {
    if (viewingFileId === file.fileId) {
      return; // Already viewing this file
    }

    setViewingFileId(file.fileId);
    const loadingToast = toast.loading('Henter fil...');

    try {
      // Use download-by-id API to get file data
      const response = await fetch('/api/download-backblaze-file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileId: file.fileId,
          fileName: file.fileName
        })
      });

      toast.dismiss(loadingToast);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Download fejlede: ${response.status}`);
      }

      const { data: base64Data, fileName: downloadedFileName } = await response.json();
      
      // Determine file type from extension
      const fileExtension = downloadedFileName.split('.').pop()?.toLowerCase();
      
      // Convert base64 to blob
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // Determine MIME type from file extension
      const mimeTypes: Record<string, string> = {
        'pdf': 'application/pdf',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'txt': 'text/plain',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'xls': 'application/vnd.ms-excel',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'ppt': 'application/vnd.ms-powerpoint',
        'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      };
      const mimeType = mimeTypes[fileExtension || ''] || 'application/octet-stream';
      
      const blob = new Blob([bytes], { type: mimeType });
      const blobUrl = URL.createObjectURL(blob);
      
      // For Office documents, convert to HTML and display
      const officeExtensions = ['docx', 'doc', 'xlsx', 'xls', 'pptx', 'ppt'];
      
      if (fileExtension && officeExtensions.includes(fileExtension)) {
        let htmlContent = '';
        
        try {
          if (fileExtension === 'docx' || fileExtension === 'doc') {
            // Convert DOCX to HTML using mammoth.js
            const result = await mammoth.convertToHtml({ arrayBuffer: bytes.buffer });
            htmlContent = result.value;
            
            // Handle any warnings
            if (result.messages.length > 0) {
              console.warn('Mammoth conversion warnings:', result.messages);
            }
          } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
            // Convert Excel to HTML using XLSX
            const workbook = XLSX.read(bytes.buffer, { type: 'array' });
            
            // Convert each sheet to HTML table
            const sheetNames = workbook.SheetNames;
            htmlContent = sheetNames.map(sheetName => {
              const worksheet = workbook.Sheets[sheetName];
              const html = XLSX.utils.sheet_to_html(worksheet);
              return `<div class="sheet-container"><h2>${sheetName}</h2>${html}</div>`;
            }).join('');
          } else {
            // PowerPoint files - not supported, show download option
            throw new Error('PowerPoint filer kan ikke vises direkte. Download filen for at åbne den.');
          }
          
          // Create viewer page with converted HTML
          const viewerPage = `
            <!DOCTYPE html>
            <html>
            <head>
              <title>${downloadedFileName}</title>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { 
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                  display: flex;
                  flex-direction: column;
                  height: 100vh;
                  background: #f5f5f5;
                }
                .header {
                  background: white;
                  padding: 15px 20px;
                  border-bottom: 1px solid #e0e0e0;
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                }
                .header h1 {
                  font-size: 18px;
                  font-weight: 500;
                  color: #333;
                }
                .download-btn {
                  padding: 8px 16px;
                  background: #007bff;
                  color: white;
                  text-decoration: none;
                  border-radius: 5px;
                  font-size: 14px;
                  transition: background 0.2s;
                }
                .download-btn:hover {
                  background: #0056b3;
                }
                .viewer-container {
                  flex: 1;
                  overflow: auto;
                  padding: 20px;
                }
                .viewer-content {
                  background: white;
                  border-radius: 8px;
                  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                  max-width: 1200px;
                  margin: 0 auto;
                  padding: 40px;
                  min-height: 100%;
                }
                /* Styles for Word documents */
                .viewer-content h1, .viewer-content h2, .viewer-content h3 {
                  margin-top: 1.5em;
                  margin-bottom: 0.5em;
                  font-weight: 600;
                }
                .viewer-content p {
                  margin-bottom: 1em;
                  line-height: 1.6;
                }
                .viewer-content ul, .viewer-content ol {
                  margin-left: 2em;
                  margin-bottom: 1em;
                }
                .viewer-content table {
                  border-collapse: collapse;
                  width: 100%;
                  margin: 1em 0;
                }
                .viewer-content table td, .viewer-content table th {
                  border: 1px solid #ddd;
                  padding: 8px;
                  text-align: left;
                }
                .viewer-content table th {
                  background-color: #f2f2f2;
                  font-weight: 600;
                }
                /* Styles for Excel sheets */
                .sheet-container {
                  margin-bottom: 3em;
                }
                .sheet-container h2 {
                  margin-bottom: 1em;
                  color: #333;
                  font-size: 1.5em;
                  border-bottom: 2px solid #007bff;
                  padding-bottom: 0.5em;
                }
                .sheet-container table {
                  font-size: 14px;
                }
              </style>
            </head>
            <body>
              <div class="header">
                <h1>${downloadedFileName}</h1>
                <a href="${blobUrl}" download="${downloadedFileName}" class="download-btn">
                  Download
                </a>
              </div>
              <div class="viewer-container">
                <div class="viewer-content">
                  ${htmlContent}
                </div>
              </div>
            </body>
            </html>
          `;
          
          // Create a blob URL for the viewer page
          const viewerBlob = new Blob([viewerPage], { type: 'text/html' });
          const viewerBlobUrl = URL.createObjectURL(viewerBlob);
          
          // Open viewer page in new tab
          const newWindow = window.open(viewerBlobUrl, '_blank');
          
          if (!newWindow) {
            // Popup blocked - create download link instead
            const downloadLink = document.createElement('a');
            downloadLink.href = blobUrl;
            downloadLink.download = downloadedFileName;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            URL.revokeObjectURL(blobUrl);
            URL.revokeObjectURL(viewerBlobUrl);
          } else {
            // Clean up blob URLs after a delay
            setTimeout(() => {
              URL.revokeObjectURL(blobUrl);
              URL.revokeObjectURL(viewerBlobUrl);
              setViewingFileId(null);
            }, 10000);
          }
        } catch (error) {
          console.error('Error converting Office document:', error);
          toast.error(error instanceof Error ? error.message : 'Kunne ikke konvertere dokument');
          
          // Fallback: show download page
          const viewerPage = `
            <!DOCTYPE html>
            <html>
            <head>
              <title>${downloadedFileName}</title>
              <meta charset="utf-8">
              <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { 
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                  display: flex;
                  flex-direction: column;
                  height: 100vh;
                  background: #f5f5f5;
                  justify-content: center;
                  align-items: center;
                }
                .message-container {
                  text-align: center;
                  padding: 50px 20px;
                  background: white;
                  border-radius: 8px;
                  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                  max-width: 500px;
                }
                .message-container h2 {
                  font-size: 24px;
                  margin-bottom: 10px;
                  color: #333;
                }
                .message-container p {
                  font-size: 16px;
                  margin-bottom: 20px;
                  color: #666;
                  line-height: 1.5;
                }
                .download-btn {
                  display: inline-block;
                  padding: 12px 24px;
                  background: #007bff;
                  color: white;
                  text-decoration: none;
                  border-radius: 5px;
                  font-size: 16px;
                  transition: background 0.2s;
                }
                .download-btn:hover {
                  background: #0056b3;
                }
              </style>
            </head>
            <body>
              <div class="message-container">
                <h2>Kunne ikke vise dokumentet</h2>
                <p>Dette dokument kan ikke vises direkte i browseren.</p>
                <p>Klik på knappen nedenfor for at downloade filen.</p>
                <a href="${blobUrl}" download="${downloadedFileName}" class="download-btn">
                  Download fil
                </a>
              </div>
            </body>
            </html>
          `;
          
          const viewerBlob = new Blob([viewerPage], { type: 'text/html' });
          const viewerBlobUrl = URL.createObjectURL(viewerBlob);
          window.open(viewerBlobUrl, '_blank');
          
          setTimeout(() => {
            URL.revokeObjectURL(blobUrl);
            URL.revokeObjectURL(viewerBlobUrl);
            setViewingFileId(null);
          }, 5000);
        }
      } else {
        // For PDF, images, and text files, use blob URL directly
        // Open file in new tab - browser will handle viewing
        window.open(blobUrl, '_blank');
        
        // Clean up blob URL after a delay
        setTimeout(() => {
          URL.revokeObjectURL(blobUrl);
          setViewingFileId(null);
        }, 1000);
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error('Error viewing file:', error);
      const errorMessage = error instanceof Error ? error.message : 'Kunne ikke åbne fil';
      toast.error(errorMessage);
      setViewingFileId(null);
    }
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
                    multiple
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
                        {uploadProgress ? (
                          `Uploader ${uploadProgress.current}/${uploadProgress.total}...`
                        ) : (
                          'Uploader...'
                        )}
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        Upload filer
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
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewFile(file)}
                        disabled={viewingFileId === file.fileId}
                        className="gap-2 shrink-0"
                      >
                        {viewingFileId === file.fileId ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Henter...
                          </>
                        ) : (
                          <>
                            <Eye className="h-4 w-4" />
                            Vis
                          </>
                        )}
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
