import { useState } from 'react';
import type { CampaignCatalog, CampaignDto, MemberRole } from '../../../ci-app/src/api';
import type { VideoCampaignBundleModel } from './campaignBundleModel';
import { TrackingHistoryExplorer } from './TrackingHistoryExplorer';

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
  historyExpanded,
  historyVideos,
  historyStart,
  historyEnd,
  onHistoryToggle,
}: {
  bundle: VideoCampaignBundleModel;
  role: MemberRole;
  copied: string | null;
  copyError: string | null;
  onCopy: (key: string, value: string) => Promise<void>;
  onToggle: (campaign: CampaignDto) => Promise<void>;
  historyExpanded: boolean;
  historyVideos: CampaignCatalog['videos'];
  historyStart: string;
  historyEnd: string;
  onHistoryToggle: (videoId: string) => void;
}) {
  const title = displayText(bundle.title);
  const catalogVideo = historyVideos.find(video => video.video_id === bundle.videoId);
  const stats = catalogVideo?.stats;
  const publishedLabel = catalogVideo?.published_at
    ? new Date(catalogVideo.published_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : null;
  const compactNumber = (value: number) => new Intl.NumberFormat('pt-BR', {
    notation: 'compact', maximumFractionDigits: 1,
  }).format(value);

  return <article className="ci-video-bundle" data-video-id={bundle.videoId}>
    <header className="ci-video-bundle-header">
      <VideoPreview videoId={bundle.videoId} title={title} thumbnailUrl={bundle.thumbnailUrl} canEmbed={bundle.canEmbed} />
      <div className="ci-video-identity">
        <div>
          <span className="ci-video-eyebrow">Vídeo do YouTube</span>
          <h3>{title}</h3>
          <code>{bundle.videoId}</code>
          {catalogVideo?.privacy_status && catalogVideo.privacy_status !== 'public' && <span
            className="ci-video-privacy"
            title={catalogVideo.privacy_status === 'private'
              ? 'Vídeo privado no YouTube: só você vê. Os links continuam ativos, mas ninguém chega neles pelo vídeo.'
              : 'Vídeo não listado no YouTube: só abre por link direto. Não aparece no canal nem na busca.'}
          >{catalogVideo.privacy_status === 'private' ? 'Privado no YouTube' : 'Não listado no YouTube'}</span>}
          {(stats || publishedLabel) && <div className="ci-video-audience">
            {stats && <>
              <span className="ci-audience-chip"><strong>{compactNumber(stats.views)}</strong> views</span>
              <span className="ci-audience-chip"><strong>{compactNumber(stats.likes)}</strong> likes</span>
              <span className="ci-audience-chip"><strong>{compactNumber(stats.comments)}</strong> comentários</span>
            </>}
            {publishedLabel && <span className="ci-audience-date">Publicado {publishedLabel}</span>}
          </div>}
        </div>
        <span className={`ci-video-link-status ci-video-link-status-${bundle.statusTone}`}>{bundle.statusSummary}</span>
        <div className="ci-video-total-metrics" aria-label="Métricas totais do vídeo">
          <span><strong>{bundle.totals.clicks}</strong><small>cliques</small></span>
          <span><strong>{bundle.totals.sales}</strong><small>vendas MAPA</small></span>
          <span><strong>{bundle.totals.additionalSales}</strong><small>adicionais</small></span>
          <span><strong>{money(bundle.totals.netAfterFees)}</strong><small>líquido originado</small></span>
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
            <span><strong>{item.metrics.sales}</strong><small>vendas MAPA</small></span>
            <span><strong>{item.metrics.additionalSales}</strong><small>adicionais</small></span>
            <span><strong>{money(item.metrics.netAfterFees)}</strong><small>líquido originado</small></span>
          </div>
        </section>;
      })}
    </div>

    <div className="ci-video-history-control">
      <button type="button" aria-expanded={historyExpanded} onClick={() => onHistoryToggle(bundle.videoId)}>
        {historyExpanded ? 'Recolher histórico' : 'Ver histórico de cliques e compras'}
      </button>
    </div>

    {historyExpanded && <TrackingHistoryExplorer
      videos={historyVideos}
      fixedVideoId={bundle.videoId}
      compact
      initialStart={historyStart}
      initialEnd={historyEnd}
    />}

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
