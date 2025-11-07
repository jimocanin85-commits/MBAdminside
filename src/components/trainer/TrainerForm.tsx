import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { CalendarIcon, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import * as XLSX from 'xlsx';

const AARGANG_OPTIONS = [
  "2008 Drenge",
  "2010 Drenge",
  "2011 Drenge",
  "2013 Drenge",
  "2013-14 Piger",
  "2014 Drenge",
  "2015 Drenge",
  "2015-16 Piger",
  "2016 Drenge",
  "2017 Drenge",
  "2017 Piger",
  "2018 Drenge",
  "2019 Drenge",
  "2020-21 Mix",
  "65+",
  "Fodbold Fitness",
  "GSVET",
  "HS1 - Senior",
  "HS 2-3 - Senior",
  "Kvinde - Senior",
  "Motionsfodbold M/K",
  "OldBoys 5-mands +32",
  "Veteran - M+45",
];

const ROLLE_OPTIONS = [
  "Assistenttræner",
  "Holdleder",
  "Træner",
];

const trainerFormSchema = z.object({
  navn: z.string().min(2, { message: "Navn skal være mindst 2 tegn" }),
  email: z.string().email({ message: "Ugyldig email adresse" }),
  telefon: z.string().min(8, { message: "Telefonnummer skal være mindst 8 cifre" }),
  foedselsdato: z.date({ required_error: "Fødselsdato er påkrævet" }),
  aargang: z.string().min(1, { message: "Hold/Årgang er påkrævet" }),
  rolle: z.string().min(1, { message: "Rolle er påkrævet" }),
  kontaktperson: z.string().min(2, { message: "Kontaktperson er påkrævet" }),
});

type TrainerFormData = z.infer<typeof trainerFormSchema>;

interface TrainerFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: TrainerFormData) => void;
}

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

const TrainerForm = ({ open, onOpenChange, onSubmit }: TrainerFormProps) => {
  const [confirmed, setConfirmed] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showInfoDialog, setShowInfoDialog] = useState(false);
  const [showYesDialog, setShowYesDialog] = useState(false);
  const [showChecklistDialog, setShowChecklistDialog] = useState(false);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});

  const form = useForm<TrainerFormData>({
    resolver: zodResolver(trainerFormSchema),
    defaultValues: {
      navn: "",
      email: "",
      telefon: "",
      aargang: "",
      rolle: "",
      kontaktperson: "",
    },
  });

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setConfirmed(false);
      setSelectedOption(null);
      setShowYesDialog(false);
    }
    onOpenChange(newOpen);
  };

  const handleSubmit = (data: TrainerFormData) => {
    // Create Excel workbook
    const wb = XLSX.utils.book_new();
    
    // Prepare trainer information section
    const trainerInfo = [
      ["TRÆNER INFORMATION", ""],
      ["Navn", data.navn],
      ["Email", data.email],
      ["Telefon", data.telefon],
      ["Fødselsdato", format(data.foedselsdato, "dd/MM/yyyy")],
      ["Hold/Årgang", data.aargang],
      ["Rolle", data.rolle],
      ["Kontaktperson", data.kontaktperson],
      [""],
      ["TJEKLISTE", "STATUS"],
    ];
    
    // Add checklist items with status and notes
    CHECKLIST_ITEMS.forEach(item => {
      const status = checklist[item.id] ? "Ja" : "Nej";
      trainerInfo.push([item.label, status]);
      trainerInfo.push([item.note, ""]);
    });
    
    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(trainerInfo);
    
    // Set column widths
    ws['!cols'] = [
      { wch: 60 },  // Column A (labels/descriptions)
      { wch: 25 }   // Column B (values/status)
    ];
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, "Træner Data");
    
    // Generate Excel file and trigger download
    const fileName = `traener_${data.navn.replace(/\s+/g, '_')}_${format(new Date(), 'dd-MM-yyyy')}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    onSubmit(data);
    form.reset();
    setChecklist({});
    onOpenChange(false);
    toast.success("Træner oprettet og Excel fil downloadet!");
  };

  return (
    <>
      <Dialog open={showChecklistDialog} onOpenChange={setShowChecklistDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tjekliste</DialogTitle>
            <DialogDescription>
              Marker de opgaver, der er blevet gennemført
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {CHECKLIST_ITEMS.map((item) => (
              <div key={item.id} className="space-y-2">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id={item.id}
                    checked={checklist[item.id] || false}
                    onChange={(e) => {
                      setChecklist(prev => ({
                        ...prev,
                        [item.id]: e.target.checked
                      }));
                    }}
                    className="mt-1 h-4 w-4 rounded border-primary text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2 cursor-pointer"
                  />
                  <div className="flex-1">
                    <label
                      htmlFor={item.id}
                      className="text-sm font-medium leading-none cursor-pointer"
                    >
                      {item.label}
                    </label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {item.note}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowChecklistDialog(false)}
            >
              Luk
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showYesDialog} onOpenChange={setShowYesDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogDescription className="space-y-4 text-left pt-4">
              <div className="space-y-2">
                <p>Tjek i KlubOffice:</p>
                <a
                  href="https://kluboffice.dbu.dk/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline hover:no-underline font-medium"
                >
                  https://kluboffice.dbu.dk/
                </a>
              </div>

              <p>
                Godkend den nye frivillige (klik på den orange boks øverst til højre: "Anmodninger om holderhverv").
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button onClick={() => {
              setShowYesDialog(false);
              setConfirmed(true);
            }}>
              Fortsæt
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showInfoDialog} onOpenChange={setShowInfoDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogDescription className="space-y-4 text-left pt-4">
              <div className="space-y-2">
                <p>Tjek, om den frivillige er kommet ind i KlubOffice:</p>
                <a
                  href="https://kluboffice.dbu.dk/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline hover:no-underline font-medium"
                >
                  https://kluboffice.dbu.dk/
                </a>
              </div>

              <p>
                Klik på den orange boks oppe i højre hjørne med teksten "Anmodninger om holderhverv".
              </p>

              <div className="space-y-2">
                <p className="font-medium">Hvis personen ikke står der, kan det skyldes:</p>
                <ul className="list-disc list-inside space-y-1 pl-2">
                  <li>Forkert e-mailadresse.</li>
                  <li>Mailen fra systemet er havnet i spam.</li>
                  <li>Bed holdlederen om at gensende invitationen.</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button onClick={() => setShowInfoDialog(false)}>
              Forstået
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Opret ny træner</DialogTitle>
        </DialogHeader>

        {!confirmed ? (
          <div className="space-y-6">
            <div className="space-y-4">
              <p className="text-sm">
                Holdleder skal invitere ny holdkontakt til holdet. Henvis holdleder til siden{" "}
                <a 
                  href="https://www.mb-boldklub.dk/traener-info/ny-frivillig/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary underline hover:no-underline"
                >
                  https://www.mb-boldklub.dk/traener-info/ny-frivillig/
                </a>
              </p>

              <div className="space-y-2">
                <p className="font-medium">Er dette blevet gjort?</p>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="confirmation"
                      value="yes"
                      checked={selectedOption === "yes"}
                      onChange={(e) => setSelectedOption(e.target.value)}
                      className="w-4 h-4"
                    />
                    <span>Ja</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="confirmation"
                      value="no"
                      checked={selectedOption === "no"}
                      onChange={(e) => setSelectedOption(e.target.value)}
                      className="w-4 h-4"
                    />
                    <span>Nej</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                Annuller
              </Button>
              <Button
                type="button"
                onClick={() => {
                  if (selectedOption === "yes") {
                    setShowYesDialog(true);
                  } else if (selectedOption === "no") {
                    setShowInfoDialog(true);
                  }
                }}
                disabled={!selectedOption}
              >
                Fortsæt
              </Button>
            </div>
          </div>
        ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="navn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Navn</FormLabel>
                    <FormControl>
                      <Input placeholder="Indtast navn" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="navn@eksempel.dk" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="telefon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefon</FormLabel>
                    <FormControl>
                      <Input placeholder="12345678" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="foedselsdato"
                render={({ field }) => {
                  const [inputValue, setInputValue] = useState(
                    field.value ? format(field.value, "dd/MM/yyyy") : ""
                  );

                  return (
                    <FormItem className="flex flex-col">
                      <FormLabel>Fødselsdato</FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Input
                            placeholder="DD/MM/ÅÅÅÅ"
                            value={inputValue}
                            onChange={(e) => {
                              const value = e.target.value;
                              setInputValue(value);
                              
                              // Try to parse date without slashes (DDMMYYYY format)
                              const digitsOnly = value.replace(/\D/g, '');
                              if (digitsOnly.length === 8) {
                                const day = parseInt(digitsOnly.substring(0, 2));
                                const month = parseInt(digitsOnly.substring(2, 4)) - 1;
                                const year = parseInt(digitsOnly.substring(4, 8));
                                const date = new Date(year, month, day);
                                
                                if (!isNaN(date.getTime()) && 
                                    date.getDate() === day && 
                                    date.getMonth() === month &&
                                    date <= new Date() && 
                                    date >= new Date("1940-01-01")) {
                                  field.onChange(date);
                                  setInputValue(format(date, "dd/MM/yyyy"));
                                }
                              } else {
                                // Try to parse the date in DD/MM/YYYY format with slashes
                                const parts = value.split('/');
                                if (parts.length === 3 && parts[2].length === 4) {
                                  const day = parseInt(parts[0]);
                                  const month = parseInt(parts[1]) - 1;
                                  const year = parseInt(parts[2]);
                                  const date = new Date(year, month, day);
                                  
                                  if (!isNaN(date.getTime()) && 
                                      date.getDate() === day && 
                                      date.getMonth() === month &&
                                      date <= new Date() && 
                                      date >= new Date("1940-01-01")) {
                                    field.onChange(date);
                                  }
                                }
                              }
                            }}
                            className="pr-10"
                          />
                        </FormControl>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() => {
                                if (field.value) {
                                  setInputValue(format(field.value, "dd/MM/yyyy"));
                                }
                              }}
                            >
                              <CalendarIcon className="h-4 w-4 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              defaultMonth={field.value || new Date()}
                              onSelect={(date) => {
                                field.onChange(date);
                                if (date) {
                                  setInputValue(format(date, "dd/MM/yyyy"));
                                }
                              }}
                              disabled={(date) =>
                                date > new Date() || date < new Date("1940-01-01")
                              }
                              initialFocus
                              className={cn("p-3 pointer-events-auto")}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <FormField
                control={form.control}
                name="aargang"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hold/Årgang</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {AARGANG_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="rolle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rolle</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ROLLE_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="kontaktperson"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kontaktperson (Hvem har bedt om oprettelsen?)</FormLabel>
                    <FormControl>
                      <Input placeholder="Indtast kontaktperson" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowChecklistDialog(true)}
                className="w-full md:w-auto"
              >
                <CheckSquare className="mr-2 h-4 w-4" />
                Tjekliste
              </Button>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Annuller
              </Button>
              <Button type="submit">Opret træner</Button>
            </div>
          </form>
        </Form>
        )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TrainerForm;
