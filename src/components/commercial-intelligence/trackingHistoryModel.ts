export interface TrackingChartDatum {
  bucketStart: string;
  clicks: number;
  sales: number;
  revenue: number;
  clickDescription: number;
  clickPinned: number;
  clickReply: number;
  clickVideo: number;
  // Instagram (bio, comentário → DM, DM manual) somado; separado do YouTube.
  clickInstagram: number;
  clickOther: number;
  // Por canal: YouTube = descrição + fixado + resposta + card.
  clickYoutube: number;
  saleDescription: number;
  salePinned: number;
  saleReply: number;
  saleVideo: number;
  saleInstagram: number;
  saleYoutube: number;
  saleAdditional: number;
  saleUnattributed: number;
  saleAmbiguous: number;
}

export type PurchaseStatusTone =
  | 'approved'
  | 'refunded'
  | 'chargeback'
  | 'canceled'
  | 'expired'
  | 'blocked'
  | 'disputed'
  | 'unknown';

export interface PurchaseStatusPresentation {
  eventLabel: string;
  statusLabel: string;
  tone: PurchaseStatusTone;
}

const PURCHASE_STATUS: Record<string, PurchaseStatusPresentation> = {
  approved: { eventLabel: 'Compra aprovada', statusLabel: 'Aprovada', tone: 'approved' },
  refunded: { eventLabel: 'Reembolso', statusLabel: 'Reembolsada', tone: 'refunded' },
  chargeback: { eventLabel: 'Chargeback', statusLabel: 'Chargeback', tone: 'chargeback' },
  canceled: { eventLabel: 'Transação cancelada', statusLabel: 'Cancelada', tone: 'canceled' },
  expired: { eventLabel: 'Transação expirada', statusLabel: 'Expirada', tone: 'expired' },
  blocked: { eventLabel: 'Transação bloqueada', statusLabel: 'Bloqueada', tone: 'blocked' },
  disputed: { eventLabel: 'Transação em disputa', statusLabel: 'Em disputa', tone: 'disputed' },
  unknown: { eventLabel: 'Transação', statusLabel: 'Status desconhecido', tone: 'unknown' },
};

export function purchaseStatusPresentation(status: string | null): PurchaseStatusPresentation {
  return PURCHASE_STATUS[status || 'unknown'] || PURCHASE_STATUS.unknown;
}

export function brtDateInput(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

// Dia em que o primeiro link rastreável foi criado (14/07/2026 17:42 BRT). Antes
// disso não existe clique nem venda com código; "Desde o início" começa aqui.
export const TRACKING_SINCE_DATE = '2026-07-14';

export type TrackingRangePreset = 'today' | '7d' | '30d' | '90d' | 'all' | 'custom';

function shiftDate(date: string, days: number): string {
  return new Date(Date.parse(`${date}T12:00:00.000Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

export function trackingPresetRange(preset: Exclude<TrackingRangePreset, 'custom'>, today = brtDateInput()): { start: string; end: string } {
  if (preset === 'all') return { start: TRACKING_SINCE_DATE, end: today };
  const length = preset === 'today' ? 1 : Number.parseInt(preset, 10);
  return { start: shiftDate(today, -(length - 1)), end: today };
}

function shortDate(date: string): string {
  const [, month, day] = date.split('-');
  return `${day}/${month}`;
}

// Texto curto que acompanha cada número da tela, pra ninguém confundir "7 dias"
// com "desde sempre" (o número 9 cliques / 0 vendas de 18/09 era isso).
export function trackingPeriodLabel(start: string, end: string, today = brtDateInput()): string {
  if (start === end) return start === today ? 'hoje' : `em ${shortDate(start)}`;
  if (start === TRACKING_SINCE_DATE && end === today) return `desde ${shortDate(start)}`;
  if (end === today) {
    const days = Math.round((Date.parse(`${end}T12:00:00Z`) - Date.parse(`${start}T12:00:00Z`)) / 86_400_000) + 1;
    return `últimos ${days} dias · ${shortDate(start)} a ${shortDate(end)}`;
  }
  return `de ${shortDate(start)} a ${shortDate(end)}`;
}

// Conversão só faz sentido com volume: 1 venda em 3 cliques não é 33%. Abaixo
// do mínimo devolve null e a tela mostra "—" com o motivo.
export const CONVERSION_MIN_CLICKS = 50;

export function conversionRate(sales: number, clicks: number, minClicks = CONVERSION_MIN_CLICKS): number | null {
  if (!clicks || clicks < minClicks) return null;
  return sales / clicks;
}

export function formatBrtShort(value: string | null | undefined): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  }).format(parsed).replace(',', '');
}

export function isExpectedHotmartSchedule(active: boolean | undefined, expression: string | null | undefined): boolean {
  return active === true && expression?.trim() === '40 9 * * *';
}

export type TrackingHealthTone = 'ok' | 'warn' | 'bad' | 'unknown';

export interface TrackingHealthLight {
  key: 'clicks' | 'sales' | 'reconciliation' | 'youtube' | 'redirect';
  label: string;
  tone: TrackingHealthTone;
  detail: string;
  hint: string;
}

interface HealthFreshness {
  lastClickAt: string | null;
  lastQualifiedClickAt?: string | null;
  lastHotmartWebhookAt: string | null;
  lastHotmartReconciliationAt: string | null;
  lastHotmartReconciliationSuccessAt?: string | null;
  lastHotmartReconciliationStatus?: 'running' | 'success' | 'partial' | 'failed' | null;
  nextHotmartReconciliationAt: string | null;
  hotmartScheduleActive?: boolean;
  hotmartScheduleExpression?: string | null;
  lastYoutubeSyncAt?: string | null;
  lastYoutubeSyncStatus?: string | null;
  lastYoutubeMetricDate?: string | null;
  youtubeScheduleActive?: boolean;
  lastRedirectCheckAt?: string | null;
  lastRedirectCheckOk?: boolean | null;
  lastRedirectCheckLatencyMs?: number | null;
  lastRedirectCheckFallback?: boolean;
  lastRedirectCheckDetail?: string | null;
  redirectScheduleActive?: boolean;
}

function ageHours(value: string | null | undefined, now: number): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : (now - parsed) / 3_600_000;
}

function daysBetweenDates(earlier: string, later: string): number {
  return Math.round((Date.parse(`${later}T12:00:00Z`) - Date.parse(`${earlier}T12:00:00Z`)) / 86_400_000);
}

// As 5 luzes de saúde: cliques, vendas, conferência Hotmart, YouTube e
// redirecionador. Verde = normal, amarelo = atrasado, vermelho = parado,
// cinza = ainda sem dado.
export function trackingHealthLights(freshness: HealthFreshness, now = Date.now()): TrackingHealthLight[] {
  const clickAt = freshness.lastQualifiedClickAt || freshness.lastClickAt;
  const clickAge = ageHours(clickAt, now);
  const clicks: TrackingHealthLight = {
    key: 'clicks',
    label: 'Cliques chegando',
    tone: clickAge === null ? 'unknown' : clickAge <= 24 ? 'ok' : clickAge <= 72 ? 'warn' : 'bad',
    detail: clickAt ? `último ${formatBrtShort(clickAt)}` : 'nenhum clique registrado',
    hint: 'Verde: clique de gente nas últimas 24 h. Amarelo: até 3 dias. Vermelho: mais de 3 dias sem clique, o redirecionador pode estar fora.',
  };

  const webhookAge = ageHours(freshness.lastHotmartWebhookAt, now);
  const sales: TrackingHealthLight = {
    key: 'sales',
    label: 'Vendas chegando',
    tone: webhookAge === null ? 'unknown' : webhookAge <= 48 ? 'ok' : webhookAge <= 168 ? 'warn' : 'bad',
    detail: freshness.lastHotmartWebhookAt ? `último aviso Hotmart ${formatBrtShort(freshness.lastHotmartWebhookAt)}` : 'nenhum aviso da Hotmart',
    hint: 'A Hotmart avisa cada venda na hora (webhook). Verde: aviso nas últimas 48 h. Amarelo: até 7 dias. Vermelho: mais de 7 dias sem aviso.',
  };

  const successAt = freshness.lastHotmartReconciliationSuccessAt || freshness.lastHotmartReconciliationAt;
  const successAge = ageHours(successAt, now);
  const status = freshness.lastHotmartReconciliationStatus;
  const scheduled = isExpectedHotmartSchedule(freshness.hotmartScheduleActive, freshness.hotmartScheduleExpression);
  const next = freshness.nextHotmartReconciliationAt ? formatBrtShort(freshness.nextHotmartReconciliationAt) : null;
  let tone: TrackingHealthTone = 'unknown';
  if (status === 'failed') tone = 'bad';
  else if (status === 'partial') tone = 'warn';
  else if (successAge !== null) tone = successAge <= 36 ? 'ok' : successAge <= 72 ? 'warn' : 'bad';
  if (tone === 'ok' && !scheduled) tone = 'warn';
  const reconciliation: TrackingHealthLight = {
    key: 'reconciliation',
    label: 'Conferência Hotmart',
    tone,
    detail: [
      successAt ? `última ${formatBrtShort(successAt)}` : 'nenhuma conferência completa',
      status === 'failed' ? 'falhou' : status === 'partial' ? 'parcial' : null,
      scheduled ? (next ? `próxima ${next}` : 'próxima 06:40') : 'automação não confirmada',
    ].filter(Boolean).join(' · '),
    hint: 'Todo dia às 06:40 o painel confere na Hotmart se alguma venda, reembolso ou chargeback passou batido. Verde: conferência completa nas últimas 36 h.',
  };

  // YouTube: o Analytics entrega as métricas com 2-3 dias de atraso, então
  // "parcial" é o normal; só a sincronização falhar (ou parar) é problema.
  const today = brtDateInput(new Date(now));
  const metricDate = freshness.lastYoutubeMetricDate ? String(freshness.lastYoutubeMetricDate).slice(0, 10) : null;
  const metricLag = metricDate ? daysBetweenDates(metricDate, today) : null;
  const syncAge = ageHours(freshness.lastYoutubeSyncAt, now);
  let youtubeTone: TrackingHealthTone = 'unknown';
  if (freshness.lastYoutubeSyncStatus === 'failed') youtubeTone = 'bad';
  else if (metricLag !== null) youtubeTone = metricLag <= 3 ? 'ok' : metricLag <= 5 ? 'warn' : 'bad';
  if (youtubeTone === 'ok' && (syncAge === null || syncAge > 30 || freshness.youtubeScheduleActive === false)) youtubeTone = 'warn';
  const youtube: TrackingHealthLight = {
    key: 'youtube',
    label: 'YouTube',
    tone: youtubeTone,
    detail: [
      metricDate ? `métricas até ${shortDate(metricDate)}` : 'sem métrica diária',
      freshness.lastYoutubeSyncStatus === 'failed'
        ? `última sincronização falhou${freshness.lastYoutubeSyncAt ? ` ${formatBrtShort(freshness.lastYoutubeSyncAt)}` : ''}`
        : metricLag !== null && metricLag <= 3
          ? 'atraso normal de 2–3 dias'
          : freshness.lastYoutubeSyncAt ? `última sincronização ${formatBrtShort(freshness.lastYoutubeSyncAt)}` : 'nunca sincronizou',
      freshness.youtubeScheduleActive === false ? 'automação desligada' : null,
    ].filter(Boolean).join(' · '),
    hint: 'Views, likes e comentários vêm do YouTube Analytics todo dia às 06:10. O YouTube libera cada dia com 2 a 3 dias de atraso: isso é normal. Amarelo: 4-5 dias sem métrica. Vermelho: sincronização falhou ou mais de 5 dias parada.',
  };

  // Redirecionador: HEAD no link curto a cada hora (não conta clique).
  const checkAge = ageHours(freshness.lastRedirectCheckAt, now);
  let redirectTone: TrackingHealthTone = 'unknown';
  if (checkAge !== null && typeof freshness.lastRedirectCheckOk === 'boolean') {
    if (!freshness.lastRedirectCheckOk) redirectTone = freshness.lastRedirectCheckFallback ? 'warn' : 'bad';
    else redirectTone = checkAge <= 2 ? 'ok' : checkAge <= 6 ? 'warn' : 'bad';
  }
  const redirect: TrackingHealthLight = {
    key: 'redirect',
    label: 'Redirecionador',
    tone: redirectTone,
    detail: checkAge === null
      ? 'ainda não testado'
      : freshness.lastRedirectCheckOk
        ? `testado ${formatBrtShort(freshness.lastRedirectCheckAt)} · respondeu${freshness.lastRedirectCheckLatencyMs ? ` em ${Math.round(freshness.lastRedirectCheckLatencyMs)} ms` : ''}${checkAge > 2 ? ' · teste atrasado' : ''}`
        : `falhou ${formatBrtShort(freshness.lastRedirectCheckAt)}${freshness.lastRedirectCheckDetail ? ` · ${freshness.lastRedirectCheckDetail}` : ''}`,
    hint: 'Todo minuto 17 de cada hora o painel testa o link curto (link.brunosallesphd.com.br/m7p/...) sem contar clique e confere se ele manda pra Hotmart com o código de rastreio. Amarelo: teste atrasado ou plano B ativo (o link manda pra Hotmart sem contar clique). Vermelho: o link não respondeu.',
  };

  return [clicks, sales, reconciliation, youtube, redirect];
}

// Link parado: vídeo que já teve volume de cliques e parou de receber. Quase
// sempre é o link que saiu da descrição/comentário fixado, ou o vídeo que foi
// pra não listado. Só avisa com volume (30+ cliques) e silêncio de 14+ dias.
export const STALLED_LINK_MIN_CLICKS = 30;
export const STALLED_LINK_MIN_DAYS = 14;

export function stalledLinkDays(lastClickAt: string | null | undefined, lifetimeClicks: number, now = Date.now()): number | null {
  if (!lastClickAt || lifetimeClicks < STALLED_LINK_MIN_CLICKS) return null;
  const parsed = Date.parse(lastClickAt);
  if (Number.isNaN(parsed)) return null;
  const days = Math.floor((now - parsed) / 86_400_000);
  return days >= STALLED_LINK_MIN_DAYS ? days : null;
}

export function trackingFiltersKey(filters: {
  start: string;
  end: string;
  granularity: string;
  videoId?: string | null;
  position: string;
  traffic: string;
  products?: string[] | null;
  channel?: string | null;
}): string {
  return [
    filters.start,
    filters.end,
    filters.granularity,
    filters.videoId || '',
    filters.position,
    filters.traffic,
    (filters.products || []).slice().sort().join(','),
    filters.channel && filters.channel !== 'all' ? filters.channel : '',
  ].join('|');
}

export function isCurrentTrackingRequest(input: {
  requestId: number;
  currentRequestId: number;
  requestFilterKey: string;
  currentFilterKey: string;
}): boolean {
  return input.requestId === input.currentRequestId
    && input.requestFilterKey === input.currentFilterKey;
}

export function mergeTrackingEventPages<T extends { eventId: string }>(current: T[], next: T[]): T[] {
  const known = new Set(current.map(event => event.eventId));
  return [...current, ...next.filter(event => !known.has(event.eventId))];
}

export function trackingChartAvailability(data: TrackingChartDatum[]): {
  hasClicks: boolean;
  hasSales: boolean;
} {
  return {
    hasClicks: data.some(item => (
      item.clickDescription + item.clickPinned + item.clickReply + item.clickVideo + item.clickInstagram + item.clickOther
    ) > 0),
    hasSales: data.some(item => (
      item.saleDescription
      + item.salePinned
      + item.saleReply
      + item.saleVideo
      + item.saleInstagram
      + item.saleAdditional
      + item.saleUnattributed
      + item.saleAmbiguous
    ) > 0),
  };
}
