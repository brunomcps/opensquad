// Agendador interno do Radar de Viral do Nicho.
// Roda toda manhã às 06:00 (horário de Brasília), dentro do processo do Railway.

import cron from 'node-cron';
import { runRadar } from './orchestrator.js';

let started = false;

export function startRadarCron(): void {
  if (started) return;
  started = true;

  cron.schedule(
    '0 6 * * *',
    async () => {
      console.log('[radar] cron diário disparado', new Date().toISOString());
      try {
        const r = await runRadar();
        console.log('[radar] cron OK — achados BR:', r.found.br, 'gringo:', r.found.gringo);
      } catch (e: any) {
        console.error('[radar] cron falhou:', e.message);
      }
    },
    { timezone: 'America/Sao_Paulo' }
  );

  console.log('[radar] cron agendado: 06:00 America/Sao_Paulo (diário)');
}
