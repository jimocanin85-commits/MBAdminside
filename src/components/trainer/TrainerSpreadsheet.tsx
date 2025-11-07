import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import * as XLSX from 'xlsx';

const CHECKLIST_ITEMS = [
  {
    id: "ko_message",
    label: "Modtaget besked i Kluboffice (KO)",
    note: "https://www.mb-boldklub.dk/traener-info/ny-frivillig/"
  },
  {
    id: "ko_cpr",
    label: "Anmodet om cpr nr via Kluboffice (KO)",
    note: "Kluboffice -> Personer / Medlemmer / Medlemsoversigt / Personstamdata, Ikon øverst til højre (anmod om CPR)"
  },
  {
    id: "balk_brik",
    label: "Bestil Brik hos Ballerup Kommune (BALK)",
    note: 'Brug email template "Nøglebrik" og sendt til tec@balk.dk. Husk at skrive personens navn i subjekt samt arkivere korrekt.'
  },
  {
    id: "brik_ready",
    label: "Brik klar til afhentning",
    note: "Email kommer fra tec@balk.dk"
  },
  {
    id: "bornetest_ordered",
    label: "Bestilt børneattest",
    note: "https://politi.dk/service-og-tilladelser/straffeattest/bestil-boerneattest (For at indhente børneattester skal man have MitID til MB)"
  },
  {
    id: "bornetest_received",
    label: "Modtaget børneattest retur",
    note: "Email modtaget i MB's E-boks"
  },
  {
    id: "welcome_email",
    label: "Email til ny træner, cc kontaktperson",
    note: 'Brug email template "Velkommen til Måløv Boldklub" Husk at skriv personens navn i Subjekt samt arkivere korrekt'
  }
];

interface TrainerSpreadsheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trainer: any;
  onSave: (updatedTrainer: any) => void;
}

const TrainerSpreadsheet = ({ open, onOpenChange, trainer, onSave }: TrainerSpreadsheetProps) => {
  const [editableData, setEditableData] = useState<any>({
    navn: "",
    email: "",
    telefon: "",
    foedselsdato: "",
    aargang: "",
    rolle: "",
    kontaktperson: "",
    checklist: {},
    checklistDateInputs: {} // Store raw input strings
  });

  useEffect(() => {
    if (trainer) {
      const checklistDateInputs: any = {};
      const checklist = trainer.excelData?.checklist || {};
      
      // Initialize date input strings
      Object.keys(checklist).forEach(key => {
        if (checklist[key]?.date) {
          checklistDateInputs[key] = format(new Date(checklist[key].date), "dd/MM/yyyy");
        }
      });
      
      setEditableData({
        navn: trainer.navn || "",
        email: trainer.email || "",
        telefon: trainer.telefon || "",
        foedselsdato: trainer.foedselsdato ? format(new Date(trainer.foedselsdato), "dd/MM/yyyy") : "",
        aargang: trainer.aargang || "",
        rolle: trainer.rolle || "",
        kontaktperson: trainer.kontaktperson || "",
        checklist: checklist,
        checklistDateInputs
      });
    }
  }, [trainer]);

  const handleDownload = () => {
    const wb = XLSX.utils.book_new();
    
    const excelData: any[][] = [
      ["Navn/email/telefon/fødselsdato", "Årgang/rolle", "Kontaktperson"],
      [
        `${editableData.navn}\n${editableData.email}\n${editableData.telefon}\n${editableData.foedselsdato}`,
        `${editableData.aargang}\n${editableData.rolle}`,
        editableData.kontaktperson
      ],
      ["", "", ""],
      ["Opgave", "Status", "Noter"]
    ];
    
    CHECKLIST_ITEMS.forEach(item => {
      const checklistItem = editableData.checklist[item.id];
      let status = "";
      
      if (checklistItem) {
        if (checklistItem.status === true && checklistItem.date) {
          status = `Ja - ${format(new Date(checklistItem.date), "dd/MM/yyyy")}`;
        } else if (checklistItem.status === false) {
          status = "Nej";
        }
      }
      
      excelData.push([item.label, status, item.note]);
    });
    
    const ws = XLSX.utils.aoa_to_sheet(excelData);
    
    ws['!cols'] = [
      { wch: 45 },
      { wch: 20 },
      { wch: 80 }
    ];
    
    ws['!rows'] = [
      { hpt: 20 },
      { hpt: 60 },
    ];
    
    XLSX.utils.book_append_sheet(wb, ws, "Træner Data");
    
    const fileName = `${editableData.navn.replace(/\s+/g, '_')}_traener_data.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const updateChecklistStatus = (itemId: string, status: boolean) => {
    setEditableData((prev: any) => {
      const newChecklist = {
        ...prev.checklist,
        [itemId]: {
          status,
          date: status ? (prev.checklist[itemId]?.date || new Date()) : null
        }
      };
      
      const newDateInputs = { ...prev.checklistDateInputs };
      if (status && !newDateInputs[itemId]) {
        newDateInputs[itemId] = format(new Date(), "dd/MM/yyyy");
      } else if (!status) {
        delete newDateInputs[itemId];
      }
      
      return {
        ...prev,
        checklist: newChecklist,
        checklistDateInputs: newDateInputs
      };
    });
  };

  const updateChecklistDateInput = (itemId: string, dateString: string) => {
    // Allow free typing - just update the input string
    setEditableData((prev: any) => ({
      ...prev,
      checklistDateInputs: {
        ...prev.checklistDateInputs,
        [itemId]: dateString
      }
    }));
  };

  const validateAndSaveDate = (itemId: string) => {
    const dateString = editableData.checklistDateInputs[itemId];
    if (!dateString) return;
    
    // Parse DD/MM/YYYY format
    const parts = dateString.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1;
      const year = parseInt(parts[2]);
      const date = new Date(year, month, day);
      
      // Validate the date
      if (!isNaN(date.getTime()) && 
          date.getDate() === day && 
          date.getMonth() === month &&
          year >= 1900 && year <= 2100) {
        setEditableData((prev: any) => ({
          ...prev,
          checklist: {
            ...prev.checklist,
            [itemId]: {
              ...prev.checklist[itemId],
              date
            }
          },
          checklistDateInputs: {
            ...prev.checklistDateInputs,
            [itemId]: format(date, "dd/MM/yyyy") // Format to standard
          }
        }));
      } else {
        // Invalid date - reset to previous valid date or current date
        const validDate = editableData.checklist[itemId]?.date || new Date();
        setEditableData((prev: any) => ({
          ...prev,
          checklistDateInputs: {
            ...prev.checklistDateInputs,
            [itemId]: format(validDate, "dd/MM/yyyy")
          }
        }));
      }
    }
  };

  const handleUploadToDrive = async () => {
    try {
      toast.loading("Uploader til Cloud...");
      
      // Generate the Excel file as a blob
      const wb = XLSX.utils.book_new();
      
      const excelData: any[][] = [
        ["Navn/email/telefon/fødselsdato", "Årgang/rolle", "Kontaktperson"],
        [
          `${editableData.navn}\n${editableData.email}\n${editableData.telefon}\n${editableData.foedselsdato}`,
          `${editableData.aargang}\n${editableData.rolle}`,
          editableData.kontaktperson
        ],
        ["", "", ""],
        ["Opgave", "Status", "Noter"]
      ];
      
      CHECKLIST_ITEMS.forEach(item => {
        const checklistItem = editableData.checklist[item.id];
        let status = "";
        
        if (checklistItem) {
          if (checklistItem.status === true && checklistItem.date) {
            status = `Ja - ${format(new Date(checklistItem.date), "dd/MM/yyyy")}`;
          } else if (checklistItem.status === false) {
            status = "Nej";
          }
        }
        
        excelData.push([item.label, status, item.note]);
      });
      
      const ws = XLSX.utils.aoa_to_sheet(excelData);
      ws['!cols'] = [{ wch: 45 }, { wch: 20 }, { wch: 80 }];
      ws['!rows'] = [{ hpt: 20 }, { hpt: 60 }];
      
      XLSX.utils.book_append_sheet(wb, ws, "Træner Data");
      
      // Convert to base64
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
      const fileName = `${editableData.navn.replace(/\s+/g, '_')}_traener_data.xlsx`;
      
      // Call edge function without auth (edge function will handle auth internally)
      const { data, error } = await supabase.functions.invoke('upload-to-cloudinary', {
        body: {
          fileData: `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${wbout}`,
          fileName: fileName,
          trainerName: editableData.navn
        }
      });

      toast.dismiss();

      if (error) {
        console.error('Upload error:', error);
        toast.error("Upload fejlede", {
          description: error.message
        });
        return;
      }

      if (data?.success) {
        toast.success("Uploadet til Cloud!", {
          description: `Filen er tilgængelig: ${fileName}`
        });
      }
    } catch (error) {
      toast.dismiss();
      console.error('Error uploading:', error);
      toast.error("Upload fejlede", {
        description: error instanceof Error ? error.message : "Ukendt fejl"
      });
    }
  };

  const handleSave = () => {
    const updatedTrainer = {
      ...trainer,
      navn: editableData.navn,
      email: editableData.email,
      telefon: editableData.telefon,
      foedselsdato: editableData.foedselsdato,
      aargang: editableData.aargang,
      rolle: editableData.rolle,
      kontaktperson: editableData.kontaktperson,
      excelData: {
        data: {
          navn: editableData.navn,
          email: editableData.email,
          telefon: editableData.telefon,
          foedselsdato: editableData.foedselsdato,
          aargang: editableData.aargang,
          rolle: editableData.rolle,
          kontaktperson: editableData.kontaktperson
        },
        checklist: editableData.checklist
      }
    };
    onSave(updatedTrainer);
    onOpenChange(false);
  };

  return (
    <>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Rediger Træner Data</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          {/* Trainer Info Section */}
          <div className="border rounded-lg p-6 bg-muted/30">
            <h3 className="font-semibold mb-4 text-lg">Træner Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Navn</label>
                <Input
                  value={editableData.navn}
                  onChange={(e) => setEditableData({ ...editableData, navn: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input
                  value={editableData.email}
                  onChange={(e) => setEditableData({ ...editableData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Telefon</label>
                <Input
                  value={editableData.telefon}
                  onChange={(e) => setEditableData({ ...editableData, telefon: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Fødselsdato</label>
                <Input
                  value={editableData.foedselsdato}
                  onChange={(e) => setEditableData({ ...editableData, foedselsdato: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Årgang</label>
                <Input
                  value={editableData.aargang}
                  onChange={(e) => setEditableData({ ...editableData, aargang: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Rolle</label>
                <Input
                  value={editableData.rolle}
                  onChange={(e) => setEditableData({ ...editableData, rolle: e.target.value })}
                />
              </div>
              <div className="space-y-2 md:col-span-3">
                <label className="text-sm font-medium">Kontaktperson</label>
                <Input
                  value={editableData.kontaktperson}
                  onChange={(e) => setEditableData({ ...editableData, kontaktperson: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Checklist Section */}
          <div className="border rounded-lg p-6 bg-muted/30">
            <h3 className="font-semibold mb-4 text-lg">Tjekliste</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-[2fr,1fr,3fr] gap-4 font-semibold text-sm border-b pb-2">
                <div>Opgave</div>
                <div>Status / Dato</div>
                <div>Noter</div>
              </div>
              {CHECKLIST_ITEMS.map((item) => {
                const checklistItem = editableData.checklist[item.id];
                const isChecked = checklistItem?.status === true;
                const dateInputValue = editableData.checklistDateInputs[item.id] || "";

                return (
                  <div key={item.id} className="grid grid-cols-[2fr,1fr,3fr] gap-4 items-start border-b pb-4">
                    <div className="text-sm">{item.label}</div>
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-4">
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="radio"
                            name={item.id}
                            checked={checklistItem?.status === true}
                            onChange={() => updateChecklistStatus(item.id, true)}
                            className="h-4 w-4"
                          />
                          <span className="text-sm">Ja</span>
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="radio"
                            name={item.id}
                            checked={checklistItem?.status === false}
                            onChange={() => updateChecklistStatus(item.id, false)}
                            className="h-4 w-4"
                          />
                          <span className="text-sm">Nej</span>
                        </label>
                      </div>
                      {isChecked && (
                        <Input
                          placeholder="DD/MM/ÅÅÅÅ"
                          value={dateInputValue}
                          onChange={(e) => updateChecklistDateInput(item.id, e.target.value)}
                          onBlur={() => validateAndSaveDate(item.id)}
                          className="h-8 text-xs"
                        />
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">{item.note}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Action Buttons at Bottom */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button onClick={handleDownload} size="default" variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Download Excel
          </Button>
          <Button onClick={handleUploadToDrive} size="default" variant="outline" className="gap-2">
            <Upload className="h-4 w-4" />
            Upload til Cloud
          </Button>
          <Button onClick={handleSave} size="default" variant="outline" className="gap-2">
            Gem ændringer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
};

export default TrainerSpreadsheet;
