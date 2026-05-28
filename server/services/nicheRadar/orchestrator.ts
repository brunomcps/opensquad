// Orquestrador do Radar de Viral do Nicho.
// Roda a manhã inteira: coleta + detecção das duas trilhas + entrega.
// Usado pelo endpoint /run-daily e pelo cron.

import { collectAll } from './collector.js';
import { runDetection } from './detector.js';
import { buildReport, deliverTelegram, type Report } from './report.js';

export interface RunResult {
  collected: { br: number; gringo: number };
  found: { br: number; gringo: number };
  report: Report;
}

export async function runRadar(opts: { deliver?: boolean } = {}): Promise<RunResult> {
  // 1. coleta as duas trilhas (gringo usa a mesma Data API; vidiq só seria p/ descobrir canal novo)
  const cBr = await collectAll('br');
  const cGringo = await collectAll('gringo');

  // 2. detecta (score + filtro + findings) por trilha
  const fBr = await runDetection('br');
  const fGringo = await runDetection('gringo');

  // 3. monta relatório e entrega
  const report = await buildReport();
  if (opts.deliver !== false) {
    try {
      await deliverTelegram(report);
    } catch (e: any) {
      console.warn('[radar] entrega Telegram falhou:', e.message);
    }
    // Notion e Obsidian entram aqui quando o acesso server-side estiver configurado.
  }

  return {
    collected: {
      br: cBr.reduce((a, c) => a + c.videos, 0),
      gringo: cGringo.reduce((a, c) => a + c.videos, 0),
    },
    found: { br: fBr.length, gringo: fGringo.length },
    report,
  };
}
