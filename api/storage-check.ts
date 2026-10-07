import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, requireAuth } from './_lib/auth.js';
import { requireAdminMode } from './_lib/adminMode.js';
import {
  StorageError,
  connect,
  deleteFile,
  listFiles,
  missingStorageSettings,
  openDownload,
  resetConnection,
  uploadFile
} from './_lib/backblaze.js';
import { VOLUNTEER_FOLDER } from './_lib/files.js';

/**
 * POST /api/storage-check   (admin mode)
 *
 * Proves, step by step, that files can be saved, fetched and removed in
 * Backblaze with the keys that are set right now. Run it after changing a
 * key or a setting - it uses exactly the code the rest of the app uses.
 *
 * It writes one small test file in its own folder ("Systemtjek/") and
 * removes it again. It never touches volunteers' files or minutes; it only
 * counts them.
 */

// Its own folder, so a test file can never be mistaken for real content.
const CHECK_FOLDER = 'Systemtjek';

// What the key must be allowed to do for the portal to work.
const REQUIRED_CAPABILITIES = ['listFiles', 'readFiles', 'writeFiles', 'deleteFiles'];

interface Step {
  id: string;
  label: string;
  ok: boolean;
  detail: string;
}

const explain = (error: unknown): string => {
  if (error instanceof StorageError) {
    return error.details ? `${error.message} (${error.details})` : error.message;
  }
  return error instanceof Error ? error.message : 'Ukendt fejl';
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const session = await requireAuth(req, res);
  if (!session) return;
  if (!requireAdminMode(req, res, session)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const steps: Step[] = [];
  const done = () => res.status(200).json({ success: steps.every((step) => step.ok), steps });

  // 1. Settings
  const missing = missingStorageSettings();
  steps.push({
    id: 'settings',
    label: 'Nøgler er sat i Vercel',
    ok: missing.length === 0,
    detail: missing.length === 0 ? 'Alle tre værdier er sat.' : `Mangler: ${missing.join(', ')}`
  });
  if (missing.length > 0) return done();

  // 2. Log in and find the bucket (from scratch, not a saved login)
  resetConnection();
  try {
    const connection = await connect(true);
    steps.push({
      id: 'connect',
      label: 'Backblaze accepterer nøglen',
      ok: true,
      detail: `Forbundet til fillageret "${connection.bucketName}".`
    });
  } catch (error) {
    steps.push({ id: 'connect', label: 'Backblaze accepterer nøglen', ok: false, detail: explain(error) });
    return done();
  }

  // 3. What the key may do. Backblaze only reports this for some keys.
  const { capabilities, namePrefix } = await connect();
  if (namePrefix) {
    // Such a key cannot reach both "Frivillige/" and "Referater/".
    steps.push({
      id: 'prefix',
      label: 'Nøglen når alle mapper',
      ok: false,
      detail: `Nøglen er begrænset til filnavne, der starter med "${namePrefix}". Opret en nøgle uden "File name prefix".`
    });
  }
  if (capabilities.length > 0) {
    const lacking = REQUIRED_CAPABILITIES.filter((capability) => !capabilities.includes(capability));
    steps.push({
      id: 'capabilities',
      label: 'Nøglen må læse, gemme og slette',
      ok: lacking.length === 0,
      detail: lacking.length === 0 ? 'Nøglen har de nødvendige rettigheder.' : `Nøglen mangler: ${lacking.join(', ')}`
    });
  }

  // 4-6. Save, fetch and remove a test file
  const testName = `${CHECK_FOLDER}/tjek-${Date.now()}.txt`;
  const testContent = Buffer.from(`Måløv Boldklub - tjek af fillager ${new Date().toISOString()}`, 'utf8');
  let saved = false;

  try {
    const stored = await uploadFile(testName, testContent, 'text/plain');
    saved = true;
    steps.push({ id: 'save', label: 'En testfil kan gemmes', ok: true, detail: 'Gemt med kontrolsum.' });

    try {
      const download = await openDownload(stored.fileId);
      const content = await download.read();
      const same = download.fileName === testName && content.equals(testContent);
      steps.push({
        id: 'fetch',
        label: 'Testfilen kan hentes igen',
        ok: same,
        detail: same ? 'Indholdet er præcis det, der blev gemt.' : 'Filen kom tilbage med andet indhold eller navn.'
      });
    } catch (error) {
      steps.push({ id: 'fetch', label: 'Testfilen kan hentes igen', ok: false, detail: explain(error) });
    }
  } catch (error) {
    steps.push({ id: 'save', label: 'En testfil kan gemmes', ok: false, detail: explain(error) });
  }

  if (saved) {
    try {
      const removed = await deleteFile(testName);
      steps.push({
        id: 'remove',
        label: 'Testfilen kan slettes',
        ok: removed > 0,
        detail: removed > 0 ? 'Testfilen er fjernet igen.' : 'Testfilen blev ikke fundet, da den skulle slettes.'
      });
    } catch (error) {
      steps.push({
        id: 'remove',
        label: 'Testfilen kan slettes',
        ok: false,
        detail: `${explain(error)} Slet selv "${testName}" i Backblaze.`
      });
    }
  }

  // 7. The real content is where the app expects it (counted, not changed)
  try {
    const volunteers = (await listFiles(`${VOLUNTEER_FOLDER}/`)).filter((file) => file.fileName.endsWith('.xlsx'));
    const minutes = await listFiles('Referater/');
    steps.push({
      id: 'content',
      label: 'Eksisterende filer kan ses',
      ok: true,
      detail: `${volunteers.length} frivillig-filer og ${minutes.length} referater fundet.`
    });
  } catch (error) {
    steps.push({ id: 'content', label: 'Eksisterende filer kan ses', ok: false, detail: explain(error) });
  }

  return done();
}
