import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.resolve(__dirname, '../../data/fichas.json');
const PATTERNS_PATH = path.resolve(__dirname, '../../data/cross-patterns.json');

function readFichas(): any[] {
  if (!fs.existsSync(DATA_PATH)) return [];
  return JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
}

const router = Router();

// GET /api/fichas/patterns — cross-video patterns analysis
router.get('/patterns', (_req, res) => {
  try {
    if (!fs.existsSync(PATTERNS_PATH)) return res.json({ ok: true, patterns: null });
    const patterns = JSON.parse(fs.readFileSync(PATTERNS_PATH, 'utf-8'));
    res.json({ ok: true, patterns });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/fichas/stats/summary — must be before /:videoId
router.get('/stats/summary', (_req, res) => {
  try {
    const fichas = readFichas();
    const total = fichas.length;
    if (total === 0) return res.json({ ok: true, stats: null });

    const avgDuration = fichas.reduce((s: number, f: any) => s + (f.durationSeconds || 0), 0) / total;
    const avgHookElements = fichas.reduce((s: number, f: any) => s + (f.hookElementCount || 0), 0) / total;
    const avgBlocks = fichas.reduce((s: number, f: any) => s + (f.blockCount || 0), 0) / total;

    const withProportions = fichas.filter((f: any) => f.proportions?.hook > 0);
    const pTotal = withProportions.length || 1;
    const avgHookPct = withProportions.reduce((s: number, f: any) => s + f.proportions.hook, 0) / pTotal;
    const avgContentPct = withProportions.reduce((s: number, f: any) => s + f.proportions.content, 0) / pTotal;
    const avgClosingPct = withProportions.reduce((s: number, f: any) => s + f.proportions.closing, 0) / pTotal;

    // Count structure types
    const typeCounts: Record<string, number> = {};
    for (const f of fichas) {
      const type = (f.structureType || '').substring(0, 60);
      if (type) typeCounts[type] = (typeCounts[type] || 0) + 1;
    }
    const structureTypes = Object.entries(typeCounts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Count sections present
    const sectionPresence: Record<string, number> = {};
    for (const f of fichas) {
      for (const key of Object.keys(f.sections || {})) {
        sectionPresence[key] = (sectionPresence[key] || 0) + 1;
      }
    }

    res.json({
      ok: true,
      stats: {
        totalFichas: total,
        avgDurationSeconds: Math.round(avgDuration),
        avgHookPercent: +avgHookPct.toFixed(1),
        avgContentPercent: +avgContentPct.toFixed(1),
        avgClosingPercent: +avgClosingPct.toFixed(1),
        avgHookElementCount: +avgHookElements.toFixed(1),
        avgBlockCount: +avgBlocks.toFixed(1),
        structureTypes,
        sectionPresence,
      },
    });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/fichas — list all fichas (without heavy sections data)
router.get('/', (req, res) => {
  try {
    const fichas = readFichas();
    const { search } = req.query;
    let result = fichas;

    if (search) {
      const q = String(search).toLowerCase();
      result = result.filter((f: any) => {
        // Search in title and structure type
        if (f.title.toLowerCase().includes(q)) return true;
        if ((f.structureType || '').toLowerCase().includes(q)) return true;
        // Full-text search in all sections content
        for (const content of Object.values(f.sections || {})) {
          if (typeof content === 'string' && content.toLowerCase().includes(q)) return true;
        }
        return false;
      });
    }

    // Return lightweight list (without full sections markdown)
    const list = result.map((f: any) => ({
      videoId: f.videoId,
      runId: f.runId,
      title: f.title,
      durationText: f.durationText,
      durationSeconds: f.durationSeconds,
      publishedAt: f.publishedAt,
      structureType: f.structureType,
      proportions: f.proportions,
      hookElementCount: f.hookElementCount,
      blockCount: f.blockCount,
      sectionCount: Object.keys(f.sections || {}).length,
    }));

    res.json({ ok: true, fichas: list });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/fichas/:videoId — single ficha with full sections
router.get('/:videoId', (req, res) => {
  try {
    const fichas = readFichas();
    const ficha = fichas.find((f: any) => f.videoId === req.params.videoId);
    if (!ficha) return res.status(404).json({ ok: false, error: 'Ficha not found' });
    res.json({ ok: true, ficha });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
