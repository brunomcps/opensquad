/**
 * run-radar-detect.ts — Roda a detecção do radar e imprime o ranking (debug/manual).
 * Uso: npx tsx --env-file=../../.env server/scripts/run-radar-detect.ts [br|gringo]
 */

import { runDetection } from '../services/nicheRadar/detector.js';
import type { Track } from '../db/nicheRadar.js';

const track = (process.argv[2] as Track) || 'br';

async function main() {
  const found = await runDetection(track);
  console.log(`\n=== TOP VIRAIS ${track.toUpperCase()} (score | outlier | vel/dia | título) ===\n`);
  for (const f of found.slice(0, 12)) {
    console.log(
      String(f.score).padStart(5),
      '|', String(f.outlier_score).padStart(6),
      '|', String(Math.round(f.velocity)).padStart(8),
      '|', (f.title || '').slice(0, 58)
    );
  }
  console.log(`\nTotal findings ${track}: ${found.length}`);
}

main().catch((e) => { console.error('ERRO:', e); process.exit(1); });
