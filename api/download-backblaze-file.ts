import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, requireAuth } from './_lib/auth.js';
import { openDownload, storageErrorBody } from './_lib/backblaze.js';
import { MAX_DOWNLOAD_BYTES, canAccessFile, isValidFileId } from './_lib/files.js';

/**
 * POST /api/download-backblaze-file  { fileId, fileName? }
 * Returns the file as base64. `fileName` is only echoed back for display.
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
  if (!isValidFileId(fileId)) {
    return res.status(400).json({ error: 'fileId is required' });
  }

  try {
    const download = await openDownload(fileId);

    // Backblaze tells us which file this id really is. Only hand it over if
    // the caller has access to the section that folder belongs to - before
    // this check, any logged-in user could fetch any file by its id.
    if (!download.fileName || !(await canAccessFile(session, download.fileName))) {
      await download.discard();
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'Du har ikke adgang til denne fil.'
      });
    }

    const tooLarge = {
      success: false,
      error: 'FILE_TOO_LARGE',
      message: 'Filen er for stor til at blive hentet gennem portalen.'
    };
    if (download.size !== null && download.size > MAX_DOWNLOAD_BYTES) {
      await download.discard();
      return res.status(413).json(tooLarge);
    }

    const content = await download.read();
    if (content.length > MAX_DOWNLOAD_BYTES) {
      return res.status(413).json(tooLarge);
    }
    return res.status(200).json({
      success: true,
      data: content.toString('base64'),
      fileName: typeof fileName === 'string' && fileName ? fileName : download.fileName.split('/').pop()
    });
  } catch (error) {
    const { status, body } = storageErrorBody(error);
    return res.status(status).json(body);
  }
}
