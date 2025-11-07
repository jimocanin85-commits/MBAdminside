import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import * as XLSX from "xlsx";

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

const TrainerForm = ({ open, onOpenChange, onSubmit }: TrainerFormProps) => {
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
    onOpenChange(newOpen);
  };

  const handleSubmit = (data: TrainerFormData) => {
    // Create worksheet data
    const worksheetData = [
      ["Felt", "Værdi"],
      ["Navn", data.navn],
      ["Email", data.email],
      ["Telefon", data.telefon],
      ["Fødselsdato", data.foedselsdato ? format(data.foedselsdato, "dd/MM/yyyy") : ""],
      ["Hold/Årgang", data.aargang],
      ["Rolle", data.rolle],
      ["Kontaktperson", data.kontaktperson],
    ];

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    
    // Set column widths
    worksheet['!cols'] = [
      { wch: 35 },
      { wch: 30 }
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, "Træner Data");

    // Generate filename with current date and trainer name
    const fileName = `traener_${data.navn.replace(/\s+/g, '_')}_${format(new Date(), "dd-MM-yyyy")}.xlsx`;

    // Download the file
    XLSX.writeFile(workbook, fileName);
    
    onSubmit(data);
    form.reset();
    onOpenChange(false);
    toast.success("Træner oprettet og Excel fil downloadet!");
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Opret ny træner</DialogTitle>
        </DialogHeader>

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

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Annuller
              </Button>
              <Button type="submit">Tryk for færdiggøre oprettelsen</Button>
            </div>
          </form>
        </Form>
        </DialogContent>
      </Dialog>
  );
};

export default TrainerForm;
