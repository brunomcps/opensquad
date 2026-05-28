// Coletor do Radar de Viral do Nicho.
// Puxa os uploads recentes de cada canal vigiado, grava vídeos e o snapshot do dia.

import { listChannels, upsertVideos, saveSnapshots, type RadarChannel, type Track } from '../../db/nicheRadar.js';
import { listUploads, getVideoStats } from './youtubeData.js';

const RECENT_DAYS = 45; // janela de uploads considerados "recentes"

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function sinceISO(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

export interface CollectResult {
  channel: string;
  videos: number;
}

/** Coleta um canal: uploads recentes -> stats -> upsert vídeos + snapshot do dia. */
export async function collectChannel(channel: RadarChannel): Promise<CollectResult> {
  if (!channel.uploads_playlist) {
    return { channel: channel.name, videos: 0 };
  }
  const uploads = await listUploads(channel.uploads_playlist, sinceISO(RECENT_DAYS));
  if (!uploads.length) return { channel: channel.name, videos: 0 };

  const stats = await getVideoStats(uploads.map((u) => u.video_id));
  const snapDate = today();

  await upsertVideos(
    stats.map((v) => ({
      video_id: v.video_id,
      channel_id: channel.channel_id,
      title: v.title,
      published_at: v.published_at,
      duration_sec: v.duration_sec,
      thumb_url: v.thumb_url,
      track: channel.track,
    }))
  );

  await saveSnapshots(
    stats.map((v) => ({
      video_id: v.video_id,
      snap_date: snapDate,
      views: v.views,
      likes: v.likes,
      comments: v.comments,
    }))
  );

  return { channel: channel.name, videos: stats.length };
}

/** Coleta todos os canais de uma trilha (ou todas, se track omitido). */
export async function collectAll(track?: Track): Promise<CollectResult[]> {
  const channels = await listChannels(track);
  const results: CollectResult[] = [];
  for (const ch of channels) {
    try {
      const r = await collectChannel(ch);
      results.push(r);
      console.log(`✔ ${r.channel}: ${r.videos} vídeos recentes`);
    } catch (e: any) {
      console.warn(`✘ ${ch.name}: ${e.message}`);
      results.push({ channel: ch.name, videos: 0 });
    }
  }
  return results;
}
