import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
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
  type AttributionDto,
  type CampaignCatalog,
  type TrackingChannelFilter,
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
  trackingHealthLights,
  trackingPeriodLabel,
  trackingPresetRange,
  type TrackingChartDatum,
  type TrackingRangePreset,
} from './trackingHistoryModel';

type RangePreset = TrackingRangePreset;

const TIME_ZONE = 'America/Sao_Paulo';

// Locais do link por canal. No Instagram "comment_reply" é o comentário que o
// robô ManyChat responde por DM, por isso o rótulo muda.
const YOUTUBE_POSITION_OPTIONS: Array<{ value: TrackingPositionFilter; label: string; short: string }> = [
  { value: 'all', label: 'Todos os locais', short: 'Todos' },
  { value: 'description', label: 'Descrição', short: 'D' },
  { value: 'pinned_comment', label: 'Comentário fixado', short: 'C' },
  { value: 'comment_reply', label: 'Resposta a comentário', short: 'R' },
  { value: 'video', label: 'Card do vídeo', short: 'V' },
];
const INSTAGRAM_POSITION_OPTIONS: Array<{ value: TrackingPositionFilter; label: string; short: string }> = [
  { value: 'all', label: 'Todos os locais', short: 'Todos' },
  { value: 'bio', label: 'Bio', short: 'B' },
  { value: 'comment_reply', label: 'Comentário → DM', short: 'C' },
  { value: 'dm', label: 'DM manual', short: 'DM' },
];
const CHANNEL_OPTIONS: Array<{ value: TrackingChannelFilter; label: string }> = [
  { value: 'all', label: 'Todos os canais' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'instagram', label: 'Instagram' },
];
const PRESETS: Array<{ value: RangePreset; label: string }> = [
  { value: 'today', label: 'Hoje' },
  { value: '7d', label: '7 dias' },
  { value: '30d', label: '30 dias' },
  { value: '90d', label: '90 dias' },
  { value: 'all', label: 'Desde o início' },
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

// Modo "Por origem": uma linha por local do link, pra comparar de onde vem
// clique/venda (descrição vs resposta vs card vs Instagram). Cores bem distintas.
const ORIGIN_SERIES = [
  { key: 'description', label: 'YouTube · Descrição', clickField: 'clickDescription', saleField: 'saleDescription', color: '#2f7fd6' },
  { key: 'pinned', label: 'YouTube · Comentário fixado', clickField: 'clickPinned', saleField: 'salePinned', color: '#c98a1f' },
  { key: 'reply', label: 'YouTube · Resposta', clickField: 'clickReply', saleField: 'saleReply', color: '#1d9d59' },
  { key: 'video', label: 'YouTube · Card', clickField: 'clickVideo', saleField: 'saleVideo', color: '#9b4dca' },
  { key: 'instagram', label: 'Instagram (bio, comentário → DM, DM)', clickField: 'clickInstagram', saleField: 'saleInstagram', color: '#B23A6A' },
] as const;

// Modo "Por canal": YouTube inteiro contra Instagram inteiro.
const CHANNEL_SERIES = [
  { key: 'youtube', label: 'YouTube', clickField: 'clickYoutube', saleField: 'saleYoutube', color: '#C4302B' },
  { key: 'instagram', label: 'Instagram', clickField: 'clickInstagram', saleField: 'saleInstagram', color: '#B23A6A' },
] as const;

export { trackingPresetRange };

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
  return value === null ? '—' : `${(value * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

function displayText(value: string): string {
  const entities: Record<string, string> = { amp: '&', quot: '"', '#39': "'", lt: '<', gt: '>' };
  return value.replace(/&(amp|quot|#39|lt|gt);/g, match => entities[match.slice(1, -1)] || match);
}

function eventChannel(event: TrackingEventDto): 'youtube' | 'instagram' | null {
  if (event.channel === 'instagram' || event.channel === 'youtube') return event.channel;
  if (event.videoId) return 'youtube';
  if (event.ctaPosition === 'bio' || event.ctaPosition === 'dm') return 'instagram';
  return null;
}

function positionLabel(event: TrackingEventDto): string {
  const options = eventChannel(event) === 'instagram' ? INSTAGRAM_POSITION_OPTIONS : YOUTUBE_POSITION_OPTIONS;
  return options.find(option => option.value === event.ctaPosition)?.label
    || (event.ctaPosition === 'bio' ? 'Bio' : event.ctaPosition === 'dm' ? 'DM' : 'Sem local atribuído');
}

function channelLabel(channel: 'youtube' | 'instagram' | null): string {
  return channel === 'instagram' ? 'Instagram' : channel === 'youtube' ? 'YouTube' : '—';
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

function eventSubject(event: TrackingEventDto): { title: string; sub: string | null } {
  if (event.videoTitle) return { title: displayText(event.videoTitle), sub: event.videoId };
  if (event.campaignName) return { title: displayText(event.campaignName), sub: null };
  return { title: eventChannel(event) === 'instagram' ? 'Link do Instagram' : 'Sem vídeo atribuído', sub: null };
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

// Tudo que a página inteira precisa saber sobre o filtro escolhido: a lista de
// vídeos, o card do Instagram e o relatório de atribuição seguem estes valores.
export interface TrackingPageFilters {
  start: string;
  end: string;
  preset: RangePreset;
  channel: TrackingChannelFilter;
  videoId: string;
  position: TrackingPositionFilter;
  traffic: TrackingTrafficFilter;
  products: string[];
}

function Explain({ text }: { text: string }) {
  return <span className="ci-explica" title={text} aria-label={text} role="img">?</span>;
}

export function TrackingHistoryExplorer({
  videos,
  products = [],
  fixedVideoId = null,
  fixedChannel = null,
  compact = false,
  initialStart,
  initialEnd,
  onPanelRefresh,
  onPeriodChange,
  onFiltersChange,
  attribution = null,
  beforeFilters,
  afterKpis,
  afterLedger,
}: {
  videos: CampaignCatalog['videos'];
  products?: CampaignCatalog['products'];
  fixedVideoId?: string | null;
  fixedChannel?: TrackingChannelFilter | null;
  compact?: boolean;
  initialStart?: string;
  initialEnd?: string;
  onPanelRefresh?: () => Promise<void> | void;
  onPeriodChange?: (start: string, end: string) => void;
  onFiltersChange?: (filters: TrackingPageFilters) => void;
  // Relatório de atribuição do mesmo período/canal: enriquece os números-resumo
  // com devolvidas, vendas em outra moeda e o total aprovado.
  attribution?: AttributionDto | null;
  // Encaixes da página em volta do histórico (título + botão, cards, gerador).
  beforeFilters?: ReactNode;
  afterKpis?: ReactNode;
  afterLedger?: ReactNode;
}) {
  const defaultRange = trackingPresetRange('all');
  const [preset, setPreset] = useState<RangePreset>(initialStart || initialEnd ? 'custom' : 'all');
  const [start, setStart] = useState(initialStart || defaultRange.start);
  const [end, setEnd] = useState(initialEnd || defaultRange.end);
  const [videoId, setVideoId] = useState(fixedVideoId || '');
  const [channel, setChannel] = useState<TrackingChannelFilter>(fixedChannel || 'all');
  const [position, setPosition] = useState<TrackingPositionFilter>('all');
  const [traffic, setTraffic] = useState<TrackingTrafficFilter>('qualified');
  const [granularity, setGranularity] = useState<TrackingGranularity>('auto');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [hiddenSeries, setHiddenSeries] = useState<Set<SeriesKey>>(new Set());
  const [chartMode, setChartMode] = useState<'total' | 'origem' | 'canal'>('total');
  const [originMetric, setOriginMetric] = useState<'clicks' | 'sales'>('clicks');
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

  const effectiveChannel = fixedChannel || channel;
  const positionOptions = effectiveChannel === 'instagram' ? INSTAGRAM_POSITION_OPTIONS : YOUTUBE_POSITION_OPTIONS;

  const filters = useMemo<TrackingHistoryFilters>(() => ({
    start,
    end,
    granularity,
    videoId: fixedVideoId || videoId || null,
    position,
    traffic,
    products: selectedProducts.length ? selectedProducts : null,
    channel: effectiveChannel,
  }), [effectiveChannel, end, fixedVideoId, granularity, position, selectedProducts, start, traffic, videoId]);
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
    onFiltersChange?.({
      start, end, preset, channel: effectiveChannel, videoId: fixedVideoId || videoId, position, traffic, products: selectedProducts,
    });
  }, [effectiveChannel, end, fixedVideoId, onFiltersChange, position, preset, selectedProducts, start, traffic, videoId]);

  // Sem polling por relógio: a tela recarregava sozinha a cada 30 s (e ao voltar
  // o foco pra aba), o que atropelava a leitura no meio de uma análise. Agora a
  // busca acontece quando o filtro muda, quando o usuario clica em "Buscar dados
  // agora", ou quando uma sincronizacao emite 'ci:data-updated' (listener acima).

  function applyPreset(nextPreset: RangePreset) {
    setPreset(nextPreset);
    if (nextPreset === 'custom') return;
    const range = trackingPresetRange(nextPreset);
    setStart(range.start);
    setEnd(range.end);
  }

  // Trocar de canal troca a lista de locais; um local que não existe no canal
  // novo (ex.: "Card do vídeo" no Instagram) volta pra "Todos".
  function applyChannel(nextChannel: TrackingChannelFilter) {
    setChannel(nextChannel);
    const options = nextChannel === 'instagram' ? INSTAGRAM_POSITION_OPTIONS : YOUTUBE_POSITION_OPTIONS;
    if (!options.some(option => option.value === position)) setPosition('all');
    if (nextChannel === 'instagram') setVideoId('');
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
  const chartData = useMemo<TrackingChartDatum[]>(() => (visibleSeries?.buckets || []).map(bucket => {
    const clickInstagram = bucket.clicks.instagram || 0;
    const saleInstagram = bucket.sales.instagram || 0;
    const clickYoutube = bucket.clicks.description + bucket.clicks.pinnedComment + bucket.clicks.commentReply + bucket.clicks.video;
    const saleYoutube = bucket.sales.description + bucket.sales.pinnedComment + bucket.sales.commentReply + bucket.sales.video;
    return {
      bucketStart: bucket.bucketStart,
      clicks: bucket.clicks.total,
      sales: saleYoutube + saleInstagram + bucket.sales.additional,
      revenue: bucket.netAfterFees,
      clickDescription: bucket.clicks.description,
      clickPinned: bucket.clicks.pinnedComment,
      clickReply: bucket.clicks.commentReply,
      clickVideo: bucket.clicks.video,
      clickInstagram,
      clickOther: bucket.clicks.other,
      clickYoutube,
      saleDescription: bucket.sales.description,
      salePinned: bucket.sales.pinnedComment,
      saleReply: bucket.sales.commentReply,
      saleVideo: bucket.sales.video,
      saleInstagram,
      saleYoutube,
      saleAdditional: bucket.sales.additional,
      saleUnattributed: bucket.sales.unattributed,
      saleAmbiguous: bucket.sales.ambiguous,
    };
  }), [visibleSeries]);
  // Totais por origem no período/filtros ativos. Somados dos mesmos buckets que
  // alimentam o gráfico, pra tabela e gráfico nunca discordarem entre si.
  const originTotals = useMemo(() => {
    type OriginRow = { key: string; label: string; color: string; clicks: number; sales: number };
    const sum = (field: keyof TrackingChartDatum) => chartData.reduce((total, item) => total + (Number(item[field]) || 0), 0);
    const rows: OriginRow[] = ORIGIN_SERIES
      .filter(origin => effectiveChannel === 'all' || (effectiveChannel === 'instagram') === (origin.key === 'instagram'))
      .map(origin => ({
        key: origin.key, label: origin.label, color: origin.color, clicks: sum(origin.clickField), sales: sum(origin.saleField),
      }));
    const otherClicks = sum('clickOther');
    const unattributedSales = sum('saleUnattributed');
    const ambiguousSales = sum('saleAmbiguous');
    const additionalSales = sum('saleAdditional');
    if (otherClicks || unattributedSales || ambiguousSales) {
      rows.push({
        key: 'other',
        label: 'Sem local (venda sem código)',
        color: '#8a8172',
        clicks: otherClicks,
        sales: unattributedSales + ambiguousSales,
      });
    }
    const totalClicks = rows.reduce((total, row) => total + row.clicks, 0);
    const totalSales = rows.reduce((total, row) => total + row.sales, 0);
    return { rows, totalClicks, totalSales, additionalSales };
  }, [chartData, effectiveChannel]);
  const { hasClicks, hasSales } = useMemo(() => trackingChartAvailability(chartData), [chartData]);
  const hasRevenue = useMemo(() => chartData.some(item => item.revenue !== 0), [chartData]);
  const hasChartData = hasClicks || hasSales || hasRevenue;
  // Frações (0..1) da largura útil onde começa cada dia (BRT). Com granularidade
  // por hora, marca só as viradas de dia (03:00Z = meia-noite BRT); nas demais,
  // cada bucket é um dia/semana e ganha linha própria. Escala "point": índice i
  // fica em i/(n-1) da largura.
  const dayBoundaryFractions = useMemo(() => {
    if (chartData.length < 2) return [];
    const lastIndex = chartData.length - 1;
    const indexes = visibleSeries?.granularity === 'hour'
      ? chartData
        .map((item, index) => (new Date(item.bucketStart).getUTCHours() === 3 ? index : -1))
        .filter(index => index >= 0)
      : chartData.map((_, index) => index);
    return indexes.map(index => index / lastIndex);
  }, [chartData, visibleSeries?.granularity]);
  const dayGridGenerator = useCallback(({ offset }: { offset: { left: number; width: number } }) => (
    offset?.width ? dayBoundaryFractions.map(fraction => offset.left + fraction * offset.width) : []
  ), [dayBoundaryFractions]);

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
  const title = fixedVideoId ? 'Histórico deste vídeo' : fixedChannel === 'instagram' ? 'Histórico do Instagram' : 'Histórico de cliques e compras';
  const lastSuccessAge = lastSuccessfulAt ? Date.now() - Date.parse(lastSuccessfulAt) : Number.POSITIVE_INFINITY;
  const liveTone = error ? 'error' : refreshing || lastSuccessAge > 90_000 ? 'warning' : 'healthy';
  const liveMessage = error
    ? 'Falha ao atualizar o painel'
    : refreshing
      ? 'Atualizando o painel agora'
      : `Painel atualizado ${relativeAge(lastSuccessfulAt)}`;
  const periodLabel = trackingPeriodLabel(start, end);
  const healthLights = useMemo(() => visibleSeries ? trackingHealthLights(visibleSeries.freshness) : [], [visibleSeries]);
  const otherProductNames = [...new Set(products
    .filter(product => !product.productName.toLocaleLowerCase('pt-BR').includes('mapa-7p'))
    .map(product => displayText(product.productName).split('·')[0].split('+')[0].trim()))].slice(0, 4);
  const foreignCurrencies = attribution
    ? [...new Set(attribution.campaigns.flatMap(campaign => Object.keys(campaign.foreignBreakdown || {})))]
    : [];
  const chipParts = [
    periodLabel,
    CHANNEL_OPTIONS.find(option => option.value === effectiveChannel)?.label.toLocaleLowerCase('pt-BR') || 'todos os canais',
    fixedVideoId || videoId ? (selectedVideo ? displayText(selectedVideo.title) : 'um vídeo') : 'todos os vídeos',
    position === 'all' ? null : positionOptions.find(option => option.value === position)?.label.toLocaleLowerCase('pt-BR') || null,
    traffic === 'qualified' ? 'cliques qualificados' : traffic === 'technical' ? 'só tráfego técnico' : 'todos os eventos',
    selectedProducts.length ? `${selectedProducts.length} produto(s)` : null,
  ].filter(Boolean);
  const chartSeries = chartMode === 'canal' ? CHANNEL_SERIES : ORIGIN_SERIES;

  return <section className={`ci-tracking-explorer${compact ? ' ci-tracking-explorer-compact' : ''}`}>
    {!compact && healthLights.length > 0 && <div className="ci-luzes" aria-label="Saúde do rastreamento">
      {healthLights.map(light => <div className={`ci-luz ci-luz-${light.tone}`} key={light.key} title={light.hint}>
        <i aria-hidden="true" />
        <div><b>{light.label}</b><small>{light.detail}</small></div>
      </div>)}
    </div>}

    {!compact && visibleSeries && ['partial', 'failed'].includes(visibleSeries.freshness.lastHotmartReconciliationStatus || '') && <div className="ci-warning-box" role="alert">
      <strong>{visibleSeries.freshness.lastHotmartReconciliationStatus === 'failed' ? 'A última conferência na Hotmart falhou' : 'A última conferência na Hotmart foi parcial'}</strong>
      <span>{reconciliationProblemDetail(visibleSeries.freshness)}</span>
    </div>}

    {!compact && Boolean(visibleSeries?.freshness.unresolvedOperationalFailures) && <div className="ci-warning-box" role="status">
      <strong>{visibleSeries!.freshness.unresolvedOperationalFailures} falha(s) operacional(is) ainda não resolvida(s)</strong>
      <span>Última ocorrência em {formatDateTime(visibleSeries!.freshness.latestOperationalFailureAt || null)}. Consulte “Qualidade dos dados” para o diagnóstico completo.</span>
    </div>}

    {beforeFilters}

    {compact && <header className="ci-tracking-explorer-heading">
      <div>
        <span>{title}</span>
        <small>{fixedVideoId && selectedVideo ? displayText(selectedVideo.title) : 'Os filtros abaixo valem só para este histórico.'}</small>
      </div>
      <div className={`ci-live-state ci-live-state-${liveTone}`}>
        <span className="ci-live-dot" aria-hidden="true" />
        <span><strong>{liveMessage}</strong></span>
      </div>
    </header>}

    <div className="ci-history-filterbar">
      <div className="ci-segmented ci-period-presets" aria-label="Período">
        {PRESETS.map(option => <button
          type="button"
          key={option.value}
          className={preset === option.value ? 'active' : ''}
          onClick={() => applyPreset(option.value)}
        >{option.label}</button>)}
      </div>
      <div className={`ci-custom-dates${preset === 'custom' ? ' ci-custom-dates-active' : ''}`}>
        <label className="ci-select-label">De<input
          type="date"
          value={start}
          max={end || undefined}
          onChange={event => { setPreset('custom'); setStart(event.target.value); }}
        /></label>
        <label className="ci-select-label">Até<input
          type="date"
          value={end}
          min={start || undefined}
          onChange={event => { setPreset('custom'); setEnd(event.target.value); }}
        /></label>
      </div>
      {!fixedChannel && !fixedVideoId && <div className="ci-segmented ci-canal-filtros" aria-label="Canal">
        {CHANNEL_OPTIONS.map(option => <button
          type="button"
          key={option.value}
          className={channel === option.value ? 'active' : ''}
          onClick={() => applyChannel(option.value)}
        >{option.label}</button>)}
      </div>}
      {!fixedVideoId && effectiveChannel !== 'instagram' && <label className="ci-select-label ci-history-video-filter">Vídeo
        <select value={videoId} onChange={event => setVideoId(event.target.value)}>
          <option value="">Todos os vídeos</option>
          {videos.map(video => <option key={video.video_id} value={video.video_id}>{displayText(video.title)}</option>)}
        </select>
      </label>}
      <div className="ci-segmented ci-position-filters" aria-label="Local do link">
        {positionOptions.map(option => <button
          type="button"
          key={option.value}
          title={option.label}
          aria-label={option.label}
          className={position === option.value ? 'active' : ''}
          onClick={() => setPosition(option.value)}
        >
          <span className="ci-position-name">{option.label}</span>
          <span className="ci-position-short" aria-hidden="true">{option.short}</span>
        </button>)}
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
      <button type="button" className="ci-refresh" disabled={refreshing} onClick={refreshPanel} title="Os filtros já aplicam sozinhos. Use isto para buscar dados novos agora.">{refreshing ? 'Buscando...' : 'Buscar dados agora'}</button>
      {!compact && <div className="ci-filtro-chip-linha">
        <span className="ci-filtro-chip">Filtrado por: {chipParts.join(' · ')}</span>
        <span className="ci-filtro-nota">Vale pra tudo abaixo: resumo, cards, gráfico e livro-caixa.</span>
      </div>}
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
      <article>
        <span>{traffic === 'qualified' ? 'Cliques qualificados' : traffic === 'technical' ? 'Cliques técnicos / bots' : 'Cliques (todos os eventos)'}<Explain text="Clique qualificado = pessoa de verdade: sem robô, sem scanner de link e sem clique repetido da mesma pessoa em 10 minutos." /></span>
        <strong>{displayedClicks.toLocaleString('pt-BR')}</strong>
        <small>{periodLabel} · de {visibleSeries.totals.totalClicks.toLocaleString('pt-BR')} acessos: {visibleSeries.totals.qualifiedClicks.toLocaleString('pt-BR')} de gente · {visibleSeries.totals.technicalClicks.toLocaleString('pt-BR')} técnicos · {visibleSeries.totals.unknownClicks} sem classificação</small>
      </article>
      <article>
        <span>Vendas do MAPA por link<Explain text="Venda aprovada na Hotmart que chegou com o código de um link seu (SCK, SRC ou XCOD). Venda sem código fica em 'sem origem'." /></span>
        <strong>{visibleSeries.totals.attributedSales.toLocaleString('pt-BR')}</strong>
        <small>{periodLabel}{attribution ? ` · de ${attribution.totals.approvedSales.toLocaleString('pt-BR')} aprovadas` : ''} · {visibleSeries.totals.unattributedSales} sem origem · {visibleSeries.totals.ambiguousSales} com origem conflitante{attribution?.totals.foreignSales ? ` · ${attribution.totals.foreignSales} em outra moeda` : ''} · conversão {percent(conversion)}</small>
      </article>
      <article>
        <span>Outros produtos por link<Explain text="Compras de outros produtos (2AS, Manual de Rotina...) que chegaram pelo mesmo link do MAPA. Contadas à parte para não inflar a venda do MAPA." /></span>
        <strong>{visibleSeries.totals.additionalProducts.toLocaleString('pt-BR')}</strong>
        <small>{periodLabel}{otherProductNames.length ? ` · ${otherProductNames.join(', ')}` : ' · separados das compras principais do MAPA'}</small>
      </article>
      <article>
        <span>Devolvidas<Explain text="Reembolso ou chargeback de uma venda que tinha sido aprovada no período. A venda continua contada acima; aqui é quanto voltou." /></span>
        <strong>{attribution ? (attribution.totals.refunds ?? 0).toLocaleString('pt-BR') : '—'}</strong>
        <small>{attribution ? `${periodLabel} · reembolso ou chargeback de venda aprovada` : 'carregando o relatório de atribuição'}</small>
      </article>
      <article>
        <span>Líquido pelos links<Explain text="Valor que sobrou para você depois das taxas da Hotmart, somando MAPA e outros produtos originados pelos links. Vendas em outra moeda não entram na soma em reais." /></span>
        <strong>{money(visibleSeries.totals.netAfterFees)}</strong>
        <small>{periodLabel}{attribution ? ` · ${money(attribution.totals.attributedNetAfterFees)} MAPA + ${money(attribution.totals.attributedAdditionalNetAfterFees)} outros` : ''}{visibleSeries.totals.financialDataIncomplete ? ` · ${visibleSeries.totals.financialDataIncomplete} venda(s) ${foreignCurrencies.length ? `em ${foreignCurrencies.join(', ')}` : 'sem valor em reais'} fora da soma` : ''}</small>
      </article>
    </div>
    </>}

    {afterKpis}

    {visibleSeries && <>
    <div className={compact ? 'ci-tracking-analise ci-tracking-analise-compact' : 'ci-tracking-analise'}>
    <article className="ci-panel ci-origin-breakdown">
      <header>
        <div>
          <span>Cliques e compras por origem</span>
          <small>{periodLabel} · cada linha é um lugar onde o link vive. Conversão = compras ÷ cliques da mesma origem.</small>
        </div>
      </header>
      <div className="ci-origin-table-wrap">
        <table className="ci-origin-table">
          <thead>
            <tr>
              <th scope="col">Origem</th>
              <th scope="col">Cliques</th>
              <th scope="col">Compras</th>
              <th scope="col">Conversão</th>
            </tr>
          </thead>
          <tbody>
            {originTotals.rows.map(row => <tr key={row.key}>
              <th scope="row">
                <span className="ci-origin-dot" style={{ background: row.color }} aria-hidden="true" />
                {row.label}
              </th>
              <td>{row.key === 'other' ? '—' : row.clicks.toLocaleString('pt-BR')}</td>
              <td>{row.sales.toLocaleString('pt-BR')}</td>
              <td>{percent(row.clicks ? row.sales / row.clicks : null)}</td>
            </tr>)}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">Total</th>
              <td>{originTotals.totalClicks.toLocaleString('pt-BR')}</td>
              <td>{originTotals.totalSales.toLocaleString('pt-BR')}</td>
              <td>{percent(originTotals.totalClicks ? originTotals.totalSales / originTotals.totalClicks : null)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      {Boolean(originTotals.additionalSales) && <small className="ci-origin-note">
        {originTotals.additionalSales} compra(s) de outro produto fora desta tabela, por não terem local de link próprio.
      </small>}
    </article>

    <article className="ci-panel ci-unified-chart-panel">
      <header>
        <div>
          <span>Evolução no tempo</span>
          <small>{chartMode === 'total'
            ? 'Linhas de cliques e vendas na escala da esquerda; receita líquida em R$ na escala da direita.'
            : chartMode === 'origem'
              ? `Uma linha por origem do link, comparando ${originMetric === 'clicks' ? 'cliques' : 'vendas'}. Use o filtro de local em "Todos" para ver todas as origens.`
              : `YouTube inteiro contra Instagram inteiro, comparando ${originMetric === 'clicks' ? 'cliques' : 'vendas'}.`}</small>
        </div>
        <div className="ci-chart-header-controls">
          <div className="ci-view-toggle" role="group" aria-label="Modo do gráfico">
            <button type="button" className={chartMode === 'total' ? 'active' : ''} aria-pressed={chartMode === 'total'} onClick={() => setChartMode('total')}>Total</button>
            <button type="button" className={chartMode === 'origem' ? 'active' : ''} aria-pressed={chartMode === 'origem'} onClick={() => setChartMode('origem')}>Por origem</button>
            <button type="button" className={chartMode === 'canal' ? 'active' : ''} aria-pressed={chartMode === 'canal'} onClick={() => setChartMode('canal')}>Por canal</button>
          </div>
          {chartMode === 'total'
            ? <div className="ci-series-toggles" role="group" aria-label="Linhas do gráfico">
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
            : <>
              <div className="ci-view-toggle" role="group" aria-label="Métrica comparada">
                <button type="button" className={originMetric === 'clicks' ? 'active' : ''} aria-pressed={originMetric === 'clicks'} onClick={() => setOriginMetric('clicks')}>Cliques</button>
                <button type="button" className={originMetric === 'sales' ? 'active' : ''} aria-pressed={originMetric === 'sales'} onClick={() => setOriginMetric('sales')}>Vendas</button>
              </div>
              <div className="ci-series-toggles" role="group" aria-label="Linhas">
                {chartSeries.map(origin => <span className="ci-series-legenda" key={origin.key}>
                  <span className="ci-series-dot" style={{ background: origin.color }} aria-hidden="true" />
                  {origin.label}
                </span>)}
              </div>
            </>}
        </div>
      </header>
      {hasChartData ? <div className="ci-history-chart ci-unified-chart">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 6, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            {dayBoundaryFractions.length > 0 && <CartesianGrid
              horizontal={false}
              stroke="var(--border)"
              strokeOpacity={0.55}
              verticalCoordinatesGenerator={dayGridGenerator}
            />}
            <XAxis dataKey="bucketStart" tickFormatter={value => formatBucket(value, visibleSeries.granularity)} tick={{ fontSize: 10 }} minTickGap={24} />
            <YAxis yAxisId="counts" allowDecimals={false} tick={{ fontSize: 10 }} width={36} />
            <YAxis
              yAxisId="money"
              orientation="right"
              hide={chartMode !== 'total'}
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
            {chartMode === 'total' && <>
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
            </>}
            {chartMode !== 'total' && chartSeries.map(origin => <Line
              key={origin.key}
              yAxisId="counts"
              type="monotone"
              dataKey={originMetric === 'clicks' ? origin.clickField : origin.saleField}
              name={origin.label}
              stroke={origin.color}
              strokeWidth={2.5}
              dot={false}
              isAnimationActive={false}
            />)}
          </ComposedChart>
        </ResponsiveContainer>
      </div> : <div className="ci-empty">Nenhum clique ou venda nesse filtro.</div>}
    </article>
    </div>

    <article className="ci-panel ci-event-ledger">
      <header><div><span>Livro-caixa de eventos</span><small>{periodLabel} · horário exato em Brasília. Para vendas, a data é a da compra/aprovação; o badge mostra o status atual, inclusive reembolso ou chargeback.</small></div></header>
      {visibleEvents.length ? <>
        <div className="ci-event-table-desktop">
          <table>
            <thead><tr><th>Data e hora</th><th>Evento</th><th>Canal</th><th>Vídeo / link</th><th>Local</th><th>Classificação</th><th>Detalhes</th></tr></thead>
            <tbody>{visibleEvents.map(event => {
              const kind = eventKind(event);
              const subject = eventSubject(event);
              const eventCh = eventChannel(event);
              return <tr key={event.eventId}>
              <td><time dateTime={event.occurredAt}>{formatDateTime(event.occurredAt)}</time></td>
              <td><span className={`ci-event-kind ci-event-kind-${kind.tone}`}>{kind.label}</span></td>
              <td><span className={`ci-canal-tag ci-canal-tag-${eventCh || 'none'}`}>{channelLabel(eventCh)}</span></td>
              <td><div className="ci-event-video">{event.thumbnailUrl && <img src={event.thumbnailUrl} alt="" />}<span><strong>{subject.title}</strong>{subject.sub && <small>{subject.sub}</small>}</span></div></td>
              <td>{positionLabel(event)}</td>
              <td><span className={`ci-event-evidence ci-event-evidence-${isPurchaseEvent(event) ? event.attribution : event.traffic}`}>{trafficLabel(event)}</span></td>
              <td><span>{eventDetail(event) || '—'}</span>{event.trackingCode && <code>{event.trackingCode}</code>}</td>
            </tr>})}</tbody>
          </table>
        </div>
        <div className="ci-event-list-mobile">
          {visibleEvents.map(event => {
            const kind = eventKind(event);
            const subject = eventSubject(event);
            return <article key={event.eventId}>
            <header><span className={`ci-event-kind ci-event-kind-${kind.tone}`}>{kind.label}</span><time dateTime={event.occurredAt}>{formatDateTime(event.occurredAt)}</time></header>
            <strong>{subject.title}</strong>
            <div><span>{channelLabel(eventChannel(event))} · {positionLabel(event)}</span><span>{trafficLabel(event)}</span></div>
            <small>{eventDetail(event) || 'Sem detalhes adicionais'}</small>
          </article>})}
        </div>
        {visibleNextCursor && <div className="ci-ledger-more"><button type="button" disabled={loadingMore} onClick={loadMore}>{loadingMore ? 'Carregando...' : 'Carregar eventos anteriores'}</button></div>}
      </> : <div className="ci-empty">Nenhum evento exato nesse filtro.</div>}
    </article>

    <details className="ci-tracking-recolhido">
      <summary>Como os dados chegam<small>4 passos: clique → venda → conferência → tela</small></summary>
      <section className="ci-data-flow-guide" aria-label="Como os dados chegam">
        <ol>
          <li><span>1</span><div><strong>Cliques</strong><small>Gravados no redirecionamento (link.brunosallesphd.com.br/m7p/...), em tempo real.</small></div></li>
          <li><span>2</span><div><strong>Vendas</strong><small>Entram pelo aviso automático da Hotmart (webhook). O crédito só existe quando a Hotmart devolve o mesmo SCK, SRC ou XCOD cadastrado; venda sem origem continua sem atribuição.</small></div></li>
          <li><span>3</span><div><strong>Conferência</strong><small>{reconciliationScheduleLabel(visibleSeries.freshness)}.</small></div></li>
          <li><span>4</span><div><strong>Tela</strong><small>Consulta o banco ao trocar um filtro ou quando você clica em “Buscar dados agora”. Não recarrega sozinha.</small></div></li>
        </ol>
      </section>
    </details>

    <details className="ci-tracking-recolhido">
      <summary>Carimbos de atualização<small>{liveMessage} · último clique {formatDateTime(visibleSeries.freshness.lastQualifiedClickAt || visibleSeries.freshness.lastClickAt)}</small></summary>
      <div className={`ci-live-state ci-live-state-${liveTone}`}>
        <span className="ci-live-dot" aria-hidden="true" />
        <span><strong>{liveMessage}</strong><small>A tela não recarrega sozinha. Ela busca ao trocar um filtro ou quando você pede.</small></span>
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
    </details>
    </>}

    {afterLedger}
  </section>;
}
