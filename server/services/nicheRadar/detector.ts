// Detector do Radar de Viral do Nicho.
// Junta coleta + score + filtro e grava os achados (radar_findings).

import { getTrackData, saveFindings, type Track, type RadarFinding, type VideoWithSnaps } from '../../db/nicheRadar.js';
import { outlierScore, velocity, combinedScore } from './scoring.js';
import { isRelevant } from './relevance.js';

const TOP_N = 12;        // top por trilha que sempre entra no relatório
const ESTOURO = 70;      // score acima disso entra mesmo fora do top

function latestViews(snaps: VideoWithSnaps['radar_snapshots']): number {
  if (!snaps.length) return 0;
  return [...snaps].sort((a, b) => b.snap_date.localeCompare(a.snap_date))[0].views;
}

export interface Detection extends RadarFinding {
  title: string | null;
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
    if (!isRelevant({ title: v.title, track: v.track }, { fromCuratedChannel: true })) continue;
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
    });
  }

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, TOP_N);
  const estouros = scored.slice(TOP_N).filter((d) => d.score >= ESTOURO);
  const findings = [...top, ...estouros];

  await saveFindings(findings.map(({ title, ...f }) => f));
  return findings;
}

/** Roda as duas trilhas. */
export async function runDailyAll(): Promise<{ br: Detection[]; gringo: Detection[] }> {
  const br = await runDetection('br');
  const gringo = await runDetection('gringo');
  return { br, gringo };
}
