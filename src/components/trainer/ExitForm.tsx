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
      console.log('=== STARTING EXIT PROCESS ===');
      console.log('Selected file:', selectedFile);
      console.log('Available files:', files.map(f => f.fileName));
      console.log('Checklist state:', checklist);
      
      // Find the file object to get fileId
      const selectedFileObj = files.find(f => f.fileName === selectedFile);
      if (!selectedFileObj || !selectedFileObj.fileId) {
        throw new Error('Kunne ikke finde fil information');
      }
      
      console.log('Found file object:', selectedFileObj);

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
      
      // First, let's log what we're looking for
      console.log('Looking for Exit Tjekliste in existing data...');
      console.log('EXIT_CHECKLIST_ITEMS labels:', EXIT_CHECKLIST_ITEMS.map(i => i.label));
      
      for (let i = 0; i < existingData.length; i++) {
        const row = existingData[i];
        const firstCell = row && row[0];
        
        if (firstCell === 'Exit Tjekliste') {
          exitStartIndex = i - 2; // Account for the 2 empty rows before it
          console.log('Found existing Exit Tjekliste at row:', i, 'will replace from row:', exitStartIndex);
          
          // Log the existing exit section to see what's there
          console.log('Existing exit section (rows', i, 'to', Math.min(i + 15, existingData.length), '):');
          for (let k = i; k < Math.min(i + 15, existingData.length); k++) {
            console.log(`  Row ${k}:`, existingData[k]);
          }
          
          // Find where Exit Tjekliste ends - look for next non-empty row that's not part of exit checklist
          // Exit checklist items are the 7 EXIT_CHECKLIST_ITEMS
          // We expect: empty row, empty row, "Exit Tjekliste", empty row, then 7 checklist items
          let foundItems = 0;
          for (let j = i + 1; j < existingData.length; j++) {
            const checkRow = existingData[j];
            if (!checkRow || checkRow.length === 0) {
              // Empty row - might be between items or after last item
              continue;
            }
            
            const checkFirstCell = checkRow[0];
            if (!checkFirstCell || typeof checkFirstCell !== 'string') {
              continue;
            }
            
            // Check if this row is still part of exit checklist (one of the 7 items)
            const isExitItem = EXIT_CHECKLIST_ITEMS.some(item => {
              // Try exact match first
              if (checkFirstCell.trim() === item.label.trim()) {
                return true;
              }
              // Then try includes match
              return checkFirstCell.includes(item.label) || item.label.includes(checkFirstCell);
            });
            
            if (isExitItem) {
              foundItems++;
              console.log(`  Found exit item ${foundItems} at row ${j}:`, checkFirstCell);
            } else if (checkFirstCell.trim() !== '') {
              // Found a non-empty row that's not an exit item - this is the end
              exitEndIndex = j;
              console.log(`Found end of Exit Tjekliste at row ${j} (found ${foundItems} items):`, checkFirstCell);
              break;
            }
          }
          
          // If we didn't find an end, exit data goes to the end
          if (exitEndIndex === -1) {
            exitEndIndex = existingData.length;
            console.log(`Exit Tjekliste extends to end of file (found ${foundItems} items)`);
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
          
          const row = [
            item.label,
            statusText,
            ''
          ];
          
          console.log(`Creating exit row for ${item.label}:`, row);
          return row;
        })
      ];
      
      console.log('Complete exitData:', exitData);
      console.log('Checklist state:', checklist);

      let combinedData;
      if (exitStartIndex !== -1 && exitEndIndex !== -1) {
        // Replace existing Exit Tjekliste - we know exactly where it starts and ends
        const beforeData = existingData.slice(0, exitStartIndex);
        const afterData = existingData.slice(exitEndIndex);
        
        console.log('=== REPLACING EXIT DATA ===');
        console.log('Before rows:', beforeData.length);
        console.log('Exit data rows:', exitData.length);
        console.log('After rows:', afterData.length);
        console.log('Replacing from row', exitStartIndex, 'to row', exitEndIndex);
        console.log('Last row before exit:', beforeData[beforeData.length - 1]);
        console.log('First row of exit data:', exitData[0]);
        console.log('Last row of exit data:', exitData[exitData.length - 1]);
        console.log('First row after exit:', afterData[0]);
        
        // Verify exitData structure before combining
        console.log('=== EXIT DATA STRUCTURE VERIFICATION ===');
        console.log('exitData[0] (should be empty):', exitData[0]);
        console.log('exitData[1] (should be empty):', exitData[1]);
        console.log('exitData[2] (should be "Exit Tjekliste"):', exitData[2]);
        console.log('exitData[3] (should be empty):', exitData[3]);
        console.log('exitData[4] (first checklist item):', exitData[4]);
        console.log('exitData[5] (second checklist item):', exitData[5]);
        console.log('exitData[10] (last checklist item):', exitData[10]);
        
        combinedData = [
          ...beforeData,
          ...exitData,
          ...afterData
        ];
        
        console.log('Total rows after replacement:', combinedData.length);
        console.log('Expected total:', beforeData.length + exitData.length + afterData.length);
        
        // Verify the combined data structure
        const combinedExitTitleIndex = combinedData.findIndex(row => row && row[0] === 'Exit Tjekliste');
        if (combinedExitTitleIndex !== -1) {
          console.log('=== VERIFYING COMBINED DATA STRUCTURE ===');
          console.log('Exit Tjekliste found at row:', combinedExitTitleIndex);
          console.log('Row', combinedExitTitleIndex, ':', combinedData[combinedExitTitleIndex]);
          console.log('Row', combinedExitTitleIndex + 1, ':', combinedData[combinedExitTitleIndex + 1]);
          console.log('Row', combinedExitTitleIndex + 2, '(first item):', combinedData[combinedExitTitleIndex + 2]);
          console.log('Row', combinedExitTitleIndex + 3, '(second item):', combinedData[combinedExitTitleIndex + 3]);
        }
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
        console.log('=== VERIFYING EXIT DATA IN COMBINED DATA ===');
        console.log('Exit Tjekliste found at row:', exitDataStart);
        console.log('Exit data sample (first 12 rows):', combinedData.slice(exitDataStart, exitDataStart + 12));
        
        // Find where checklist items actually start
        // In existing data: 'Exit Tjekliste' is at row i, then empty row, then items start at row i+2
        // In exitData array: ['', ''], ['', ''], ['Exit Tjekliste', ''], [''], [item1], [item2], ...
        // So when we insert exitData, items start at exitDataStart + 2 (skip title and empty row)
        const checklistStartRow = exitDataStart + 2;
        const checklistItemsInData = combinedData.slice(checklistStartRow, checklistStartRow + EXIT_CHECKLIST_ITEMS.length);
        
        console.log('=== CHECKLIST ITEMS IN EXCEL DATA ===');
        console.log('checklistStartRow:', checklistStartRow);
        console.log('exitData structure:');
        for (let i = exitDataStart; i < Math.min(exitDataStart + 15, combinedData.length); i++) {
          console.log(`  Row ${i}:`, combinedData[i]);
        }
        
        checklistItemsInData.forEach((row, idx) => {
          console.log(`Item ${idx + 1}:`, row);
        });
        
        console.log('=== EXPECTED CHECKLIST ITEMS ===');
        EXIT_CHECKLIST_ITEMS.forEach((item, idx) => {
          const status = checklist[item.id]?.status;
          const date = checklist[item.id]?.date;
          const expectedStatus = status && date ? `Ja - ${format(date, 'dd/MM/yyyy')}` : (status ? 'Ja' : 'Nej');
          const actualRow = checklistItemsInData[idx];
          const actualLabel = actualRow?.[0];
          const actualStatus = actualRow?.[1];
          
          console.log(`Item ${idx + 1} (${item.id}):`, {
            expectedLabel: item.label,
            actualLabel,
            labelMatch: actualLabel === item.label,
            expectedStatus,
            actualStatus,
            statusMatch: actualStatus === expectedStatus
          });
        });
      } else {
        console.error('ERROR: Exit Tjekliste not found in combined data!');
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
