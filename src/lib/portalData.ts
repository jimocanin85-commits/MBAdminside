/**
 * Read-only fetchers for the overview on the front page. The section pages
 * load (and change) their own data; these only read.
 */
import { functions } from "@/integrations/api/client";
import { apiFetch } from "@/lib/api";

export interface TaskSummary {
  id: string;
  title: string;
  assignedUsers: string[];
  completed: boolean;
  /** 0 = January. */
  month: number;
}

export interface StoredFile {
  fileName: string;
  fileId: string;
  size: number;
  uploadTimestamp: number;
}

export const MONTH_NAMES = [
  "Januar",
  "Februar",
  "Marts",
  "April",
  "Maj",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "December",
];

/** This year's tasks from the årshjul. */
export async function fetchTasks(): Promise<TaskSummary[]> {
  const response = await apiFetch("/tasks");
  const result = await response.json();
  if (!response.ok || !result.success) {
    throw new Error(result.error || "Kunne ikke hente opgaver");
  }
  return Array.isArray(result.data) ? result.data : [];
}

/** Board-meeting minutes for one year, newest first. */
export async function fetchReferater(year: string): Promise<StoredFile[]> {
  const { data, error } = await functions.invoke<{ files?: StoredFile[] }>("list-referater-files", {
    method: "POST",
    body: { year },
  });
  if (error) throw new Error(error.message || "Kunne ikke hente referater");
  const files = data && Array.isArray(data.files) ? data.files : [];
  return [...files].sort((a, b) => b.uploadTimestamp - a.uploadTimestamp);
}

/** Volunteer files (one spreadsheet per volunteer), newest first. */
export async function fetchVolunteerFiles(): Promise<StoredFile[]> {
  const { data, error } = await functions.invoke<{ success?: boolean; files?: StoredFile[] }>("list-backblaze-files");
  if (error) throw new Error(error.message || "Kunne ikke hente filer");
  const files = data && Array.isArray(data.files) ? data.files : [];
  return [...files].sort((a, b) => b.uploadTimestamp - a.uploadTimestamp);
}

/** "Fornavn_Efternavn.xlsx" -> "Fornavn Efternavn". */
export const displayNameFromFile = (fileName: string) => fileName.replace(/\.xlsx?$/i, "").replace(/_/g, " ");
