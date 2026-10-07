/**
 * Rules for the files kept in Backblaze, shared by the upload, download,
 * list and delete routes.
 *
 * The bucket has two areas, and each belongs to one section of the portal:
 *
 *   Frivillige/<name>.xlsx          one spreadsheet per volunteer  -> "frivillig"
 *   Referater/<year>/<file>         board-meeting minutes          -> "referater"
 *
 * Anything else in the bucket is off limits to everyone but the admin
 * accounts.
 */
import type { Permission, VerifiedSession } from './auth.js';
import { getPermissions } from './auth.js';

export const VOLUNTEER_FOLDER = 'Frivillige';
const REFERATER_FOLDER = /^Referater\/\d{4}$/;

// Vercel rejects request bodies over 4.5 MB before they reach this code, so
// this mostly documents the real limit rather than enforcing a new one.
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** Which section a stored file belongs to, from its full name in the bucket. */
export function sectionForFile(fullName: string): Permission | null {
  if (fullName.startsWith(`${VOLUNTEER_FOLDER}/`)) return 'frivillig';
  if (fullName.startsWith('Referater/')) return 'referater';
  return null;
}

/** May this session read or change the file with this full name? */
export async function canAccessFile(session: VerifiedSession, fullName: string): Promise<boolean> {
  if (session.isAdmin) return true;
  const section = sectionForFile(fullName);
  if (!section) return false;
  return (await getPermissions(session)).includes(section);
}

export type UploadTarget =
  | { ok: true; folder: string; section: Permission }
  | { ok: false; message: string };

/**
 * Decide where an upload may go. The folder used to be taken from the
 * request as-is, so any logged-in user could write anywhere in the bucket.
 */
export function resolveUploadTarget(folder: unknown, fileName: unknown): UploadTarget {
  if (typeof fileName !== 'string' || fileName.length === 0 || fileName.length > 200) {
    return { ok: false, message: 'Filnavnet mangler eller er for langt.' };
  }
  // A file name, not a path: no folders, no "..", no hidden files, no control characters.
  // eslint-disable-next-line no-control-regex
  if (/[/\\]/.test(fileName) || fileName.startsWith('.') || /[\u0000-\u001f]/.test(fileName)) {
    return { ok: false, message: 'Filnavnet indeholder tegn, der ikke er tilladt.' };
  }

  if (folder === undefined || folder === null || folder === '' || folder === VOLUNTEER_FOLDER) {
    if (!fileName.toLowerCase().endsWith('.xlsx')) {
      return { ok: false, message: 'Frivilliges filer skal være .xlsx-regneark.' };
    }
    return { ok: true, folder: VOLUNTEER_FOLDER, section: 'frivillig' };
  }

  if (typeof folder === 'string' && REFERATER_FOLDER.test(folder)) {
    return { ok: true, folder, section: 'referater' };
  }

  return { ok: false, message: 'Ukendt mappe.' };
}

/** Backblaze file ids are opaque tokens; reject anything that is not one. */
export function isValidFileId(fileId: unknown): fileId is string {
  return typeof fileId === 'string' && /^[A-Za-z0-9_\-:.]{10,200}$/.test(fileId);
}

/**
 * Look up a stored file's real full name from its id. The browser only
 * knows the display name, so the server must not trust a name sent by it.
 */
export async function getStoredFileName(
  apiUrl: string,
  authorizationToken: string,
  fileId: string
): Promise<string | null> {
  const response = await fetch(`${apiUrl}/b2api/v2/b2_get_file_info`, {
    method: 'POST',
    headers: { 'Authorization': authorizationToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileId }),
  });
  if (!response.ok) return null;
  const info = await response.json();
  return typeof info.fileName === 'string' ? info.fileName : null;
}
