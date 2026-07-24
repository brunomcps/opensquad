/**
 * create-radar-tables.ts — Cria as tabelas do Radar de Viral do Nicho via Postgres direto.
 *
 * Uso: npx tsx server/scripts/create-radar-tables.ts <SUPABASE_DB_PASSWORD>
 *
 * Senha em: https://supabase.com/dashboard/project/vdaualgktroizsttbrfh/settings/database
 * (Database Settings → Connection string → Password)
 *
 * Módulo independente. NÃO mexe no viral-radar antigo.
 */

import postgres from 'postgres';

const DB_PASSWORD = process.argv[2];
if (!DB_PASSWORD) {
  console.error('Usage: npx tsx server/scripts/create-radar-tables.ts <DB_PASSWORD>');
  console.error('Senha: https://supabase.com/dashboard/project/vdaualgktroizsttbrfh/settings/database');
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
  const [{ now }] = await sql`SELECT now()`;
  console.log('Connected:', now);

  await sql`
    CREATE TABLE IF NOT EXISTS radar_channels (
      channel_id        text PRIMARY KEY,
      name              text NOT NULL,
      track             text NOT NULL CHECK (track IN ('br','gringo')),
      subscribers       bigint,
      uploads_playlist  text,
      active            boolean NOT NULL DEFAULT true,
      origin            text NOT NULL DEFAULT 'curated' CHECK (origin IN ('curated','discovered')),
      created_at        timestamptz NOT NULL DEFAULT now()
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS radar_videos (
      video_id      text PRIMARY KEY,
      channel_id    text NOT NULL REFERENCES radar_channels(channel_id),
      title         text,
      published_at  timestamptz,
      duration_sec  int,
      thumb_url     text,
      track         text NOT NULL,
      first_seen    timestamptz NOT NULL DEFAULT now()
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS radar_snapshots (
      id         bigserial PRIMARY KEY,
      video_id   text NOT NULL REFERENCES radar_videos(video_id),
      snap_date  date NOT NULL,
      views      bigint NOT NULL,
      likes      bigint,
      comments   bigint,
      UNIQUE (video_id, snap_date)
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS radar_findings (
      id             bigserial PRIMARY KEY,
      video_id       text NOT NULL REFERENCES radar_videos(video_id),
      detected_on    date NOT NULL,
      score          numeric NOT NULL,
      outlier_score  numeric,
      velocity       numeric,
      track          text NOT NULL,
      status         text NOT NULL DEFAULT 'novo' CHECK (status IN ('novo','visto','usado')),
      UNIQUE (video_id, detected_on)
    )`;

  // índices úteis pra leitura do dashboard e do detector
  await sql`CREATE INDEX IF NOT EXISTS idx_radar_snapshots_video ON radar_snapshots(video_id, snap_date DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_radar_findings_date ON radar_findings(detected_on DESC, track)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_radar_videos_channel ON radar_videos(channel_id)`;

  console.log('Radar tables ready.');
  await sql.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
