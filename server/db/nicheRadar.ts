import { supabase } from './client.js';

// Camada de banco do Radar de Viral do Nicho.
// Módulo independente — não compartilha tabelas com o viral-radar antigo.

export type Track = 'br' | 'gringo';

export interface RadarChannel {
  channel_id: string;
  name: string;
  track: Track;
  subscribers?: number | null;
  uploads_playlist?: string | null;
  active?: boolean;
  origin?: 'curated' | 'discovered';
}

export interface RadarVideo {
  video_id: string;
  channel_id: string;
  title?: string | null;
  published_at?: string | null;
  duration_sec?: number | null;
  thumb_url?: string | null;
  track: Track;
}

export interface RadarSnapshot {
  video_id: string;
  snap_date: string; // ISO date (YYYY-MM-DD)
  views: number;
  likes?: number | null;
  comments?: number | null;
}

export interface RadarFinding {
  video_id: string;
  detected_on: string; // ISO date
  score: number;
  outlier_score?: number | null;
  velocity?: number | null;
  track: Track;
  status?: 'novo' | 'visto' | 'usado';
}

// -- Canais --

export async function listChannels(track?: Track): Promise<RadarChannel[]> {
  let q = supabase.from('radar_channels').select('*').eq('active', true);
  if (track) q = q.eq('track', track);
  const { data, error } = await q;
  if (error) throw new Error(`[radar] listChannels: ${error.message}`);
  return (data ?? []) as RadarChannel[];
}

export async function upsertChannels(channels: RadarChannel[]): Promise<void> {
  if (!channels.length) return;
  const { error } = await supabase.from('radar_channels').upsert(channels, { onConflict: 'channel_id' });
  if (error) throw new Error(`[radar] upsertChannels: ${error.message}`);
}

// -- Vídeos --

export async function upsertVideos(videos: RadarVideo[]): Promise<void> {
  if (!videos.length) return;
  const { error } = await supabase.from('radar_videos').upsert(videos, { onConflict: 'video_id' });
  if (error) throw new Error(`[radar] upsertVideos: ${error.message}`);
}

// -- Snapshots --

export async function saveSnapshots(snaps: RadarSnapshot[]): Promise<void> {
  if (!snaps.length) return;
  const { error } = await supabase.from('radar_snapshots').upsert(snaps, { onConflict: 'video_id,snap_date' });
  if (error) throw new Error(`[radar] saveSnapshots: ${error.message}`);
}

export async function getSnapshots(videoId: string): Promise<RadarSnapshot[]> {
  const { data, error } = await supabase
    .from('radar_snapshots')
    .select('video_id, snap_date, views, likes, comments')
    .eq('video_id', videoId)
    .order('snap_date', { ascending: true });
  if (error) throw new Error(`[radar] getSnapshots: ${error.message}`);
  return (data ?? []) as RadarSnapshot[];
}

// -- Findings --

export async function saveFindings(findings: RadarFinding[]): Promise<void> {
  if (!findings.length) return;
  const { error } = await supabase.from('radar_findings').upsert(findings, { onConflict: 'video_id,detected_on' });
  if (error) throw new Error(`[radar] saveFindings: ${error.message}`);
}

export async function getFindings(track?: Track, detectedOn?: string): Promise<any[]> {
  let q = supabase
    .from('radar_findings')
    .select('*, radar_videos(title, thumb_url, channel_id, published_at)')
    .order('score', { ascending: false });
  if (track) q = q.eq('track', track);
  if (detectedOn) q = q.eq('detected_on', detectedOn);
  const { data, error } = await q;
  if (error) throw new Error(`[radar] getFindings: ${error.message}`);
  return data ?? [];
}

// Vídeos de uma trilha com seus snapshots aninhados (pro detector calcular score).
export interface VideoWithSnaps {
  video_id: string;
  channel_id: string;
  title: string | null;
  published_at: string | null;
  duration_sec: number | null;
  track: Track;
  radar_snapshots: { snap_date: string; views: number; likes: number | null; comments: number | null }[];
}

export async function getTrackData(track: Track): Promise<VideoWithSnaps[]> {
  const { data, error } = await supabase
    .from('radar_videos')
    .select('video_id, channel_id, title, published_at, duration_sec, track, radar_snapshots(snap_date, views, likes, comments)')
    .eq('track', track);
  if (error) throw new Error(`[radar] getTrackData: ${error.message}`);
  return (data ?? []) as VideoWithSnaps[];
}
