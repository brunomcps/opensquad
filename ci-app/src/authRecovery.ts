export type AuthMode = 'login' | 'reset' | 'update';

type AuthErrorLike = {
  code?: string;
  name?: string;
  status?: number;
  message?: string;
};

const RATE_LIMIT_CODES = new Set([
  'over_email_send_rate_limit',
  'over_request_rate_limit',
  'over_sms_send_rate_limit',
]);

function errorCode(error: unknown): string {
  if (!error || typeof error !== 'object') return '';
  const candidate = error as AuthErrorLike;
  return String(candidate.code || candidate.name || '').toLowerCase();
}

function errorStatus(error: unknown): number | null {
  if (!error || typeof error !== 'object') return null;
  const status = Number((error as AuthErrorLike).status);
  return Number.isFinite(status) ? status : null;
}

export function recoveryRedirectUrl(origin: string): string {
  return new URL('/', origin).toString();
}

export function hasRecoveryContext(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.searchParams.get('recovery') === '1' || url.searchParams.get('type') === 'recovery') return true;
    const fragment = new URLSearchParams(url.hash.replace(/^#/, ''));
    return fragment.get('type') === 'recovery';
  } catch {
    return false;
  }
}

export function cleanRecoveryUrl(origin: string): void {
  if (typeof window === 'undefined') return;
  window.history.replaceState({}, document.title, new URL('/', origin).toString());
}

export function authErrorMessage(mode: AuthMode, error: unknown): string {
  const code = errorCode(error);
  const status = errorStatus(error);
  const rateLimited = RATE_LIMIT_CODES.has(code) || status === 429;

  if (mode === 'login') {
    if (rateLimited) return 'Muitas tentativas de acesso. Aguarde alguns minutos e tente novamente.';
    if (code === 'invalid_credentials' || status === 400) return 'E-mail ou senha inválidos.';
    return 'Não foi possível acessar o serviço de autenticação. Tente novamente.';
  }

  if (mode === 'reset') {
    if (rateLimited) return 'Muitas solicitações de recuperação. Aguarde alguns minutos antes de reenviar.';
    return 'Não foi possível enviar as instruções agora. Verifique sua conexão e tente novamente.';
  }

  if (code === 'same_password') return 'A nova senha precisa ser diferente da senha anterior.';
  if (code === 'weak_password') return 'Use uma senha mais forte, com pelo menos oito caracteres.';
  if (['otp_expired', 'session_not_found', 'refresh_token_not_found'].includes(code) || status === 401 || status === 403) {
    return 'Esse link expirou ou já foi usado. Solicite um novo link de recuperação.';
  }
  return 'Não foi possível salvar a nova senha. Tente novamente ou solicite outro link.';
}
