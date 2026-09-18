import { useState } from 'react';
import type { CampaignCatalog, CampaignDto, MemberRole } from '../../../ci-app/src/api';
import type { CampaignBundleTotals, CampaignPositionItem, VideoCampaignBundleModel } from './campaignBundleModel';
import { TrackingHistoryExplorer } from './TrackingHistoryExplorer';
import { CONVERSION_MIN_CLICKS, formatBrtShort, stalledLinkDays } from './trackingHistoryModel';

function money(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function displayText(value: string): string {
  const entities: Record<string, string> = { amp: '&', quot: '"', '#39': "'", lt: '<', gt: '>' };
  return value.replace(/&(amp|quot|#39|lt|gt);/g, match => entities[match.slice(1, -1)] || match);
}

export function campaignStatusLabel(campaign: CampaignDto): string {
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

function percent(value: number | null): string {
  return value === null ? '—' : `${(value * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
}

// Os seis números de cima do card. "na vida" só aparece quando o período
// filtrado é menor que o histórico inteiro (senão seria o mesmo número duas vezes).
export function BundleTotals({ totals, periodLabel, bioNote = false }: {
  totals: CampaignBundleTotals;
  periodLabel: string;
  bioNote?: boolean;
}) {
  const lifetime = totals.lifetime;
  const showLifetime = Boolean(lifetime) && (lifetime!.clicks !== totals.clicks || lifetime!.sales !== totals.sales);
  const conversionHint = totals.conversion === null
    ? bioNote && totals.clicks === 0
      ? 'bio não conta clique'
      : `menos de ${CONVERSION_MIN_CLICKS} cliques: cedo pra afirmar`
    : `1 venda a cada ${Math.round(totals.clicks / Math.max(totals.sales, 1))} cliques`;
  const lastClick = formatBrtShort(totals.lastClickAt);
  return <div className="ci-video-total-metrics ci-bundle-totais" aria-label={`Totais ${periodLabel}`}>
    <span><strong>{totals.clicks.toLocaleString('pt-BR')}</strong><small>cliques{showLifetime && <em> · {lifetime!.clicks.toLocaleString('pt-BR')} na vida</em>}</small></span>
    <span><strong>{totals.sales}</strong><small>{totals.sales === 1 ? 'venda MAPA' : 'vendas MAPA'}{showLifetime && <em> · {lifetime!.sales} na vida</em>}{totals.foreignSales > 0 && <em> · {totals.foreignSales} em outra moeda</em>}</small></span>
    <span><strong>{totals.additionalSales}</strong><small>{totals.additionalSales === 1 ? 'outro produto' : 'outros produtos'}</small></span>
    <span><strong>{totals.refunds}</strong><small>{totals.refunds === 1 ? 'devolvida' : 'devolvidas'}</small></span>
    <span title={`Conversão = vendas MAPA ÷ cliques de gente, só nos locais onde o clique é medido. Abaixo de ${CONVERSION_MIN_CLICKS} cliques não afirmamos porcentagem.`}>
      <strong>{percent(totals.conversion)}</strong><small>conversão<em> · {conversionHint}</em></small>
    </span>
    <span><strong>{money(totals.netAfterFees)}</strong><small>líquido{lastClick && <em> · último clique {lastClick}</em>}</small></span>
  </div>;
}

// As linhas de link (D/C/R/V no YouTube; B/C/DM no Instagram), com copiar e métricas.
export function PositionRows({ items, copied, copyError, onCopy }: {
  items: CampaignPositionItem[];
  copied: string | null;
  copyError: string | null;
  onCopy: (key: string, value: string) => Promise<void>;
}) {
  return <div className="ci-position-list">
    {items.map(item => {
      const publicKey = `redirect-${item.campaign.campaign_id}`;
      const publicUrl = item.campaign.redirectUrl;
      return <section className="ci-position-row" key={item.campaign.campaign_id} data-position={item.campaign.cta_position}>
        <span className="ci-position-code" aria-hidden="true">{item.code}</span>
        <div className="ci-position-label">
          <strong>{item.label}</strong>
          {item.hint && <span className="ci-position-hint">{item.hint}</span>}
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
  </div>;
}

// Texto que vai pra área de transferência no "Copiar os N links": um por linha,
// com o local na frente, pronto pra colar na descrição/comentário.
export function bundleLinksText(items: CampaignPositionItem[]): string {
  return items
    .filter(item => item.campaign.redirectUrl)
    .map(item => `${item.label}: ${item.campaign.redirectUrl}`)
    .join('\n');
}

export function TechnicalDetails({ items, role, copied, copyError, onCopy, onToggle }: {
  items: CampaignPositionItem[];
  role: MemberRole;
  copied: string | null;
  copyError: string | null;
  onCopy: (key: string, value: string) => Promise<void>;
  onToggle: (campaign: CampaignDto) => Promise<void>;
}) {
  return <details className="ci-bundle-details">
    <summary>Detalhes técnicos</summary>
    <div className="ci-bundle-details-content">
      {items.map(item => {
        const directKey = `direct-${item.campaign.campaign_id}`;
        return <section className="ci-technical-campaign" key={item.campaign.campaign_id}>
          <header><strong>{item.code} · {item.label}</strong><span className={`ci-status-pill ci-status-${item.campaign.status}`}>{campaignStatusLabel(item.campaign)}</span></header>
          <div className="ci-technical-meta">
            <span><small>Campanha</small>{item.campaign.name}</span>
            <span><small>Produto</small>{displayText(item.campaign.product_name)}</span>
            <span><small>Tracking code</small><code>{item.campaign.tracking_code}</code></span>
          </div>
          <div className="ci-technical-link">
            <small>HotLink direto (não conta clique: use só onde o link curto não cabe)</small>
            <code title={item.campaign.directUrl}>{item.campaign.directUrl}</code>
            <button type="button" className="ci-copy-button" onClick={() => onCopy(directKey, item.campaign.directUrl)}>{copied === directKey ? 'Copiado' : 'Copiar'}</button>
            {copyError === directKey && <span className="ci-copy-error" role="alert">Não foi possível copiar. Selecione o link.</span>}
          </div>
          {role === 'admin' && <button type="button" className="ci-text-action" onClick={() => onToggle(item.campaign)}>{item.campaign.status === 'active' ? 'Desativar campanha' : 'Reativar campanha'}</button>}
        </section>;
      })}
    </div>
  </details>;
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
  periodLabel,
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
  periodLabel: string;
}) {
  const title = displayText(bundle.title);
  const catalogVideo = historyVideos.find(video => video.video_id === bundle.videoId);
  const stats = catalogVideo?.stats;
  const publishedAt = catalogVideo?.published_at ? new Date(catalogVideo.published_at) : null;
  const publishedLabel = publishedAt
    ? publishedAt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : null;
  const publishedAge = publishedAt ? Math.floor((Date.now() - publishedAt.getTime()) / 86_400_000) : null;
  const compactNumber = (value: number) => new Intl.NumberFormat('pt-BR', {
    notation: 'compact', maximumFractionDigits: 1,
  }).format(value);
  const allKey = `all-${bundle.videoId}`;
  const linkCount = bundle.items.filter(item => item.campaign.redirectUrl).length;
  const lifetimeClicks = bundle.totals.lifetime?.clicks ?? bundle.totals.clicks;
  const lastClickEver = bundle.totals.lifetime?.lastClickAt ?? bundle.totals.lastClickAt;
  const isPublic = !catalogVideo?.privacy_status || catalogVideo.privacy_status === 'public';
  const stalledDays = isPublic ? stalledLinkDays(lastClickEver, lifetimeClicks) : null;

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
          {stalledDays !== null && <span
            className="ci-video-privacy ci-video-parado"
            title={`Este vídeo já teve ${lifetimeClicks.toLocaleString('pt-BR')} cliques e não recebe nenhum há ${stalledDays} dias. Confere se o link continua na descrição e no comentário fixado.`}
          >Sem clique há {stalledDays} dias</span>}
          {(stats || publishedLabel) && <div className="ci-video-audience">
            {stats && <>
              <span className="ci-audience-chip"><strong>{compactNumber(stats.views)}</strong> views</span>
              <span className="ci-audience-chip"><strong>{compactNumber(stats.likes)}</strong> likes</span>
              <span className="ci-audience-chip"><strong>{compactNumber(stats.comments)}</strong> comentários</span>
            </>}
            {publishedLabel && <span className="ci-audience-date">Publicado {publishedLabel}{publishedAge !== null && publishedAge >= 0 && ` · ${publishedAge === 0 ? 'hoje' : publishedAge === 1 ? 'ontem' : `há ${publishedAge} dias`}`}</span>}
          </div>}
        </div>
        <span className={`ci-video-link-status ci-video-link-status-${bundle.statusTone}`}>{bundle.statusSummary}</span>
        <BundleTotals totals={bundle.totals} periodLabel={periodLabel} />
      </div>
    </header>

    <div className="ci-bundle-acoes">
      {linkCount > 0 && <button type="button" className="ci-copy-button" onClick={() => onCopy(allKey, bundleLinksText(bundle.items))}>
        {copied === allKey ? 'Copiados' : `Copiar ${linkCount === 1 ? 'o link' : `os ${linkCount} links`}`}
      </button>}
      {copyError === allKey && <small className="ci-copy-error" role="alert">Não foi possível copiar. Copie um por um abaixo.</small>}
      <button type="button" aria-expanded={historyExpanded} onClick={() => onHistoryToggle(bundle.videoId)}>
        {historyExpanded ? 'Recolher histórico' : 'Ver histórico deste vídeo'}
      </button>
    </div>

    <PositionRows items={bundle.items} copied={copied} copyError={copyError} onCopy={onCopy} />

    {historyExpanded && <TrackingHistoryExplorer
      videos={historyVideos}
      fixedVideoId={bundle.videoId}
      compact
      initialStart={historyStart}
      initialEnd={historyEnd}
    />}

    <TechnicalDetails items={bundle.items} role={role} copied={copied} copyError={copyError} onCopy={onCopy} onToggle={onToggle} />
  </article>;
}
