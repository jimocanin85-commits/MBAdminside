import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, requireAuth } from './_lib/auth.js';
import { requireAdminMode } from './_lib/adminMode.js';
import { deleteFile, fileNameById, storageErrorBody } from './_lib/backblaze.js';
import { canAccessFile, isValidFileId } from './_lib/files.js';

/**
 * POST /api/delete-backblaze-file  { fileId, fileName }
 * Removes a file for good, every stored version of it. Needs admin mode
 * and access to the section the file belongs to.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const session = await requireAuth(req, res);
  if (!session) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { fileName, fileId } = req.body || {};
  if (!fileName || !isValidFileId(fileId)) {
    return res.status(400).json({ error: 'fileName and fileId are required' });
  }

  try {
    // The browser only knows the short display name ("Navn.xlsx"), while
    // Backblaze needs the full stored name ("Frivillige/Navn.xlsx"). Look
    // the real name up from the id, and use it for the access check too.
    const storedName = await fileNameById(fileId);
    if (!storedName) {
      return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Filen findes ikke.' });
    }
    if (!(await canAccessFile(session, storedName))) {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'Du har ikke adgang til denne fil.'
      });
    }

    // Deleting a stored file is permanent, so it needs admin mode. The
    // confirmation code for this used to be checked only in the browser.
    if (!requireAdminMode(req, res, session)) return;

    // Every save adds a version. Removing only the newest one made the
    // previous version show up again, so remove them all.
    const removedVersions = await deleteFile(storedName);

    return res.status(200).json({
      success: true,
      message: 'File deleted successfully',
      fileId,
      fileName: storedName,
      removedVersions
    });
  } catch (error) {
    const { status, body } = storageErrorBody(error);
    return res.status(status).json(body);
  }
}
