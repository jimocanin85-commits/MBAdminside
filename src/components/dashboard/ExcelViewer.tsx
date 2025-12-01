import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { X, Save } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from 'xlsx';
import { functions } from "@/integrations/api/client";

interface ExcelViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileName: string;
  fileData: string; // base64
  onSaved?: () => void;
}

export const ExcelViewer = ({ open, onOpenChange, fileName, fileData, onSaved }: ExcelViewerProps) => {
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [currentSheetIndex, setCurrentSheetIndex] = useState(0);
  const [sheetData, setSheetData] = useState<any[][]>([]);

  // Initialize workbook and sheet data when fileData changes
  useEffect(() => {
    if (!fileData || !open) {
      setWorkbook(null);
      setSheetData([]);
      return;
    }

    try {
      const binaryString = atob(fileData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const wb = XLSX.read(bytes, { type: 'array' });
      setWorkbook(wb);
      
      // Load first sheet data
      const worksheet = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];
      setSheetData(data);
      setCurrentSheetIndex(0);
    } catch (error) {
      console.error('Error parsing Excel file:', error);
      toast.error('Kunne ikke indlæse Excel fil');
      setWorkbook(null);
      setSheetData([]);
    }
  }, [fileData, open]);

  const switchSheet = (index: number) => {
    if (!workbook) return;
    setCurrentSheetIndex(index);
    const worksheet = workbook.Sheets[workbook.SheetNames[index]];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];
    setSheetData(data);
  };

  const updateCell = (rowIndex: number, colIndex: number, value: string) => {
    const newData = [...sheetData];
    if (!newData[rowIndex]) {
      newData[rowIndex] = [];
    }
    newData[rowIndex][colIndex] = value;
    setSheetData(newData);
  };

  const handleSave = async () => {
    if (!workbook) return;
    
    try {
      toast.loading("Gemmer fil...");

      // Update current sheet with edited data
      const ws = XLSX.utils.aoa_to_sheet(sheetData);
      
      // Set column widths for trainer data sheet - larger column B for dates
      if (currentSheetIndex === 0) {
        ws['!cols'] = [
          { wpx: 300 },  // Column A
          { wpx: 400 },  // Column B - wider for full dates like "Ja - 10. november 2025"
          { wpx: 500 }   // Column C
        ];
        
        ws['!rows'] = [
          { hpt: 20 },
          { hpt: 60 },
        ];
      }

      // Update the workbook with current sheet
      workbook.Sheets[workbook.SheetNames[currentSheetIndex]] = ws;

      // Convert entire workbook to base64
      const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });

      // Upload to Backblaze
      const { data, error } = await functions.invoke('upload-to-backblaze', {
        method: 'POST',
        body: {
          fileData: `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${wbout}`,
          fileName: fileName
        }
      });

      toast.dismiss();

      if (error) {
        console.error('Upload error:', error);
        toast.error("Gem fejlede", {
          description: error.message
        });
        return;
      }

      if (data?.success) {
        toast.success("Filen er gemt!", {
          description: fileName
        });
        onSaved?.();
        onOpenChange(false);
      }
    } catch (error) {
      toast.dismiss();
      console.error('Error saving:', error);
      toast.error("Gem fejlede", {
        description: error instanceof Error ? error.message : "Ukendt fejl"
      });
    }
  };

  // Find max columns
  const maxCols = Math.max(...sheetData.map(row => row?.length || 0));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[90vh] flex flex-col p-3 sm:p-6 [&>button]:hidden">
        <DialogHeader>
          <DialogTitle className="truncate text-sm sm:text-base">{fileName}</DialogTitle>
          <DialogDescription className="sr-only">
            Rediger Excel fil data
          </DialogDescription>
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-1 sm:gap-2 flex-shrink-0">
              <Button onClick={handleSave} size="sm" className="gap-1 sm:gap-2 min-h-[44px]">
                <Save className="h-4 w-4" />
                <span className="hidden sm:inline">Gem</span>
              </Button>
              <Button onClick={() => onOpenChange(false)} size="sm" variant="ghost" className="min-h-[44px]">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        {workbook && workbook.SheetNames.length > 1 && (
          <Tabs value={currentSheetIndex.toString()} onValueChange={(v) => switchSheet(parseInt(v))}>
            <TabsList>
              {workbook.SheetNames.map((name, index) => (
                <TabsTrigger key={index} value={index.toString()}>
                  {name}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}
        
        <div className="flex-1 overflow-auto border rounded-lg -mx-3 sm:mx-0">
          <table className="w-full border-collapse text-sm">
            <tbody>
              {sheetData.map((row, rowIndex) => (
                <tr key={rowIndex} className="border-b">
                  {Array.from({ length: maxCols }).map((_, colIndex) => (
                    <td 
                      key={colIndex} 
                      className="border-r p-0"
                      style={{ 
                        minWidth: colIndex === 0 ? '250px' : colIndex === 2 ? '400px' : '120px' 
                      }}
                    >
                      {rowIndex === 0 || rowIndex === 3 ? (
                        // Header rows - bold and larger
                        <div className="p-2 font-semibold bg-muted/50">
                          {row[colIndex] || ''}
                        </div>
                      ) : rowIndex === 1 ? (
                        // Multi-line cell
                        <textarea
                          value={row[colIndex] || ''}
                          onChange={(e) => updateCell(rowIndex, colIndex, e.target.value)}
                          className="w-full h-full p-2 resize-none min-h-[100px] bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-primary"
                          rows={4}
                        />
                      ) : (
                        // Regular cells
                        <Input
                          value={row[colIndex] || ''}
                          onChange={(e) => updateCell(rowIndex, colIndex, e.target.value)}
                          className="border-none rounded-none focus-visible:ring-1 focus-visible:ring-primary h-auto py-2"
                        />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
};
