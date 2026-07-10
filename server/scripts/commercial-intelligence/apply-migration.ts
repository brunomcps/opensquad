import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationPath = path.join(__dirname, '001-base.sql');
const apply = process.argv.includes('--apply');
const verify = process.argv.includes('--verify');

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function assertMigration(sql: string): void {
  if (!sql.includes('create table if not exists public.ci_youtube_videos')) {
    throw new Error('Unexpected migration: ci_youtube_videos is missing');
  }
  if (!sql.includes('create or replace function public.ci_apply_hotmart_event')) {
    throw new Error('Unexpected migration: ci_apply_hotmart_event is missing');
  }
  if (/\bdrop\s+(table|schema|function)\b/i.test(sql)) {
    throw new Error('Destructive DROP statement found');
  }
}

async function main(): Promise<void> {
  const sql = fs.readFileSync(migrationPath, 'utf8');
  assertMigration(sql);

  if (!apply && !verify) {
    console.log(JSON.stringify({
      ok: true,
      mode: 'check',
      migration: path.basename(migrationPath),
      bytes: Buffer.byteLength(sql),
    }));
    return;
  }

  const url = requireEnv('SUPABASE_URL');
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (apply) {
    const { error: migrationError } = await supabase.rpc('exec_sql', { sql });
    if (migrationError) {
      throw new Error(`Migration RPC failed: ${migrationError.code || 'unknown'}`);
    }
  }

  const tables = [
    'ci_youtube_videos',
    'ci_youtube_daily',
    'ci_hotmart_transactions',
    'ci_hotmart_events',
    'ci_sync_runs',
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
    migration: path.basename(migrationPath),
    tables: counts,
  }));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown migration failure';
  console.error(JSON.stringify({ ok: false, error: message }));
  process.exitCode = 1;
});
