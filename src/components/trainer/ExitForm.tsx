import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import * as XLSX from 'xlsx';

const EXIT_CHECKLIST_ITEMS = [
  { id: 'contract', label: 'Er der kontrakt?' },
  { id: 'kluboffice', label: 'Meldt af Kluboffice' },
  { id: 'facebook', label: 'Meldt af Facebook gruppe' },
  { id: 'email_return', label: 'Send email om retur ting' },
  { id: 'badge_return', label: 'Brik retur' },
  { id: 'clothes', label: 'Tøj' },
  { id: 'email_tina', label: 'Send email til Tina om at brik skal lukkes' }
];

interface ExitFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ExitForm = ({ open, onOpenChange }: ExitFormProps) => {
  const [files, setFiles] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (open) {
      loadFiles();
      // Initialize checklist with all items as false
      const initialChecklist = EXIT_CHECKLIST_ITEMS.reduce((acc, item) => {
        acc[item.id] = false;
        return acc;
      }, {} as Record<string, boolean>);
      setChecklist(initialChecklist);
    }
  }, [open]);

  const loadFiles = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('list-backblaze-files');
      
      if (error) throw error;
      
      if (data?.files) {
        setFiles(data.files);
      }
    } catch (error) {
      console.error('Error loading files:', error);
      toast.error('Kunne ikke indlæse filer');
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile) {
      toast.error('Vælg venligst en træner');
      return;
    }

    setIsLoading(true);
    const loadingToast = toast.loading('Behandler exit...');

    try {
      // Download the existing Excel file
      const { data: downloadData, error: downloadError } = await supabase.functions.invoke(
        'download-backblaze-file',
        { body: { fileName: selectedFile } }
      );

      if (downloadError) throw downloadError;

      // Parse the existing Excel file
      const binaryString = atob(downloadData.fileData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const workbook = XLSX.read(bytes, { type: 'array' });

      // Create exit checklist data
      const exitData = [
        ['Exit Tjekliste', ''],
        ['', ''],
        ...EXIT_CHECKLIST_ITEMS.map(item => [
          item.label,
          checklist[item.id] ? 'Ja' : 'Nej'
        ])
      ];

      // Add or update the Exit sheet
      const exitSheet = XLSX.utils.aoa_to_sheet(exitData);
      workbook.SheetNames.push('Exit');
      workbook.Sheets['Exit'] = exitSheet;

      // Convert back to Excel
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      // Convert to base64
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64data = reader.result as string;

        // Upload back to Backblaze
        const { error: uploadError } = await supabase.functions.invoke('upload-to-backblaze', {
          body: {
            fileData: base64data,
            fileName: selectedFile
          }
        });

        if (uploadError) throw uploadError;

        toast.success('Exit tjekliste tilføjet!', { id: loadingToast });
        onOpenChange(false);
      };
    } catch (error) {
      console.error('Error processing exit:', error);
      toast.error('Kunne ikke behandle exit', { id: loadingToast });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="space-y-6 pt-6">
          <div className="space-y-2">
            <Label>Vælg frivillig</Label>
            <Select value={selectedFile} onValueChange={setSelectedFile}>
              <SelectTrigger>
                <SelectValue placeholder="Vælg en træner..." />
              </SelectTrigger>
              <SelectContent>
                {files.map((file) => (
                  <SelectItem key={file.fileId} value={file.fileName}>
                    {file.fileName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4 border-t pt-4">
            {EXIT_CHECKLIST_ITEMS.map((item) => (
              <div key={item.id} className="space-y-2">
                <Label className="text-base">{item.label}</Label>
                <RadioGroup
                  value={checklist[item.id] ? "true" : "false"}
                  onValueChange={(value) => setChecklist(prev => ({ ...prev, [item.id]: value === "true" }))}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="true" id={`${item.id}-yes`} />
                    <Label htmlFor={`${item.id}-yes`} className="cursor-pointer">Ja</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="false" id={`${item.id}-no`} />
                    <Label htmlFor={`${item.id}-no`} className="cursor-pointer">Nej</Label>
                  </div>
                </RadioGroup>
              </div>
            ))}
          </div>

          <Button 
            onClick={handleSubmit} 
            disabled={isLoading || !selectedFile}
            className="w-full"
          >
            Ok
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExitForm;
