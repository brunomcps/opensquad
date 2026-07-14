import { useState } from 'react';
import type { CampaignDto, MemberRole } from '../../../ci-app/src/api';
import type { VideoCampaignBundleModel } from './campaignBundleModel';

function money(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function displayText(value: string): string {
  const entities: Record<string, string> = { amp: '&', quot: '"', '#39': "'", lt: '<', gt: '>' };
  return value.replace(/&(amp|quot|#39|lt|gt);/g, match => entities[match.slice(1, -1)] || match);
}

function campaignStatusLabel(campaign: CampaignDto): string {
  if (campaign.status === 'active') return 'Ativa';
  if (campaign.status === 'inactive') return 'Inativa';
  return 'Rascunho';
}

function VideoPreview({ videoId, title, thumbnailUrl, canEmbed }: {
  videoId: string;
  title: string;
  thumbnailUrl: string | null;
  canEmbed: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  if (expanded && canEmbed) {
    return <div className="ci-video-preview ci-video-preview-expanded">
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1`}
        title={`Vídeo: ${title}`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
      <button type="button" className="ci-video-collapse" aria-expanded="true" onClick={() => setExpanded(false)}>Recolher vídeo</button>
    </div>;
  }

  const preview = thumbnailUrl && !imageFailed
    ? <img src={thumbnailUrl} alt="" onError={() => setImageFailed(true)} />
    : <span className="ci-video-preview-fallback"><span aria-hidden="true">▶</span><small>Prévia indisponível</small></span>;

  if (!canEmbed) return <div className="ci-video-preview ci-video-preview-disabled">{preview}</div>;

  return <button
    type="button"
    className="ci-video-preview ci-video-preview-trigger"
    aria-label={`Reproduzir ${title}`}
    aria-expanded="false"
    onClick={() => setExpanded(true)}
  >
    {preview}
    <span className="ci-video-play" aria-hidden="true">▶</span>
  </button>;
}

export function VideoCampaignBundle({
  bundle,
  role,
  copied,
  copyError,
  onCopy,
  onToggle,
}: {
  bundle: VideoCampaignBundleModel;
  role: MemberRole;
  copied: string | null;
  copyError: string | null;
  onCopy: (key: string, value: string) => Promise<void>;
  onToggle: (campaign: CampaignDto) => Promise<void>;
}) {
  const title = displayText(bundle.title);

  return <article className="ci-video-bundle" data-video-id={bundle.videoId}>
    <header className="ci-video-bundle-header">
      <VideoPreview videoId={bundle.videoId} title={title} thumbnailUrl={bundle.thumbnailUrl} canEmbed={bundle.canEmbed} />
      <div className="ci-video-identity">
        <div>
          <span className="ci-video-eyebrow">Vídeo do YouTube</span>
          <h3>{title}</h3>
          <code>{bundle.videoId}</code>
        </div>
        <span className={`ci-video-link-status ci-video-link-status-${bundle.statusTone}`}>{bundle.statusSummary}</span>
        <div className="ci-video-total-metrics" aria-label="Métricas totais do vídeo">
          <span><strong>{bundle.totals.clicks}</strong><small>cliques</small></span>
          <span><strong>{bundle.totals.sales}</strong><small>vendas</small></span>
          <span><strong>{money(bundle.totals.netAfterFees)}</strong><small>líquido</small></span>
        </div>
      </div>
    </header>

    <div className="ci-position-list">
      {bundle.items.map(item => {
        const publicKey = `redirect-${item.campaign.campaign_id}`;
        const publicUrl = item.campaign.redirectUrl;
        return <section className="ci-position-row" key={item.campaign.campaign_id} data-position={item.campaign.cta_position}>
          <span className="ci-position-code" aria-hidden="true">{item.code}</span>
          <div className="ci-position-label">
            <strong>{item.label}</strong>
            {item.campaign.status !== 'active' && <small>{campaignStatusLabel(item.campaign)}</small>}
          </div>
          <div className="ci-position-link">
            {publicUrl
              ? <code title={publicUrl}>{publicUrl}</code>
              : <span className="ci-position-link-missing">Link público indisponível</span>}
            {copyError === publicKey && <small className="ci-copy-error" role="alert">Não foi possível copiar. Selecione o link.</small>}
          </div>
          {publicUrl && <button type="button" className="ci-copy-button" onClick={() => onCopy(publicKey, publicUrl)}>{copied === publicKey ? 'Copiado' : 'Copiar'}</button>}
          <div className="ci-position-metrics" aria-label={`Métricas de ${item.label}`}>
            <span><strong>{item.metrics.clicks}</strong><small>cliques</small></span>
            <span><strong>{item.metrics.sales}</strong><small>vendas</small></span>
            <span><strong>{money(item.metrics.netAfterFees)}</strong><small>líquido</small></span>
          </div>
        </section>;
      })}
    </div>

    <details className="ci-bundle-details">
      <summary>Detalhes técnicos</summary>
      <div className="ci-bundle-details-content">
        {bundle.items.map(item => {
          const directKey = `direct-${item.campaign.campaign_id}`;
          return <section className="ci-technical-campaign" key={item.campaign.campaign_id}>
            <header><strong>{item.code} · {item.label}</strong><span className={`ci-status-pill ci-status-${item.campaign.status}`}>{campaignStatusLabel(item.campaign)}</span></header>
            <div className="ci-technical-meta">
              <span><small>Campanha</small>{item.campaign.name}</span>
              <span><small>Produto</small>{displayText(item.campaign.product_name)}</span>
              <span><small>Tracking code</small><code>{item.campaign.tracking_code}</code></span>
            </div>
            <div className="ci-technical-link">
              <small>HotLink direto</small>
              <code title={item.campaign.directUrl}>{item.campaign.directUrl}</code>
              <button type="button" className="ci-copy-button" onClick={() => onCopy(directKey, item.campaign.directUrl)}>{copied === directKey ? 'Copiado' : 'Copiar'}</button>
              {copyError === directKey && <span className="ci-copy-error" role="alert">Não foi possível copiar. Selecione o link.</span>}
            </div>
            {role === 'admin' && <button type="button" className="ci-text-action" onClick={() => onToggle(item.campaign)}>{item.campaign.status === 'active' ? 'Desativar campanha' : 'Reativar campanha'}</button>}
          </section>;
        })}
      </div>
    </details>
  </article>;
}
