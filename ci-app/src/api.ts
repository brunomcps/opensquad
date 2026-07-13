import type { DataQualityReport } from '../../src/types/commercialIntelligence';
import { functionsBaseUrl, supabase } from './supabase';

export type MemberRole = 'viewer' | 'admin';

interface FunctionErrorPayload {
  error?: { code?: string; message?: string } | string;
}

export class CommercialIntelligenceApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'CommercialIntelligenceApiError';
  }
}

async function request<T>(functionName: string, init?: RequestInit, retry = true): Promise<T> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    throw new CommercialIntelligenceApiError('unauthorized', 'Sua sessão expirou.', 401);
  }

  const response = await fetch(`${functionsBaseUrl}/${functionName}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${data.session.access_token}`,
      ...(init?.headers || {}),
    },
  });

  if (response.status === 401 && retry) {
    const refreshed = await supabase.auth.refreshSession();
    if (refreshed.data.session) return request<T>(functionName, init, false);
  }

  const payload = await response.json().catch(() => ({})) as T & FunctionErrorPayload;
  if (!response.ok) {
    const error = typeof payload.error === 'object' ? payload.error : undefined;
    throw new CommercialIntelligenceApiError(
      error?.code || 'request_failed',
      error?.message || 'Não foi possível concluir a solicitação.',
      response.status,
    );
  }
  return payload;
}

export async function getQuality(): Promise<{ quality: DataQualityReport; member: { role: MemberRole } }> {
  const result = await request<{ ok: true; quality: DataQualityReport; member: { role: MemberRole } }>('ci-quality');
  return { quality: result.quality, member: result.member };
}

export async function runSync(source: 'youtube' | 'hotmart'): Promise<void> {
  await request(`ci-sync-${source}`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}
