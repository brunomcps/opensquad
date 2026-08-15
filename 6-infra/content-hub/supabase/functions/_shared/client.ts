import { createClient } from 'npm:@supabase/supabase-js@2.100.1';
import { CommercialIntelligenceError } from './errors.ts';
import { SupabaseEdgeRepository } from './repository.ts';

export function serviceClient() {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) {
    throw new CommercialIntelligenceError('database_not_configured', 'Banco não configurado.', 503);
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function edgeRepository() {
  return new SupabaseEdgeRepository(serviceClient());
}
