import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, requireAuth, requirePermission } from './_lib/auth.js';
import { isStorageConfigured, listFiles, missingStorageSettings, storageErrorBody } from './_lib/backblaze.js';

// Some older files were stored with percent-encoded names; show those
// readably, and leave any other name (for example "Budget 50%.pdf") alone.
const readableName = (name: string) => {
  try {
    return decodeURIComponent(name);
  } catch {
    return name;
  }
};

/**
 * POST /api/list-referater-files  { year: "2026" }
 * Board-meeting minutes for one year: the current version of every file in
 * "Referater/<year>/".
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const session = await requireAuth(req, res);
  if (!session) return;
  if (!(await requirePermission(res, session, 'referater'))) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const year = String((req.body && req.body.year) || '');
  if (!/^\d{4}$/.test(year)) {
    return res.status(400).json({ error: 'Year is required' });
  }

  if (!isStorageConfigured()) {
    return res.status(200).json({
      success: true,
      configured: false,
      files: [],
      year,
      error: 'Backblaze credentials not configured',
      message: `Fillageret er ikke sat op. Mangler i Vercel: ${missingStorageSettings().join(', ')}`
    });
  }

  try {
    const prefix = `Referater/${year}/`;
    const files = (await listFiles(prefix))
      .map((file) => ({ ...file, displayName: file.fileName.slice(prefix.length) }))
      .filter((file) => file.displayName.length > 0 && !file.displayName.includes('/') && !file.displayName.startsWith('.'))
      .map((file) => ({
        fileName: readableName(file.displayName),
        fullPath: file.fileName,
        fileId: file.fileId,
        size: file.size,
        uploadTimestamp: file.uploadTimestamp
      }))
      .sort((a, b) => a.fileName.localeCompare(b.fileName));

    return res.status(200).json({ success: true, configured: true, files, year });
  } catch (error) {
    const { status, body } = storageErrorBody(error);
    return res.status(status).json(body);
  }
}
