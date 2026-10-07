import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, requireAuth, requirePermission } from './_lib/auth.js';
import { isStorageConfigured, listFiles, missingStorageSettings, storageErrorBody } from './_lib/backblaze.js';
import { VOLUNTEER_FOLDER } from './_lib/files.js';

/**
 * GET /api/list-backblaze-files
 * The volunteers' spreadsheets: the current version of every .xlsx file in
 * "Frivillige/".
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const session = await requireAuth(req, res);
  if (!session) return;
  // Volunteers' spreadsheets hold names, phone numbers and birth dates.
  if (!(await requirePermission(res, session, 'frivillig'))) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!isStorageConfigured()) {
    // Answered as an empty list so the page still opens, but flagged so the
    // page can say why it is empty.
    return res.status(200).json({
      success: true,
      configured: false,
      files: [],
      error: 'Backblaze credentials not configured',
      message: `Fillageret er ikke sat op. Mangler i Vercel: ${missingStorageSettings().join(', ')}`
    });
  }

  try {
    const prefix = `${VOLUNTEER_FOLDER}/`;
    const files = (await listFiles(prefix))
      .map((file) => ({ ...file, displayName: file.fileName.slice(prefix.length) }))
      // Only spreadsheets directly in the folder; no hidden or system files.
      .filter((file) => !file.displayName.includes('/') && !file.displayName.startsWith('.') && file.displayName.endsWith('.xlsx'))
      .map((file) => ({
        fileName: file.displayName,
        fullPath: file.fileName,
        fileId: file.fileId,
        size: file.size,
        uploadTimestamp: file.uploadTimestamp
      }));

    return res.status(200).json({ success: true, configured: true, files });
  } catch (error) {
    const { status, body } = storageErrorBody(error);
    return res.status(status).json(body);
  }
}
