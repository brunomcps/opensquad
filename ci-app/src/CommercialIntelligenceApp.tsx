import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { configureCommercialIntelligenceQualityLoader, useCommercialIntelligenceStore } from '../../src/store/useCommercialIntelligenceStore';
import { CommercialIntelligenceApiError, getQuality, runSync, type MemberRole } from './api';
import { cleanRecoveryUrl, hasRecoveryContext } from './authRecovery';
import { AuthScreen } from './AuthScreen';
import { StandaloneCommercialIntelligenceView } from './StandaloneCommercialIntelligenceView';
import { configurationError, supabase } from './supabase';

configureCommercialIntelligenceQualityLoader(async () => (await getQuality()).quality);

export function CommercialIntelligenceApp() {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<MemberRole | null>(null);
  const [booting, setBooting] = useState(true);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [recoveryMode, setRecoveryMode] = useState(() => hasRecoveryContext(window.location.href));
  const [syncing, setSyncing] = useState<'youtube' | 'hotmart' | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const fetchQuality = useCommercialIntelligenceStore(state => state.fetchQuality);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) setSession(data.session);
    }).finally(() => {
      if (active) setBooting(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'PASSWORD_RECOVERY') setRecoveryMode(true);
      // Só reage a login/logout de verdade. A renovação periódica de token
      // (TOKEN_REFRESHED) traz um objeto de sessão novo com o MESMO usuário; se
      // atualizarmos o estado aqui, o app revalida e remonta a tela, jogando o
      // usuário de volta pra Visão comercial. Preservando a referência quando a
      // pessoa é a mesma, a aba ativa não se perde.
      setSession(prev => (prev?.user?.id === nextSession?.user?.id ? prev : nextSession));
      if (!nextSession) {
        setRole(null);
        setAccessError(null);
      }
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session) return;
    let active = true;
    setBooting(true);
    getQuality()
      .then(result => {
        if (!active) return;
        setRole(result.member.role);
        setAccessError(null);
      })
      .catch(error => {
        if (!active) return;
        const denied = error instanceof CommercialIntelligenceApiError && error.status === 403;
        setAccessError(denied
          ? 'Sua conta existe, mas não está autorizada para esta aplicação.'
          : 'Não foi possível validar seu acesso agora.');
      })
      .finally(() => {
        if (active) setBooting(false);
      });
    return () => { active = false; };
  }, [session]);

  async function triggerSync(source: 'youtube' | 'hotmart') {
    setSyncing(source);
    setActionMessage(null);
    try {
      await runSync(source);
      await fetchQuality();
      window.dispatchEvent(new CustomEvent('ci:data-updated', { detail: { source } }));
      setActionMessage(`Sincronização ${source === 'youtube' ? 'YouTube' : 'Hotmart'} concluída.`);
    } catch (error) {
      // O motivo real vai na tela. "Não foi possível concluir" escondeu por dois
      // meses (16/07 a 18/09/2026) que a chave do YouTube tinha morrido.
      const code = error instanceof CommercialIntelligenceApiError ? error.code : null;
      const reasons: Record<string, string> = {
        sync_in_progress: 'Já existe uma sincronização dessa fonte em andamento.',
        youtube_auth_failed: 'O YouTube recusou a chave de acesso do painel. É preciso autorizar de novo no Google (chave YOUTUBE_REFRESH_TOKEN).',
        youtube_api_failed: 'O YouTube não respondeu à consulta. Tente de novo em alguns minutos.',
        youtube_report_contract_changed: 'O YouTube mudou o formato do relatório; o código da sincronização precisa de ajuste.',
        hotmart_auth_failed: 'A Hotmart recusou as credenciais do painel (HOTMART_CLIENT_ID / SECRET).',
        database_error: 'O banco não aceitou a gravação. Veja "Qualidade dos dados".',
      };
      const message = (code && reasons[code])
        || `Não foi possível concluir a sincronização${code ? ` (motivo: ${code})` : ''}.`;
      setActionMessage(message);
    } finally {
      setSyncing(null);
    }
  }

  if (configurationError) {
    return <main className="ci-state"><strong>Configuração incompleta</strong><span>{configurationError}</span></main>;
  }
  if (booting) return <main className="ci-state"><span className="loading-pulse">Validando acesso...</span></main>;
  if (!session || recoveryMode) {
    return <AuthScreen recoveryMode={recoveryMode} onRecoveryComplete={() => {
      cleanRecoveryUrl(window.location.origin);
      setRecoveryMode(false);
    }} />;
  }
  if (accessError || !role) {
    return (
      <main className="ci-state">
        <strong>Acesso indisponível</strong>
        <span>{accessError || 'Sua conta não possui associação ativa.'}</span>
        <button type="button" onClick={() => supabase.auth.signOut({ scope: 'local' })}>Sair</button>
      </main>
    );
  }

  const actions = (
    <div className="ci-actions">
      {role === 'admin' && (
        <>
          <button type="button" disabled={Boolean(syncing)} onClick={() => triggerSync('youtube')}>
            {syncing === 'youtube' ? 'Sincronizando...' : 'Sincronizar dados do YouTube'}
          </button>
          <button type="button" disabled={Boolean(syncing)} onClick={() => triggerSync('hotmart')}>
            {syncing === 'hotmart' ? 'Buscando vendas...' : 'Buscar vendas na Hotmart agora'}
          </button>
        </>
      )}
      <span>{session.user.email} · {role}</span>
      <button type="button" className="ci-secondary" onClick={() => supabase.auth.signOut({ scope: 'local' })}>Sair</button>
    </div>
  );

  return (
    <main className="ci-app-shell">
      {actionMessage && <div className="ci-action-message" role="status">{actionMessage}</div>}
      <StandaloneCommercialIntelligenceView actions={actions} role={role} />
    </main>
  );
}
