import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../../data');

const router = Router();

router.get('/profiles', (_req, res) => {
  try {
    const filePath = path.join(DATA_DIR, 'competitor-profiles.json');
    if (!fs.existsSync(filePath)) return res.json({ ok: true, data: [] });
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    res.json({ ok: true, data });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/viral', (_req, res) => {
  try {
    const filePath = path.join(DATA_DIR, 'viral-content.json');
    if (!fs.existsSync(filePath)) return res.json({ ok: true, data: null });
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    res.json({ ok: true, data });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/trends', (_req, res) => {
  try {
    const filePath = path.join(DATA_DIR, 'trends.json');
    if (!fs.existsSync(filePath)) return res.json({ ok: true, data: [] });
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    res.json({ ok: true, data });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/opportunities', (_req, res) => {
  try {
    const filePath = path.join(DATA_DIR, 'opportunities.json');
    if (!fs.existsSync(filePath)) return res.json({ ok: true, data: [] });
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    res.json({ ok: true, data });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
