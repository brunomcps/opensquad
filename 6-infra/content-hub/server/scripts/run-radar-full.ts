/**
 * run-radar-full.ts — Roda o radar completo (coleta + detecção + entrega das 2 trilhas).
 * Uso: npx tsx --env-file=../../.env server/scripts/run-radar-full.ts [--no-deliver]
 * É o que o cron de manhã chama (ou o endpoint POST /api/niche-radar/run-daily).
 */

import { runRadar } from '../services/nicheRadar/orchestrator.js';

const deliver = !process.argv.includes('--no-deliver');

async function main() {
  const r = await runRadar({ deliver });
  console.log('\n=== RADAR COMPLETO ===');
  console.log('Vídeos coletados — BR:', r.collected.br, '| Gringo:', r.collected.gringo);
  console.log('Achados — BR:', r.found.br, '| Gringo:', r.found.gringo);
  console.log('Entrega:', deliver ? 'Telegram enviado' : 'pulada (--no-deliver)');
}

main().catch((e) => { console.error('ERRO:', e); process.exit(1); });
