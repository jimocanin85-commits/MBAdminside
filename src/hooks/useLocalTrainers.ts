import { useCallback, useEffect, useState } from "react";

/**
 * Volunteers created in THIS browser.
 *
 * The form uploads a spreadsheet per volunteer to the shared file storage
 * (see the "Filer" page); this list is only the local shortcut to the ones
 * made on this device, exactly as before the redesign. It lives in
 * localStorage under "trainers".
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExcelData = any;

export interface LocalTrainer {
  navn: string;
  email: string;
  telefon: string;
  foedselsdato: Date;
  aargang: string;
  rolle: string;
  kontaktperson: string;
  createdAt: Date;
  excelData?: ExcelData;
}

const STORAGE_KEY = "trainers";

const toDate = (value: unknown): Date => {
  const date = value ? new Date(value as string) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
};

const readStored = (): LocalTrainer[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.map((trainer) => ({
      ...trainer,
      foedselsdato: toDate(trainer.foedselsdato),
      createdAt: toDate(trainer.createdAt),
    }));
  } catch {
    return [];
  }
};

const sameTrainer = (a: LocalTrainer, b: LocalTrainer) =>
  new Date(a.createdAt).getTime() === new Date(b.createdAt).getTime();

export const useLocalTrainers = () => {
  const [trainers, setTrainers] = useState<LocalTrainer[]>(readStored);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trainers));
    } catch {
      // Storage full or unavailable - the list still works for this visit.
    }
  }, [trainers]);

  const addTrainer = useCallback((data: Omit<LocalTrainer, "createdAt">) => {
    const trainer: LocalTrainer = { ...data, createdAt: new Date() };
    setTrainers((current) => [...current, trainer]);
    return trainer;
  }, []);

  const updateTrainer = useCallback((updated: LocalTrainer) => {
    setTrainers((current) => current.map((trainer) => (sameTrainer(trainer, updated) ? updated : trainer)));
  }, []);

  const removeTrainer = useCallback((target: LocalTrainer) => {
    setTrainers((current) => current.filter((trainer) => !sameTrainer(trainer, target)));
  }, []);

  /** Re-read from storage (another component may have changed it). */
  const reload = useCallback(() => setTrainers(readStored()), []);

  return { trainers, addTrainer, updateTrainer, removeTrainer, reload };
};
