import { useState, type FormEvent } from 'react';
import { supabase } from './supabase';

type Mode = 'login' | 'reset' | 'update';

export function AuthScreen({
  recoveryMode = false,
  onRecoveryComplete,
}: {
  recoveryMode?: boolean;
  onRecoveryComplete?: () => void;
}) {
  const [mode, setMode] = useState<Mode>(recoveryMode ? 'update' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      if (mode === 'login') {
        const result = await supabase.auth.signInWithPassword({ email, password });
        if (result.error) throw result.error;
        return;
      }
      if (mode === 'reset') {
        const result = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });
        if (result.error) throw result.error;
        setMessage('Se o e-mail estiver autorizado, você receberá as instruções de recuperação.');
        return;
      }
      if (password.length < 8) throw new Error('Use uma senha com pelo menos 8 caracteres.');
      const result = await supabase.auth.updateUser({ password });
      if (result.error) throw result.error;
      onRecoveryComplete?.();
    } catch {
      setError(mode === 'login'
        ? 'Não foi possível entrar com essas credenciais.'
        : 'Não foi possível concluir a solicitação. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="ci-auth-layout">
      <section className="ci-auth-card">
        <div className="ci-brand-mark">CI</div>
        <div className="ci-eyebrow">OpenSquad</div>
        <h1>Inteligência Comercial</h1>
        <p className="ci-auth-copy">
          {mode === 'login' && 'Entre com seu e-mail e senha para acessar os dados comerciais.'}
          {mode === 'reset' && 'Informe seu e-mail para receber as instruções de recuperação.'}
          {mode === 'update' && 'Defina uma nova senha para sua conta.'}
        </p>

        <form onSubmit={submit} className="ci-auth-form">
          {mode !== 'update' && (
            <label>
              E-mail
              <input
                type="email"
                value={email}
                onChange={event => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </label>
          )}
          {mode !== 'reset' && (
            <label>
              Senha
              <input
                type="password"
                value={password}
                onChange={event => setPassword(event.target.value)}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                minLength={mode === 'update' ? 8 : undefined}
                required
              />
            </label>
          )}
          {error && <div className="ci-form-error" role="alert">{error}</div>}
          {message && <div className="ci-form-message" role="status">{message}</div>}
          <button type="submit" disabled={loading}>
            {loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : mode === 'reset' ? 'Enviar instruções' : 'Salvar nova senha'}
          </button>
        </form>

        {mode !== 'update' && (
          <button
            type="button"
            className="ci-link-button"
            onClick={() => {
              setMode(mode === 'login' ? 'reset' : 'login');
              setError(null);
              setMessage(null);
            }}
          >
            {mode === 'login' ? 'Esqueci minha senha' : 'Voltar para o login'}
          </button>
        )}
      </section>
    </main>
  );
}
