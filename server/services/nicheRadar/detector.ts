// Detector do Radar de Viral do Nicho.
// Junta coleta + score + filtro e grava os achados (radar_findings).

import { getTrackData, saveFindings, deleteFindings, type Track, type RadarFinding, type VideoWithSnaps } from '../../db/nicheRadar.js';
import { outlierScore, velocity, combinedScore } from './scoring.js';
import { isRelevant } from './relevance.js';

const TOP_N = 12;        // top por trilha que sempre entra no relatório
const ESTOURO = 70;      // score acima disso entra mesmo fora do top
const MIN_DURATION = 180; // ignora vídeos < 3 min (cortes/shorts)
const MAX_PER_CHANNEL = 3; // diversidade: máx achados por canal no relatório do dia

function latestViews(snaps: VideoWithSnaps['radar_snapshots']): number {
  if (!snaps.length) return 0;
  return [...snaps].sort((a, b) => b.snap_date.localeCompare(a.snap_date))[0].views;
}

export interface Detection extends RadarFinding {
  title: string | null;
  channel_id: string;
}

/** Roda a detecção de uma trilha: calcula score de cada vídeo, filtra, grava findings. */
export async function runDetection(track: Track): Promise<Detection[]> {
  const videos = await getTrackData(track);
  const today = new Date().toISOString().slice(0, 10);

  // média de views por canal (baseline do outlier)
  const viewsByChannel = new Map<string, number[]>();
  for (const v of videos) {
    const arr = viewsByChannel.get(v.channel_id) ?? [];
    arr.push(latestViews(v.radar_snapshots));
    viewsByChannel.set(v.channel_id, arr);
  }

  const scored: Detection[] = [];
  for (const v of videos) {
    // calibração: ignora cortes/shorts e aplica o filtro de tema mesmo em canal curado
    if ((v.duration_sec ?? 0) < MIN_DURATION) continue;
    if (!isRelevant({ title: v.title, track: v.track })) continue;
    const views = latestViews(v.radar_snapshots);
    const channelViews = viewsByChannel.get(v.channel_id) ?? [];
    const outlier = outlierScore(views, channelViews);
    const vel = velocity(v.radar_snapshots, v.published_at ?? undefined);
    const score = combinedScore({ outlier, velocity: vel });
    scored.push({
      video_id: v.video_id,
      detected_on: today,
      score: Number(score.toFixed(2)),
      outlier_score: Number(outlier.toFixed(3)),
      velocity: Number(vel.toFixed(1)),
      track,
      status: 'novo',
      title: v.title,
      channel_id: v.channel_id,
    });
  }

  scored.sort((a, b) => b.score - a.score);

  // diversidade: máx N por canal; preenche o top e ainda admite estouros fortes
  const perChannel = new Map<string, number>();
  const findings: Detection[] = [];
  for (const d of scored) {
    const n = perChannel.get(d.channel_id) ?? 0;
    if (n >= MAX_PER_CHANNEL) continue;
    const isTop = findings.length < TOP_N;
    const isEstouro = d.score >= ESTOURO;
    if (isTop || isEstouro) {
      findings.push(d);
      perChannel.set(d.channel_id, n + 1);
    }
  }

  await deleteFindings(track, today); // idempotência: re-rodar no mesmo dia não acumula
  await saveFindings(findings.map(({ title, channel_id, ...f }) => f));
  return findings;
}

/** Roda as duas trilhas. */
export async function runDailyAll(): Promise<{ br: Detection[]; gringo: Detection[] }> {
  const br = await runDetection('br');
  const gringo = await runDetection('gringo');
  return { br, gringo };
}
