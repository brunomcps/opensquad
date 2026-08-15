import { Router } from 'express';
import { runRadar } from '../services/nicheRadar/orchestrator.js';
import { listChannels, upsertChannels, getFindings, type RadarChannel } from '../db/nicheRadar.js';

// Radar de Viral do Nicho — módulo novo, independente do viral-radar antigo.

const router = Router();
let isRunning = false;

// GET /channels — lista canais vigiados (opcional ?track=br|gringo)
router.get('/channels', async (req, res) => {
  try {
    const track = req.query.track as 'br' | 'gringo' | undefined;
    const data = await listChannels(track);
    res.json({ ok: true, data });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /channels — adiciona/atualiza canais (body: RadarChannel[])
router.post('/channels', async (req, res) => {
  try {
    await upsertChannels(req.body as RadarChannel[]);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /findings — achados (opcional ?track=&date=YYYY-MM-DD)
router.get('/findings', async (req, res) => {
  try {
    const track = req.query.track as 'br' | 'gringo' | undefined;
    const date = req.query.date as string | undefined;
    const data = await getFindings(track, date);
    res.json({ ok: true, data });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /run-daily — coleta + detecta a trilha BR (chamado pelo cron de manhã ou on-demand)
router.post('/run-daily', async (_req, res) => {
  if (isRunning) {
    return res.status(409).json({ ok: false, error: 'radar já está rodando' });
  }
  isRunning = true;
  try {
    const result = await runRadar();
    res.json({
      ok: true,
      data: {
        videos: result.collected,
        achados: result.found,
      },
    });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  } finally {
    isRunning = false;
  }
});

export default router;
