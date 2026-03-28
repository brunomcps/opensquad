import { supabase } from './client.js';

export async function getFichas() {
  const { data } = await supabase
    .from('fichas')
    .select('video_id, run_id, title, duration_text, duration_seconds, published_at, structure_type, proportions, hook_element_count, block_count, blocks')
    .order('published_at', { ascending: false });
  return (data || []).map(f => ({
    videoId: f.video_id,
    runId: f.run_id,
    title: f.title,
    durationText: f.duration_text,
    durationSeconds: f.duration_seconds,
    publishedAt: f.published_at,
    structureType: f.structure_type,
    proportions: f.proportions,
    hookElementCount: f.hook_element_count,
    blockCount: f.block_count,
    blocks: f.blocks,
  }));
}

export async function getFichaById(videoId: string) {
  const { data } = await supabase
    .from('fichas')
    .select('*')
    .eq('video_id', videoId)
    .single();
  if (!data) return null;
  return {
    videoId: data.video_id,
    runId: data.run_id,
    title: data.title,
    durationText: data.duration_text,
    durationSeconds: data.duration_seconds,
    publishedAt: data.published_at,
    structureType: data.structure_type,
    proportions: data.proportions,
    hookElementCount: data.hook_element_count,
    blockCount: data.block_count,
    blocks: data.blocks,
    sections: data.sections,
  };
}

export async function saveFichas(fichas: any[]) {
  const rows = fichas.map(f => ({
    video_id: f.videoId,
    run_id: f.runId,
    title: f.title,
    duration_text: f.durationText,
    duration_seconds: f.durationSeconds,
    published_at: f.publishedAt,
    structure_type: f.structureType,
    proportions: f.proportions,
    hook_element_count: f.hookElementCount,
    block_count: f.blockCount,
    blocks: f.blocks,
    sections: f.sections,
  }));
  await supabase.from('fichas').upsert(rows, { onConflict: 'video_id' });
}

export async function getCrossPatterns() {
  const { data } = await supabase
    .from('cross_patterns')
    .select('*')
    .eq('id', 'current')
    .single();
  return data?.data || null;
}

export async function saveCrossPatterns(patterns: any) {
  await supabase.from('cross_patterns').upsert({
    id: 'current',
    generated_at: patterns.generatedAt || new Date().toISOString(),
    total_videos: patterns.totalVideos,
    total_duration: patterns.totalDuration,
    data: patterns,
  });
}
