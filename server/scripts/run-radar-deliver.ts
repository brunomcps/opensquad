/**
 * run-radar-deliver.ts — Monta o relatório do dia e entrega nos destinos (debug/manual).
 * Uso: npx tsx --env-file=../../.env server/scripts/run-radar-deliver.ts [telegram]
 */

import { buildReport, deliverTelegram } from '../services/nicheRadar/report.js';

const target = process.argv[2] || 'telegram';

async function main() {
  const report = await buildReport();
  console.log(`Relatório ${report.date} — BR: ${report.br.length}, Gringo: ${report.gringo.length}`);
  if (target === 'telegram') {
    await deliverTelegram(report);
    console.log('✔ Telegram enviado.');
  }
}

main().catch((e) => { console.error('ERRO:', e); process.exit(1); });
