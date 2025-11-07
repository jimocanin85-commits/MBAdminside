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
  DialogDescription,
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
  "Kampklarassistent",
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

  const handleSubmit = (data: TrainerFormData) => {
    onSubmit(data);
    form.reset();
    onOpenChange(false);
    toast.success("Træner oprettet succesfuldt!");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Opret ny træner</DialogTitle>
          <DialogDescription>
            Udfyld alle felter for at oprette en ny træner
          </DialogDescription>
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
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fødselsdato</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "dd/MM/yyyy")
                            ) : (
                              <span>Vælg dato</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1940-01-01")
                          }
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
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
                          <SelectValue placeholder="Vælg hold/årgang" />
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
                          <SelectValue placeholder="Vælg rolle" />
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
                    <FormLabel>Kontaktperson</FormLabel>
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
              <Button type="submit">Opret træner</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default TrainerForm;
