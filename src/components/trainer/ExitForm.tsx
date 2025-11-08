import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { da } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
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

interface ChecklistState {
  status: boolean;
  date?: Date;
}

interface ExitFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const ExitForm = ({ open, onOpenChange, onSuccess }: ExitFormProps) => {
  const [files, setFiles] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [checklist, setChecklist] = useState<Record<string, ChecklistState>>({});

  useEffect(() => {
    if (open) {
      loadFiles();
      // Initialize checklist with all items
      const initialChecklist = EXIT_CHECKLIST_ITEMS.reduce((acc, item) => {
        acc[item.id] = { status: false };
        return acc;
      }, {} as Record<string, ChecklistState>);
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
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Get existing data
      const existingData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];

      // Create exit checklist data
      const exitData = [
        ['', '', ''],
        ['Exit Tjekliste', '', ''],
        ['', '', ''],
        ...EXIT_CHECKLIST_ITEMS.map(item => [
          item.label,
          checklist[item.id]?.status ? 'Ja' : 'Nej',
          checklist[item.id]?.date ? format(checklist[item.id].date!, 'd. MMMM yyyy', { locale: da }) : ''
        ])
      ];

      // Append exit data to existing data
      const combinedData = [...existingData, ...exitData];

      // Create new worksheet with combined data
      const newWorksheet = XLSX.utils.aoa_to_sheet(combinedData);
      
      // Set column widths
      newWorksheet['!cols'] = [
        { wch: 45 },
        { wch: 20 },
        { wch: 80 }
      ];

      // Update workbook
      workbook.Sheets[sheetName] = newWorksheet;

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
        onSuccess?.();
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
            <Label className="text-base font-medium">Vælg frivillig</Label>
            <Select value={selectedFile} onValueChange={setSelectedFile}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Vælg en frivillig..." />
              </SelectTrigger>
              <SelectContent className="z-[100] bg-background">
                {files.length === 0 ? (
                  <SelectItem value="none" disabled>Ingen filer fundet</SelectItem>
                ) : (
                  files
                    .filter((file) => file.fileName !== '.bzEmpty')
                    .map((file) => (
                      <SelectItem key={file.fileId} value={file.fileName}>
                        {file.fileName.replace('Frivillige/', '')}
                      </SelectItem>
                    ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4 border-t pt-4">
            {EXIT_CHECKLIST_ITEMS.map((item) => (
              <div key={item.id} className="space-y-2">
                <Label className="text-base">{item.label}</Label>
                <div className="flex gap-4 items-center">
                  <RadioGroup
                    value={checklist[item.id]?.status ? "true" : "false"}
                    onValueChange={(value) => setChecklist(prev => ({ 
                      ...prev, 
                      [item.id]: { ...prev[item.id], status: value === "true" } 
                    }))}
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
                  
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "justify-start text-left font-normal",
                          !checklist[item.id]?.date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {checklist[item.id]?.date ? (
                          format(checklist[item.id].date!, "d. MMM yyyy", { locale: da })
                        ) : (
                          <span>Vælg dato</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={checklist[item.id]?.date}
                        onSelect={(date) => setChecklist(prev => ({ 
                          ...prev, 
                          [item.id]: { ...prev[item.id], date } 
                        }))}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
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
