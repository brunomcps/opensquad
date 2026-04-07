// OneDrive API via rclone — vault access for Diário Inteligente V3
// Used when PC is offline (Haiku fallback mode)
// rclone handles OAuth token refresh automatically

import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const execFileAsync = promisify(execFile);

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const RCLONE_REMOTE = 'opensquad-vault';
const VAULT_PATH = process.env.ONEDRIVE_VAULT_PATH || 'Bruno Salles/Projetos/OpenSquad';
const RCLONE_BIN = process.env.RCLONE_BIN || 'rclone';
const RCLONE_CONFIG_PATH = process.env.RCLONE_CONFIG_PATH || '/tmp/rclone.conf';

// --- Cache (write-through, TTL 1h) ---

interface CacheEntry {
  content: string;
  cachedAt: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 60 * 60 * 1000;

// --- Setup ---

export async function setupRcloneConfig(): Promise<void> {
  const configB64 = process.env.RCLONE_CONFIG_B64;
  if (!configB64) {
    console.log('[OneDrive] No RCLONE_CONFIG_B64 — skipping setup');
    return;
  }

  const configContent = Buffer.from(configB64, 'base64').toString('utf-8');
  fs.writeFileSync(RCLONE_CONFIG_PATH, configContent, { mode: 0o600 });
  console.log(`[OneDrive] Config written to ${RCLONE_CONFIG_PATH}`);

  // Test connection
  try {
    await rclone(['about', `${RCLONE_REMOTE}:`, '--json']);
    console.log('[OneDrive] Connection OK');
  } catch (e: any) {
    console.error('[OneDrive] Connection test failed:', e.message);
  }
}

// --- rclone wrapper ---

async function rclone(args: string[]): Promise<string> {
  const fullArgs = ['--config', RCLONE_CONFIG_PATH, ...args];
  try {
    const { stdout } = await execFileAsync(RCLONE_BIN, fullArgs, {
      maxBuffer: 10 * 1024 * 1024, // 10MB
      timeout: 30000,
    });
    return stdout;
  } catch (e: any) {
    const msg = e.stderr || e.message || 'Unknown rclone error';
    throw new Error(`[OneDrive] rclone ${args[0]} failed: ${msg}`);
  }
}

async function rcloneWrite(remotePath: string, content: string): Promise<void> {
  const fullArgs = ['--config', RCLONE_CONFIG_PATH, 'rcat', remotePath];
  return new Promise((resolve, reject) => {
    const proc = execFile(RCLONE_BIN, fullArgs, { timeout: 30000 }, (err) => {
      if (err) reject(new Error(`[OneDrive] Write failed: ${err.message}`));
      else resolve();
    });
    proc.stdin?.write(content);
    proc.stdin?.end();
  });
}

function remotePath(vaultRelative: string): string {
  return `${RCLONE_REMOTE}:${VAULT_PATH}/${vaultRelative}`;
}

// --- File Operations ---

export async function readFile(vaultRelativePath: string): Promise<string> {
  const cached = cache.get(vaultRelativePath);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL) {
    return cached.content;
  }

  const content = await rclone(['cat', remotePath(vaultRelativePath)]);
  cache.set(vaultRelativePath, { content, cachedAt: Date.now() });
  return content;
}

export async function writeFile(vaultRelativePath: string, content: string): Promise<void> {
  await rcloneWrite(remotePath(vaultRelativePath), content);
  cache.set(vaultRelativePath, { content, cachedAt: Date.now() });
  console.log(`[OneDrive] Written: ${vaultRelativePath}`);
}

export interface DriveItem {
  Path: string;
  Name: string;
  Size: number;
  MimeType: string;
  ModTime: string;
  IsDir: boolean;
}

export async function listFolder(vaultRelativePath: string): Promise<DriveItem[]> {
  const output = await rclone(['lsjson', remotePath(vaultRelativePath)]);
  return JSON.parse(output) as DriveItem[];
}

export async function fileExists(vaultRelativePath: string): Promise<boolean> {
  try {
    await rclone(['lsjson', remotePath(vaultRelativePath), '--files-only']);
    return true;
  } catch {
    return false;
  }
}

// --- Cache Management ---

export function clearCache(): void {
  cache.clear();
  console.log('[OneDrive] Cache cleared');
}

export function getCacheStats(): { entries: number; keys: string[] } {
  return { entries: cache.size, keys: Array.from(cache.keys()) };
}

// --- Health ---

export async function checkHealth(): Promise<{ ok: boolean; quota?: any; error?: string }> {
  try {
    const output = await rclone(['about', `${RCLONE_REMOTE}:`, '--json']);
    const quota = JSON.parse(output);
    return { ok: true, quota };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}
