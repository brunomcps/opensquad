import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.resolve(__dirname, '../../data/publications.json');

const router = Router();

function readPublications() {
  const raw = fs.readFileSync(DATA_PATH, 'utf-8');
  return JSON.parse(raw);
}

function writePublications(data: any[]) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

router.get('/', (_req, res) => {
  try {
    const publications = readPublications();
    res.json({ ok: true, publications });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/', (req, res) => {
  try {
    const publications = readPublications();
    const entry = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...req.body };
    publications.push(entry);
    writePublications(publications);
    res.status(201).json({ ok: true, publication: entry });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
