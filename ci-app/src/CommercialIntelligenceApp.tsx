import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { configureCommercialIntelligenceQualityLoader, useCommercialIntelligenceStore } from '../../src/store/useCommercialIntelligenceStore';
import { CommercialIntelligenceApiError, getQuality, runSync, type MemberRole } from './api';
import { AuthScreen } from './AuthScreen';
import { StandaloneCommercialIntelligenceView } from './StandaloneCommercialIntelligenceView';
import { configurationError, supabase } from './supabase';

configureCommercialIntelligenceQualityLoader(async () => (await getQuality()).quality);

export function CommercialIntelligenceApp() {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<MemberRole | null>(null);
  const [booting, setBooting] = useState(true);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [recoveryMode, setRecoveryMode] = useState(false);
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
      setSession(nextSession);
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
      setActionMessage(`Sincronização ${source === 'youtube' ? 'YouTube' : 'Hotmart'} concluída.`);
    } catch (error) {
      const message = error instanceof CommercialIntelligenceApiError && error.code === 'sync_in_progress'
        ? 'Já existe uma sincronização dessa fonte em andamento.'
        : 'Não foi possível concluir a sincronização.';
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
    return <AuthScreen recoveryMode={recoveryMode} onRecoveryComplete={() => setRecoveryMode(false)} />;
  }
  if (accessError || !role) {
    return (
      <main className="ci-state">
        <strong>Acesso indisponível</strong>
        <span>{accessError || 'Sua conta não possui associação ativa.'}</span>
        <button type="button" onClick={() => supabase.auth.signOut()}>Sair</button>
      </main>
    );
  }

  const actions = (
    <div className="ci-actions">
      {role === 'admin' && (
        <>
          <button type="button" disabled={Boolean(syncing)} onClick={() => triggerSync('youtube')}>
            {syncing === 'youtube' ? 'Sincronizando...' : 'Sincronizar YouTube'}
          </button>
          <button type="button" disabled={Boolean(syncing)} onClick={() => triggerSync('hotmart')}>
            {syncing === 'hotmart' ? 'Sincronizando...' : 'Reconciliar Hotmart'}
          </button>
        </>
      )}
      <span>{session.user.email} · {role}</span>
      <button type="button" className="ci-secondary" onClick={() => supabase.auth.signOut()}>Sair</button>
    </div>
  );

  return (
    <main className="ci-app-shell">
      {actionMessage && <div className="ci-action-message" role="status">{actionMessage}</div>}
      <StandaloneCommercialIntelligenceView actions={actions} role={role} />
    </main>
  );
}
