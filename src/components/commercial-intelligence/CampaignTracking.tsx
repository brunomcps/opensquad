import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { CampaignInput, CtaPosition, TrackingParameter } from '../../../supabase/functions/_shared/campaigns';
import {
  createCampaign,
  createCampaignBatch,
  getAttribution,
  getCampaigns,
  updateCampaignStatus,
  type AttributionDto,
  type CampaignCatalog,
  type CampaignDto,
  type MemberRole,
} from '../../../ci-app/src/api';

const POSITION_LABELS: Record<CtaPosition, string> = {
  description: 'Descrição',
  pinned_comment: 'Comentário fixado',
  comment_reply: 'Resposta a comentário',
  video: 'Dentro do vídeo',
  bio: 'Bio',
  community: 'Comunidade',
  other: 'Outro',
};

const MAPA7P_PRODUCT_ID = '6966825';
const MAPA7P_PRODUCT_NAME = 'MAPA-7P · Mapeamento de Padrões Dopaminérgico';
const MAPA7P_HOTLINK = 'https://go.hotmart.com/K103806991N';
const MAPA7P_POSITIONS: CtaPosition[] = ['description', 'pinned_comment', 'comment_reply'];

function dateInput(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function shift(date: string, days: number): string {
  return new Date(Date.parse(`${date}T12:00:00.000Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

function money(value: number, currency = 'BRL'): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(value);
}

function percent(value: number | null): string {
  return value === null ? '—' : `${(value * 100).toFixed(1)}%`;
}

function displayText(value: string): string {
  const entities: Record<string, string> = { amp: '&', quot: '"', '#39': "'", lt: '<', gt: '>' };
  return value.replace(/&(amp|quot|#39|lt|gt);/g, match => entities[match.slice(1, -1)] || match);
}

function emptyForm(): CampaignInput {
  return {
    name: '', videoId: '', productId: '', productName: '', offerCode: null,
    destinationUrl: MAPA7P_HOTLINK, trackingParameter: 'src', ctaLabel: '', ctaPosition: 'description',
    utmSource: 'youtube', utmMedium: 'organic', utmCampaign: '', utmContent: 'descricao',
    utmTerm: null, startsAt: new Date().toISOString(), status: 'active',
  };
}

function CampaignForm({ catalog, onCreated }: { catalog: CampaignCatalog; onCreated: () => Promise<void> }) {
  const [form, setForm] = useState<CampaignInput>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm(current => ({
      ...current,
      videoId: current.videoId || catalog.videos[0]?.video_id || '',
      productId: current.productId || catalog.products[0]?.productId || '',
      productName: current.productName || catalog.products[0]?.productName || '',
      offerCode: current.offerCode || catalog.products[0]?.offerCodes[0] || null,
    }));
  }, [catalog]);

  const selectedProduct = catalog.products.find(product => product.productId === form.productId);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await createCampaign({
        ...form,
        productName: selectedProduct?.productName || form.productName,
        utmCampaign: form.utmCampaign || form.name,
        startsAt: new Date().toISOString(),
      });
      setForm(current => ({ ...emptyForm(), videoId: current.videoId, productId: current.productId, productName: current.productName }));
      await onCreated();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível criar a campanha.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="ci-campaign-form" onSubmit={submit}>
      <header>
        <div><span>Nova campanha</span><small>Vídeo + produto + CTA viram um código de origem único</small></div>
        <span className="ci-evidence-badge ci-evidence-direct">Atribuição direta</span>
      </header>
      <div className="ci-form-grid">
        <label>Nome da campanha<input value={form.name} required minLength={3} placeholder="Ex.: TDAH — descrição" onChange={event => setForm({ ...form, name: event.target.value })} /></label>
        <label>Vídeo<select value={form.videoId} required onChange={event => setForm({ ...form, videoId: event.target.value })}>
          <option value="">Selecione</option>{catalog.videos.map(video => <option value={video.video_id} key={video.video_id}>{displayText(video.title)}</option>)}
        </select></label>
        <label>Produto<select value={form.productId} required onChange={event => {
          const product = catalog.products.find(item => item.productId === event.target.value);
          setForm({ ...form, productId: event.target.value, productName: product?.productName || '', offerCode: product?.offerCodes[0] || null });
        }}><option value="">Selecione</option>{catalog.products.map(product => <option value={product.productId} key={product.productId}>{displayText(product.productName)}</option>)}</select></label>
        <label>CTA<input value={form.ctaLabel} required minLength={2} placeholder="Ex.: Conheça o curso" onChange={event => setForm({ ...form, ctaLabel: event.target.value })} /></label>
        <label>Posição<select value={form.ctaPosition} onChange={event => setForm({ ...form, ctaPosition: event.target.value as CtaPosition, utmContent: event.target.value })}>
          {Object.entries(POSITION_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
        </select></label>
        <label>Tipo do destino<select value={form.trackingParameter} onChange={event => setForm({ ...form, trackingParameter: event.target.value as TrackingParameter })}>
          <option value="sck">Checkout direto (SCK)</option><option value="src">HotLink / página (SRC)</option>
        </select></label>
        <label className="ci-form-wide">URL de destino<input type="url" value={form.destinationUrl} required placeholder="https://pay.hotmart.com/..." onChange={event => setForm({ ...form, destinationUrl: event.target.value })} /></label>
        <label>UTM campaign<input value={form.utmCampaign} placeholder="Usa o nome se ficar vazio" onChange={event => setForm({ ...form, utmCampaign: event.target.value })} /></label>
        <label>Oferta<select value={form.offerCode || ''} onChange={event => setForm({ ...form, offerCode: event.target.value || null })}>
          <option value="">Sem oferta específica</option>{selectedProduct?.offerCodes.map(code => <option key={code} value={code}>{code}</option>)}
        </select></label>
      </div>
      {error && <div className="ci-form-error" role="alert">{error}</div>}
      <div className="ci-form-footer">
        <span>O código terá no máximo 30 caracteres e será incluído automaticamente no link.</span>
        <button type="submit" disabled={saving || !catalog.videos.length || !catalog.products.length}>{saving ? 'Criando...' : 'Criar campanha e gerar links'}</button>
      </div>
    </form>
  );
}

function BulkCampaignGenerator({
  catalog,
  campaigns,
  onCreated,
}: {
  catalog: CampaignCatalog;
  campaigns: CampaignDto[];
  onCreated: () => Promise<void>;
}) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const mapaProduct = useMemo(() => catalog.products.find(product => product.productId === MAPA7P_PRODUCT_ID)
    || catalog.products.find(product => product.productName.toLocaleLowerCase('pt-BR').includes('mapa-7p')), [catalog.products]);
  const existingKeys = useMemo(() => new Set(campaigns
    .filter(campaign => campaign.product_id === MAPA7P_PRODUCT_ID)
    .map(campaign => `${campaign.video_id}|${campaign.cta_position}`)), [campaigns]);
  const missingPositions = (videoId: string) => MAPA7P_POSITIONS
    .filter(position => !existingKeys.has(`${videoId}|${position}`));
  const eligibleVideos = useMemo(() => catalog.videos
    .filter(video => MAPA7P_POSITIONS.some(position => !existingKeys.has(`${video.video_id}|${position}`))), [catalog.videos, existingKeys]);
  const filteredVideos = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('pt-BR');
    if (!normalized) return eligibleVideos;
    return eligibleVideos.filter(video => displayText(video.title).toLocaleLowerCase('pt-BR').includes(normalized)
      || video.video_id.toLocaleLowerCase('pt-BR').includes(normalized));
  }, [eligibleVideos, query]);
  const selectedLinkCount = useMemo(() => eligibleVideos
    .filter(video => selected.has(video.video_id))
    .reduce((total, video) => total + missingPositions(video.video_id).length, 0), [eligibleVideos, existingKeys, selected]);

  useEffect(() => {
    setSelected(new Set(eligibleVideos.map(video => video.video_id)));
  }, [eligibleVideos]);

  function toggleVideo(videoId: string) {
    setSelected(current => {
      const next = new Set(current);
      if (next.has(videoId)) next.delete(videoId);
      else next.add(videoId);
      return next;
    });
  }

  function selectVisible() {
    setSelected(current => new Set([...current, ...filteredVideos.map(video => video.video_id)]));
  }

  async function createBatch() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const result = await createCampaignBatch({
        namePrefix: 'MAPA-7P',
        videoIds: [...selected],
        productId: MAPA7P_PRODUCT_ID,
        productName: MAPA7P_PRODUCT_NAME,
        offerCode: mapaProduct?.offerCodes.find(code => code === 'vyqym0gx') || null,
        destinationUrl: MAPA7P_HOTLINK,
        trackingParameter: 'src',
        ctaLabel: 'Conheça o MAPA-7P',
        positions: MAPA7P_POSITIONS,
        utmSource: 'youtube',
        utmMedium: 'organic',
        utmCampaign: 'mapa7p-youtube',
        startsAt: new Date().toISOString(),
        status: 'active',
      });
      setMessage(`${result.created} link(s) criado(s); ${result.skipped} já existia(m).`);
      await onCreated();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível gerar os links do MAPA-7P.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="ci-campaign-form ci-bulk-generator">
      <header>
        <div><span>Gerador MAPA-7P</span><small>Cria descrição, comentário fixado e resposta para cada vídeo selecionado</small></div>
        <span className="ci-evidence-badge ci-evidence-direct">HotLink verificado</span>
      </header>
      <div className="ci-bulk-summary">
        <div><strong>{eligibleVideos.length}</strong><span>vídeo(s) ainda têm links pendentes</span></div>
        <div><strong>{selectedLinkCount}</strong><span>link(s) serão criados neste lote</span></div>
        <code>{MAPA7P_HOTLINK}</code>
      </div>
      <div className="ci-bulk-controls">
        <label>Filtrar vídeos<input value={query} placeholder="Título ou ID do vídeo" onChange={event => setQuery(event.target.value)} /></label>
        <div>
          <button type="button" onClick={selectVisible}>Selecionar visíveis</button>
          <button type="button" onClick={() => setSelected(new Set())}>Limpar seleção</button>
        </div>
      </div>
      <div className="ci-bulk-video-list">
        {filteredVideos.map(video => {
          const pending = missingPositions(video.video_id);
          return <label key={video.video_id}>
            <input type="checkbox" checked={selected.has(video.video_id)} onChange={() => toggleVideo(video.video_id)} />
            <span><strong>{displayText(video.title)}</strong><small>{video.video_id} · {pending.map(position => POSITION_LABELS[position]).join(' · ')}</small></span>
          </label>;
        })}
        {!filteredVideos.length && <div className="ci-bulk-empty">Nenhum vídeo pendente nesse filtro.</div>}
      </div>
      {error && <div className="ci-form-error" role="alert">{error}</div>}
      {message && <div className="ci-form-message" role="status">{message}</div>}
      <div className="ci-form-footer">
        <span>Reexecução segura: combinações que já existem são ignoradas.</span>
        <button type="button" disabled={saving || !selected.size} onClick={createBatch}>{saving ? 'Gerando...' : `Gerar ${selectedLinkCount} link(s)`}</button>
      </div>
    </section>
  );
}

export function CampaignTracking({ role }: { role: MemberRole }) {
  const today = dateInput();
  const [start, setStart] = useState(shift(today, -180));
  const [end, setEnd] = useState(today);
  const [campaigns, setCampaigns] = useState<CampaignDto[]>([]);
  const [catalog, setCatalog] = useState<CampaignCatalog>({ videos: [], products: [] });
  const [attribution, setAttribution] = useState<AttributionDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const videoTitles = useMemo(() => new Map(catalog.videos.map(video => [video.video_id, video.title])), [catalog.videos]);
  const campaignGroups = useMemo(() => {
    const groups = new Map<string, CampaignDto[]>();
    for (const campaign of campaigns) {
      const group = groups.get(campaign.video_id) || [];
      group.push(campaign);
      groups.set(campaign.video_id, group);
    }
    return [...groups.entries()].map(([videoId, items]) => ({ videoId, items }));
  }, [campaigns]);
  const attributionByCampaign = useMemo(() => new Map(
    (attribution?.campaigns || []).map(item => [item.campaignId, item]),
  ), [attribution]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [campaignResult, attributionResult] = await Promise.all([
        getCampaigns(), getAttribution({ start, end, currency: 'BRL' }),
      ]);
      setCampaigns(campaignResult.campaigns);
      setCatalog(campaignResult.catalog);
      setAttribution(attributionResult);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar o rastreamento.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function copy(label: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(label);
    window.setTimeout(() => setCopied(current => current === label ? null : current), 1_500);
  }

  async function toggle(campaign: CampaignDto) {
    const status = campaign.status === 'active' ? 'inactive' : 'active';
    try {
      const updated = await updateCampaignStatus(campaign.campaign_id, status);
      setCampaigns(current => current.map(item => item.campaign_id === campaign.campaign_id ? updated : item));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível atualizar a campanha.');
    }
  }

  if (loading && !attribution) return <div className="ci-overview-state"><span className="loading-pulse">Carregando rastreamento...</span></div>;

  return (
    <div className="ci-decision-view">
      <section className="ci-method-banner ci-method-direct">
        <div><span className="ci-evidence-badge ci-evidence-direct">Atribuição direta</span><strong>Venda com código conhecido → campanha comprovada</strong></div>
        <p>O crédito só existe quando a Hotmart devolve o mesmo SCK, SRC ou XCOD cadastrado. Venda sem origem continua sem atribuição.</p>
      </section>

      {role === 'admin' && <>
        <BulkCampaignGenerator catalog={catalog} campaigns={campaigns} onCreated={load} />
        <CampaignForm catalog={catalog} onCreated={load} />
      </>}

      <section className="ci-overview-toolbar">
        <div><strong>Cobertura da atribuição</strong><span>Filtro aplicado às vendas e aos cliques</span></div>
        <div className="ci-filter-groups">
          <label className="ci-select-label">De<input type="date" value={start} onChange={event => setStart(event.target.value)} /></label>
          <label className="ci-select-label">Até<input type="date" value={end} onChange={event => setEnd(event.target.value)} /></label>
          <button className="ci-refresh" type="button" onClick={load}>Atualizar</button>
        </div>
      </section>

      {error && <div className="ci-warning-box" role="alert"><strong>Rastreamento indisponível</strong><span>{error}</span></div>}

      {attribution && <>
        <section className="ci-kpi-grid ci-kpi-grid-four">
          <article className="ci-kpi-card ci-kpi-primary"><span>Cobertura direta</span><strong>{percent(attribution.totals.coverage)}</strong><small>{attribution.totals.attributedSales} de {attribution.totals.approvedSales} vendas aprovadas</small></article>
          <article className="ci-kpi-card"><span>Cliques humanos</span><strong>{attribution.totals.humanClicks}</strong><small>Pré-visualizações e bots ficam fora</small></article>
          <article className="ci-kpi-card"><span>Vendas atribuídas</span><strong>{attribution.totals.attributedSales}</strong><small>{attribution.totals.unattributedSales} sem crédito · {attribution.totals.ambiguousOriginSales} com origem conflitante</small></article>
          <article className="ci-kpi-card"><span>Líquido atribuído</span><strong>{money(attribution.totals.attributedNetAfterFees)}</strong><small>Bruto menos taxas das vendas atribuídas</small></article>
        </section>

        {!campaigns.length && <section className="ci-empty-action"><strong>Ainda não existe campanha rastreável</strong><span>Crie a primeira campanha acima. As transações históricas que chegaram sem código de origem permanecem sem atribuição.</span></section>}

        {!!campaigns.length && <section className="ci-panel">
          <header><div><span>Campanhas e links</span><small>Use o link rastreável para medir clique; o link direto preserva a origem Hotmart como fallback</small></div></header>
          <div className="ci-campaign-list">
            {campaignGroups.map(group => <section className="ci-video-campaign-group" key={group.videoId}>
              <header>
                <div><strong>{displayText(videoTitles.get(group.videoId) || group.videoId)}</strong><small>{group.videoId}</small></div>
                <span>{group.items.length} link(s)</span>
              </header>
              {group.items.map(campaign => {
                const stats = attributionByCampaign.get(campaign.campaign_id);
                return <article className="ci-campaign-row" key={campaign.campaign_id}>
                  <div className="ci-campaign-summary">
                    <div><span className={`ci-status-pill ci-status-${campaign.status}`}>{campaign.status === 'active' ? 'Ativa' : campaign.status === 'inactive' ? 'Inativa' : 'Rascunho'}</span><strong>{POSITION_LABELS[campaign.cta_position]}</strong><small>{campaign.name}</small></div>
                    <div className="ci-campaign-metrics"><span>{stats?.clicks || 0}<small>cliques</small></span><span>{stats?.sales || 0}<small>vendas</small></span><span>{money(stats?.netAfterFees || 0)}<small>líquido</small></span></div>
                  </div>
                  <div className="ci-campaign-meta"><span>{displayText(campaign.product_name)}</span><code>{campaign.tracking_code}</code></div>
                  <div className="ci-link-stack">
                    {campaign.redirectUrl && <div><label>Link para colar</label><code>{campaign.redirectUrl}</code><button type="button" onClick={() => copy(`redirect-${campaign.campaign_id}`, campaign.redirectUrl!)}>{copied === `redirect-${campaign.campaign_id}` ? 'Copiado' : 'Copiar'}</button></div>}
                    <div><label>HotLink direto</label><code>{campaign.directUrl}</code><button type="button" onClick={() => copy(`direct-${campaign.campaign_id}`, campaign.directUrl)}>{copied === `direct-${campaign.campaign_id}` ? 'Copiado' : 'Copiar'}</button></div>
                  </div>
                  {role === 'admin' && <button type="button" className="ci-text-action" onClick={() => toggle(campaign)}>{campaign.status === 'active' ? 'Desativar campanha' : 'Reativar campanha'}</button>}
                </article>;
              })}
            </section>)}
          </div>
        </section>}

        {!!attribution.unknownCodes.length && <section className="ci-warning-box"><strong>Códigos de origem ainda não cadastrados</strong>{attribution.unknownCodes.map(item => <span key={item.code}><code>{item.code}</code> · {item.sales} venda(s) · {money(item.netAfterFees)}</span>)}</section>}
      </>}
    </div>
  );
}
