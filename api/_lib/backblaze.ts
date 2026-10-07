/**
 * Everything the API does with the Backblaze B2 file storage, in one place.
 *
 * The five file routes each used to carry their own copy of the Backblaze
 * calls. They now share this module, and so does the storage check
 * (api/storage-check.ts) - so when the check is green, the same code the
 * app uses for saving and fetching files has just been proven to work.
 *
 * Things this module gets right that the copies did not:
 *  - Works with an application key that is limited to one bucket (the
 *    recommended kind). Such a key may not list all buckets.
 *  - Uploads carry a SHA-1 checksum, so Backblaze refuses a file that was
 *    damaged on the way instead of storing it silently.
 *  - Lists follow Backblaze's paging, so files do not drop out of the list
 *    once the bucket grows.
 *  - Deleting a file removes every stored version of it. Each save adds a
 *    version, and deleting only the newest made the previous one reappear.
 */
import { createHash } from 'node:crypto';

const BACKBLAZE_HOST = 'https://api.backblazeb2.com';

// Backblaze's API comes in numbered versions. v4 is the current one and the
// only one that accepts every kind of application key (keys for several
// buckets need it). The portal was written for v2; that is kept as a second
// try in case a login with v4 is refused for a reason other than the key.
const API_VERSIONS = ['v4', 'v2'] as const;
type ApiVersion = (typeof API_VERSIONS)[number];

// Backblaze tokens last 24 hours; reuse one for a while instead of logging
// in again on every request.
const CONNECTION_TTL_MS = 30 * 60 * 1000;
const PAGE_SIZE = 1000;
const MAX_PAGES = 50;
// How long to wait for Backblaze before giving up with a clear error
// instead of leaving the user with a request that never answers.
const CALL_TIMEOUT_MS = 8000;
const TRANSFER_TIMEOUT_MS = 20000;

export type StorageErrorCode =
  | 'NOT_CONFIGURED'
  | 'KEY_REJECTED'
  | 'BUCKET_NOT_FOUND'
  | 'NOT_FOUND'
  | 'REQUEST_FAILED';

export class StorageError extends Error {
  code: StorageErrorCode;
  /** HTTP status to answer the browser with. */
  status: number;
  /** Backblaze's own explanation, for the server log and the storage check. */
  details?: string;

  constructor(code: StorageErrorCode, message: string, status = 502, details?: string) {
    super(message);
    this.name = 'StorageError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export interface StoredFile {
  fileId: string;
  /** Full name in the bucket, e.g. "Frivillige/Navn Navnesen.xlsx". */
  fileName: string;
  size: number;
  uploadTimestamp: number;
}

interface Connection {
  /** The API version the login succeeded with; used for every later call. */
  version: ApiVersion;
  apiUrl: string;
  downloadUrl: string;
  token: string;
  accountId: string;
  bucketId: string;
  bucketName: string;
  /** What the key is allowed to do, when Backblaze reports it. */
  capabilities: string[];
  /** Set when the key only reaches file names with this start. */
  namePrefix: string | null;
  createdAt: number;
}

let cached: Connection | null = null;

/** Names of the required settings that are missing (empty when all are set). */
export function missingStorageSettings(): string[] {
  const missing: string[] = [];
  if (!process.env.BACKBLAZE_KEY_ID) missing.push('BACKBLAZE_KEY_ID');
  if (!process.env.BACKBLAZE_APPLICATION_KEY) missing.push('BACKBLAZE_APPLICATION_KEY');
  if (!process.env.BACKBLAZE_BUCKET_NAME) missing.push('BACKBLAZE_BUCKET_NAME');
  return missing;
}

export function isStorageConfigured(): boolean {
  return missingStorageSettings().length === 0;
}

/**
 * fetch() towards Backblaze with a time limit. "No answer" and "no network"
 * become a StorageError the routes can explain, not an unexplained crash.
 */
async function request(url: string, init: RequestInit, timeoutMs = CALL_TIMEOUT_MS): Promise<Response> {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  } catch (error) {
    throw new StorageError(
      'REQUEST_FAILED',
      'Kunne ikke få forbindelse til Backblaze. Prøv igen om lidt.',
      502,
      error instanceof Error ? `${error.name}: ${error.message}` : undefined,
    );
  }
}

async function readText(response: Response): Promise<string> {
  try {
    return (await response.text()).slice(0, 500);
  } catch {
    return '';
  }
}

interface Login {
  version: ApiVersion;
  apiUrl: string;
  downloadUrl: string;
  token: string;
  accountId: string;
  /** The buckets the key is limited to (empty: every bucket on the account). */
  buckets: { id: string; name: string | null }[];
  capabilities: string[];
  namePrefix: string | null;
}

/**
 * Read Backblaze's answer to a login. v4 keeps the addresses and the key's
 * limits under apiInfo.storageApi and lists the allowed buckets; v2 has
 * them at the top with at most one bucket. Returns null if the answer has
 * neither shape.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function readLogin(version: ApiVersion, auth: any): Login | null {
  if (!auth || typeof auth !== 'object') return null;
  const storage = auth.apiInfo && auth.apiInfo.storageApi ? auth.apiInfo.storageApi : auth;
  const allowed = storage.allowed || auth.allowed || {};
  if (typeof storage.apiUrl !== 'string' || typeof storage.downloadUrl !== 'string' || typeof auth.authorizationToken !== 'string') {
    return null;
  }

  const buckets: { id: string; name: string | null }[] = [];
  if (Array.isArray(allowed.buckets)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    allowed.buckets.forEach((bucket: any) => {
      const id = bucket && (bucket.id || bucket.bucketId);
      if (typeof id === 'string' && id) buckets.push({ id, name: bucket.name ?? bucket.bucketName ?? null });
    });
  } else if (typeof allowed.bucketId === 'string' && allowed.bucketId) {
    buckets.push({ id: allowed.bucketId, name: allowed.bucketName ?? null });
  }

  return {
    version,
    apiUrl: storage.apiUrl,
    downloadUrl: storage.downloadUrl,
    token: auth.authorizationToken,
    accountId: auth.accountId,
    buckets,
    capabilities: Array.isArray(allowed.capabilities) ? allowed.capabilities : [],
    namePrefix: typeof allowed.namePrefix === 'string' && allowed.namePrefix ? allowed.namePrefix : null,
  };
}

/** Log in to Backblaze and find the bucket. Reuses a recent login unless `fresh`. */
export async function connect(fresh = false): Promise<Connection> {
  if (!fresh && cached && Date.now() - cached.createdAt < CONNECTION_TTL_MS) return cached;
  cached = null;

  const missing = missingStorageSettings();
  if (missing.length > 0) {
    throw new StorageError('NOT_CONFIGURED', `Mangler i Vercel: ${missing.join(', ')}`, 500);
  }

  const keyId = (process.env.BACKBLAZE_KEY_ID || '').trim();
  const applicationKey = (process.env.BACKBLAZE_APPLICATION_KEY || '').trim();
  const bucketName = (process.env.BACKBLAZE_BUCKET_NAME || '').trim();

  // Log in. A "no" to the key itself (401) is final; a refusal of v4 for any
  // other reason is followed by one try with v2.
  const basic = `Basic ${Buffer.from(`${keyId}:${applicationKey}`).toString('base64')}`;
  let login: Login | null = null;
  let refusal = '';
  for (const version of API_VERSIONS) {
    const authResponse = await request(`${BACKBLAZE_HOST}/b2api/${version}/b2_authorize_account`, {
      method: 'GET',
      headers: { Authorization: basic },
    });
    if (authResponse.ok) {
      login = readLogin(version, await authResponse.json());
      if (login) break;
      refusal = refusal || `Uventet svar fra Backblaze (${version}).`;
      continue;
    }
    const details = await readText(authResponse);
    if (authResponse.status === 401) {
      throw new StorageError(
        'KEY_REJECTED',
        'Backblaze afviste nøglen. Tjek BACKBLAZE_KEY_ID og BACKBLAZE_APPLICATION_KEY i Vercel.',
        502,
        details,
      );
    }
    if (authResponse.status === 403) {
      // Backblaze uses this when the account has hit a usage cap.
      throw new StorageError(
        'REQUEST_FAILED',
        'Backblaze afviste forespørgslen. Kontoen kan have nået et forbrugsloft - se "Caps & Alerts" hos Backblaze.',
        502,
        details,
      );
    }
    refusal = refusal || details || `HTTP ${authResponse.status}`;
  }
  if (!login) {
    throw new StorageError('REQUEST_FAILED', 'Backblaze kunne ikke logge portalen ind.', 502, refusal);
  }

  let bucketId: string | null = null;

  if (login.buckets.length > 0) {
    // The key is limited to certain buckets. Ours must be one of them.
    const match = login.buckets.find((bucket) => bucket.name === bucketName);
    if (!match) {
      const names = login.buckets.map((bucket) => bucket.name).filter(Boolean);
      throw new StorageError(
        'BUCKET_NOT_FOUND',
        names.length > 0
          ? `Nøglen gælder "${names.join('", "')}", men BACKBLAZE_BUCKET_NAME er "${bucketName}".`
          : `Nøglen gælder et fillager, der ikke findes længere. BACKBLAZE_BUCKET_NAME er "${bucketName}".`,
        502,
      );
    }
    bucketId = match.id;
  } else {
    const bucketsResponse = await request(`${login.apiUrl}/b2api/${login.version}/b2_list_buckets`, {
      method: 'POST',
      headers: { Authorization: login.token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId: login.accountId, bucketName }),
    });
    if (!bucketsResponse.ok) {
      throw new StorageError('REQUEST_FAILED', 'Kunne ikke slå fillageret op hos Backblaze.', 502, await readText(bucketsResponse));
    }
    const data = await bucketsResponse.json();
    const bucket = (data.buckets || []).find((b: { bucketName: string }) => b.bucketName === bucketName);
    bucketId = bucket ? bucket.bucketId : null;
  }

  if (!bucketId) {
    throw new StorageError('BUCKET_NOT_FOUND', `Fillageret "${bucketName}" findes ikke på denne Backblaze-konto.`, 502);
  }

  cached = {
    version: login.version,
    apiUrl: login.apiUrl,
    downloadUrl: login.downloadUrl,
    token: login.token,
    accountId: login.accountId,
    bucketId,
    bucketName,
    capabilities: login.capabilities,
    namePrefix: login.namePrefix,
    createdAt: Date.now(),
  };
  return cached;
}

/**
 * One Backblaze API call. If the saved login has expired, logs in again
 * and tries once more.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function call(operation: string, body: (connection: Connection) => object): Promise<any> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const connection = await connect(attempt > 0);
    const response = await request(`${connection.apiUrl}/b2api/${connection.version}/${operation}`, {
      method: 'POST',
      headers: { Authorization: connection.token, 'Content-Type': 'application/json' },
      body: JSON.stringify(body(connection)),
    });
    if (response.status === 401 && attempt === 0) continue;
    if (!response.ok) {
      const details = await readText(response);
      const notFound = response.status === 404 || /file_not_present|not_found|no_such_file/i.test(details);
      throw new StorageError(
        notFound ? 'NOT_FOUND' : 'REQUEST_FAILED',
        notFound ? 'Filen findes ikke.' : `Backblaze svarede med en fejl (${operation}).`,
        notFound ? 404 : 502,
        details,
      );
    }
    return response.json();
  }
  throw new StorageError('KEY_REJECTED', 'Backblaze afviste nøglen.', 502);
}

/** Every stored version of every file whose name starts with `prefix`. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function listVersions(prefix: string): Promise<any[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const versions: any[] = [];
  let startFileName: string | undefined;
  let startFileId: string | undefined;

  for (let page = 0; page < MAX_PAGES; page++) {
    const data = await call('b2_list_file_versions', (connection) => ({
      bucketId: connection.bucketId,
      prefix,
      maxFileCount: PAGE_SIZE,
      ...(startFileName ? { startFileName } : {}),
      ...(startFileId ? { startFileId } : {}),
    }));
    versions.push(...(data.files || []));
    if (!data.nextFileName) break;
    startFileName = data.nextFileName;
    startFileId = data.nextFileId || undefined;
  }
  return versions;
}

/**
 * The current version of each file under `prefix` (a folder such as
 * "Frivillige/"). Older versions and hidden files are left out.
 */
export async function listFiles(prefix: string): Promise<StoredFile[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const newest = new Map<string, any>();
  for (const version of await listVersions(prefix)) {
    if (version.action !== 'upload' && version.action !== 'hide') continue;
    const current = newest.get(version.fileName);
    if (!current || version.uploadTimestamp > current.uploadTimestamp) {
      newest.set(version.fileName, version);
    }
  }

  return Array.from(newest.values())
    .filter((version) => version.action === 'upload')
    .map((version) => ({
      fileId: version.fileId,
      fileName: version.fileName,
      size: version.contentLength || 0,
      uploadTimestamp: version.uploadTimestamp,
    }));
}

/** Backblaze wants file names percent-encoded, with "/" kept as it is. */
function encodeFileName(fullName: string): string {
  return fullName.split('/').map(encodeURIComponent).join('/');
}

/**
 * Store a file under its full name. Sends a checksum so a damaged upload is
 * refused, and retries once with a new upload address, as Backblaze asks.
 */
export async function uploadFile(fullName: string, content: Buffer, contentType: string): Promise<StoredFile> {
  const sha1 = createHash('sha1').update(content).digest('hex');
  let lastError: StorageError | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    const target = await call('b2_get_upload_url', (connection) => ({ bucketId: connection.bucketId }));
    let response: Response;
    try {
      response = await request(
        target.uploadUrl,
        {
          method: 'POST',
          headers: {
            Authorization: target.authorizationToken,
            'X-Bz-File-Name': encodeFileName(fullName),
            'Content-Type': contentType || 'application/octet-stream',
            'Content-Length': content.length.toString(),
            'X-Bz-Content-Sha1': sha1,
          },
          body: content,
        },
        TRANSFER_TIMEOUT_MS,
      );
    } catch (error) {
      // A broken connection is worth one more try with a new upload address.
      lastError = error as StorageError;
      continue;
    }

    if (response.ok) {
      const stored = await response.json();
      return {
        fileId: stored.fileId,
        fileName: stored.fileName,
        size: stored.contentLength || content.length,
        uploadTimestamp: stored.uploadTimestamp || Date.now(),
      };
    }

    lastError = new StorageError('REQUEST_FAILED', 'Filen kunne ikke gemmes hos Backblaze.', 502, await readText(response));
    // 401, 408, 429 and 5xx mean "ask for a new upload address and try again".
    const retryable = response.status === 401 || response.status === 408 || response.status === 429 || response.status >= 500;
    if (!retryable) break;
  }
  throw lastError || new StorageError('REQUEST_FAILED', 'Filen kunne ikke gemmes hos Backblaze.');
}

export interface OpenDownload {
  /** The file's real full name in the bucket. */
  fileName: string;
  /** Size in bytes, when Backblaze states it. */
  size: number | null;
  /** Reads the content. Only call it once access has been checked. */
  read: () => Promise<Buffer>;
  /** Drop the download without reading it (access refused, file too big). */
  discard: () => Promise<void>;
}

/**
 * Start fetching a file by id. The name arrives before the content, so the
 * caller can check access first and only then read the file.
 */
export async function openDownload(fileId: string): Promise<OpenDownload> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const connection = await connect(attempt > 0);
    const response = await request(
      `${connection.downloadUrl}/b2api/${connection.version}/b2_download_file_by_id?fileId=${encodeURIComponent(fileId)}`,
      { headers: { Authorization: connection.token } },
      TRANSFER_TIMEOUT_MS,
    );
    if (response.status === 401 && attempt === 0) continue;
    if (!response.ok) {
      const notFound = response.status === 404 || response.status === 400;
      throw new StorageError(
        notFound ? 'NOT_FOUND' : 'REQUEST_FAILED',
        notFound ? 'Filen findes ikke.' : 'Filen kunne ikke hentes fra Backblaze.',
        notFound ? 404 : 502,
        await readText(response),
      );
    }

    let fileName = '';
    try {
      fileName = decodeURIComponent((response.headers.get('x-bz-file-name') || '').replace(/\+/g, '%20'));
    } catch {
      fileName = '';
    }
    const length = response.headers.has('content-length') ? Number(response.headers.get('content-length')) : NaN;
    return {
      fileName,
      size: Number.isFinite(length) && length >= 0 ? length : null,
      read: async () => {
        try {
          return Buffer.from(await response.arrayBuffer());
        } catch (error) {
          throw new StorageError(
            'REQUEST_FAILED',
            'Filen kunne ikke hentes fra Backblaze. Prøv igen om lidt.',
            502,
            error instanceof Error ? `${error.name}: ${error.message}` : undefined,
          );
        }
      },
      discard: async () => {
        try {
          await response.body?.cancel();
        } catch {
          // Already closed.
        }
      },
    };
  }
  throw new StorageError('KEY_REJECTED', 'Backblaze afviste nøglen.', 502);
}

/** A stored file's real full name, or null when the id is unknown. */
export async function fileNameById(fileId: string): Promise<string | null> {
  try {
    const info = await call('b2_get_file_info', () => ({ fileId }));
    return typeof info.fileName === 'string' ? info.fileName : null;
  } catch (error) {
    // Backblaze answers 400 for an id it does not recognise.
    if (error instanceof StorageError && (error.code === 'NOT_FOUND' || /bad_request|invalid/i.test(error.details || ''))) {
      return null;
    }
    throw error;
  }
}

/**
 * Remove a file completely: every stored version of exactly this name.
 * Returns how many versions were removed.
 */
export async function deleteFile(fullName: string): Promise<number> {
  const versions = (await listVersions(fullName)).filter((version) => version.fileName === fullName);
  for (const version of versions) {
    await call('b2_delete_file_version', () => ({ fileName: version.fileName, fileId: version.fileId }));
  }
  return versions.length;
}

/** Forget the saved login (used by the storage check to test from scratch). */
export function resetConnection() {
  cached = null;
}

/**
 * Answer the browser when a file route fails. Storage problems get their
 * own status and a message a person can act on; anything else is a 500.
 */
export function storageErrorBody(error: unknown): { status: number; body: Record<string, unknown> } {
  if (error instanceof StorageError) {
    console.error(`Storage error [${error.code}]: ${error.message}`, error.details || '');
    return { status: error.status, body: { success: false, error: error.code, message: error.message } };
  }
  console.error('Unexpected error in a file route:', error);
  return {
    status: 500,
    body: { success: false, error: 'INTERNAL_ERROR', message: 'Der opstod en fejl på serveren.' },
  };
}
