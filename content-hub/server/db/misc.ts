import { supabase } from './client.js';

// -- Content Groups --
export async function getContentGroups() {
  const { data } = await supabase.from('content_groups').select('*').order('created_at', { ascending: false });
  return (data || []).map(g => ({ id: g.id, name: g.name, createdAt: g.created_at, platforms: g.platforms }));
}

export async function saveContentGroups(groups: any[]) {
  const rows = groups.map(g => ({ id: g.id, name: g.name, created_at: g.createdAt, platforms: g.platforms }));
  await supabase.from('content_groups').upsert(rows, { onConflict: 'id' });
}

// -- B-Rolls --
export async function getBRolls() {
  const { data } = await supabase.from('brolls').select('*').order('created_at', { ascending: false });
  return (data || []).map(b => ({
    id: b.id, filename: b.filename, filepath: b.filepath, thumbnailPath: b.thumbnail_url,
    duration: b.duration, resolution: b.resolution, aspectRatio: b.aspect_ratio,
    fileSize: b.file_size, description: b.description, tags: b.tags || [],
    source: b.source, prompt: b.prompt, createdAt: b.created_at, usedIn: b.used_in || [],
  }));
}

export async function saveBRolls(brolls: any[]) {
  const rows = brolls.map(b => ({
    id: b.id, filename: b.filename, filepath: b.filepath, thumbnail_url: b.thumbnailPath || b.thumbnail_url,
    duration: b.duration, resolution: b.resolution, aspect_ratio: b.aspectRatio,
    file_size: b.fileSize, description: b.description, tags: b.tags,
    source: b.source, prompt: b.prompt, created_at: b.createdAt, used_in: b.usedIn,
  }));
  await supabase.from('brolls').upsert(rows, { onConflict: 'id' });
}

// -- Productions --
export async function getProductions() {
  const { data } = await supabase.from('productions').select('*').order('updated_at', { ascending: false });
  return (data || []).map(p => ({
    id: p.id, title: p.title, titleVariations: p.title_variations, description: p.description,
    tags: p.tags, status: p.status, plannedDate: p.planned_date, youtubeId: p.youtube_id,
    script: p.script, rawVideoPath: p.raw_video_path, thumbnailPath: p.thumbnail_url,
    thumbnailText: p.thumbnail_text, thumbnailTextVariations: p.thumbnail_text_variations,
    thumbnailPrompt: p.thumbnail_prompt, blocks: p.blocks, ideaNote: p.idea_note,
    ideaSource: p.idea_source, createdAt: p.created_at, updatedAt: p.updated_at,
  }));
}

export async function saveProduction(prod: any) {
  await supabase.from('productions').upsert({
    id: prod.id, title: prod.title, title_variations: prod.titleVariations,
    description: prod.description, tags: prod.tags, status: prod.status,
    planned_date: prod.plannedDate, youtube_id: prod.youtubeId, script: prod.script,
    raw_video_path: prod.rawVideoPath, thumbnail_url: prod.thumbnailPath,
    thumbnail_text: prod.thumbnailText, thumbnail_text_variations: prod.thumbnailTextVariations,
    thumbnail_prompt: prod.thumbnailPrompt, blocks: prod.blocks,
    idea_note: prod.ideaNote, idea_source: prod.ideaSource,
    created_at: prod.createdAt || new Date().toISOString(),
    updated_at: prod.updatedAt || new Date().toISOString(),
  }, { onConflict: 'id' });
}

export async function deleteProduction(id: string) {
  await supabase.from('productions').delete().eq('id', id);
}

// -- Publications --
export async function getPublications() {
  const { data } = await supabase.from('publications').select('*').order('created_at', { ascending: false });
  return (data || []).map(p => ({
    id: p.id, title: p.title, description: p.description, thumbnail: p.thumbnail,
    sourceFile: p.source_file, contentType: p.content_type, squad: p.squad,
    createdAt: p.created_at, platforms: p.platforms,
  }));
}

export async function savePublication(pub: any) {
  await supabase.from('publications').upsert({
    id: pub.id, title: pub.title, description: pub.description, thumbnail: pub.thumbnail,
    source_file: pub.sourceFile, content_type: pub.contentType, squad: pub.squad,
    created_at: pub.createdAt, platforms: pub.platforms,
  }, { onConflict: 'id' });
}

// -- API Tokens --
export async function getApiToken(platform: string) {
  const { data } = await supabase.from('api_tokens').select('*').eq('platform', platform).single();
  if (!data) return null;
  return { token: data.encrypted_token, refreshedAt: data.refreshed_at, expiresIn: data.expires_in };
}

export async function saveApiToken(platform: string, token: string, refreshedAt: string, expiresIn: number) {
  await supabase.from('api_tokens').upsert({
    platform, encrypted_token: token, refreshed_at: refreshedAt, expires_in: expiresIn,
  }, { onConflict: 'platform' });
}
