/**
 * Local development API server
 * Runs API routes locally for development
 */

import express from 'express';
import cors from 'cors';
import { readFileSync } from 'fs';
import { join } from 'path';

const app = express();
const PORT = 3001;

// Load environment variables
try {
  const envPath = join(process.cwd(), '.env');
  const envFile = readFileSync(envPath, 'utf-8');
  envFile.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').replace(/^["']|["']$/g, '');
        process.env[key.trim()] = value.trim();
      }
    }
  });
} catch (error) {
  console.warn('⚠️  .env file not found');
}

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Import and wrap Vercel handlers
async function createHandler(handlerPath: string) {
  const module = await import(handlerPath);
  return async (req: express.Request, res: express.Response) => {
    // Convert Express req/res to Vercel format
    const vercelReq = req as any;
    const vercelRes = {
      status: (code: number) => ({
        json: (data: any) => {
          res.status(code).json(data);
        },
        setHeader: (name: string, value: string) => {
          res.setHeader(name, value);
          return {
            json: (data: any) => {
              res.status(code).json(data);
            },
            end: () => {
              res.status(code).end();
            }
          };
        },
        end: () => {
          res.status(code).end();
        }
      }),
      setHeader: (name: string, value: string) => {
        res.setHeader(name, value);
        return {
          json: (data: any) => res.json(data),
          end: () => res.end()
        };
      },
      json: (data: any) => res.json(data),
      end: () => res.end()
    };
    
    await module.default(vercelReq, vercelRes);
  };
}

// API routes
app.get('/api/list-backblaze-files', async (req, res) => {
  try {
    const handler = await createHandler('./api/list-backblaze-files.ts');
    await handler(req, res);
  } catch (error: any) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

app.post('/api/upload-to-backblaze', async (req, res) => {
  try {
    const handler = await createHandler('./api/upload-to-backblaze.ts');
    await handler(req, res);
  } catch (error: any) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

app.post('/api/download-backblaze-file', async (req, res) => {
  try {
    const handler = await createHandler('./api/download-backblaze-file.ts');
    await handler(req, res);
  } catch (error: any) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

app.post('/api/delete-backblaze-file', async (req, res) => {
  try {
    const handler = await createHandler('./api/delete-backblaze-file.ts');
    await handler(req, res);
  } catch (error: any) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Local API server running on http://localhost:${PORT}`);
  console.log(`📝 API routes available at http://localhost:${PORT}/api/*`);
  console.log(`\n💡 Update vite.config.ts proxy to point to http://localhost:${PORT}`);
});
