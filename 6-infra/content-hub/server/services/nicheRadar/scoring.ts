// Motor de score do Radar de Viral do Nicho.
// Lógica pura, testável (sem I/O). Combina dois sinais: outlier + velocidade.

// Tetos de normalização (ajustáveis após calibrar com dados reais — ver spec §8).
export const OUTLIER_CAP = 10; // 10x a média do canal => nota máxima do sinal
export const VELOCITY_CAP = 10000; // 10 mil views/dia => nota máxima do sinal

export interface ScoreWeights {
  outlier: number;
  velocity: number;
}

export interface ScoreCaps {
  outlier: number;
  velocity: number;
}

/**
 * Outlier: quantas vezes o vídeo bateu a média de views do próprio canal.
 * 1 = na média; 5 = cinco vezes acima. Retorna 0 se não há base de comparação.
 */
export function outlierScore(views: number, channelRecentViews: number[]): number {
  if (!channelRecentViews.length) return 0;
  const avg = channelRecentViews.reduce((a, b) => a + b, 0) / channelRecentViews.length;
  if (avg === 0) return 0;
  return views / avg;
}

/**
 * Velocidade: views ganhas por dia.
 * Com 2+ snapshots, usa o delta entre os dois últimos. Com 1 snapshot e data de
 * publicação, aproxima por views/dias desde a publicação. Sem dados, 0.
 */
export function velocity(
  snapshots: { snap_date: string; views: number }[],
  publishedAt?: string
): number {
  if (!snapshots.length) return 0;

  const sorted = [...snapshots].sort((a, b) => a.snap_date.localeCompare(b.snap_date));

  if (sorted.length >= 2) {
    const last = sorted[sorted.length - 1];
    const prev = sorted[sorted.length - 2];
    const days = Math.max(daysBetween(prev.snap_date, last.snap_date), 1);
    return (last.views - prev.views) / days;
  }

  // 1 snapshot: aproximação pela idade do vídeo
  const only = sorted[0];
  if (publishedAt) {
    const days = Math.max(daysBetween(publishedAt, only.snap_date), 1);
    return only.views / days;
  }
  return 0;
}

/**
 * Score final 0-100: normaliza cada sinal pelo seu teto e combina pelos pesos.
 * Pesos default 50/50; tetos ajustáveis.
 */
export function combinedScore(
  signals: { outlier: number; velocity: number },
  weights: ScoreWeights = { outlier: 0.5, velocity: 0.5 },
  caps: ScoreCaps = { outlier: OUTLIER_CAP, velocity: VELOCITY_CAP }
): number {
  const outlierNorm = normalize(signals.outlier, caps.outlier);
  const velocityNorm = normalize(signals.velocity, caps.velocity);
  const wSum = weights.outlier + weights.velocity || 1;
  const wOutlier = weights.outlier / wSum;
  const wVelocity = weights.velocity / wSum;
  return outlierNorm * wOutlier + velocityNorm * wVelocity;
}

function normalize(value: number, cap: number): number {
  if (cap <= 0) return 0;
  return Math.min(Math.max(value, 0) / cap, 1) * 100;
}

function daysBetween(isoA: string, isoB: string): number {
  const a = new Date(isoA).getTime();
  const b = new Date(isoB).getTime();
  return Math.abs(b - a) / 86_400_000;
}
