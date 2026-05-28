// Filtro de relevância do Radar de Viral do Nicho.
// Corta ruído (música, ASMR, infantil) que apareceu nos testes de descoberta por tema.
// Canal curado pelo Bruno bypassa o filtro (já foi aprovado por ele).
// Lógica pura, testável.

import type { Track } from '../../db/nicheRadar.js';

// Padrões de ruído observados na busca por "TDAH": clipes, música, ASMR, infantil.
const NOISE_PATTERNS: RegExp[] = [
  /\basmr\b/i,
  /\b(m[úu]sica|song|lyrics?|clipe|videoclipe|official\s+video|[áa]udio\s+oficial)\b/i,
  /\b(infantil|kids|crian[çc]as?|nursery|desenho\s+animado)\b/i,
  /\b(funk|sertanejo|pagode|trap)\b/i,
];

export interface RadarVideoLike {
  title?: string | null;
  track: Track;
}

export interface RelevanceOpts {
  fromCuratedChannel?: boolean;
}

/**
 * Decide se o vídeo entra no radar.
 * - Canal curado: sempre relevante (o Bruno já aprovou o canal).
 * - Descoberta por tema: rejeita títulos que batem nos padrões de ruído.
 */
export function isRelevant(video: RadarVideoLike, opts: RelevanceOpts = {}): boolean {
  if (opts.fromCuratedChannel) return true;
  const title = (video.title ?? '').trim();
  if (!title) return false;
  return !NOISE_PATTERNS.some((rx) => rx.test(title));
}
