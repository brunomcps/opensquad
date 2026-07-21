import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../ci-app/src/supabase';

// Caixa de e-mails do MAPA (irmã da caixa de Instagram): lista à esquerda,
// conversa à direita com o rascunho da IA pra aprovar/editar/descartar.
// Aprovar NÃO dispara e-mail direto: a esteira cria um RASCUNHO no Gmail, no
// thread certo, e o envio final é 1 clique do Bruno lá (trava de segurança).

type Status = 'novo' | 'rascunho' | 'aprovado' | 'draft_criado' | 'enviado' | 'descartado' | 'fila';

interface Conversa {
  conversation_id: string;
  autor_nome: string | null;
  autor_id: string | null;
  assunto: string | null;
  ultima_msg_lead: string | null;
  ultima_msg_em: string | null;
  grupo: string | null;
  rascunho: string | null;
  texto_final: string | null;
  status: Status;
  motivo: string | null;
  atualizado_em: string;
}

const GRUPO_LABEL: Record<string, { rotulo: string; cor: string }> = {
  entrega_acesso: { rotulo: 'Entrega / acesso', cor: '#2E6E9E' },
  duvida_resultado: { rotulo: 'Dúvida de resultado', cor: '#6E4F9E' },
  lead_consulta: { rotulo: 'Consulta / quer mais', cor: '#A9823F' },
  reembolso: { rotulo: 'Reembolso', cor: '#B02A1E' },
  elogio: { rotulo: 'Elogio', cor: '#3E7D3A' },
  cobranca: { rotulo: 'Cobrança', cor: '#948C79' },
  outro: { rotulo: 'Outro', cor: '#948C79' },
};

const FILTROS: Array<{ chave: string; rotulo: string; status?: Status[] }> = [
  { chave: 'pendentes', rotulo: 'A responder', status: ['rascunho', 'novo'] },
  { chave: 'aprovadas', rotulo: 'Aprovadas', status: ['aprovado', 'draft_criado'] },
  { chave: 'enviadas', rotulo: 'Respondidas', status: ['enviado'] },
  { chave: 'todas', rotulo: 'Todas' },
];

function quando(iso: string | null): string {
  if (!iso) return '';
  const dif = Date.now() - new Date(iso).getTime();
  const h = Math.floor(dif / 3_600_000);
  if (h < 1) return 'agora há pouco';
  if (h < 24) return `há ${h}h`;
  return `há ${Math.floor(h / 24)}d`;
}

function iniciais(nome: string): string {
  return nome.replace(/[^a-zA-ZÀ-ú]/g, '').slice(0, 2).toUpperCase() || '@';
}

function Etiqueta({ grupo }: { grupo: string | null }) {
  const info = grupo ? GRUPO_LABEL[grupo] : null;
  if (!info) return null;
  return <span className="ci-ig-etiqueta" style={{ color: info.cor, borderColor: info.cor }}>{info.rotulo}</span>;
}

export function EmailInboxView() {
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtro, setFiltro] = useState('pendentes');
  const [aberta, setAberta] = useState<string | null>(null);
  const [edicao, setEdicao] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState<string | null>(null);

  const carrega = useCallback(async () => {
    setCarregando(true);
    const { data } = await supabase
      .from('ci_email_conversas')
      .select('*')
      .order('atualizado_em', { ascending: false })
      .limit(200);
    setConversas((data as Conversa[]) || []);
    setCarregando(false);
  }, []);

  useEffect(() => { void carrega(); }, [carrega]);

  const visiveis = useMemo(() => {
    const alvo = FILTROS.find(f => f.chave === filtro);
    if (!alvo?.status) return conversas;
    return conversas.filter(c => alvo.status!.includes(c.status));
  }, [conversas, filtro]);

  useEffect(() => {
    if (visiveis.length && !visiveis.some(c => c.conversation_id === aberta)) {
      setAberta(visiveis[0].conversation_id);
    }
    if (!visiveis.length) setAberta(null);
  }, [visiveis, aberta]);

  const contadores = useMemo(() => ({
    pendentes: conversas.filter(c => c.status === 'rascunho' || c.status === 'novo').length,
    aprovadas: conversas.filter(c => c.status === 'aprovado' || c.status === 'draft_criado').length,
    enviadas: conversas.filter(c => c.status === 'enviado').length,
    todas: conversas.length,
  }), [conversas]);

  const conversaAberta = visiveis.find(c => c.conversation_id === aberta) ?? null;

  async function decide(conversa: Conversa, status: Status) {
    setSalvando(conversa.conversation_id);
    const texto_final = status === 'aprovado'
      ? (edicao[conversa.conversation_id] ?? conversa.rascunho ?? '')
      : conversa.texto_final;
    const { error } = await supabase
      .from('ci_email_conversas')
      .update({ status, texto_final, atualizado_em: new Date().toISOString() })
      .eq('conversation_id', conversa.conversation_id);
    if (!error) {
      setConversas(atual => atual.map(c => c.conversation_id === conversa.conversation_id
        ? { ...c, status, texto_final: texto_final ?? c.texto_final } : c));
    }
    setSalvando(null);
  }

  return (
    <section className="ci-ig">
      <header className="ci-ig-cabecalho">
        <div>
          <h2>Caixa de e-mails do MAPA</h2>
          <p>A IA lê cada e-mail de comprador, marca o tipo e escreve um rascunho na voz da equipe. Ao aprovar, a resposta é ENVIADA de verdade, no e-mail certo, com o texto exato que você aprovou. Reembolso sempre chega com alerta na hora.</p>
        </div>
        <button type="button" className="ci-ig-atualizar" onClick={() => void carrega()}>Atualizar</button>
      </header>

      <nav className="ci-ig-filtros" aria-label="Filtrar e-mails">
        {FILTROS.map(f => (
          <button key={f.chave} type="button" className={f.chave === filtro ? 'active' : ''} onClick={() => setFiltro(f.chave)}>
            {f.rotulo}<span className="ci-ig-contador">{contadores[f.chave as keyof typeof contadores] ?? 0}</span>
          </button>
        ))}
      </nav>

      <div className="ci-ig-inbox">
        <aside className="ci-ig-lista-col">
          {carregando && <div className="ci-ig-vazio-lista">Carregando...</div>}
          {!carregando && visiveis.length === 0 && <div className="ci-ig-vazio-lista">Nenhum e-mail aqui.</div>}
          {visiveis.map(c => (
            <button
              key={c.conversation_id}
              type="button"
              className={`ci-ig-linha${c.conversation_id === aberta ? ' active' : ''}`}
              onClick={() => setAberta(c.conversation_id)}
            >
              <span className={`ci-ig-avatar g-${c.grupo || 'x'}`}>{iniciais(c.autor_nome || '@')}</span>
              <span className="ci-ig-linha-corpo">
                <span className="ci-ig-linha-topo">
                  <strong>{c.autor_nome || c.autor_id || 'contato'}</strong>
                  <small>{quando(c.ultima_msg_em || c.atualizado_em)}</small>
                </span>
                <span className="ci-ig-linha-preview">{c.assunto || c.ultima_msg_lead || '(sem assunto)'}</span>
                <Etiqueta grupo={c.grupo} />
              </span>
            </button>
          ))}
        </aside>

        <div className="ci-ig-detalhe">
          {!conversaAberta && <div className="ci-ig-vazio-detalhe">Selecione um e-mail à esquerda.</div>}
          {conversaAberta && (() => {
            const c = conversaAberta;
            const rascunho = edicao[c.conversation_id] ?? c.rascunho ?? '';
            const editavel = c.status === 'rascunho' || c.status === 'novo';
            return (
              <>
                <div className="ci-ig-detalhe-topo">
                  <span className={`ci-ig-avatar grande g-${c.grupo || 'x'}`}>{iniciais(c.autor_nome || '@')}</span>
                  <div>
                    <strong>{c.autor_nome || 'contato'}</strong>
                    <small>{c.autor_id} · {quando(c.ultima_msg_em || c.atualizado_em)}</small>
                  </div>
                  <Etiqueta grupo={c.grupo} />
                </div>

                {c.assunto && <div className="ci-ig-assunto">✉️ {c.assunto}</div>}

                <div className="ci-ig-bolha lead">
                  <span>A pessoa escreveu</span>
                  <p>{c.ultima_msg_lead || '(sem texto)'}</p>
                </div>

                {c.status === 'fila' && (
                  <div className="ci-ig-fila">🚨 Caso sensível. A IA não responde sozinha. {c.motivo || 'Responda você mesmo pelo Gmail.'}</div>
                )}

                {c.status === 'enviado' && (
                  <div className="ci-ig-bolha equipe">
                    <span>Respondido pela equipe</span>
                    <p>{c.texto_final || c.rascunho}</p>
                  </div>
                )}

                {(editavel || c.status === 'aprovado' || c.status === 'draft_criado') && (
                  <div className="ci-ig-compositor">
                    <label>Rascunho da IA {editavel && '· edite se quiser'}</label>
                    <textarea
                      value={rascunho}
                      readOnly={!editavel}
                      onChange={e => setEdicao(s => ({ ...s, [c.conversation_id]: e.target.value }))}
                      rows={6}
                    />
                    {c.motivo && <small className="ci-ig-motivo">{c.motivo}</small>}
                    {editavel && (
                      <div className="ci-ig-acoes">
                        <button type="button" className="ci-ig-btn-primario" disabled={salvando === c.conversation_id || !rascunho.trim()} onClick={() => void decide(c, 'aprovado')}>
                          Aprovar e enviar
                        </button>
                        <button type="button" className="ci-ig-btn-secundario" disabled={salvando === c.conversation_id} onClick={() => void decide(c, 'descartado')}>Descartar</button>
                      </div>
                    )}
                    {c.status === 'aprovado' && (
                      <div className="ci-ig-aguardando">✓ Aprovado. A esteira ENVIA o e-mail na próxima passada (até 30 min) e te avisa no Telegram.</div>
                    )}
                    {c.status === 'draft_criado' && (
                      <div className="ci-ig-aguardando">📬 Rascunho criado no Gmail (fluxo antigo). Falta só o clique de enviar lá.</div>
                    )}
                  </div>
                )}
                {c.status === 'descartado' && <div className="ci-ig-descartado">Descartado.</div>}
              </>
            );
          })()}
        </div>
      </div>
    </section>
  );
}
