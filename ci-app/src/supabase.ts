import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

export const configurationError = !url || !publishableKey
  ? 'VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY precisam estar configuradas.'
  : null;

export const supabase = createClient(
  url || 'https://invalid.local',
  publishableKey || 'missing-publishable-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);

export const functionsBaseUrl = url ? `${url}/functions/v1` : '';
