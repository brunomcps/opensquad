/**
 * setup-audience-intelligence.ts
 *
 * Fase 1 completa: cria tabelas, faz upload dos 11.050 comentários,
 * popula vídeos com métricas do YouTube, e computa superfãs.
 *
 * Uso: cd content-hub && npx tsx --env-file=../.env server/scripts/setup-audience-intelligence.ts
 */

import { supabase } from '../db/client.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Paths
const SCALE_DIR = path.resolve(__dirname, '../../../squads/yt-comments-v2/pipeline/data/scale');
const VIDEOS_DIR = path.resolve(__dirname, '../../../youtube/by-video/longos');
const VIDEO_TITLES_PATH = path.resolve(__dirname, '../../../squads/yt-comments-v2/pipeline/data/video-titles.json');

// Team accounts to exclude from audience analysis
const TEAM_ACCOUNTS = [
  '@JoaoTech_77', '@brumcp', '@nessa.portoca21', '@LucasMoura_92',
  '@alloreia', '@Brms1313', '@bmcps-123'
];

// ============================================================
// Step 1: Create tables
// ============================================================
async function createTables() {
  console.log('1. Criando tabelas...');

  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      -- Drop if exist (for re-runs)
      DROP TABLE IF EXISTS aud_insights CASCADE;
      DROP TABLE IF EXISTS aud_subclusters CASCADE;
      DROP TABLE IF EXISTS aud_demandas CASCADE;
      DROP TABLE IF EXISTS aud_superfans CASCADE;
      DROP TABLE IF EXISTS aud_comments CASCADE;
      DROP TABLE IF EXISTS aud_videos CASCADE;

      -- 1. aud_videos
      CREATE TABLE aud_videos (
        video_id text PRIMARY KEY,
        title text NOT NULL,
        published_at timestamptz,
        duration_seconds integer,
        views integer DEFAULT 0,
        likes integer DEFAULT 0,
        comment_count_yt integer DEFAULT 0,
        shares integer DEFAULT 0,
        subscribers_gained integer DEFAULT 0,
        avg_view_duration integer DEFAULT 0,
        avg_view_percentage real DEFAULT 0,
        estimated_minutes_watched integer DEFAULT 0,
        tags jsonb DEFAULT '[]'::jsonb,
        comment_count_classified integer DEFAULT 0,
        demand_count integer DEFAULT 0,
        demand_rate real DEFAULT 0,
        created_at timestamptz DEFAULT now()
      );

      -- 2. aud_comments
      CREATE TABLE aud_comments (
        id text PRIMARY KEY,
        video_id text REFERENCES aud_videos(video_id),
        video_title text,
        author_name text,
        author_channel_url text,
        text text,
        char_count integer DEFAULT 0,
        like_count integer DEFAULT 0,
        reply_count integer DEFAULT 0,
        published_at timestamptz,
        is_reply boolean DEFAULT false,
        is_channel_owner boolean DEFAULT false,
        is_team boolean DEFAULT false,
        peso_social integer DEFAULT 0,
        nome_detectado text,
        tipo text,
        tem_demanda boolean DEFAULT false,
        sentimento_geral text,
        elogio_tipo text,
        sinal_conteudo text DEFAULT 'ausente',
        sinal_conteudo_justificativa text,
        sinal_conteudo_sugestoes jsonb,
        sinal_produto text DEFAULT 'ausente',
        sinal_produto_justificativa text,
        sinal_produto_sugestoes jsonb,
        sinal_copy text DEFAULT 'ausente',
        sinal_copy_justificativa text,
        sinal_copy_sugestoes jsonb,
        sinal_metodo text DEFAULT 'ausente',
        sinal_metodo_justificativa text,
        sinal_metodo_sugestoes jsonb,
        perfil_genero text,
        perfil_faixa_etaria text,
        perfil_estado_civil text,
        perfil_filhos boolean,
        perfil_profissao text,
        perfil_diagnostico text,
        perfil_em_tratamento boolean,
        perfil_localizacao text,
        insights_extraidos jsonb DEFAULT '[]'::jsonb,
        linguagem_exata jsonb DEFAULT '[]'::jsonb,
        impacto_descrito text,
        created_at timestamptz DEFAULT now()
      );

      CREATE INDEX idx_aud_comments_video_id ON aud_comments(video_id);
      CREATE INDEX idx_aud_comments_tipo ON aud_comments(tipo);
      CREATE INDEX idx_aud_comments_sentimento ON aud_comments(sentimento_geral);
      CREATE INDEX idx_aud_comments_sinal_conteudo ON aud_comments(sinal_conteudo);
      CREATE INDEX idx_aud_comments_sinal_produto ON aud_comments(sinal_produto);
      CREATE INDEX idx_aud_comments_sinal_copy ON aud_comments(sinal_copy);
      CREATE INDEX idx_aud_comments_sinal_metodo ON aud_comments(sinal_metodo);
      CREATE INDEX idx_aud_comments_perfil_genero ON aud_comments(perfil_genero);
      CREATE INDEX idx_aud_comments_perfil_faixa_etaria ON aud_comments(perfil_faixa_etaria);
      CREATE INDEX idx_aud_comments_perfil_diagnostico ON aud_comments(perfil_diagnostico);
      CREATE INDEX idx_aud_comments_is_team ON aud_comments(is_team);
      CREATE INDEX idx_aud_comments_tem_demanda ON aud_comments(tem_demanda);
      CREATE INDEX idx_aud_comments_peso_social ON aud_comments(peso_social DESC);
      CREATE INDEX idx_aud_comments_is_channel_owner ON aud_comments(is_channel_owner);

      -- 3. aud_demandas
      CREATE TABLE aud_demandas (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        comment_id text REFERENCES aud_comments(id) ON DELETE CASCADE,
        tipo text,
        descricao text,
        categoria text,
        outro_descricao text
      );

      CREATE INDEX idx_aud_demandas_comment ON aud_demandas(comment_id);
      CREATE INDEX idx_aud_demandas_categoria ON aud_demandas(categoria);
      CREATE INDEX idx_aud_demandas_tipo ON aud_demandas(tipo);

      -- 4. aud_superfans
      CREATE TABLE aud_superfans (
        author_channel_url text PRIMARY KEY,
        author_name text,
        video_count integer DEFAULT 0,
        comment_count integer DEFAULT 0,
        total_likes integer DEFAULT 0,
        total_peso_social integer DEFAULT 0,
        is_superfan boolean DEFAULT false,
        is_team boolean DEFAULT false,
        perfil_genero text,
        perfil_diagnostico text,
        categorias_top jsonb DEFAULT '[]'::jsonb,
        sentimento_predominante text,
        elogios_qualificados integer DEFAULT 0,
        impactos jsonb DEFAULT '[]'::jsonb,
        primeiro_video text,
        ultimo_video text,
        sinais_fortes jsonb DEFAULT '{}'::jsonb,
        first_seen timestamptz,
        last_seen timestamptz
      );

      CREATE INDEX idx_aud_superfans_is_superfan ON aud_superfans(is_superfan);
      CREATE INDEX idx_aud_superfans_is_team ON aud_superfans(is_team);
      CREATE INDEX idx_aud_superfans_total_peso_social ON aud_superfans(total_peso_social DESC);

      -- 5. aud_subclusters
      CREATE TABLE aud_subclusters (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        dimension text NOT NULL,
        parent_value text NOT NULL,
        cluster_name text NOT NULL,
        cluster_description text,
        comment_ids jsonb DEFAULT '[]'::jsonb,
        example_quotes jsonb DEFAULT '[]'::jsonb,
        count integer DEFAULT 0,
        generated_at timestamptz DEFAULT now()
      );

      CREATE INDEX idx_aud_subclusters_dimension ON aud_subclusters(dimension, parent_value);

      -- 6. aud_insights
      CREATE TABLE aud_insights (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        level integer NOT NULL,
        dimension text,
        title text NOT NULL,
        narrative text,
        data_snapshot jsonb,
        generated_at timestamptz DEFAULT now()
      );

      CREATE INDEX idx_aud_insights_level ON aud_insights(level);
    `
  });

  if (error) {
    // rpc may not exist, try direct SQL via REST
    console.log('   RPC not available, using direct table creation...');
    await createTablesDirectly();
    return;
  }
  console.log('   Done.');
}

async function createTablesDirectly() {
  // Use supabase-js to check if tables exist, if not we need to use the dashboard
  // For now, let's check if aud_videos exists
  const { error } = await supabase.from('aud_videos').select('video_id').limit(1);

  if (error) {
    // Tables don't exist — save SQL and instruct user
    const sqlPath = path.resolve(__dirname, 'audience-intelligence-migration.sql');
    fs.writeFileSync(sqlPath, getMigrationSQL());
    console.log('\n   Tables do not exist yet.');
    console.log('   SQL saved to: ' + sqlPath);
    console.log('\n   Go to: https://supabase.com/dashboard/project/vdaualgktroizsttbrfh/sql/new');
    console.log('   Paste the SQL and click "Run".');
    console.log('   Then re-run this script.\n');
    process.exit(1);
  } else {
    console.log('   Tables already exist. Proceeding with data upload...');
  }
}

function getMigrationSQL(): string {
  return `
-- Drop existing tables (for clean re-run)
DROP TABLE IF EXISTS aud_insights CASCADE;
DROP TABLE IF EXISTS aud_subclusters CASCADE;
DROP TABLE IF EXISTS aud_demandas CASCADE;
DROP TABLE IF EXISTS aud_superfans CASCADE;
DROP TABLE IF EXISTS aud_comments CASCADE;
DROP TABLE IF EXISTS aud_videos CASCADE;

-- 1. aud_videos — 27 videos with YouTube metrics
CREATE TABLE aud_videos (
  video_id text PRIMARY KEY,
  title text NOT NULL,
  published_at timestamptz,
  duration_seconds integer,
  views integer DEFAULT 0,
  likes integer DEFAULT 0,
  comment_count_yt integer DEFAULT 0,
  shares integer DEFAULT 0,
  subscribers_gained integer DEFAULT 0,
  avg_view_duration integer DEFAULT 0,
  avg_view_percentage real DEFAULT 0,
  estimated_minutes_watched integer DEFAULT 0,
  tags jsonb DEFAULT '[]'::jsonb,
  comment_count_classified integer DEFAULT 0,
  demand_count integer DEFAULT 0,
  demand_rate real DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 2. aud_comments — 11,050 classified comments
CREATE TABLE aud_comments (
  id text PRIMARY KEY,
  video_id text REFERENCES aud_videos(video_id),
  video_title text,
  author_name text,
  author_channel_url text,
  text text,
  char_count integer DEFAULT 0,
  like_count integer DEFAULT 0,
  reply_count integer DEFAULT 0,
  published_at timestamptz,
  is_reply boolean DEFAULT false,
  is_channel_owner boolean DEFAULT false,
  is_team boolean DEFAULT false,
  peso_social integer DEFAULT 0,
  nome_detectado text,
  tipo text,
  tem_demanda boolean DEFAULT false,
  sentimento_geral text,
  elogio_tipo text,
  sinal_conteudo text DEFAULT 'ausente',
  sinal_conteudo_justificativa text,
  sinal_conteudo_sugestoes jsonb,
  sinal_produto text DEFAULT 'ausente',
  sinal_produto_justificativa text,
  sinal_produto_sugestoes jsonb,
  sinal_copy text DEFAULT 'ausente',
  sinal_copy_justificativa text,
  sinal_copy_sugestoes jsonb,
  sinal_metodo text DEFAULT 'ausente',
  sinal_metodo_justificativa text,
  sinal_metodo_sugestoes jsonb,
  perfil_genero text,
  perfil_faixa_etaria text,
  perfil_estado_civil text,
  perfil_filhos boolean,
  perfil_profissao text,
  perfil_diagnostico text,
  perfil_em_tratamento boolean,
  perfil_localizacao text,
  insights_extraidos jsonb DEFAULT '[]'::jsonb,
  linguagem_exata jsonb DEFAULT '[]'::jsonb,
  impacto_descrito text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_aud_comments_video_id ON aud_comments(video_id);
CREATE INDEX idx_aud_comments_tipo ON aud_comments(tipo);
CREATE INDEX idx_aud_comments_sentimento ON aud_comments(sentimento_geral);
CREATE INDEX idx_aud_comments_sinal_conteudo ON aud_comments(sinal_conteudo);
CREATE INDEX idx_aud_comments_sinal_produto ON aud_comments(sinal_produto);
CREATE INDEX idx_aud_comments_sinal_copy ON aud_comments(sinal_copy);
CREATE INDEX idx_aud_comments_sinal_metodo ON aud_comments(sinal_metodo);
CREATE INDEX idx_aud_comments_perfil_genero ON aud_comments(perfil_genero);
CREATE INDEX idx_aud_comments_perfil_faixa_etaria ON aud_comments(perfil_faixa_etaria);
CREATE INDEX idx_aud_comments_perfil_diagnostico ON aud_comments(perfil_diagnostico);
CREATE INDEX idx_aud_comments_is_team ON aud_comments(is_team);
CREATE INDEX idx_aud_comments_tem_demanda ON aud_comments(tem_demanda);
CREATE INDEX idx_aud_comments_peso_social ON aud_comments(peso_social DESC);
CREATE INDEX idx_aud_comments_is_channel_owner ON aud_comments(is_channel_owner);

-- 3. aud_demandas — demands (many-to-one with comments)
CREATE TABLE aud_demandas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id text REFERENCES aud_comments(id) ON DELETE CASCADE,
  tipo text,
  descricao text,
  categoria text,
  outro_descricao text
);

CREATE INDEX idx_aud_demandas_comment ON aud_demandas(comment_id);
CREATE INDEX idx_aud_demandas_categoria ON aud_demandas(categoria);
CREATE INDEX idx_aud_demandas_tipo ON aud_demandas(tipo);

-- 4. aud_superfans — materialized aggregates per commenter
CREATE TABLE aud_superfans (
  author_channel_url text PRIMARY KEY,
  author_name text,
  video_count integer DEFAULT 0,
  comment_count integer DEFAULT 0,
  total_likes integer DEFAULT 0,
  total_peso_social integer DEFAULT 0,
  is_superfan boolean DEFAULT false,
  is_team boolean DEFAULT false,
  perfil_genero text,
  perfil_diagnostico text,
  categorias_top jsonb DEFAULT '[]'::jsonb,
  sentimento_predominante text,
  elogios_qualificados integer DEFAULT 0,
  impactos jsonb DEFAULT '[]'::jsonb,
  primeiro_video text,
  ultimo_video text,
  sinais_fortes jsonb DEFAULT '{}'::jsonb,
  first_seen timestamptz,
  last_seen timestamptz
);

CREATE INDEX idx_aud_superfans_is_superfan ON aud_superfans(is_superfan);
CREATE INDEX idx_aud_superfans_is_team ON aud_superfans(is_team);
CREATE INDEX idx_aud_superfans_total_peso_social ON aud_superfans(total_peso_social DESC);

-- 5. aud_subclusters — semantic sub-groups (populated later)
CREATE TABLE aud_subclusters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dimension text NOT NULL,
  parent_value text NOT NULL,
  cluster_name text NOT NULL,
  cluster_description text,
  comment_ids jsonb DEFAULT '[]'::jsonb,
  example_quotes jsonb DEFAULT '[]'::jsonb,
  count integer DEFAULT 0,
  generated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_aud_subclusters_dimension ON aud_subclusters(dimension, parent_value);

-- 6. aud_insights — narrative insights (populated later)
CREATE TABLE aud_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level integer NOT NULL,
  dimension text,
  title text NOT NULL,
  narrative text,
  data_snapshot jsonb,
  generated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_aud_insights_level ON aud_insights(level);
`;
}

// ============================================================
// Step 2: Upload videos with YouTube metrics
// ============================================================
async function uploadVideos() {
  console.log('\n2. Uploading vídeos com métricas do YouTube...');

  const videoTitles: Record<string, string> = JSON.parse(fs.readFileSync(VIDEO_TITLES_PATH, 'utf-8'));
  const videoIds = Object.keys(videoTitles);
  const videos: any[] = [];

  for (const videoId of videoIds) {
    const videoDir = path.join(VIDEOS_DIR, videoId);
    let metadata: any = {};
    let analytics: any = {};

    const metaPath = path.join(videoDir, 'metadata.json');
    const analyticsPath = path.join(videoDir, 'analytics.json');

    if (fs.existsSync(metaPath)) {
      metadata = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    }
    if (fs.existsSync(analyticsPath)) {
      analytics = JSON.parse(fs.readFileSync(analyticsPath, 'utf-8'));
    }

    videos.push({
      video_id: videoId,
      title: videoTitles[videoId],
      published_at: metadata.published_at || null,
      duration_seconds: metadata.duration_seconds || null,
      views: metadata.statistics?.views || 0,
      likes: metadata.statistics?.likes || 0,
      comment_count_yt: metadata.statistics?.comments || 0,
      shares: analytics.metrics?.shares || 0,
      subscribers_gained: analytics.metrics?.subscribersGained || 0,
      avg_view_duration: analytics.metrics?.averageViewDuration || 0,
      avg_view_percentage: analytics.metrics?.averageViewPercentage || 0,
      estimated_minutes_watched: analytics.metrics?.estimatedMinutesWatched || 0,
      tags: metadata.tags || [],
    });
  }

  const { error } = await supabase.from('aud_videos').upsert(videos, { onConflict: 'video_id' });
  if (error) throw new Error(`Video upload failed: ${error.message}`);
  console.log(`   Done: ${videos.length} vídeos`);
  return videos;
}

// ============================================================
// Step 3: Upload classified comments
// ============================================================
async function uploadComments() {
  console.log('\n3. Uploading comentários classificados...');

  let totalComments = 0;
  let totalDemandas = 0;

  for (let g = 0; g <= 44; g++) {
    const groupStr = String(g).padStart(2, '0');
    const filePath = path.join(SCALE_DIR, `results-group-${groupStr}.json`);
    if (!fs.existsSync(filePath)) {
      console.warn(`   Skipping group ${groupStr} (not found)`);
      continue;
    }

    const rawComments: any[] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    // Transform and upload comments in batches of 100
    const comments = rawComments.map(c => ({
      id: c.id,
      video_id: c.videoId || null,
      video_title: c.videoTitle || null,
      author_name: c.authorName || null,
      author_channel_url: c.authorChannelUrl || null,
      text: c.text || null,
      char_count: c.char_count || 0,
      like_count: c.likeCount || 0,
      reply_count: c.replyCount || 0,
      published_at: c.publishedAt || null,
      is_reply: c.isReply || false,
      is_channel_owner: c.is_channel_owner || false,
      is_team: TEAM_ACCOUNTS.some(t => c.authorName === t),
      peso_social: c.peso_social || 0,
      nome_detectado: c.nome_detectado || null,
      tipo: c.tipo || null,
      tem_demanda: c.tem_demanda || false,
      sentimento_geral: c.sentimento_geral || null,
      elogio_tipo: c.elogio_tipo || null,
      sinal_conteudo: c.sinal_conteudo || 'ausente',
      sinal_conteudo_justificativa: c.sinal_conteudo_justificativa || null,
      sinal_conteudo_sugestoes: c.sinal_conteudo_sugestoes || null,
      sinal_produto: c.sinal_produto || 'ausente',
      sinal_produto_justificativa: c.sinal_produto_justificativa || null,
      sinal_produto_sugestoes: c.sinal_produto_sugestoes || null,
      sinal_copy: c.sinal_copy || 'ausente',
      sinal_copy_justificativa: c.sinal_copy_justificativa || null,
      sinal_copy_sugestoes: c.sinal_copy_sugestoes || null,
      sinal_metodo: c.sinal_metodo || 'ausente',
      sinal_metodo_justificativa: c.sinal_metodo_justificativa || null,
      sinal_metodo_sugestoes: c.sinal_metodo_sugestoes || null,
      perfil_genero: c.perfil?.genero || null,
      perfil_faixa_etaria: c.perfil?.faixa_etaria || null,
      perfil_estado_civil: c.perfil?.estado_civil || null,
      perfil_filhos: c.perfil?.filhos ?? null,
      perfil_profissao: c.perfil?.profissao || null,
      perfil_diagnostico: c.perfil?.diagnostico || null,
      perfil_em_tratamento: c.perfil?.em_tratamento ?? null,
      perfil_localizacao: c.perfil?.localizacao || null,
      insights_extraidos: c.insights_extraidos || [],
      linguagem_exata: c.linguagem_exata || [],
      impacto_descrito: c.impacto_descrito || null,
    }));

    // Batch upsert (100 at a time)
    for (let i = 0; i < comments.length; i += 100) {
      const batch = comments.slice(i, i + 100);
      const { error } = await supabase.from('aud_comments').upsert(batch, { onConflict: 'id' });
      if (error) throw new Error(`Comment upload failed at group ${groupStr}, batch ${i}: ${error.message}`);
    }

    // Upload demandas
    const demandas: any[] = [];
    for (const c of rawComments) {
      if (!c.demandas_detectadas || c.demandas_detectadas.length === 0) continue;
      for (const d of c.demandas_detectadas) {
        demandas.push({
          comment_id: c.id,
          tipo: d.tipo || null,
          descricao: d.descricao || null,
          categoria: d.categoria || null,
          outro_descricao: d.outro_descricao || null,
        });
      }
    }

    if (demandas.length > 0) {
      // Delete existing demandas for these comments first (for idempotency)
      const commentIds = rawComments.map(c => c.id);
      await supabase.from('aud_demandas').delete().in('comment_id', commentIds);

      for (let i = 0; i < demandas.length; i += 100) {
        const batch = demandas.slice(i, i + 100);
        const { error } = await supabase.from('aud_demandas').insert(batch);
        if (error) throw new Error(`Demandas upload failed at group ${groupStr}, batch ${i}: ${error.message}`);
      }
    }

    totalComments += comments.length;
    totalDemandas += demandas.length;
    process.stdout.write(`   Grupo ${groupStr}: ${comments.length} comentários, ${demandas.length} demandas\n`);
  }

  console.log(`   Done: ${totalComments} comentários, ${totalDemandas} demandas`);
  return { totalComments, totalDemandas };
}

// ============================================================
// Step 4: Update video computed metrics
// ============================================================
async function updateVideoMetrics() {
  console.log('\n4. Atualizando métricas computadas dos vídeos...');

  // Get counts per video
  const { data: commentCounts } = await supabase
    .from('aud_comments')
    .select('video_id')
    .not('is_channel_owner', 'eq', true);

  const { data: demandCounts } = await supabase
    .from('aud_demandas')
    .select('comment_id, categoria');

  // Get comment_id → video_id mapping
  const { data: commentVideoMap } = await supabase
    .from('aud_comments')
    .select('id, video_id');

  const commentToVideo: Record<string, string> = {};
  for (const row of commentVideoMap || []) {
    commentToVideo[row.id] = row.video_id;
  }

  // Count per video
  const videoCommentCounts: Record<string, number> = {};
  const videoDemandCounts: Record<string, number> = {};

  for (const row of commentCounts || []) {
    videoCommentCounts[row.video_id] = (videoCommentCounts[row.video_id] || 0) + 1;
  }

  for (const row of demandCounts || []) {
    const vid = commentToVideo[row.comment_id];
    if (vid) videoDemandCounts[vid] = (videoDemandCounts[vid] || 0) + 1;
  }

  // Update each video
  const { data: videos } = await supabase.from('aud_videos').select('video_id');
  for (const v of videos || []) {
    const cc = videoCommentCounts[v.video_id] || 0;
    const dc = videoDemandCounts[v.video_id] || 0;
    await supabase.from('aud_videos').update({
      comment_count_classified: cc,
      demand_count: dc,
      demand_rate: cc > 0 ? Math.round(dc / cc * 1000) / 10 : 0,
    }).eq('video_id', v.video_id);
  }

  console.log('   Done.');
}

// ============================================================
// Step 5: Compute superfans
// ============================================================
async function computeSuperfans() {
  console.log('\n5. Computando superfãs...');

  // Fetch all public comments
  const allComments: any[] = [];
  let offset = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('aud_comments')
      .select('*')
      .eq('is_channel_owner', false)
      .range(offset, offset + PAGE - 1);
    if (error) throw new Error(`Fetch comments failed: ${error.message}`);
    if (!data || data.length === 0) break;
    allComments.push(...data);
    offset += PAGE;
  }

  console.log(`   ${allComments.length} comentários públicos carregados`);

  // Group by author
  const authors: Record<string, any> = {};
  for (const c of allComments) {
    const key = c.author_channel_url || c.author_name;
    if (!authors[key]) {
      authors[key] = {
        author_channel_url: c.author_channel_url || c.author_name,
        author_name: c.author_name,
        videos: new Set<string>(),
        comment_count: 0,
        total_likes: 0,
        total_peso_social: 0,
        is_team: c.is_team,
        generos: {} as Record<string, number>,
        diagnosticos: {} as Record<string, number>,
        categorias: {} as Record<string, number>,
        sentimentos: {} as Record<string, number>,
        elogios_qualificados: 0,
        impactos: [] as string[],
        sinais_fortes: { conteudo: 0, produto: 0, copy: 0, metodo: 0 },
        dates: [] as string[],
        videoTitles: {} as Record<string, string>,
      };
    }
    const a = authors[key];
    a.comment_count++;
    if (c.video_id) {
      a.videos.add(c.video_id);
      a.videoTitles[c.video_id] = c.video_title;
    }
    a.total_likes += c.like_count || 0;
    a.total_peso_social += c.peso_social || 0;
    if (c.published_at) a.dates.push(c.published_at);

    // Profile aggregation
    if (c.perfil_genero) a.generos[c.perfil_genero] = (a.generos[c.perfil_genero] || 0) + 1;
    if (c.perfil_diagnostico) a.diagnosticos[c.perfil_diagnostico] = (a.diagnosticos[c.perfil_diagnostico] || 0) + 1;
    if (c.sentimento_geral) a.sentimentos[c.sentimento_geral] = (a.sentimentos[c.sentimento_geral] || 0) + 1;

    // Signals
    if (c.sinal_conteudo === 'forte') a.sinais_fortes.conteudo++;
    if (c.sinal_produto === 'forte') a.sinais_fortes.produto++;
    if (c.sinal_copy === 'forte') a.sinais_fortes.copy++;
    if (c.sinal_metodo === 'forte') a.sinais_fortes.metodo++;

    // Elogios
    if (c.elogio_tipo === 'qualificado') {
      a.elogios_qualificados++;
      if (c.impacto_descrito) a.impactos.push(c.impacto_descrito);
    }
  }

  // Get demandas for category aggregation
  const { data: allDemandas } = await supabase.from('aud_demandas').select('comment_id, categoria');
  const commentAuthorMap: Record<string, string> = {};
  for (const c of allComments) {
    commentAuthorMap[c.id] = c.author_channel_url || c.author_name;
  }
  for (const d of allDemandas || []) {
    const authorKey = commentAuthorMap[d.comment_id];
    if (authorKey && authors[authorKey]) {
      authors[authorKey].categorias[d.categoria] = (authors[authorKey].categorias[d.categoria] || 0) + 1;
    }
  }

  // Build superfan rows
  const topVal = (obj: Record<string, number>) => {
    const entries = Object.entries(obj);
    if (entries.length === 0) return null;
    return entries.sort((a, b) => b[1] - a[1])[0][0];
  };

  const topN = (obj: Record<string, number>, n: number) => {
    return Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => ({ categoria: k, count: v }));
  };

  const superfanRows = Object.values(authors).map((a: any) => {
    const videoCount = a.videos.size;
    const sortedDates = a.dates.sort();
    return {
      author_channel_url: a.author_channel_url,
      author_name: a.author_name,
      video_count: videoCount,
      comment_count: a.comment_count,
      total_likes: a.total_likes,
      total_peso_social: a.total_peso_social,
      is_superfan: videoCount >= 2 || a.comment_count >= 3,
      is_team: a.is_team,
      perfil_genero: topVal(a.generos),
      perfil_diagnostico: topVal(a.diagnosticos),
      categorias_top: topN(a.categorias, 3),
      sentimento_predominante: topVal(a.sentimentos),
      elogios_qualificados: a.elogios_qualificados,
      impactos: a.impactos.slice(0, 5),
      primeiro_video: a.videoTitles[Array.from(a.videos)[0] as string] || null,
      ultimo_video: a.videoTitles[Array.from(a.videos).pop() as string] || null,
      sinais_fortes: a.sinais_fortes,
      first_seen: sortedDates[0] || null,
      last_seen: sortedDates[sortedDates.length - 1] || null,
    };
  });

  // Clear and insert (batches of 100)
  await supabase.from('aud_superfans').delete().neq('author_channel_url', '');
  for (let i = 0; i < superfanRows.length; i += 100) {
    const batch = superfanRows.slice(i, i + 100);
    const { error } = await supabase.from('aud_superfans').insert(batch);
    if (error) throw new Error(`Superfans insert failed at batch ${i}: ${error.message}`);
  }

  const realSuperfans = superfanRows.filter(s => s.is_superfan && !s.is_team).length;
  console.log(`   Done: ${superfanRows.length} comentaristas, ${realSuperfans} superfãs reais`);
}

// ============================================================
// Step 6: Validate
// ============================================================
async function validate() {
  console.log('\n6. Validando...');

  const { count: videoCount } = await supabase.from('aud_videos').select('*', { count: 'exact', head: true });
  const { count: commentCount } = await supabase.from('aud_comments').select('*', { count: 'exact', head: true });
  const { count: demandaCount } = await supabase.from('aud_demandas').select('*', { count: 'exact', head: true });
  const { count: superfanCount } = await supabase.from('aud_superfans').select('*', { count: 'exact', head: true }).eq('is_superfan', true).eq('is_team', false);
  const { count: teamCount } = await supabase.from('aud_comments').select('*', { count: 'exact', head: true }).eq('is_team', true);

  console.log(`   Videos:     ${videoCount} (expected: 27)`);
  console.log(`   Comments:   ${commentCount} (expected: 11050)`);
  console.log(`   Demandas:   ${demandaCount} (expected: ~2655)`);
  console.log(`   Superfans:  ${superfanCount} (expected: ~947)`);
  console.log(`   Team flags: ${teamCount}`);

  const ok = (videoCount || 0) >= 27 && (commentCount || 0) >= 11000;
  console.log(ok ? '\n   All good!' : '\n   Some counts are off — please check.');
}

// ============================================================
// Main
// ============================================================
async function main() {
  console.log('=== Audience Intelligence — Setup ===\n');

  try {
    await createTables();
    await uploadVideos();
    await uploadComments();
    await updateVideoMetrics();
    await computeSuperfans();
    await validate();
    console.log('\nSetup completo!');
  } catch (err: any) {
    console.error('\nErro:', err.message);
    process.exit(1);
  }
}

main();
