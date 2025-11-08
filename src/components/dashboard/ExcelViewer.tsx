import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { X, Save } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from 'xlsx';
import { supabase } from "@/integrations/supabase/client";

interface ExcelViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileName: string;
  fileData: string; // base64
  onSaved?: () => void;
}

export const ExcelViewer = ({ open, onOpenChange, fileName, fileData, onSaved }: ExcelViewerProps) => {
  const [sheetData, setSheetData] = useState<any[][]>(() => {
    if (!fileData) return [];
    const binaryString = atob(fileData);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const workbook = XLSX.read(bytes, { type: 'array' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];
  });

  const updateCell = (rowIndex: number, colIndex: number, value: string) => {
    const newData = [...sheetData];
    if (!newData[rowIndex]) {
      newData[rowIndex] = [];
    }
    newData[rowIndex][colIndex] = value;
    setSheetData(newData);
  };

  const handleSave = async () => {
    try {
      toast.loading("Gemmer fil...");

      // Create workbook from updated data
      const ws = XLSX.utils.aoa_to_sheet(sheetData);
      
      // Set column widths
      ws['!cols'] = [
        { wch: 45 },
        { wch: 20 },
        { wch: 80 }
      ];
      
      // Set row heights
      ws['!rows'] = [
        { hpt: 20 },
        { hpt: 60 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Træner Data");

      // Convert to base64
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });

      // Upload to Backblaze
      const { data, error } = await supabase.functions.invoke('upload-to-backblaze', {
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
      <DialogContent className="max-w-[95vw] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{fileName}</DialogTitle>
            <div className="flex gap-2">
              <Button onClick={handleSave} size="sm" className="gap-2">
                <Save className="h-4 w-4" />
                Gem
              </Button>
              <Button onClick={() => onOpenChange(false)} size="sm" variant="ghost">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto border rounded-lg">
          <table className="w-full border-collapse">
            <tbody>
              {sheetData.map((row, rowIndex) => (
                <tr key={rowIndex} className="border-b">
                  {Array.from({ length: maxCols }).map((_, colIndex) => (
                    <td 
                      key={colIndex} 
                      className="border-r p-0"
                      style={{ 
                        minWidth: colIndex === 0 ? '300px' : colIndex === 2 ? '500px' : '150px' 
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
