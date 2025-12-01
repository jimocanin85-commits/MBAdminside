import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { functions } from "@/integrations/api/client";
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
      const { data, error } = await functions.invoke('list-backblaze-files');
      
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
      // Find the file object to get fileId
      const selectedFileObj = files.find(f => f.fileName === selectedFile);
      if (!selectedFileObj || !selectedFileObj.fileId) {
        throw new Error('Kunne ikke finde fil information');
      }

      // Download the existing Excel file
      const { data: downloadData, error: downloadError } = await functions.invoke(
        'download-backblaze-file',
        { 
          method: 'POST',
          body: { 
            fileName: selectedFile,
            fileId: selectedFileObj.fileId
          } 
        }
      );

      if (downloadError) {
        console.error('Download error:', downloadError);
        throw new Error(downloadError.message || 'Kunne ikke downloade fil');
      }

      console.log('Download successful, processing file...');

      // API returns { success: true, data: base64, fileName }
      // API client extracts response.data, so downloadData IS the base64 string
      // But let's handle both cases to be safe
      let fileData: string;
      
      if (typeof downloadData === 'string') {
        // downloadData is already the base64 string (most likely case)
        fileData = downloadData;
      } else if (downloadData && typeof downloadData === 'object' && downloadData.data && typeof downloadData.data === 'string') {
        // downloadData is an object with data property
        fileData = downloadData.data;
      } else {
        // Last resort: try to find any string property
        const stringValue = Object.values(downloadData || {}).find(v => typeof v === 'string' && v.length > 50) as string | undefined;
        if (stringValue) {
          fileData = stringValue;
        } else {
          throw new Error(`Kunne ikke hente fil data. Response type: ${typeof downloadData}, Value: ${JSON.stringify(downloadData).substring(0, 200)}`);
        }
      }

      if (!fileData || fileData.length === 0) {
        throw new Error('Kunne ikke hente fil data - tom data');
      }

      // Parse the existing Excel file
      console.log('Decoding base64, length:', fileData.length);
      const binaryString = atob(fileData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      console.log('Reading Excel file, bytes:', bytes.length);
      const workbook = XLSX.read(bytes, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      console.log('Sheet name:', sheetName);
      const worksheet = workbook.Sheets[sheetName];
      
      // Get existing data
      const existingData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];
      console.log('Existing data rows:', existingData.length);

      // Find if Exit Tjekliste already exists
      let exitStartIndex = -1;
      let exitEndIndex = -1;
      
      for (let i = 0; i < existingData.length; i++) {
        if (existingData[i] && existingData[i][0] === 'Exit Tjekliste') {
          exitStartIndex = i - 2; // Account for the 2 empty rows before it
          console.log('Found existing Exit Tjekliste at row:', i, 'will replace from row:', exitStartIndex);
          
          // Find where Exit Tjekliste ends - look for next non-empty row that's not part of exit checklist
          // Exit checklist items are the 7 EXIT_CHECKLIST_ITEMS
          for (let j = i + 1; j < existingData.length; j++) {
            const row = existingData[j];
            if (!row || row.length === 0) continue;
            
            const firstCell = row[0];
            // Check if this row is still part of exit checklist (one of the 7 items)
            const isExitItem = EXIT_CHECKLIST_ITEMS.some(item => 
              firstCell && typeof firstCell === 'string' && firstCell.includes(item.label)
            );
            
            if (!isExitItem && firstCell && firstCell.trim() !== '') {
              // Found the end - this is a non-exit row
              exitEndIndex = j;
              console.log('Found end of Exit Tjekliste at row:', j);
              break;
            }
          }
          
          // If we didn't find an end, exit data goes to the end
          if (exitEndIndex === -1) {
            exitEndIndex = existingData.length;
            console.log('Exit Tjekliste extends to end of file');
          }
          
          break;
        }
      }
      if (exitStartIndex === -1) {
        console.log('No existing Exit Tjekliste found, will append at end');
      }

      // Create exit checklist data
      const exitData = [
        ['', '', ''],
        ['', '', ''], // Extra empty row to move Exit Tjekliste down
        ['Exit Tjekliste', '', ''],
        ['', '', ''],
        ...EXIT_CHECKLIST_ITEMS.map(item => {
          const status = checklist[item.id]?.status;
          const date = checklist[item.id]?.date;
          
          let statusText = status ? 'Ja' : 'Nej';
          if (status && date) {
            statusText = `Ja - ${format(date, 'dd/MM/yyyy')}`;
          }
          
          return [
            item.label,
            statusText,
            ''
          ];
        })
      ];

      let combinedData;
      if (exitStartIndex !== -1 && exitEndIndex !== -1) {
        // Replace existing Exit Tjekliste - we know exactly where it starts and ends
        combinedData = [
          ...existingData.slice(0, exitStartIndex),
          ...exitData,
          ...existingData.slice(exitEndIndex)
        ];
        console.log('Replaced Exit Tjekliste. Old rows:', existingData.length, 'New rows:', combinedData.length, 'Replaced from', exitStartIndex, 'to', exitEndIndex);
        console.log('Data before exit:', existingData.slice(Math.max(0, exitStartIndex - 2), exitStartIndex));
        console.log('New exit data:', exitData.slice(0, 5));
        console.log('Data after exit:', existingData.slice(exitEndIndex, exitEndIndex + 3));
      } else {
        // Append new Exit Tjekliste
        combinedData = [...existingData, ...exitData];
        console.log('Appended Exit Tjekliste. Old rows:', existingData.length, 'New rows:', combinedData.length);
      }
      
      // Verify exit data is in combined data
      const hasExitTitle = combinedData.some(row => row && row[0] === 'Exit Tjekliste');
      const exitTitleIndex = combinedData.findIndex(row => row && row[0] === 'Exit Tjekliste');
      console.log('Combined data contains Exit Tjekliste:', hasExitTitle, 'at index:', exitTitleIndex);
      if (!hasExitTitle) {
        console.error('ERROR: Exit Tjekliste not found in combined data!');
        console.error('First 5 rows of combined data:', combinedData.slice(0, 5));
      }
      
      // Log a sample of the exit data to verify it's correct
      const exitDataStart = combinedData.findIndex(row => row && row[0] === 'Exit Tjekliste');
      if (exitDataStart !== -1) {
        console.log('Exit data sample:', combinedData.slice(exitDataStart, exitDataStart + 10));
        // Log the actual checklist items with their values
        const checklistItemsInData = combinedData.slice(exitDataStart + 4, exitDataStart + 4 + EXIT_CHECKLIST_ITEMS.length);
        console.log('Checklist items in Excel data:', checklistItemsInData);
        console.log('Expected checklist items:', EXIT_CHECKLIST_ITEMS.map(item => ({
          label: item.label,
          status: checklist[item.id]?.status,
          date: checklist[item.id]?.date
        })));
      }

      // Instead of creating a new worksheet, update the existing one
      // This preserves all formatting, styles, and other data
      const newWorksheet = XLSX.utils.aoa_to_sheet(combinedData);
      
      // Preserve existing worksheet properties
      if (worksheet['!ref']) {
        newWorksheet['!ref'] = worksheet['!ref'];
      }
      
      // Preserve existing column widths if they exist, otherwise set new ones
      if (worksheet['!cols']) {
        newWorksheet['!cols'] = worksheet['!cols'];
      } else {
        newWorksheet['!cols'] = [
          { wpx: 300 },  // Column A - Checklist item
          { wpx: 400 },  // Column B - Status (with full date)
          { wpx: 500 }   // Column C - Additional info
        ];
      }
      
      // Preserve existing row heights if they exist
      if (worksheet['!rows']) {
        newWorksheet['!rows'] = worksheet['!rows'];
      }
      
      // Preserve existing merges if they exist
      if (worksheet['!merges']) {
        newWorksheet['!merges'] = worksheet['!merges'];
      }
      
      // Find the row where "Exit Tjekliste" is located (1-indexed for Excel)
      const exitTitleRow = exitStartIndex !== -1 ? exitStartIndex + 3 : existingData.length + 3;
      const exitTitleCell = XLSX.utils.encode_cell({ r: exitTitleRow - 1, c: 0 }); // Convert to 0-indexed
      
      // Make "Exit Tjekliste" bold if the cell exists
      if (newWorksheet[exitTitleCell]) {
        newWorksheet[exitTitleCell].s = {
          font: { bold: true, sz: 14 },
          alignment: { vertical: 'center', horizontal: 'left' }
        };
      }

      // Update workbook - preserve all sheets and workbook properties
      workbook.Sheets[sheetName] = newWorksheet;
      
      // Preserve workbook properties
      if (workbook.Props) {
        // Keep existing workbook properties
      }
      
      console.log('Updated Excel file:', {
        sheetName,
        totalRows: combinedData.length,
        exitTitleRow,
        exitTitleCell,
        hasExitData: combinedData.some(row => row[0] === 'Exit Tjekliste')
      });

      // Convert back to Excel with cell styles enabled
      // Use 'base64' type directly - XLSX can output base64
      const base64 = XLSX.write(workbook, { 
        bookType: 'xlsx', 
        type: 'base64',
        cellStyles: true 
      });
      
      console.log('Excel base64 length:', base64.length, 'characters');
      
      if (!base64 || base64.length === 0) {
        throw new Error('Kunne ikke generere Excel fil');
      }

      console.log('Base64 length:', base64.length);
      console.log('Uploading file:', selectedFile);

      // Upload back to Backblaze
      const { error: uploadError } = await functions.invoke('upload-to-backblaze', {
        method: 'POST',
        body: {
          fileData: `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64}`,
          fileName: selectedFile
        }
      });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      console.log('Upload successful!');
      toast.success('Exit tjekliste opdateret!', { id: loadingToast });
      onSuccess?.();
      onOpenChange(false);
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
        <DialogHeader>
          <DialogTitle>Exit Tjekliste</DialogTitle>
          <DialogDescription>
            Vælg en træner og udfyld exit tjeklisten. Tjeklisten vil blive tilføjet til Excel filen.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 pt-6">
          <div className="space-y-2">
            <Select value={selectedFile} onValueChange={setSelectedFile}>
              <SelectTrigger>
                <SelectValue placeholder="Vælg en frivillig..." />
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
                        disabled={!checklist[item.id]?.status}
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
