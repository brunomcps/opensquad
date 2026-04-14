/**
 * create-aud-tables.ts — Creates Audience Intelligence tables via direct Postgres connection
 *
 * Usage: npx tsx server/scripts/create-aud-tables.ts <SUPABASE_DB_PASSWORD>
 *
 * Get your password from: https://supabase.com/dashboard/project/vdaualgktroizsttbrfh/settings/database
 * (Database Settings → Connection string → Password)
 */

import postgres from 'postgres';

const DB_PASSWORD = process.argv[2];
if (!DB_PASSWORD) {
  console.error('Usage: npx tsx server/scripts/create-aud-tables.ts <DB_PASSWORD>');
  console.error('Get it from: https://supabase.com/dashboard/project/vdaualgktroizsttbrfh/settings/database');
  process.exit(1);
}

const sql = postgres({
  host: 'db.vdaualgktroizsttbrfh.supabase.co',
  port: 5432,
  database: 'postgres',
  username: 'postgres',
  password: DB_PASSWORD,
  ssl: 'require',
});

async function main() {
  console.log('Connecting to Supabase Postgres...');

  // Test connection
  const [{ now }] = await sql`SELECT now()`;
  console.log('Connected:', now);

  console.log('\nDropping existing tables...');
  await sql`DROP TABLE IF EXISTS aud_insights CASCADE`;
  await sql`DROP TABLE IF EXISTS aud_subclusters CASCADE`;
  await sql`DROP TABLE IF EXISTS aud_demandas CASCADE`;
  await sql`DROP TABLE IF EXISTS aud_superfans CASCADE`;
  await sql`DROP TABLE IF EXISTS aud_comments CASCADE`;
  await sql`DROP TABLE IF EXISTS aud_videos CASCADE`;

  console.log('Creating aud_videos...');
  await sql`
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
    )
  `;

  console.log('Creating aud_comments...');
  await sql`
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
    )
  `;

  console.log('Creating indexes on aud_comments...');
  await sql`CREATE INDEX idx_aud_comments_video_id ON aud_comments(video_id)`;
  await sql`CREATE INDEX idx_aud_comments_tipo ON aud_comments(tipo)`;
  await sql`CREATE INDEX idx_aud_comments_sentimento ON aud_comments(sentimento_geral)`;
  await sql`CREATE INDEX idx_aud_comments_sinal_conteudo ON aud_comments(sinal_conteudo)`;
  await sql`CREATE INDEX idx_aud_comments_sinal_produto ON aud_comments(sinal_produto)`;
  await sql`CREATE INDEX idx_aud_comments_sinal_copy ON aud_comments(sinal_copy)`;
  await sql`CREATE INDEX idx_aud_comments_sinal_metodo ON aud_comments(sinal_metodo)`;
  await sql`CREATE INDEX idx_aud_comments_perfil_genero ON aud_comments(perfil_genero)`;
  await sql`CREATE INDEX idx_aud_comments_perfil_faixa_etaria ON aud_comments(perfil_faixa_etaria)`;
  await sql`CREATE INDEX idx_aud_comments_perfil_diagnostico ON aud_comments(perfil_diagnostico)`;
  await sql`CREATE INDEX idx_aud_comments_is_team ON aud_comments(is_team)`;
  await sql`CREATE INDEX idx_aud_comments_tem_demanda ON aud_comments(tem_demanda)`;
  await sql`CREATE INDEX idx_aud_comments_peso_social ON aud_comments(peso_social DESC)`;
  await sql`CREATE INDEX idx_aud_comments_is_channel_owner ON aud_comments(is_channel_owner)`;

  console.log('Creating aud_demandas...');
  await sql`
    CREATE TABLE aud_demandas (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      comment_id text REFERENCES aud_comments(id) ON DELETE CASCADE,
      tipo text,
      descricao text,
      categoria text,
      outro_descricao text
    )
  `;
  await sql`CREATE INDEX idx_aud_demandas_comment ON aud_demandas(comment_id)`;
  await sql`CREATE INDEX idx_aud_demandas_categoria ON aud_demandas(categoria)`;
  await sql`CREATE INDEX idx_aud_demandas_tipo ON aud_demandas(tipo)`;

  console.log('Creating aud_superfans...');
  await sql`
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
    )
  `;
  await sql`CREATE INDEX idx_aud_superfans_is_superfan ON aud_superfans(is_superfan)`;
  await sql`CREATE INDEX idx_aud_superfans_is_team ON aud_superfans(is_team)`;
  await sql`CREATE INDEX idx_aud_superfans_total_peso_social ON aud_superfans(total_peso_social DESC)`;

  console.log('Creating aud_subclusters...');
  await sql`
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
    )
  `;
  await sql`CREATE INDEX idx_aud_subclusters_dimension ON aud_subclusters(dimension, parent_value)`;

  console.log('Creating aud_insights...');
  await sql`
    CREATE TABLE aud_insights (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      level integer NOT NULL,
      dimension text,
      title text NOT NULL,
      narrative text,
      data_snapshot jsonb,
      generated_at timestamptz DEFAULT now()
    )
  `;
  await sql`CREATE INDEX idx_aud_insights_level ON aud_insights(level)`;

  // Disable RLS on all tables (same pattern as existing tables)
  console.log('\nDisabling RLS...');
  for (const table of ['aud_videos', 'aud_comments', 'aud_demandas', 'aud_superfans', 'aud_subclusters', 'aud_insights']) {
    await sql`ALTER TABLE ${sql(table)} ENABLE ROW LEVEL SECURITY`;
    await sql.unsafe(`CREATE POLICY "Allow all for anon" ON ${table} FOR ALL TO anon USING (true) WITH CHECK (true)`);
  }

  console.log('\nAll tables created successfully!');

  // Verify
  const tables = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name LIKE 'aud_%'
    ORDER BY table_name
  `;
  console.log('\nTables created:');
  for (const t of tables) console.log('  -', t.table_name);

  await sql.end();
}

main().catch(async (err) => {
  console.error('Error:', err.message);
  await sql.end();
  process.exit(1);
});
