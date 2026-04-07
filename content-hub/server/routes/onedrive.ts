import { Router } from 'express';
import {
  readFile,
  writeFile,
  listFolder,
  fileExists,
  clearCache,
  getCacheStats,
  checkHealth,
} from '../services/onedrive.js';

const router = Router();

// --- Health ---

router.get('/health', async (_req, res) => {
  try {
    const result = await checkHealth();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// --- File Operations ---

router.get('/read', async (req, res) => {
  const filePath = req.query.path as string;
  if (!filePath) return res.status(400).json({ ok: false, error: 'Missing ?path=' });

  try {
    const content = await readFile(filePath);
    res.json({ ok: true, path: filePath, content });
  } catch (err: any) {
    const status = err.message.includes('not found') ? 404 : 500;
    res.status(status).json({ ok: false, error: err.message });
  }
});

router.post('/write', async (req, res) => {
  const { path: filePath, content } = req.body;
  if (!filePath || content === undefined) {
    return res.status(400).json({ ok: false, error: 'Missing path or content in body' });
  }

  try {
    await writeFile(filePath, content);
    res.json({ ok: true, path: filePath });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/list', async (req, res) => {
  const folderPath = req.query.path as string;
  if (!folderPath) return res.status(400).json({ ok: false, error: 'Missing ?path=' });

  try {
    const items = await listFolder(folderPath);
    res.json({ ok: true, path: folderPath, count: items.length, items });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/exists', async (req, res) => {
  const filePath = req.query.path as string;
  if (!filePath) return res.status(400).json({ ok: false, error: 'Missing ?path=' });

  try {
    const exists = await fileExists(filePath);
    res.json({ ok: true, path: filePath, exists });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// --- Cache ---

router.post('/cache/clear', (_req, res) => {
  clearCache();
  res.json({ ok: true, message: 'Cache cleared' });
});

router.get('/cache/stats', (_req, res) => {
  res.json({ ok: true, ...getCacheStats() });
});

export default router;
