import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Loader2, Edit } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import * as XLSX from 'xlsx';

interface CloudFile {
  fileName: string;
  fullPath: string;
  fileId: string;
  size: number;
  uploadTimestamp: number;
  downloadUrl: string;
}

interface CloudFilesProps {
  onEditFile: (fileData: any) => void;
}

export const CloudFiles = ({ onEditFile }: CloudFilesProps) => {
  const [files, setFiles] = useState<CloudFile[]>([]);
  const [loading, setLoading] = useState(true);

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

      // Convert base64 to array buffer
      const binaryString = atob(downloadData.fileData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const workbook = XLSX.read(bytes, { type: 'array' });
      
      // Parse the Excel file
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const excelData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      
      // Extract trainer data from the Excel structure
      const trainerInfo = excelData[1][0].split('\n');
      const yearRole = excelData[1][1].split('\n');
      
      // Build checklist from rows starting at index 4
      const checklist: any = {};
      for (let i = 4; i < excelData.length; i++) {
        if (!excelData[i] || !excelData[i][0]) continue;
        
        const taskName = excelData[i][0];
        const statusText = excelData[i][1] || '';
        
        // Map task names to IDs
        const taskIdMap: Record<string, string> = {
          'Modtaget besked i Kluboffice (KO)': 'ko_message',
          'Anmodet om cpr nr via Kluboffice (KO)': 'ko_cpr',
          'Bestil Brik hos Ballerup Kommune (BALK)': 'balk_brik',
          'Brik klar til afhentning': 'brik_ready',
          'Bestilt børneattest': 'bornetest_ordered',
          'Modtaget børneattest retur': 'bornetest_received',
          'Email til ny træner, cc kontaktperson': 'welcome_email'
        };
        
        const taskId = taskIdMap[taskName];
        if (taskId) {
          if (statusText.includes('Ja -')) {
            const dateStr = statusText.replace('Ja - ', '').trim();
            const [day, month, year] = dateStr.split('/');
            const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            checklist[taskId] = { status: true, date };
          } else if (statusText === 'Nej') {
            checklist[taskId] = { status: false, date: null };
          }
        }
      }
      
      const trainerData = {
        navn: trainerInfo[0] || '',
        email: trainerInfo[1] || '',
        telefon: trainerInfo[2] || '',
        foedselsdato: trainerInfo[3] || '',
        aargang: yearRole[0] || '',
        rolle: yearRole[1] || '',
        kontaktperson: excelData[1][2] || '',
        createdAt: new Date(file.uploadTimestamp),
        excelData: {
          data: {
            navn: trainerInfo[0] || '',
            email: trainerInfo[1] || '',
            telefon: trainerInfo[2] || '',
            foedselsdato: trainerInfo[3] || '',
            aargang: yearRole[0] || '',
            rolle: yearRole[1] || '',
            kontaktperson: excelData[1][2] || ''
          },
          checklist
        }
      };
      
      toast.dismiss();
      toast.success("Fil indlæst!");
      onEditFile(trainerData);
    } catch (error) {
      toast.dismiss();
      console.error('Error loading file:', error);
      toast.error("Kunne ikke indlæse fil", {
        description: error instanceof Error ? error.message : "Ukendt fejl"
      });
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
                    <Edit className="h-4 w-4" />
                    Rediger
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
