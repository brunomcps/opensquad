import { useEffect, useState } from 'react';
import type { TemporalAssociationReport } from '../../../supabase/functions/_shared/association';
import { getAssociation } from '../../../ci-app/src/api';

function today(): string { return new Date().toISOString().slice(0, 10); }
function shift(date: string, days: number): string { return new Date(Date.parse(`${date}T12:00:00.000Z`) + days * 86_400_000).toISOString().slice(0, 10); }
function money(value: number): string { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value); }
function compact(value: number): string { return new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(value); }
function date(value: string): string { return new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR'); }

const SIGNALS = {
  above: { label: 'Acima do baseline', className: 'ci-signal-above' },
  below: { label: 'Abaixo do baseline', className: 'ci-signal-below' },
  flat: { label: 'Sem diferença', className: 'ci-signal-flat' },
};

export function VideoSalesAssociation() {
  const end = today();
  const [days, setDays] = useState(180);
  const [windowDays, setWindowDays] = useState(7);
  const [baselineWeeks, setBaselineWeeks] = useState(2);
  const [data, setData] = useState<TemporalAssociationReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load(nextDays = days, nextWindow = windowDays, nextBaselineWeeks = baselineWeeks) {
    setLoading(true);
    setError(null);
    try {
      setData(await getAssociation({
        start: shift(end, -nextDays),
        end,
        currency: 'BRL',
        window: nextWindow,
        baselineWeeks: nextBaselineWeeks,
      }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível calcular a associação.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  return (
    <div className="ci-decision-view">
      <section className="ci-method-banner ci-method-association">
        <div><span className="ci-evidence-badge ci-evidence-association">Associação temporal exploratória</span><strong>O que aconteceu depois de cada publicação</strong></div>
        <p>Compara a janela posterior aos mesmos dias da semana anteriores. Isso encontra sinais úteis, mas não prova que o vídeo causou as vendas.</p>
      </section>

      <section className="ci-overview-toolbar">
        <div><strong>Vídeos × vendas</strong><span>{data?.method.description || 'Baseline por mesmos dias da semana'}</span></div>
        <div className="ci-filter-groups">
          <div className="ci-segmented">{[90, 180, 365].map(value => <button type="button" key={value} className={days === value ? 'active' : ''} onClick={() => { setDays(value); void load(value, windowDays, baselineWeeks); }}>{value} dias</button>)}</div>
          <label className="ci-select-label">Janela<select value={windowDays} onChange={event => { const value = Number(event.target.value); setWindowDays(value); void load(days, value, baselineWeeks); }}><option value={7}>7 dias</option><option value={14}>14 dias</option></select></label>
          <label className="ci-select-label">Baseline<select value={baselineWeeks} onChange={event => { const value = Number(event.target.value); setBaselineWeeks(value); void load(days, windowDays, value); }}><option value={2}>2 semanas</option><option value={4}>4 semanas</option><option value={8}>8 semanas</option></select></label>
          <button className="ci-refresh" type="button" onClick={() => load()}>Atualizar</button>
        </div>
      </section>

      {loading && !data && <div className="ci-overview-state"><span className="loading-pulse">Calculando associação...</span></div>}
      {error && <div className="ci-warning-box" role="alert"><strong>Análise indisponível</strong><span>{error}</span></div>}

      {data && <>
        <section className="ci-kpi-grid ci-kpi-grid-four">
          <article className="ci-kpi-card ci-kpi-primary"><span>Vídeos analisados</span><strong>{data.totals.videosAnalyzed}</strong><small>{data.totals.videosPublished} publicados no período</small></article>
          <article className="ci-kpi-card"><span>Acima do baseline</span><strong>{data.totals.aboveBaseline}</strong><small>Diferença observada, não causal</small></article>
          <article className="ci-kpi-card"><span>Abaixo do baseline</span><strong>{data.totals.belowBaseline}</strong><small>Janela posterior menor que a referência</small></article>
          <article className="ci-kpi-card"><span>Dados insuficientes</span><strong>{data.totals.insufficientData}</strong><small>Sem baseline ou janela completa</small></article>
        </section>

        {!data.videos.length && <section className="ci-empty-action"><strong>Ainda não há vídeos comparáveis nesse período</strong><span>É preciso ter a janela posterior completa e quatro semanas anteriores de transações para formar o baseline.</span></section>}

        {!!data.videos.length && <section className="ci-panel ci-association-panel">
          <header><div><span>Ranking exploratório</span><small>Ordenado pela diferença de líquido após taxas em relação ao baseline</small></div></header>
          <div className="ci-association-table-wrap ci-association-desktop">
            <table className="ci-association-table">
              <thead><tr><th>Vídeo</th><th>Janela</th><th>Views</th><th>Vendas</th><th>Líquido após taxas</th><th>Diferença</th><th>Concorrência</th></tr></thead>
              <tbody>{data.videos.map(video => {
                const signal = SIGNALS[video.signal];
                return <tr key={video.videoId}>
                  <td><div className="ci-video-cell">{video.thumbnailUrl ? <img src={video.thumbnailUrl} alt="" /> : <span className="ci-video-placeholder">YT</span>}<div><strong title={video.title}>{video.title}</strong><small>{date(video.publishedDate)} · {video.contentType}</small><span className={`ci-signal ${signal.className}`}>{signal.label}</span></div></div></td>
                  <td><strong>{date(video.postWindow.start)}–{date(video.postWindow.end)}</strong><small>{data.method.postWindowDays} dias</small></td>
                  <td><strong>{compact(video.views)}</strong><small>na janela</small></td>
                  <td><strong>{video.actualSales}</strong><small>baseline {video.expectedSales.toFixed(1)}</small></td>
                  <td><strong>{money(video.actualNetAfterFees)}</strong><small>baseline {money(video.expectedNetAfterFees)}</small></td>
                  <td className={video.netDifference >= 0 ? 'ci-positive-value' : 'ci-negative-value'}><strong>{video.netDifference >= 0 ? '+' : ''}{money(video.netDifference)}</strong><small>{video.netDifferenceRate === null ? 'baseline zerado' : `${video.netDifferenceRate >= 0 ? '+' : ''}${(video.netDifferenceRate * 100).toFixed(1)}%`}</small></td>
                  <td><strong>{video.overlapCount}</strong><small>{video.overlapCount ? 'outro(s) vídeo(s)' : 'sem outro vídeo'}</small></td>
                </tr>;
              })}</tbody>
            </table>
          </div>
          <div className="ci-association-mobile">
            {data.videos.map(video => {
              const signal = SIGNALS[video.signal];
              return <article className="ci-association-card" key={video.videoId}>
                <div className="ci-association-card-head">
                  <div><strong>{video.title}</strong><small>{date(video.publishedDate)} · {video.contentType}</small></div>
                  <span className={`ci-signal ${signal.className}`}>{signal.label}</span>
                </div>
                <dl>
                  <div><dt>Janela</dt><dd>{date(video.postWindow.start)}–{date(video.postWindow.end)}</dd></div>
                  <div><dt>Views</dt><dd>{compact(video.views)}</dd></div>
                  <div><dt>Vendas</dt><dd>{video.actualSales}<small>baseline {video.expectedSales.toFixed(1)}</small></dd></div>
                  <div><dt>Líquido</dt><dd>{money(video.actualNetAfterFees)}<small>baseline {money(video.expectedNetAfterFees)}</small></dd></div>
                  <div><dt>Diferença</dt><dd className={video.netDifference >= 0 ? 'ci-positive-value' : 'ci-negative-value'}><strong>{video.netDifference >= 0 ? '+' : ''}{money(video.netDifference)}</strong><small>{video.netDifferenceRate === null ? 'baseline zerado' : `${video.netDifferenceRate >= 0 ? '+' : ''}${(video.netDifferenceRate * 100).toFixed(1)}%`}</small></dd></div>
                  <div><dt>Concorrência</dt><dd>{video.overlapCount}<small>{video.overlapCount ? 'outro(s) vídeo(s)' : 'sem outro vídeo'}</small></dd></div>
                </dl>
              </article>;
            })}
          </div>
        </section>}

        <section className="ci-warning-box"><strong>Como ler sem cair no caô</strong><span>{data.method.warning}</span><span>Vídeos sobrepostos não têm seus lifts somados. Campanhas, e-mail, preço e outros eventos podem explicar a diferença.</span></section>
      </>}
    </div>
  );
}
