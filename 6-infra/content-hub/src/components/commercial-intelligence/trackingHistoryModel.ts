export interface TrackingChartDatum {
  bucketStart: string;
  clicks: number;
  sales: number;
  revenue: number;
  clickDescription: number;
  clickPinned: number;
  clickReply: number;
  clickVideo: number;
  clickOther: number;
  saleDescription: number;
  salePinned: number;
  saleReply: number;
  saleVideo: number;
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

export function isExpectedHotmartSchedule(active: boolean | undefined, expression: string | null | undefined): boolean {
  return active === true && expression?.trim() === '40 9 * * *';
}

export function trackingFiltersKey(filters: {
  start: string;
  end: string;
  granularity: string;
  videoId?: string | null;
  position: string;
  traffic: string;
  products?: string[] | null;
}): string {
  return [
    filters.start,
    filters.end,
    filters.granularity,
    filters.videoId || '',
    filters.position,
    filters.traffic,
    (filters.products || []).slice().sort().join(','),
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
      item.clickDescription + item.clickPinned + item.clickReply + item.clickVideo + item.clickOther
    ) > 0),
    hasSales: data.some(item => (
      item.saleDescription
      + item.salePinned
      + item.saleReply
      + item.saleVideo
      + item.saleAdditional
      + item.saleUnattributed
      + item.saleAmbiguous
    ) > 0),
  };
}
