import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  getTrackingEvents,
  getTrackingSeries,
  type CampaignCatalog,
  type TrackingEventDto,
  type TrackingGranularity,
  type TrackingHistoryFilters,
  type TrackingPositionFilter,
  type TrackingSeriesDto,
  type TrackingTrafficFilter,
} from '../../../ci-app/src/api';
import {
  brtDateInput,
  isCurrentTrackingRequest,
  isExpectedHotmartSchedule,
  mergeTrackingEventPages,
  purchaseStatusPresentation,
  trackingChartAvailability,
  trackingFiltersKey,
  type TrackingChartDatum,
} from './trackingHistoryModel';

type RangePreset = 'today' | '7d' | '30d' | '90d' | 'custom';

const TIME_ZONE = 'America/Sao_Paulo';
const POSITION_OPTIONS: Array<{ value: TrackingPositionFilter; label: string; short: string }> = [
  { value: 'all', label: 'Todos os locais', short: 'Todos' },
  { value: 'description', label: 'Descrição', short: 'D' },
  { value: 'pinned_comment', label: 'Comentário fixado', short: 'C' },
  { value: 'comment_reply', label: 'Resposta a comentário', short: 'R' },
  { value: 'video', label: 'Card do vídeo', short: 'V' },
];
const PRESETS: Array<{ value: RangePreset; label: string }> = [
  { value: 'today', label: 'Hoje' },
  { value: '7d', label: '7 dias' },
  { value: '30d', label: '30 dias' },
  { value: '90d', label: '90 dias' },
  { value: 'custom', label: 'Personalizado' },
];

const SERIES_COLORS = {
  clicks: '#2f7fd6',
  sales: '#0f8a5f',
  revenue: '#b8860b',
} as const;

type SeriesKey = keyof typeof SERIES_COLORS;

const SERIES_OPTIONS: Array<{ key: SeriesKey; label: string; hint: string }> = [
  { key: 'clicks', label: 'Cliques', hint: 'Cliques do filtro de tráfego escolhido' },
  { key: 'sales', label: 'Vendas', hint: 'Compras originadas pelos links (principal + adicional)' },
  { key: 'revenue', label: 'Receita (R$)', hint: 'Líquido após taxas das compras originadas' },
];

function shiftDate(date: string, days: number): string {
  return new Date(Date.parse(`${date}T12:00:00.000Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

export function trackingPresetRange(preset: Exclude<RangePreset, 'custom'>, today = brtDateInput()): { start: string; end: string } {
  const length = preset === 'today' ? 1 : Number.parseInt(preset, 10);
  return { start: shiftDate(today, -(length - 1)), end: today };
}

function formatDateTime(value: string | null): string {
  if (!value) return 'Ainda não registrado';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Data indisponível';
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(parsed);
}

function formatBucket(value: string, granularity: 'hour' | 'day' | 'week'): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', granularity === 'hour'
    ? { timeZone: TIME_ZONE, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }
    : { timeZone: TIME_ZONE, day: '2-digit', month: '2-digit' }).format(parsed);
}

function money(value: number | null, currency = 'BRL'): string {
  if (value === null) return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(value);
}

function percent(value: number | null): string {
  return value === null ? '—' : `${(value * 100).toFixed(1)}%`;
}

function displayText(value: string): string {
  const entities: Record<string, string> = { amp: '&', quot: '"', '#39': "'", lt: '<', gt: '>' };
  return value.replace(/&(amp|quot|#39|lt|gt);/g, match => entities[match.slice(1, -1)] || match);
}

function positionLabel(position: TrackingEventDto['ctaPosition']): string {
  return POSITION_OPTIONS.find(option => option.value === position)?.label || 'Sem local atribuído';
}

function isPurchaseEvent(event: TrackingEventDto): boolean {
  return event.type !== 'click';
}

function trafficLabel(event: TrackingEventDto): string {
  if (isPurchaseEvent(event)) {
    if (event.attribution === 'attributed' || event.attribution === 'direct_primary') return 'Origem comprovada';
    if (event.attribution === 'direct_additional') return 'Produto adicional';
    if (event.attribution === 'ambiguous') return 'Origem conflitante';
    return 'Sem origem';
  }
  if (event.traffic === 'qualified') return 'Clique qualificado';
  if (event.traffic === 'bot') return 'Bot';
  if (event.traffic === 'scanner') return 'Scanner';
  if (event.traffic === 'duplicate') return 'Evento duplicado';
  if (event.traffic === 'technical') return 'Tráfego técnico';
  return 'Não classificado';
}

function relativeAge(value: string | null): string {
  if (!value) return 'ainda não carregado';
  const seconds = Math.max(0, Math.floor((Date.now() - Date.parse(value)) / 1_000));
  if (seconds < 10) return 'agora';
  if (seconds < 60) return `há ${seconds} s`;
  return `há ${Math.floor(seconds / 60)} min`;
}

function eventDetail(event: TrackingEventDto): string {
  if (isPurchaseEvent(event)) {
    const status = purchaseStatusPresentation(event.status);
    return [event.productName, `${status.statusLabel} (status atual)`, money(event.amount, event.currency || 'BRL')].filter(Boolean).join(' · ');
  }
  return [event.deviceType, event.referrerHost || 'origem direta', event.technicalReason].filter(Boolean).join(' · ');
}

function eventKind(event: TrackingEventDto): { label: string; tone: string } {
  if (!isPurchaseEvent(event)) return { label: 'Clique', tone: 'click' };
  const status = purchaseStatusPresentation(event.status);
  return { label: status.eventLabel, tone: status.tone };
}

function reconciliationScheduleLabel(freshness: TrackingSeriesDto['freshness'] | null | undefined): string {
  if (isExpectedHotmartSchedule(freshness?.hotmartScheduleActive, freshness?.hotmartScheduleExpression)) {
    return 'Varredura automática diária às 06:40 BRT e também manual';
  }
  if (freshness?.hotmartScheduleActive === true) {
    return 'Automação ativa, mas o horário de 06:40 BRT não está confirmado; a busca manual continua disponível';
  }
  return 'Automação não confirmada; a busca manual continua disponível';
}

function nextReconciliationLabel(freshness: TrackingSeriesDto['freshness'] | null | undefined): string {
  if (!isExpectedHotmartSchedule(freshness?.hotmartScheduleActive, freshness?.hotmartScheduleExpression)) {
    return freshness?.hotmartScheduleActive === true ? 'Horário automático não confirmado' : 'Automação não confirmada';
  }
  if (!freshness) return 'Automação não confirmada';
  return freshness.nextHotmartReconciliationAt
    ? formatDateTime(freshness.nextHotmartReconciliationAt)
    : 'Próxima execução não informada';
}

function reconciliationStatusLabel(status: TrackingSeriesDto['freshness']['lastHotmartReconciliationStatus']): string {
  if (status === 'success') return 'sucesso completo';
  if (status === 'partial') return 'parcial';
  if (status === 'failed') return 'falhou';
  if (status === 'running') return 'em andamento';
  return 'sem tentativa registrada';
}

function reconciliationAttemptLabel(freshness: TrackingSeriesDto['freshness']): string {
  const timestamp = freshness.lastHotmartReconciliationAttemptAt || null;
  if (!timestamp) return 'Ainda não registrada';
  return `${formatDateTime(timestamp)} · ${reconciliationStatusLabel(freshness.lastHotmartReconciliationStatus)}`;
}

const HOTMART_GROUP_LABELS: Record<string, string> = {
  APPROVED: 'vendas aprovadas',
  COMPLETE: 'vendas concluídas',
  REFUNDED: 'reembolsos',
  CHARGEBACK: 'chargebacks',
  CANCELLED: 'cancelamentos',
};

function reconciliationProblemDetail(freshness: TrackingSeriesDto['freshness']): string {
  const warnings = freshness.lastHotmartReconciliationWarnings || [];
  const partial = warnings.find(warning => warning.startsWith('hotmart_partial_statuses:'));
  if (partial) {
    const groups = partial.slice('hotmart_partial_statuses:'.length)
      .split(',')
      .map(group => HOTMART_GROUP_LABELS[group] || group.toLowerCase())
      .join(', ');
    return `A Hotmart não respondeu para: ${groups}. O último sucesso completo continua sendo o carimbo confiável.`;
  }
  return freshness.lastHotmartReconciliationErrorMessage
    || 'A tentativa não atualizou todos os dados. O último sucesso completo continua sendo o carimbo confiável.';
}

export function TrackingHistoryExplorer({
  videos,
  products = [],
  fixedVideoId = null,
  compact = false,
  initialStart,
  initialEnd,
  onPanelRefresh,
  onPeriodChange,
}: {
  videos: CampaignCatalog['videos'];
  products?: CampaignCatalog['products'];
  fixedVideoId?: string | null;
  compact?: boolean;
  initialStart?: string;
  initialEnd?: string;
  onPanelRefresh?: () => Promise<void> | void;
  onPeriodChange?: (start: string, end: string) => void;
}) {
  const defaultRange = trackingPresetRange('7d');
  const [preset, setPreset] = useState<RangePreset>(initialStart || initialEnd ? 'custom' : '7d');
  const [start, setStart] = useState(initialStart || defaultRange.start);
  const [end, setEnd] = useState(initialEnd || defaultRange.end);
  const [videoId, setVideoId] = useState(fixedVideoId || '');
  const [position, setPosition] = useState<TrackingPositionFilter>('all');
  const [traffic, setTraffic] = useState<TrackingTrafficFilter>('qualified');
  const [granularity, setGranularity] = useState<TrackingGranularity>('auto');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [hiddenSeries, setHiddenSeries] = useState<Set<SeriesKey>>(new Set());
  const [series, setSeries] = useState<TrackingSeriesDto | null>(null);
  const [events, setEvents] = useState<TrackingEventDto[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSuccessfulAt, setLastSuccessfulAt] = useState<string | null>(null);
  const [loadedFilterKey, setLoadedFilterKey] = useState<string | null>(null);
  const requestSequence = useRef(0);
  const pageRequestSequence = useRef(0);
  const activeLoadRequest = useRef<number | null>(null);
  const pageLoadActive = useRef(false);
  const loadedFilterKeyRef = useRef<string | null>(null);
  const currentFilterKeyRef = useRef('');

  const filters = useMemo<TrackingHistoryFilters>(() => ({
    start,
    end,
    granularity,
    videoId: fixedVideoId || videoId || null,
    position,
    traffic,
    products: selectedProducts.length ? selectedProducts : null,
  }), [end, fixedVideoId, granularity, position, selectedProducts, start, traffic, videoId]);
  const filterKey = useMemo(() => trackingFiltersKey(filters), [filters]);
  currentFilterKeyRef.current = filterKey;

  const load = useCallback(async (silent = false) => {
    if (!start || !end || start > end) {
      requestSequence.current += 1;
      pageRequestSequence.current += 1;
      loadedFilterKeyRef.current = null;
      setLoadedFilterKey(null);
      setSeries(null);
      setEvents([]);
      setNextCursor(null);
      setLoading(false);
      setRefreshing(false);
      setError('Escolha um período válido.');
      return;
    }
    if (silent && activeLoadRequest.current !== null) return;
    const requestId = ++requestSequence.current;
    const requestFilterKey = filterKey;
    activeLoadRequest.current = requestId;
    pageRequestSequence.current += 1;
    pageLoadActive.current = false;
    if (!silent) {
      loadedFilterKeyRef.current = null;
      setLoadedFilterKey(null);
      setSeries(null);
      setEvents([]);
      setNextCursor(null);
      setLoadingMore(false);
    }
    if (!silent) setLoading(true);
    setRefreshing(true);
    setError(null);
    try {
      const [nextSeries, nextEvents] = await Promise.all([
        getTrackingSeries(filters),
        getTrackingEvents(filters, { limit: compact ? 20 : 50 }),
      ]);
      if (!isCurrentTrackingRequest({
        requestId,
        currentRequestId: requestSequence.current,
        requestFilterKey,
        currentFilterKey: currentFilterKeyRef.current,
      })) return;
      setSeries(nextSeries);
      setEvents(nextEvents.events);
      setNextCursor(nextEvents.nextCursor);
      loadedFilterKeyRef.current = requestFilterKey;
      setLoadedFilterKey(requestFilterKey);
      setLastSuccessfulAt(new Date().toISOString());
    } catch (cause) {
      if (!isCurrentTrackingRequest({
        requestId,
        currentRequestId: requestSequence.current,
        requestFilterKey,
        currentFilterKey: currentFilterKeyRef.current,
      })) return;
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar o histórico.');
    } finally {
      if (requestId === requestSequence.current) {
        activeLoadRequest.current = null;
        if (!silent) setLoading(false);
        setRefreshing(false);
      }
    }
  }, [compact, end, filterKey, filters, start]);

  useEffect(() => {
    void load(false);
    return () => {
      requestSequence.current += 1;
      pageRequestSequence.current += 1;
      pageLoadActive.current = false;
    };
  }, [load]);

  useEffect(() => {
    const reloadAfterSync = () => {
      if (document.visibilityState === 'visible') void load(true);
    };
    window.addEventListener('ci:data-updated', reloadAfterSync);
    return () => window.removeEventListener('ci:data-updated', reloadAfterSync);
  }, [load]);

  useEffect(() => {
    onPeriodChange?.(start, end);
  }, [end, onPeriodChange, start]);

  useEffect(() => {
    const poll = () => {
      if (document.visibilityState === 'visible') void load(true);
    };
    const interval = window.setInterval(poll, 30_000);
    document.addEventListener('visibilitychange', poll);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', poll);
    };
  }, [load]);

  function applyPreset(nextPreset: RangePreset) {
    setPreset(nextPreset);
    if (nextPreset === 'custom') return;
    const range = trackingPresetRange(nextPreset);
    setStart(range.start);
    setEnd(range.end);
  }

  async function refreshPanel() {
    await Promise.all([load(false), Promise.resolve(onPanelRefresh?.())]);
  }

  async function loadMore() {
    if (!nextCursor || loadingMore || pageLoadActive.current || loadedFilterKeyRef.current !== filterKey) return;
    const cursor = nextCursor;
    const baseRequestId = requestSequence.current;
    const requestFilterKey = filterKey;
    const pageRequestId = ++pageRequestSequence.current;
    pageLoadActive.current = true;
    setLoadingMore(true);
    try {
      const result = await getTrackingEvents(filters, { cursor, limit: compact ? 20 : 50 });
      if (pageRequestId !== pageRequestSequence.current
        || pageLoadActive.current !== true
        || loadedFilterKeyRef.current !== requestFilterKey
        || !isCurrentTrackingRequest({
          requestId: baseRequestId,
          currentRequestId: requestSequence.current,
          requestFilterKey,
          currentFilterKey: currentFilterKeyRef.current,
        })) return;
      setEvents(current => mergeTrackingEventPages(current, result.events));
      setNextCursor(result.nextCursor);
    } catch (cause) {
      if (pageRequestId === pageRequestSequence.current
        && loadedFilterKeyRef.current === requestFilterKey
        && currentFilterKeyRef.current === requestFilterKey) {
        setError(cause instanceof Error ? cause.message : 'Não foi possível carregar mais eventos.');
      }
    } finally {
      if (pageRequestId === pageRequestSequence.current) {
        pageLoadActive.current = false;
        setLoadingMore(false);
      }
    }
  }

  const visibleSeries = loadedFilterKey === filterKey ? series : null;
  const visibleEvents = loadedFilterKey === filterKey ? events : [];
  const visibleNextCursor = loadedFilterKey === filterKey ? nextCursor : null;

  const displayedClicks = visibleSeries
    ? traffic === 'qualified'
      ? visibleSeries.totals.qualifiedClicks
      : traffic === 'technical'
        ? visibleSeries.totals.technicalClicks
        : visibleSeries.totals.totalClicks
    : 0;
  const conversion = visibleSeries?.totals.qualifiedClicks
    ? visibleSeries.totals.attributedSales / visibleSeries.totals.qualifiedClicks
    : null;
  const chartData = useMemo<TrackingChartDatum[]>(() => (visibleSeries?.buckets || []).map(bucket => ({
    bucketStart: bucket.bucketStart,
    clicks: bucket.clicks.total,
    sales: bucket.sales.description + bucket.sales.pinnedComment + bucket.sales.commentReply
      + bucket.sales.video + bucket.sales.additional,
    revenue: bucket.netAfterFees,
    clickDescription: bucket.clicks.description,
    clickPinned: bucket.clicks.pinnedComment,
    clickReply: bucket.clicks.commentReply,
    clickVideo: bucket.clicks.video,
    clickOther: bucket.clicks.other,
    saleDescription: bucket.sales.description,
    salePinned: bucket.sales.pinnedComment,
    saleReply: bucket.sales.commentReply,
    saleVideo: bucket.sales.video,
    saleAdditional: bucket.sales.additional,
    saleUnattributed: bucket.sales.unattributed,
    saleAmbiguous: bucket.sales.ambiguous,
  })), [visibleSeries]);
  const { hasClicks, hasSales } = useMemo(() => trackingChartAvailability(chartData), [chartData]);
  const hasRevenue = useMemo(() => chartData.some(item => item.revenue !== 0), [chartData]);
  const hasChartData = hasClicks || hasSales || hasRevenue;

  function toggleSeries(key: SeriesKey) {
    setHiddenSeries(current => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else if (next.size < SERIES_OPTIONS.length - 1) next.add(key);
      return next;
    });
  }

  function toggleProduct(productId: string) {
    setSelectedProducts(current => current.includes(productId)
      ? current.filter(item => item !== productId)
      : [...current, productId]);
  }
  const selectedVideo = videos.find(video => video.video_id === (fixedVideoId || videoId));
  const title = fixedVideoId ? 'Histórico deste vídeo' : 'Histórico de cliques e compras';
  const lastSuccessAge = lastSuccessfulAt ? Date.now() - Date.parse(lastSuccessfulAt) : Number.POSITIVE_INFINITY;
  const liveTone = error ? 'error' : refreshing || lastSuccessAge > 90_000 ? 'warning' : 'healthy';
  const liveMessage = error
    ? 'Falha ao atualizar o painel'
    : refreshing
      ? 'Atualizando o painel agora'
      : `Painel atualizado ${relativeAge(lastSuccessfulAt)}`;

  return <section className={`ci-tracking-explorer${compact ? ' ci-tracking-explorer-compact' : ''}`}>
    <header className="ci-tracking-explorer-heading">
      <div>
        <span>{title}</span>
        <small>{fixedVideoId && selectedVideo ? displayText(selectedVideo.title) : 'Compare o total, cada vídeo e o local exato do link.'}</small>
      </div>
      <div className={`ci-live-state ci-live-state-${liveTone}`}>
        <span className="ci-live-dot" aria-hidden="true" />
        <span><strong>{liveMessage}</strong><small>Consulta automática a cada 30 s somente com esta aba aberta</small></span>
      </div>
    </header>

    <section className="ci-data-flow-guide" aria-label="Como os dados chegam">
      <strong>Como os dados chegam</strong>
      <ol>
        <li><span>1</span><div><strong>Cliques</strong><small>Gravados no redirecionamento, em tempo real.</small></div></li>
        <li><span>2</span><div><strong>Vendas</strong><small>Entram pelo webhook Hotmart; confirme a última chegada logo abaixo.</small></div></li>
        <li><span>3</span><div><strong>Reconciliação</strong><small>{reconciliationScheduleLabel(visibleSeries?.freshness)}.</small></div></li>
        <li><span>4</span><div><strong>Tela</strong><small>Consulta o banco a cada 30 s enquanto estiver aberta.</small></div></li>
      </ol>
    </section>

    <div className="ci-history-filterbar">
      <div className="ci-segmented ci-period-presets" aria-label="Período do histórico">
        {PRESETS.map(option => <button
          type="button"
          key={option.value}
          className={preset === option.value ? 'active' : ''}
          onClick={() => applyPreset(option.value)}
        >{option.label}</button>)}
      </div>
      {preset === 'custom' && <div className="ci-custom-dates">
        <label className="ci-select-label">De<input type="date" value={start} onChange={event => setStart(event.target.value)} /></label>
        <label className="ci-select-label">Até<input type="date" value={end} onChange={event => setEnd(event.target.value)} /></label>
      </div>}
      {!fixedVideoId && <label className="ci-select-label ci-history-video-filter">Vídeo
        <select value={videoId} onChange={event => setVideoId(event.target.value)}>
          <option value="">Todos os vídeos</option>
          {videos.map(video => <option key={video.video_id} value={video.video_id}>{displayText(video.title)}</option>)}
        </select>
      </label>}
      <div className="ci-segmented ci-position-filters" aria-label="Local do link">
        {POSITION_OPTIONS.map(option => <button
          type="button"
          key={option.value}
          title={option.label}
          className={position === option.value ? 'active' : ''}
          onClick={() => setPosition(option.value)}
        >{option.short}</button>)}
      </div>
      <label className="ci-select-label">Tráfego
        <select value={traffic} onChange={event => setTraffic(event.target.value as TrackingTrafficFilter)}>
          <option value="qualified">Qualificado</option>
          <option value="all">Todos os eventos</option>
          <option value="technical">Técnico / bots</option>
        </select>
      </label>
      <label className="ci-select-label">Escala
        <select value={granularity} onChange={event => setGranularity(event.target.value as TrackingGranularity)}>
          <option value="auto">Automática</option>
          <option value="hour">Por hora</option>
          <option value="day">Por dia</option>
          <option value="week">Por semana</option>
        </select>
      </label>
      <button type="button" className="ci-refresh" disabled={refreshing} onClick={refreshPanel}>{refreshing ? 'Atualizando...' : 'Atualizar painel'}</button>
    </div>

    {products.length > 1 && <div className="ci-product-filterbar" role="group" aria-label="Filtro de produtos">
      <span>Produtos</span>
      <button
        type="button"
        className={selectedProducts.length === 0 ? 'active' : ''}
        onClick={() => setSelectedProducts([])}
      >Todos</button>
      {products.map(product => <button
        type="button"
        key={product.productId}
        className={selectedProducts.includes(product.productId) ? 'active' : ''}
        title={displayText(product.productName)}
        onClick={() => toggleProduct(product.productId)}
      >{displayText(product.productName).split('·')[0].trim().slice(0, 28)}</button>)}
    </div>}

    {error && <div className="ci-warning-box" role="alert"><strong>Histórico indisponível</strong><span>{error}</span></div>}

    {!visibleSeries && loading && <div className="ci-overview-state"><span className="loading-pulse">Carregando indicadores e eventos...</span></div>}

    {visibleSeries && <>
    <div className="ci-history-kpis">
      <article><span>Cliques no filtro</span><strong>{displayedClicks.toLocaleString('pt-BR')}</strong><small>{visibleSeries.totals.qualifiedClicks} qualificado(s) · {visibleSeries.totals.technicalClicks} técnico(s) · {visibleSeries.totals.unknownClicks} sem classificação</small></article>
      <article><span>Compras atribuídas</span><strong>{visibleSeries.totals.attributedSales}</strong><small>{visibleSeries.totals.unattributedSales} sem origem · {visibleSeries.totals.ambiguousSales} com origem conflitante</small></article>
      <article><span>Produtos adicionais</span><strong>{visibleSeries.totals.additionalProducts}</strong><small>Separados das compras principais do MAPA</small></article>
      <article><span>Conversão clique → compra</span><strong>{percent(conversion)}</strong><small>Compra MAPA atribuída ÷ cliques qualificados</small></article>
      <article><span>Líquido total originado</span><strong>{money(visibleSeries.totals.netAfterFees)}</strong><small>{visibleSeries.totals.financialDataIncomplete} compra(s) originada(s) sem financeiro completo</small></article>
    </div>

    <div className="ci-freshness-grid" aria-label="Atualidade dos dados">
      <span><small>Dados consultados</small><strong>{formatDateTime(visibleSeries.freshness.consultedAt || visibleSeries.generatedAt)}</strong></span>
      <span><small>Último acesso bruto</small><strong>{formatDateTime(visibleSeries.freshness.lastClickAt)}</strong></span>
      <span><small>Último clique qualificado</small><strong>{formatDateTime(visibleSeries.freshness.lastQualifiedClickAt || null)}</strong></span>
      <span><small>Último webhook Hotmart</small><strong>{formatDateTime(visibleSeries.freshness.lastHotmartWebhookAt)}</strong></span>
      <span><small>Última tentativa Hotmart</small><strong>{reconciliationAttemptLabel(visibleSeries.freshness)}</strong></span>
      <span><small>Último sucesso completo</small><strong>{formatDateTime(visibleSeries.freshness.lastHotmartReconciliationSuccessAt || visibleSeries.freshness.lastHotmartReconciliationAt)}</strong></span>
      <span><small>Última execução parcial</small><strong>{formatDateTime(visibleSeries.freshness.lastHotmartReconciliationPartialAt || null)}</strong></span>
      <span><small>Próxima automática</small><strong>{nextReconciliationLabel(visibleSeries.freshness)}</strong></span>
    </div>

    {['partial', 'failed'].includes(visibleSeries.freshness.lastHotmartReconciliationStatus || '') && <div className="ci-warning-box" role="alert">
      <strong>{visibleSeries.freshness.lastHotmartReconciliationStatus === 'failed' ? 'A última reconciliação falhou' : 'A última reconciliação foi parcial'}</strong>
      <span>{reconciliationProblemDetail(visibleSeries.freshness)}</span>
    </div>}

    {Boolean(visibleSeries.freshness.unresolvedOperationalFailures) && <div className="ci-warning-box" role="status">
      <strong>{visibleSeries.freshness.unresolvedOperationalFailures} falha(s) operacional(is) ainda não resolvida(s)</strong>
      <span>Última ocorrência em {formatDateTime(visibleSeries.freshness.latestOperationalFailureAt || null)}. Consulte “Qualidade dos dados” para o diagnóstico completo.</span>
    </div>}

    <article className="ci-panel ci-unified-chart-panel">
      <header>
        <div><span>Evolução no tempo</span><small>Linhas de cliques e vendas na escala da esquerda; receita líquida em R$ na escala da direita.</small></div>
        <div className="ci-series-toggles" role="group" aria-label="Linhas do gráfico">
          {SERIES_OPTIONS.map(option => {
            const active = !hiddenSeries.has(option.key);
            return <button
              type="button"
              key={option.key}
              className={active ? 'active' : ''}
              title={option.hint}
              aria-pressed={active}
              onClick={() => toggleSeries(option.key)}
            >
              <span className="ci-series-dot" style={{ background: SERIES_COLORS[option.key] }} aria-hidden="true" />
              {option.label}
            </button>;
          })}
        </div>
      </header>
      {hasChartData ? <div className="ci-history-chart ci-unified-chart">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 6, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis dataKey="bucketStart" tickFormatter={value => formatBucket(value, visibleSeries.granularity)} tick={{ fontSize: 10 }} minTickGap={24} />
            <YAxis yAxisId="counts" allowDecimals={false} tick={{ fontSize: 10 }} width={36} />
            <YAxis
              yAxisId="money"
              orientation="right"
              tick={{ fontSize: 10, fill: SERIES_COLORS.revenue }}
              width={58}
              tickFormatter={value => new Intl.NumberFormat('pt-BR', {
                style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1,
              }).format(Number(value))}
            />
            <Tooltip
              labelFormatter={value => formatDateTime(String(value))}
              formatter={(value, name) => name === 'Receita (R$)'
                ? [money(Number(value)), name]
                : [Number(value).toLocaleString('pt-BR'), name]}
            />
            {!hiddenSeries.has('clicks') && <Line
              yAxisId="counts" type="monotone" dataKey="clicks" name="Cliques"
              stroke={SERIES_COLORS.clicks} strokeWidth={2.5} dot={false} isAnimationActive={false}
            />}
            {!hiddenSeries.has('sales') && <Line
              yAxisId="counts" type="monotone" dataKey="sales" name="Vendas"
              stroke={SERIES_COLORS.sales} strokeWidth={2.5} dot={false} isAnimationActive={false}
            />}
            {!hiddenSeries.has('revenue') && <Line
              yAxisId="money" type="monotone" dataKey="revenue" name="Receita (R$)"
              stroke={SERIES_COLORS.revenue} strokeWidth={2.5} dot={false} isAnimationActive={false}
            />}
          </ComposedChart>
        </ResponsiveContainer>
      </div> : <div className="ci-empty">Nenhum clique ou venda nesse filtro.</div>}
    </article>

    <article className="ci-panel ci-event-ledger">
      <header><div><span>Livro-caixa de eventos</span><small>Horário exato em Brasília. Para vendas, a data é a da compra/aprovação; o badge mostra o status atual, inclusive reembolso ou chargeback.</small></div></header>
      {visibleEvents.length ? <>
        <div className="ci-event-table-desktop">
          <table>
            <thead><tr><th>Data e hora</th><th>Evento</th><th>Vídeo</th><th>Local</th><th>Classificação</th><th>Detalhes</th></tr></thead>
            <tbody>{visibleEvents.map(event => {
              const kind = eventKind(event);
              return <tr key={event.eventId}>
              <td><time dateTime={event.occurredAt}>{formatDateTime(event.occurredAt)}</time></td>
              <td><span className={`ci-event-kind ci-event-kind-${kind.tone}`}>{kind.label}</span></td>
              <td><div className="ci-event-video">{event.thumbnailUrl && <img src={event.thumbnailUrl} alt="" />}<span><strong>{event.videoTitle ? displayText(event.videoTitle) : 'Sem vídeo atribuído'}</strong>{event.videoId && <small>{event.videoId}</small>}</span></div></td>
              <td>{positionLabel(event.ctaPosition)}</td>
              <td><span className={`ci-event-evidence ci-event-evidence-${isPurchaseEvent(event) ? event.attribution : event.traffic}`}>{trafficLabel(event)}</span></td>
              <td><span>{eventDetail(event) || '—'}</span>{event.trackingCode && <code>{event.trackingCode}</code>}</td>
            </tr>})}</tbody>
          </table>
        </div>
        <div className="ci-event-list-mobile">
          {visibleEvents.map(event => {
            const kind = eventKind(event);
            return <article key={event.eventId}>
            <header><span className={`ci-event-kind ci-event-kind-${kind.tone}`}>{kind.label}</span><time dateTime={event.occurredAt}>{formatDateTime(event.occurredAt)}</time></header>
            <strong>{event.videoTitle ? displayText(event.videoTitle) : 'Sem vídeo atribuído'}</strong>
            <div><span>{positionLabel(event.ctaPosition)}</span><span>{trafficLabel(event)}</span></div>
            <small>{eventDetail(event) || 'Sem detalhes adicionais'}</small>
          </article>})}
        </div>
        {visibleNextCursor && <div className="ci-ledger-more"><button type="button" disabled={loadingMore} onClick={loadMore}>{loadingMore ? 'Carregando...' : 'Carregar eventos anteriores'}</button></div>}
      </> : <div className="ci-empty">Nenhum evento exato nesse filtro.</div>}
    </article>
    </>}
  </section>;
}
