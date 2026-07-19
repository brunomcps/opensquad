import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../ci-app/src/supabase';

// Painel de DMs do Instagram ("ManyChat próprio"): lê ci_ig_conversas, mostra a
// mensagem do lead + o rascunho da IA, e deixa o Bruno aprovar/editar/descartar.
// O envio real acontece no servidor (a tarefa agendada lê status='aprovado').

type Status = 'rascunho' | 'aprovado' | 'enviado' | 'descartado' | 'fila' | 'janela_fechada';

interface Conversa {
  conversation_id: string;
  autor_nome: string | null;
  autor_id: string | null;
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
  consulta: { rotulo: 'Consulta', cor: '#6A1420' },
  sera_que_tenho: { rotulo: 'Será que tenho?', cor: '#A9823F' },
  pergunta_conteudo: { rotulo: 'Pergunta', cor: '#2E6E9E' },
  elogio_papo: { rotulo: 'Elogio / papo', cor: '#3E7D3A' },
  oferta_b2b: { rotulo: 'Oferta / B2B', cor: '#948C79' },
  delicado: { rotulo: 'Delicado', cor: '#B02A1E' },
  spam_vago: { rotulo: 'Spam / vago', cor: '#948C79' },
};

const FILTROS: Array<{ chave: string; rotulo: string; status?: Status[] }> = [
  { chave: 'pendentes', rotulo: 'A responder', status: ['rascunho'] },
  { chave: 'fila', rotulo: 'Só com você', status: ['fila'] },
  { chave: 'enviadas', rotulo: 'Respondidas', status: ['enviado'] },
  { chave: 'todas', rotulo: 'Todas' },
];

function quando(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const dif = Date.now() - d.getTime();
  const h = Math.floor(dif / 3_600_000);
  if (h < 1) return 'agora há pouco';
  if (h < 24) return `há ${h}h`;
  return `há ${Math.floor(h / 24)}d`;
}

function Etiqueta({ grupo }: { grupo: string | null }) {
  const info = grupo ? GRUPO_LABEL[grupo] : null;
  if (!info) return null;
  return (
    <span className="ci-ig-etiqueta" style={{ color: info.cor, borderColor: info.cor }}>
      {info.rotulo}
    </span>
  );
}

export function InstagramInboxView() {
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtro, setFiltro] = useState('pendentes');
  const [edicao, setEdicao] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState<string | null>(null);

  const carrega = useCallback(async () => {
    setCarregando(true);
    const { data } = await supabase
      .from('ci_ig_conversas')
      .select('*')
      .order('atualizado_em', { ascending: false })
      .limit(200);
    setConversas((data as Conversa[]) || []);
    setCarregando(false);
  }, []);

  useEffect(() => {
    void carrega();
  }, [carrega]);

  const visiveis = useMemo(() => {
    const alvo = FILTROS.find(f => f.chave === filtro);
    if (!alvo?.status) return conversas;
    return conversas.filter(c => alvo.status!.includes(c.status));
  }, [conversas, filtro]);

  const contadores = useMemo(() => ({
    pendentes: conversas.filter(c => c.status === 'rascunho').length,
    fila: conversas.filter(c => c.status === 'fila').length,
    enviadas: conversas.filter(c => c.status === 'enviado').length,
    todas: conversas.length,
  }), [conversas]);

  async function decide(conversa: Conversa, status: Status) {
    setSalvando(conversa.conversation_id);
    const texto_final = status === 'aprovado'
      ? (edicao[conversa.conversation_id] ?? conversa.rascunho ?? '')
      : conversa.texto_final;
    const { error } = await supabase
      .from('ci_ig_conversas')
      .update({ status, texto_final, atualizado_em: new Date().toISOString() })
      .eq('conversation_id', conversa.conversation_id);
    if (!error) {
      setConversas(atual => atual.map(c => c.conversation_id === conversa.conversation_id
        ? { ...c, status, texto_final: texto_final ?? c.texto_final }
        : c));
    }
    setSalvando(null);
  }

  return (
    <section className="ci-ig">
      <header className="ci-ig-cabecalho">
        <div>
          <h2>Caixa de entrada do Instagram</h2>
          <p>
            A IA lê cada DM, identifica a demanda e escreve um rascunho na voz da equipe.
            Você aprova, edita ou descarta. Nada é enviado sem o seu aval; casos delicados nunca respondem sozinhos.
          </p>
        </div>
        <button type="button" className="ci-ig-atualizar" onClick={() => void carrega()}>Atualizar</button>
      </header>

      <nav className="ci-ig-filtros" aria-label="Filtrar conversas">
        {FILTROS.map(f => (
          <button
            key={f.chave}
            type="button"
            className={f.chave === filtro ? 'active' : ''}
            onClick={() => setFiltro(f.chave)}
          >
            {f.rotulo}
            <span className="ci-ig-contador">{contadores[f.chave as keyof typeof contadores] ?? 0}</span>
          </button>
        ))}
      </nav>

      {carregando && <div className="ci-ig-vazio">Carregando conversas...</div>}

      {!carregando && visiveis.length === 0 && (
        <div className="ci-ig-vazio">
          <strong>Nenhuma conversa aqui ainda.</strong>
          <span>
            Assim que a esteira começar a rodar, os rascunhos das DMs novas aparecem nesta lista pra você aprovar.
          </span>
        </div>
      )}

      <div className="ci-ig-lista">
        {visiveis.map(conversa => {
          const rascunho = edicao[conversa.conversation_id] ?? conversa.rascunho ?? '';
          const editavel = conversa.status === 'rascunho';
          const finalizada = conversa.status === 'enviado' || conversa.status === 'descartado';
          return (
            <article key={conversa.conversation_id} className={`ci-ig-cartao ${conversa.status}`}>
              <div className="ci-ig-cartao-topo">
                <div className="ci-ig-quem">
                  <strong>@{conversa.autor_nome || conversa.autor_id || 'contato'}</strong>
                  <small>{quando(conversa.ultima_msg_em || conversa.atualizado_em)}</small>
                </div>
                <Etiqueta grupo={conversa.grupo} />
              </div>

              <p className="ci-ig-msg-lead">{conversa.ultima_msg_lead || '(sem texto)'}</p>

              {conversa.status === 'fila' && (
                <div className="ci-ig-fila">
                  🚨 Caso delicado. A IA não responde sozinha. {conversa.motivo || 'Responder você mesmo pelo Instagram.'}
                </div>
              )}

              {conversa.status === 'enviado' && (
                <div className="ci-ig-enviada">
                  <span>Enviado pela equipe:</span>
                  <p>{conversa.texto_final || conversa.rascunho}</p>
                </div>
              )}

              {(editavel || conversa.status === 'aprovado') && (
                <>
                  <label className="ci-ig-rotulo-rascunho">Rascunho da IA {editavel && '(edite se quiser)'}</label>
                  <textarea
                    className="ci-ig-rascunho"
                    value={rascunho}
                    readOnly={!editavel}
                    onChange={e => setEdicao(s => ({ ...s, [conversa.conversation_id]: e.target.value }))}
                    rows={3}
                  />
                  {conversa.motivo && <small className="ci-ig-motivo">{conversa.motivo}</small>}
                </>
              )}

              {editavel && (
                <div className="ci-ig-acoes">
                  <button
                    type="button"
                    className="ci-ig-btn-primario"
                    disabled={salvando === conversa.conversation_id || !rascunho.trim()}
                    onClick={() => void decide(conversa, 'aprovado')}
                  >
                    Aprovar e enviar
                  </button>
                  <button
                    type="button"
                    className="ci-ig-btn-secundario"
                    disabled={salvando === conversa.conversation_id}
                    onClick={() => void decide(conversa, 'descartado')}
                  >
                    Descartar
                  </button>
                </div>
              )}

              {conversa.status === 'aprovado' && <div className="ci-ig-aguardando">✓ Aprovado. A esteira envia na próxima passada.</div>}
              {conversa.status === 'descartado' && <div className="ci-ig-descartado">Descartado.</div>}
              {finalizada && conversa.status === 'enviado' && <div className="ci-ig-ok">✓ Respondido</div>}
            </article>
          );
        })}
      </div>
    </section>
  );
}
