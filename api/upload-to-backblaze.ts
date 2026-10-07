import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, requireAuth, requirePermission } from './_lib/auth.js';
import { deleteFile, storageErrorBody, uploadFile } from './_lib/backblaze.js';
import { MAX_UPLOAD_BYTES, VOLUNTEER_FOLDER, resolveUploadTarget } from './_lib/files.js';

/**
 * POST /api/upload-to-backblaze  { fileName, fileData, folder? }
 *
 * Stores one file. `fileData` is base64, optionally as a data URL
 * ("data:<type>;base64,<content>"). Without `folder` the file goes to the
 * volunteers' folder; minutes use "Referater/<year>".
 *
 * Size: Vercel refuses requests over 4.5 MB before they reach this code,
 * which leaves room for a file of roughly 3 MB once it is base64-encoded.
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

  // Large JSON bodies sometimes arrive unparsed.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ success: false, error: 'Invalid JSON body' });
    }
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({ success: false, error: 'Invalid request body format' });
  }

  const { fileName, fileData, folder } = body;
  if (!fileName || !fileData) {
    return res.status(400).json({
      success: false,
      error: 'fileName and fileData are required',
      received: { hasFileName: !!fileName, hasFileData: !!fileData }
    });
  }

  // Only the two known areas of the bucket may be written to, and only by
  // users with access to the section that area belongs to. The folder used
  // to be taken from the request unchecked.
  const target = resolveUploadTarget(folder, fileName);
  if (target.ok === false) {
    return res.status(400).json({ success: false, error: target.message });
  }
  if (!(await requirePermission(res, session, target.section))) return;

  // Take the content (and its type) out of the data URL.
  if (typeof fileData !== 'string') {
    return res.status(400).json({ success: false, error: 'Invalid fileData format' });
  }
  let base64 = fileData;
  let contentType = 'application/octet-stream';
  if (fileData.startsWith('data:')) {
    const typeMatch = fileData.match(/^data:([^;,]+)[;,]/);
    if (typeMatch) contentType = typeMatch[1];
    const marker = fileData.indexOf('base64,');
    if (marker === -1) {
      return res.status(400).json({ success: false, error: 'Invalid fileData format' });
    }
    base64 = fileData.substring(marker + 7);
  }

  const content = Buffer.from(base64, 'base64');
  if (content.length === 0) {
    return res.status(400).json({ success: false, error: 'Empty file buffer after base64 decode' });
  }
  if (content.length > MAX_UPLOAD_BYTES) {
    return res.status(413).json({ success: false, error: 'Filen er for stor.' });
  }

  try {
    // Long ago volunteer files were stored at the top of the bucket. If one
    // with this name is still there, remove it so it cannot be confused
    // with the one in the folder. Never allowed to stop the upload.
    if (target.folder === VOLUNTEER_FOLDER) {
      try {
        await deleteFile(fileName);
      } catch (cleanupError) {
        console.warn('Could not check for an old copy at the top of the bucket:', cleanupError);
      }
    }

    const stored = await uploadFile(`${target.folder}/${fileName}`, content, contentType);

    return res.status(200).json({
      success: true,
      fileId: stored.fileId,
      fileName: stored.fileName,
      size: stored.size
    });
  } catch (error) {
    const { status, body: errorBody } = storageErrorBody(error);
    return res.status(status).json(errorBody);
  }
}
