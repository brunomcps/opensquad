import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { CampaignInput, CtaPosition, TrackingParameter } from '../../../supabase/functions/_shared/campaigns';
import {
  createCampaign,
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
  video: 'Dentro do vídeo',
  bio: 'Bio',
  community: 'Comunidade',
  other: 'Outro',
};

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

function emptyForm(): CampaignInput {
  return {
    name: '', videoId: '', productId: '', productName: '', offerCode: null,
    destinationUrl: '', trackingParameter: 'sck', ctaLabel: '', ctaPosition: 'description',
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
          <option value="">Selecione</option>{catalog.videos.map(video => <option value={video.video_id} key={video.video_id}>{video.title}</option>)}
        </select></label>
        <label>Produto<select value={form.productId} required onChange={event => {
          const product = catalog.products.find(item => item.productId === event.target.value);
          setForm({ ...form, productId: event.target.value, productName: product?.productName || '', offerCode: product?.offerCodes[0] || null });
        }}><option value="">Selecione</option>{catalog.products.map(product => <option value={product.productId} key={product.productId}>{product.productName}</option>)}</select></label>
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

      {role === 'admin' && <CampaignForm catalog={catalog} onCreated={load} />}

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
            {campaigns.map(campaign => {
              const stats = attribution.campaigns.find(item => item.campaignId === campaign.campaign_id);
              return <article className="ci-campaign-row" key={campaign.campaign_id}>
                <div className="ci-campaign-summary">
                  <div><span className={`ci-status-pill ci-status-${campaign.status}`}>{campaign.status === 'active' ? 'Ativa' : campaign.status === 'inactive' ? 'Inativa' : 'Rascunho'}</span><strong>{campaign.name}</strong><small>{videoTitles.get(campaign.video_id) || campaign.video_id}</small></div>
                  <div className="ci-campaign-metrics"><span>{stats?.clicks || 0}<small>cliques</small></span><span>{stats?.sales || 0}<small>vendas</small></span><span>{money(stats?.netAfterFees || 0)}<small>líquido</small></span></div>
                </div>
                <div className="ci-campaign-meta"><span>{campaign.product_name}</span><span>{POSITION_LABELS[campaign.cta_position]}</span><code>{campaign.tracking_code}</code></div>
                <div className="ci-link-stack">
                  {campaign.redirectUrl && <div><label>Link rastreável</label><code>{campaign.redirectUrl}</code><button type="button" onClick={() => copy(`redirect-${campaign.campaign_id}`, campaign.redirectUrl!)}>{copied === `redirect-${campaign.campaign_id}` ? 'Copiado' : 'Copiar'}</button></div>}
                  <div><label>Link direto</label><code>{campaign.directUrl}</code><button type="button" onClick={() => copy(`direct-${campaign.campaign_id}`, campaign.directUrl)}>{copied === `direct-${campaign.campaign_id}` ? 'Copiado' : 'Copiar'}</button></div>
                </div>
                {role === 'admin' && <button type="button" className="ci-text-action" onClick={() => toggle(campaign)}>{campaign.status === 'active' ? 'Desativar campanha' : 'Reativar campanha'}</button>}
              </article>;
            })}
          </div>
        </section>}

        {!!attribution.unknownCodes.length && <section className="ci-warning-box"><strong>Códigos de origem ainda não cadastrados</strong>{attribution.unknownCodes.map(item => <span key={item.code}><code>{item.code}</code> · {item.sales} venda(s) · {money(item.netAfterFees)}</span>)}</section>}
      </>}
    </div>
  );
}
