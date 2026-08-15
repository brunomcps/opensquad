import { secureEqual } from './crypto.ts';
import { CommercialIntelligenceError } from './errors.ts';
import type { Member, MemberRole } from './types.ts';

type SupabaseLike = any;

function bearer(request: Request): string | null {
  const value = request.headers.get('authorization');
  return value?.match(/^Bearer\s+(.+)$/i)?.[1] || null;
}

function roleAllows(actual: MemberRole, required: MemberRole): boolean {
  return actual === 'admin' || required === 'viewer';
}

export async function authorizeMember(
  request: Request,
  client: SupabaseLike,
  requiredRole: MemberRole = 'viewer',
): Promise<Member> {
  const token = bearer(request);
  if (!token) throw new CommercialIntelligenceError('unauthorized', 'Sessão necessária.', 401);

  const userResult = await client.auth.getUser(token);
  if (userResult.error || !userResult.data?.user?.id) {
    throw new CommercialIntelligenceError('unauthorized', 'Sessão inválida ou expirada.', 401);
  }

  const membership = await client
    .from('ci_app_members')
    .select('role,enabled')
    .eq('user_id', userResult.data.user.id)
    .maybeSingle();
  if (membership.error) {
    throw new CommercialIntelligenceError('membership_check_failed', 'Não foi possível validar o acesso.', 503);
  }
  if (!membership.data || !membership.data.enabled) {
    throw new CommercialIntelligenceError('membership_required', 'Conta sem acesso à aplicação.', 403);
  }
  const role = membership.data.role as MemberRole;
  if (!roleAllows(role, requiredRole)) {
    throw new CommercialIntelligenceError('admin_required', 'Permissão de administrador necessária.', 403);
  }
  return { userId: userResult.data.user.id, role };
}

export async function authorizeAdminOrCron(
  request: Request,
  client: SupabaseLike,
  configuredCronSecret: string | undefined,
): Promise<{ actor: 'cron' | 'user'; member?: Member }> {
  const received = request.headers.get('x-ci-cron-secret') || undefined;
  if (configuredCronSecret && secureEqual(configuredCronSecret, received)) return { actor: 'cron' };
  return { actor: 'user', member: await authorizeMember(request, client, 'admin') };
}
