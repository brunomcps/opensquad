import type { CampaignCatalog, CampaignDto, MemberRole } from '../../../ci-app/src/api';
import type { CampaignPositionItem, InstagramCampaignBundleModel } from './campaignBundleModel';
import { TrackingHistoryExplorer } from './TrackingHistoryExplorer';
import { BundleTotals, PositionRows, TechnicalDetails, bundleLinksText, type LinkTestState } from './VideoCampaignBundle';

function shortDate(value: string | null): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric' });
}

// O Instagram é um canal, não um vídeo: um card só, com os três lugares onde o
// link vive (bio, comentário que o robô ManyChat responde por DM, DM manual).
export function InstagramCampaignBundle({
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
  onTest,
  tests,
}: {
  bundle: InstagramCampaignBundleModel;
  role: MemberRole;
  copied: string | null;
  copyError: string | null;
  onCopy: (key: string, value: string) => Promise<void>;
  onToggle: (campaign: CampaignDto) => Promise<void>;
  historyExpanded: boolean;
  historyVideos: CampaignCatalog['videos'];
  historyStart: string;
  historyEnd: string;
  onHistoryToggle: () => void;
  periodLabel: string;
  onTest?: (item: CampaignPositionItem) => void;
  tests?: Record<string, LinkTestState>;
}) {
  const allKey = 'all-instagram';
  const linkCount = bundle.items.filter(item => item.campaign.redirectUrl).length;
  const from = shortDate(bundle.createdFrom);
  const to = shortDate(bundle.createdTo);
  const bio = bundle.items.find(item => item.campaign.cta_position === 'bio');

  return <article className="ci-video-bundle ci-instagram-bundle" data-channel="instagram">
    <header className="ci-video-bundle-header">
      <div className="ci-video-preview ci-video-preview-disabled ci-instagram-tile" aria-hidden="true">
        <span>@brunosallesphd</span>
      </div>
      <div className="ci-video-identity">
        <div>
          <span className="ci-video-eyebrow">Canal</span>
          <h3>Instagram</h3>
          <code>bio · comentário → DM · DM manual</code>
          {from && <div className="ci-video-audience">
            <span className="ci-audience-date">Links criados {from === to || !to ? `em ${from}` : `de ${from} a ${to}`}</span>
          </div>}
        </div>
        <span className={`ci-video-link-status ci-video-link-status-${bundle.statusTone}`}>{bundle.statusSummary}</span>
        <BundleTotals totals={bundle.totals} periodLabel={periodLabel} bioNote />
      </div>
    </header>

    <div className="ci-bundle-acoes">
      {linkCount > 0 && <button type="button" className="ci-copy-button" onClick={() => onCopy(allKey, bundleLinksText(bundle.items))}>
        {copied === allKey ? 'Copiados' : `Copiar ${linkCount === 1 ? 'o link' : `os ${linkCount} links`}`}
      </button>}
      {copyError === allKey && <small className="ci-copy-error" role="alert">Não foi possível copiar. Copie um por um abaixo.</small>}
      <button type="button" aria-expanded={historyExpanded} onClick={onHistoryToggle}>
        {historyExpanded ? 'Recolher histórico' : 'Ver histórico do Instagram'}
      </button>
    </div>

    <PositionRows items={bundle.items} copied={copied} copyError={copyError} onCopy={onCopy} onTest={onTest} tests={tests} />

    {bundle.bioWithoutClicks && bio && <div className="ci-bundle-aviso" role="status">
      <strong>Bio: {bio.metrics.sales} {bio.metrics.sales === 1 ? 'venda' : 'vendas'} e 0 cliques.</strong>
      {' '}A bio ainda usa o link cru da Hotmart: a venda chega, o clique não. Troque pelo link <b>{bio.campaign.redirectUrl}</b> e o clique passa a contar.
    </div>}

    {historyExpanded && <TrackingHistoryExplorer
      videos={historyVideos}
      fixedChannel="instagram"
      compact
      initialStart={historyStart}
      initialEnd={historyEnd}
    />}

    <TechnicalDetails items={bundle.items} role={role} copied={copied} copyError={copyError} onCopy={onCopy} onToggle={onToggle} />
  </article>;
}
