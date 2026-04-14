/**
 * Showcase page with different comment card layout options.
 * Accessible via ?showcase query param on Audiência tab.
 */

const SAMPLE_COMMENTS = [
  {
    id: '1', author_name: '@KaiqeSantos_',
    video_title: 'Por que o TDAH faz voce NAO sentir SAUDADE? A Neurociencia Explica!',
    text: 'Cara eu ainda nao fiz exames pra TDAH mas todos os sinais apontam a isso, e nao e de agora, minha psicologa que eu tinha quando crianca diz que minha tendencia e ter TDAH. Eu preciso urgentemente de um tratamento, parece que ta ficando pior minha mente nao para de pensar criar cenarios etc',
    tipo: 'desabafo', sentimento_geral: 'identificacao', like_count: 4,
    sinal_produto: 'forte', sinal_copy: 'ausente', sinal_conteudo: 'ausente', sinal_metodo: 'ausente', tem_demanda: true,
  },
  {
    id: '2', author_name: '@atlas3854',
    video_title: '5 SINAIS OCULTOS de TDAH em ADULTOS que voce NAO deve IGNORAR',
    text: 'Eu tenho 22 anos, e nossa, um video nunca foi tao certeiro... Eu suspeito de ter apenas, mas tudo o que ele disse neste video, foi certeiro em mim, 100% das coisas que ele disse, refletem em mim, eu to pasmo',
    tipo: 'desabafo', sentimento_geral: 'identificacao', like_count: 7,
    sinal_produto: 'ausente', sinal_copy: 'ausente', sinal_conteudo: 'ausente', sinal_metodo: 'ausente', tem_demanda: false,
  },
  {
    id: '3', author_name: '@morganagomes508',
    video_title: '3 Tipos de Trabalho p/ TDAH: Voce provavelmente esta no ERRADO',
    text: 'Sou professora, e eu era otima ministrando aula, mas nao conseguia desligar, mesmo apos o trabalho continuava o tempo todo planejando novas aulas, mais dinamicas e etc. Na hora de preencher as notas e fazer relatorios era um horror. Hoje trabalho de forma autonoma e me sinto muito mais livre.',
    tipo: 'desabafo', sentimento_geral: 'frustracao', like_count: 8,
    sinal_produto: 'forte', sinal_copy: 'forte', sinal_conteudo: 'ausente', sinal_metodo: 'ausente', tem_demanda: true,
  },
  {
    id: '4', author_name: '@AnaLu-n5z',
    video_title: '5 SINAIS OCULTOS de TDAH em ADULTOS que voce NAO deve IGNORAR',
    text: 'Nao quero admitir que me identifiquei e que posso sim ter este problema ou quadro psiquico!',
    tipo: 'desabafo', sentimento_geral: 'identificacao', like_count: 19,
    sinal_produto: 'ausente', sinal_copy: 'ausente', sinal_conteudo: 'ausente', sinal_metodo: 'ausente', tem_demanda: false,
  },
  {
    id: '5', author_name: '@JunSeongKang-n8r',
    video_title: '5 SINAIS OCULTOS de TDAH em ADULTOS que voce NAO deve IGNORAR',
    text: 'Me identifiquei com tudo. Eu lembro de todos os periodos da minha vida como eu sofri por ser sempre rotulado por todos. Na infancia eu era "o pestinha", na adolescencia eu era o "anti-social" e na fase adulta ainda continuo anti-social e ainda me sentia muito burro. Uma das maiores dificuldades era na escola, eu nao conseguia prestar atencao nas aulas, ficava olhando pro nada.',
    tipo: 'desabafo', sentimento_geral: 'identificacao', like_count: 2,
    sinal_produto: 'ausente', sinal_copy: 'forte', sinal_conteudo: 'ausente', sinal_metodo: 'ausente', tem_demanda: false,
  },
];

const SENTIMENT_COLORS: Record<string, string> = {
  frustracao: '#ef4444', tristeza: '#6366f1', identificacao: '#f59e0b',
  gratidao: '#22c55e', humor: '#ec4899', raiva: '#dc2626',
  esperanca: '#10b981', neutro: '#94a3b8',
};

const SENTIMENT_BG: Record<string, string> = {
  frustracao: 'rgba(239,68,68,0.06)', tristeza: 'rgba(99,102,241,0.06)',
  identificacao: 'rgba(245,158,11,0.06)', gratidao: 'rgba(34,197,94,0.06)',
  humor: 'rgba(236,72,153,0.06)', raiva: 'rgba(220,38,38,0.06)',
  esperanca: 'rgba(16,185,129,0.06)', neutro: 'rgba(148,163,184,0.06)',
};

const SENTIMENT_EMOJI: Record<string, string> = {
  frustracao: '\u{1F62E}\u{200D}\u{1F4A8}', tristeza: '\u{1F622}', identificacao: '\u{1F914}',
  gratidao: '\u{1F64F}', humor: '\u{1F602}', raiva: '\u{1F621}',
  esperanca: '\u{1F331}', neutro: '\u{1F4AC}',
};

function SignalDots({ c }: { c: any }) {
  const signals = [];
  if (c.sinal_conteudo === 'forte') signals.push({ label: 'C', color: '#22c55e' });
  if (c.sinal_produto === 'forte') signals.push({ label: 'P', color: '#3b82f6' });
  if (c.sinal_copy === 'forte') signals.push({ label: 'Cp', color: '#a855f7' });
  if (c.sinal_metodo === 'forte') signals.push({ label: 'M', color: '#f59e0b' });
  if (signals.length === 0) return null;
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {signals.map(s => (
        <span key={s.label} style={{
          width: 20, height: 20, borderRadius: '50%', background: s.color,
          color: '#fff', fontSize: 9, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{s.label}</span>
      ))}
    </div>
  );
}

// ========================
// LAYOUT A: Atual (referência)
// ========================
function LayoutA() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {SAMPLE_COMMENTS.map(c => {
        const sentColor = SENTIMENT_COLORS[c.sentimento_geral] || '#94a3b8';
        return (
          <div key={c.id} style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)', borderLeft: `3px solid ${sentColor}`,
            borderRadius: 8, padding: '14px 18px',
          }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>{c.video_title}</div>
            <div style={{ fontSize: 13.5, color: 'var(--text-primary)', lineHeight: 1.7, marginBottom: 10 }}>
              {c.text?.slice(0, 300)}{(c.text?.length || 0) > 300 ? '...' : ''}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 4, alignItems: 'center' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{c.author_name}</span>
              <span>·</span><span>{c.tipo}</span><span>·</span>
              <span style={{ color: sentColor }}>{c.sentimento_geral}</span>
              {c.like_count > 0 && <><span>·</span><span>{c.like_count} ♥</span></>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ========================
// LAYOUT G: Magazine — large quote + sidebar metadata
// ========================
function LayoutG() {
  return (
    <div style={{ maxWidth: 820, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {SAMPLE_COMMENTS.map(c => {
        const sentColor = SENTIMENT_COLORS[c.sentimento_geral] || '#94a3b8';
        const sentBg = SENTIMENT_BG[c.sentimento_geral] || 'transparent';
        return (
          <div key={c.id} style={{
            background: sentBg, borderRadius: 14, padding: 0, display: 'flex',
            border: '1px solid var(--border)', overflow: 'hidden',
          }}>
            {/* Sidebar */}
            <div style={{
              width: 60, background: sentColor, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 6, flexShrink: 0, padding: '16px 0',
            }}>
              <span style={{ fontSize: 22 }}>{SENTIMENT_EMOJI[c.sentimento_geral]}</span>
              {c.like_count > 0 && (
                <span style={{ fontSize: 11, color: '#fff', fontWeight: 600 }}>{c.like_count}♥</span>
              )}
            </div>
            {/* Content */}
            <div style={{ padding: '18px 22px', flex: 1 }}>
              <div style={{ fontSize: 15, color: 'var(--text-primary)', lineHeight: 1.8, marginBottom: 12, fontWeight: 400 }}>
                {c.text}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{c.author_name}</span>
                  <span style={{ margin: '0 4px' }}>·</span>
                  <span>{c.video_title?.slice(0, 55)}{(c.video_title?.length || 0) > 55 ? '...' : ''}</span>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <SignalDots c={c} />
                  {c.tem_demanda && <span style={{ fontSize: 9, fontWeight: 600, color: '#166534', background: '#dcfce7', padding: '2px 8px', borderRadius: 10 }}>demanda</span>}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ========================
// LAYOUT H: Card com header colorido + texto limpo
// ========================
function LayoutH() {
  return (
    <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
      {SAMPLE_COMMENTS.map(c => {
        const sentColor = SENTIMENT_COLORS[c.sentimento_geral] || '#94a3b8';
        return (
          <div key={c.id} style={{
            background: 'var(--bg-card)', borderRadius: 12, overflow: 'hidden',
            border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          }}>
            {/* Colored header bar */}
            <div style={{
              background: `linear-gradient(135deg, ${sentColor}15 0%, ${sentColor}08 100%)`,
              padding: '10px 20px', borderBottom: '1px solid var(--border)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16 }}>{SENTIMENT_EMOJI[c.sentimento_geral]}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{c.author_name}</span>
                <span style={{ fontSize: 11, color: sentColor, fontWeight: 500 }}>{c.sentimento_geral}</span>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <SignalDots c={c} />
                {c.like_count > 0 && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.like_count} ♥</span>}
              </div>
            </div>
            {/* Body */}
            <div style={{ padding: '16px 20px' }}>
              <div style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.8, marginBottom: 10 }}>
                {c.text}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>{c.video_title?.slice(0, 60)}{(c.video_title?.length || 0) > 60 ? '...' : ''}</span>
                {c.tem_demanda && <span style={{ color: '#166534', fontWeight: 600 }}>· demanda</span>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ========================
// LAYOUT I: Grid 2 colunas com cards coloridos
// ========================
function LayoutI() {
  const col1 = SAMPLE_COMMENTS.filter((_, i) => i % 2 === 0);
  const col2 = SAMPLE_COMMENTS.filter((_, i) => i % 2 === 1);
  const renderCard = (c: any) => {
    const sentColor = SENTIMENT_COLORS[c.sentimento_geral] || '#94a3b8';
    const sentBg = SENTIMENT_BG[c.sentimento_geral] || 'transparent';
    return (
      <div key={c.id} style={{
        background: sentBg, borderRadius: 14, padding: '18px 20px',
        border: '1px solid var(--border)', marginBottom: 12,
        boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 18 }}>{SENTIMENT_EMOJI[c.sentimento_geral]}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{c.author_name}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <SignalDots c={c} />
            {c.like_count > 0 && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.like_count} ♥</span>}
          </div>
        </div>
        <div style={{ fontSize: 13.5, color: 'var(--text-primary)', lineHeight: 1.75, marginBottom: 10 }}>
          {c.text?.slice(0, 280)}{(c.text?.length || 0) > 280 ? '...' : ''}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
          {c.video_title?.slice(0, 50)}{(c.video_title?.length || 0) > 50 ? '...' : ''}
          {c.tem_demanda && <span style={{ color: '#166534', fontWeight: 600 }}> · demanda</span>}
        </div>
      </div>
    );
  };
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }}>
      <div>{col1.map(renderCard)}</div>
      <div>{col2.map(renderCard)}</div>
    </div>
  );
}

// ========================
// LAYOUT J: Twitter/social style
// ========================
function LayoutJ() {
  return (
    <div style={{ maxWidth: 620, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 0 }}>
      {SAMPLE_COMMENTS.map((c, idx) => {
        const sentColor = SENTIMENT_COLORS[c.sentimento_geral] || '#94a3b8';
        return (
          <div key={c.id} style={{
            background: 'var(--bg-card)', padding: '18px 20px',
            borderBottom: idx < SAMPLE_COMMENTS.length - 1 ? '1px solid var(--border)' : 'none',
          }}>
            <div style={{ display: 'flex', gap: 12 }}>
              {/* Avatar placeholder */}
              <div style={{
                width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                background: `linear-gradient(135deg, ${sentColor}40, ${sentColor}20)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16,
              }}>
                {SENTIMENT_EMOJI[c.sentimento_geral]}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{c.author_name}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>{c.tipo}</span>
                  </div>
                  {c.like_count > 0 && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.like_count} ♥</span>}
                </div>
                <div style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.7, marginBottom: 8 }}>
                  {c.text}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {c.video_title?.slice(0, 50)}{(c.video_title?.length || 0) > 50 ? '...' : ''}
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <SignalDots c={c} />
                    {c.tem_demanda && <span style={{ fontSize: 9, fontWeight: 600, color: '#fff', background: '#166534', padding: '2px 8px', borderRadius: 10 }}>demanda</span>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ========================
// LAYOUT K: Minimal dark accent cards
// ========================
function LayoutK() {
  return (
    <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {SAMPLE_COMMENTS.map(c => {
        const sentColor = SENTIMENT_COLORS[c.sentimento_geral] || '#94a3b8';
        return (
          <div key={c.id} style={{
            background: '#1a1a2e', borderRadius: 12, padding: '20px 24px',
            border: '1px solid #2a2a4a',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: sentColor }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0' }}>{c.author_name}</span>
                <span style={{ fontSize: 11, color: sentColor }}>{c.sentimento_geral}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <SignalDots c={c} />
                {c.like_count > 0 && <span style={{ fontSize: 11, color: '#94a3b8' }}>{c.like_count} ♥</span>}
              </div>
            </div>
            <div style={{ fontSize: 14, color: '#f1f5f9', lineHeight: 1.8, marginBottom: 12 }}>
              {c.text}
            </div>
            <div style={{ fontSize: 10, color: '#64748b' }}>
              {c.video_title}
              {c.tem_demanda && <span style={{ color: '#4ade80', fontWeight: 600 }}> · demanda</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ========================
// LAYOUT L: Pull-quote editorial com destaque visual
// ========================
function LayoutL() {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {SAMPLE_COMMENTS.map(c => {
        const sentColor = SENTIMENT_COLORS[c.sentimento_geral] || '#94a3b8';
        const isShort = (c.text?.length || 0) < 120;
        return (
          <div key={c.id} style={{
            background: 'var(--bg-card)', borderRadius: 16, overflow: 'hidden',
            border: '1px solid var(--border)', boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
          }}>
            <div style={{ padding: '24px 28px 20px' }}>
              {/* Large opening quote mark */}
              <div style={{ fontSize: 48, lineHeight: '0.8', color: sentColor, opacity: 0.3, marginBottom: 4, fontFamily: 'Georgia, serif' }}>"</div>
              <div style={{
                fontSize: isShort ? 18 : 14.5,
                color: 'var(--text-primary)',
                lineHeight: 1.8,
                marginBottom: 16,
                fontWeight: isShort ? 500 : 400,
              }}>
                {c.text}
              </div>
              {/* Footer */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                borderTop: '1px solid var(--border)', paddingTop: 14,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: `linear-gradient(135deg, ${sentColor}30, ${sentColor}10)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                  }}>
                    {SENTIMENT_EMOJI[c.sentimento_geral]}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{c.author_name}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{c.video_title?.slice(0, 55)}{(c.video_title?.length || 0) > 55 ? '...' : ''}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <SignalDots c={c} />
                  {c.tem_demanda && <span style={{ fontSize: 9, fontWeight: 600, color: '#166534', background: '#dcfce7', padding: '3px 10px', borderRadius: 12 }}>demanda</span>}
                  {c.like_count > 0 && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.like_count} ♥</span>}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ========================
// MAIN SHOWCASE
// ========================
export function CommentLayoutShowcase() {
  return (
    <div style={{ padding: '32px', maxWidth: 1400, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
        Comment Card Layouts
      </h1>
      <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 48 }}>
        Mesmos 5 comentarios, 7 layouts visuais distintos. Rolagem vertical.
      </p>

      {[
        { id: 'A', title: 'Atual — Borda lateral, full width', desc: 'O que temos hoje. Cards de ponta a ponta.', Component: LayoutA },
        { id: 'G', title: 'Magazine — Sidebar colorida com emoji', desc: 'Sidebar de sentimento com emoji e likes. Background sutil por sentimento. Texto completo.', Component: LayoutG },
        { id: 'H', title: 'Header colorido + corpo limpo', desc: 'Barra superior com gradiente do sentimento, emoji e author. Corpo branco limpo.', Component: LayoutH },
        { id: 'I', title: 'Grid 2 colunas com fundo por sentimento', desc: 'Cards coloridos em grid. Bom pra scanear rapido.', Component: LayoutI },
        { id: 'J', title: 'Social/Twitter style', desc: 'Feed continuo sem bordas laterais. Avatar circular com emoji. Leitura fluida.', Component: LayoutJ },
        { id: 'K', title: 'Dark mode cards', desc: 'Cards escuros com texto claro. Visual premium. Dot colorido de sentimento.', Component: LayoutK },
        { id: 'L', title: 'Editorial — Pull-quote com aspas', desc: 'Aspas grandes decorativas, cards com shadow. Comentarios curtos ficam maiores. Footer com avatar.', Component: LayoutL },
      ].map(layout => (
        <section key={layout.id} style={{ marginBottom: 64 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 4 }}>
            <span style={{
              fontSize: 13, fontWeight: 700, color: '#fff', background: 'var(--accent-gold-dark)',
              padding: '2px 10px', borderRadius: 6,
            }}>{layout.id}</span>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{layout.title}</h2>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>{layout.desc}</p>
          <layout.Component />
        </section>
      ))}
    </div>
  );
}
