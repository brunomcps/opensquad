// Rotas de controle da esteira de DMs do Instagram (ig-responder).
// GET  /api/ig-responder/status — config atual + últimos processamentos
// POST /api/ig-responder/poll   — dispara uma varredura manual (teste)
import { Router } from 'express';
import { supabase } from '../db/client.js';
import { pollDmsOnce } from '../services/igResponder.js';

export const igResponderRouter = Router();

igResponderRouter.get('/status', async (_req, res) => {
  const [config, processadas] = await Promise.all([
    supabase.from('ci_ig_responder_config').select('*').eq('id', 1).maybeSingle(),
    supabase
      .from('ci_ig_processed')
      .select('message_id,conversation_id,grupo,acao,criado_em')
      .order('criado_em', { ascending: false })
      .limit(20),
  ]);
  res.json({
    ok: true,
    config: config.data || null,
    ultimas: processadas.data || [],
  });
});

igResponderRouter.post('/poll', async (_req, res) => {
  try {
    const resumo = await pollDmsOnce();
    res.json({ ok: true, resumo });
  } catch (erro: any) {
    res.status(500).json({ ok: false, error: String(erro?.message || erro) });
  }
});
