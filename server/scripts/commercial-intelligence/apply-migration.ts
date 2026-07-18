import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationPaths = [
  path.join(__dirname, '001-base.sql'),
  path.resolve(__dirname, '../../../supabase/migrations/20260713180000_ci_edge_app.sql'),
  path.resolve(__dirname, '../../../supabase/migrations/20260713230000_ci_campaign_tracking.sql'),
  path.resolve(__dirname, '../../../supabase/migrations/20260714193000_ci_campaign_comment_reply.sql'),
  path.resolve(__dirname, '../../../supabase/migrations/20260715120000_ci_tracking_history.sql'),
  path.resolve(__dirname, '../../../supabase/migrations/20260715130000_ci_hotmart_reconciliation_repair.sql'),
  path.resolve(__dirname, '../../../supabase/migrations/20260717021000_ci_youtube_card_tracking.sql'),
];
const apply = process.argv.includes('--apply');
const verify = process.argv.includes('--verify');

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function assertMigrations(sqlByName: Array<{ name: string; sql: string }>): void {
  const combined = sqlByName.map(item => item.sql).join('\n');
  if (!sqlByName.some(item => item.name === '20260715130000_ci_hotmart_reconciliation_repair.sql')) {
    throw new Error('Unexpected migrations: Hotmart reconciliation repair is missing');
  }
  if (!sqlByName.some(item => item.name === '20260717021000_ci_youtube_card_tracking.sql')) {
    throw new Error('Unexpected migrations: YouTube card tracking is missing');
  }
  if (!combined.includes('create table if not exists public.ci_youtube_videos')) {
    throw new Error('Unexpected migrations: ci_youtube_videos is missing');
  }
  if (!combined.includes('create or replace function public.ci_apply_hotmart_event')) {
    throw new Error('Unexpected migrations: ci_apply_hotmart_event is missing');
  }
  if (!combined.includes('create table if not exists public.ci_app_members')) {
    throw new Error('Unexpected migrations: ci_app_members is missing');
  }
  if (!combined.includes('create or replace function public.ci_acquire_sync_lock')) {
    throw new Error('Unexpected migrations: ci_acquire_sync_lock is missing');
  }
  if (!combined.includes('create table if not exists public.ci_campaigns')) {
    throw new Error('Unexpected migrations: ci_campaigns is missing');
  }
  if (!combined.includes('create table if not exists public.ci_click_events')) {
    throw new Error('Unexpected migrations: ci_click_events is missing');
  }
  if (!combined.includes('create table if not exists public.ci_operational_events')) {
    throw new Error('Unexpected migrations: ci_operational_events is missing');
  }
  if (!combined.includes('create or replace function public.ci_tracking_series')) {
    throw new Error('Unexpected migrations: ci_tracking_series is missing');
  }
  if (!combined.includes('create or replace function public.ci_tracking_events')) {
    throw new Error('Unexpected migrations: ci_tracking_events is missing');
  }
  if (/\bdrop\s+(table|schema|function)\b/i.test(combined)) {
    throw new Error('Destructive DROP statement found');
  }
}

async function main(): Promise<void> {
  const migrations = migrationPaths.map(migrationPath => ({
    name: path.basename(migrationPath),
    sql: fs.readFileSync(migrationPath, 'utf8'),
  }));
  assertMigrations(migrations);

  if (!apply && !verify) {
    console.log(JSON.stringify({
      ok: true,
      mode: 'check',
      migrations: migrations.map(migration => ({
        name: migration.name,
        bytes: Buffer.byteLength(migration.sql),
      })),
    }));
    return;
  }

  const url = requireEnv('SUPABASE_URL');
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (apply) {
    for (const migration of migrations) {
      const { error: migrationError } = await supabase.rpc('exec_sql', { sql: migration.sql });
      if (migrationError) {
        throw new Error(`Migration RPC failed for ${migration.name}: ${migrationError.code || 'unknown'}`);
      }
    }
  }

  const tables = [
    'ci_youtube_videos',
    'ci_youtube_daily',
    'ci_hotmart_transactions',
    'ci_hotmart_events',
    'ci_sync_runs',
    'ci_app_members',
    'ci_sync_locks',
    'ci_campaigns',
    'ci_click_events',
    'ci_operational_events',
  ] as const;
  const counts: Record<string, number | null> = {};

  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
    if (error) throw new Error(`Verification failed for ${table}: ${error.code || 'unknown'}`);
    counts[table] = count;
  }

  console.log(JSON.stringify({
    ok: true,
    mode: apply ? 'apply' : 'verify',
    migrations: migrations.map(migration => migration.name),
    tables: counts,
  }));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown migration failure';
  console.error(JSON.stringify({ ok: false, error: message }));
  process.exitCode = 1;
});
