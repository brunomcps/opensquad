import { CommercialIntelligenceError } from './errors.ts';

export const TRACKING_TIMEZONE = 'America/Sao_Paulo';
export const TRACKING_POSITIONS = ['description', 'pinned_comment', 'comment_reply', 'video'] as const;
export const TRACKING_TRAFFIC = ['qualified', 'technical', 'all'] as const;
export const TRACKING_EVENT_TYPES = ['click', 'sale'] as const;

export type TrackingGranularity = 'hour' | 'day' | 'week';
export type TrackingPosition = typeof TRACKING_POSITIONS[number];
export type TrackingTraffic = typeof TRACKING_TRAFFIC[number];
export type TrackingEventType = typeof TRACKING_EVENT_TYPES[number];

export interface TrackingFilters {
  start: string;
  end: string;
  startIso: string;
  endExclusiveIso: string;
  granularity: TrackingGranularity;
  videoId: string | null;
  position: TrackingPosition | null;
  traffic: TrackingTraffic;
}

export interface TrackingCursor {
  occurredAt: string;
  sortId: string;
}

const localPartsFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: TRACKING_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

function parts(date: Date): Record<string, number> {
  return Object.fromEntries(
    localPartsFormatter.formatToParts(date)
      .filter(part => part.type !== 'literal')
      .map(part => [part.type, Number(part.value)]),
  );
}

function localDateTimeToUtc(input: {
  year: number;
  month: number;
  day: number;
  hour?: number;
  minute?: number;
  second?: number;
}): Date {
  const desired = Date.UTC(
    input.year,
    input.month - 1,
    input.day,
    input.hour || 0,
    input.minute || 0,
    input.second || 0,
  );
  let candidate = desired;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const actual = parts(new Date(candidate));
    const represented = Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
      actual.minute,
      actual.second,
    );
    const correction = desired - represented;
    candidate += correction;
    if (correction === 0) break;
  }
  return new Date(candidate);
}

function validDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function shiftDate(value: string, days: number): string {
  return new Date(Date.parse(`${value}T12:00:00.000Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

function businessDate(now: Date): string {
  const value = parts(now);
  return `${value.year}-${String(value.month).padStart(2, '0')}-${String(value.day).padStart(2, '0')}`;
}

function dateOnlyStart(value: string): string {
  const [year, month, day] = value.split('-').map(Number);
  return localDateTimeToUtc({ year, month, day }).toISOString();
}

function parseBoundary(value: string, kind: 'start' | 'end'): { iso: string; display: string } {
  if (validDateOnly(value)) {
    const boundary = kind === 'end' ? shiftDate(value, 1) : value;
    return { iso: dateOnlyStart(boundary), display: value };
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new CommercialIntelligenceError('invalid_tracking_period', 'Período de rastreamento inválido.', 400);
  }
  return { iso: parsed.toISOString(), display: parsed.toISOString() };
}

function enumValue<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  if (!value) return fallback;
  if (!allowed.includes(value as T)) {
    throw new CommercialIntelligenceError('invalid_tracking_filter', 'Filtro de rastreamento inválido.', 400);
  }
  return value as T;
}

function optionalVideoId(value: string | null): string | null {
  if (!value || value === 'all') return null;
  if (!/^[A-Za-z0-9_-]{3,32}$/.test(value)) {
    throw new CommercialIntelligenceError('invalid_tracking_filter', 'Vídeo inválido.', 400);
  }
  return value;
}

export function parseTrackingFilters(url: URL, now = new Date()): TrackingFilters {
  const today = businessDate(now);
  const rawStart = url.searchParams.get('start') || shiftDate(today, -29);
  const rawEnd = url.searchParams.get('end') || today;
  const start = parseBoundary(rawStart, 'start');
  const end = parseBoundary(rawEnd, 'end');
  const duration = Date.parse(end.iso) - Date.parse(start.iso);
  if (!(duration > 0) || duration > 366 * 86_400_000) {
    throw new CommercialIntelligenceError('invalid_tracking_period', 'O período deve ter entre um instante e 366 dias.', 400);
  }

  const requestedGranularity = url.searchParams.get('granularity') || url.searchParams.get('bucket') || 'auto';
  if (!['auto', 'hour', 'day', 'week'].includes(requestedGranularity)) {
    throw new CommercialIntelligenceError('invalid_tracking_filter', 'Granularidade inválida.', 400);
  }
  const granularity: TrackingGranularity = requestedGranularity === 'auto'
    ? duration <= 48 * 3_600_000 ? 'hour' : duration <= 90 * 86_400_000 ? 'day' : 'week'
    : requestedGranularity as TrackingGranularity;

  const positionValue = url.searchParams.get('position') || url.searchParams.get('placement');
  const position = !positionValue || positionValue === 'all'
    ? null
    : enumValue(positionValue, TRACKING_POSITIONS, 'description');

  return {
    start: start.display,
    end: end.display,
    startIso: start.iso,
    endExclusiveIso: end.iso,
    granularity,
    videoId: optionalVideoId(url.searchParams.get('videoId') || url.searchParams.get('video')),
    position,
    traffic: enumValue(url.searchParams.get('traffic'), TRACKING_TRAFFIC, 'all'),
  };
}

export function parseEventTypes(value: string | null): TrackingEventType[] {
  if (!value) return [...TRACKING_EVENT_TYPES];
  const types = [...new Set(value.split(',').map(item => item.trim()).filter(Boolean))];
  if (!types.length || types.some(type => !TRACKING_EVENT_TYPES.includes(type as TrackingEventType))) {
    throw new CommercialIntelligenceError('invalid_tracking_filter', 'Tipo de evento inválido.', 400);
  }
  return types as TrackingEventType[];
}

export function parseEventLimit(value: string | null): number {
  if (!value) return 50;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
    throw new CommercialIntelligenceError('invalid_tracking_filter', 'Limite de eventos inválido.', 400);
  }
  return parsed;
}

const MAX_CURSOR_SORT_ID_LENGTH = 240;
const MAX_ENCODED_CURSOR_LENGTH = 1_024;
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f-\u009f]/u;

function toBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/g, '');
}

function fromBase64Url(value: string): string {
  if (!value || value.length > MAX_ENCODED_CURSOR_LENGTH || !/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new Error('invalid base64url');
  }
  const normalized = value.replaceAll('-', '+').replaceAll('_', '/');
  const binary = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '='));
  const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

function validCursorSortId(value: unknown): value is string {
  if (typeof value !== 'string' || value.length < 3 || value.length > MAX_CURSOR_SORT_ID_LENGTH) return false;
  if (!(value.startsWith('c:') || value.startsWith('s:'))) return false;
  return !CONTROL_CHARACTERS.test(value);
}

export function encodeTrackingCursor(cursor: TrackingCursor): string {
  if (!cursor.occurredAt || Number.isNaN(Date.parse(cursor.occurredAt)) || !validCursorSortId(cursor.sortId)) {
    throw new CommercialIntelligenceError('invalid_tracking_cursor', 'Cursor de eventos inválido.', 400);
  }
  return toBase64Url(JSON.stringify(cursor));
}

export function decodeTrackingCursor(value: string | null): TrackingCursor | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(fromBase64Url(value)) as Partial<TrackingCursor>;
    if (!parsed.occurredAt || Number.isNaN(Date.parse(parsed.occurredAt))) throw new Error('invalid date');
    if (!validCursorSortId(parsed.sortId)) throw new Error('invalid id');
    return { occurredAt: new Date(parsed.occurredAt).toISOString(), sortId: parsed.sortId };
  } catch {
    throw new CommercialIntelligenceError('invalid_tracking_cursor', 'Cursor de eventos inválido.', 400);
  }
}

export function nextHotmartReconciliationAt(now = new Date()): string {
  const local = parts(now);
  let date = `${local.year}-${String(local.month).padStart(2, '0')}-${String(local.day).padStart(2, '0')}`;
  let next = localDateTimeToUtc({ year: local.year, month: local.month, day: local.day, hour: 6, minute: 40 });
  if (next.getTime() <= now.getTime()) {
    date = shiftDate(date, 1);
    const [year, month, day] = date.split('-').map(Number);
    next = localDateTimeToUtc({ year, month, day, hour: 6, minute: 40 });
  }
  return next.toISOString();
}

function normalizeLocal(input: { year: number; month: number; day: number; hour: number }, hours: number) {
  const date = new Date(Date.UTC(input.year, input.month - 1, input.day, input.hour + hours));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
  };
}

export function trackingBucketStarts(
  startIso: string,
  endExclusiveIso: string,
  granularity: TrackingGranularity,
): string[] {
  const start = new Date(startIso);
  const end = new Date(endExclusiveIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) return [];
  const local = parts(start);
  let cursor = { year: local.year, month: local.month, day: local.day, hour: granularity === 'hour' ? local.hour : 0 };
  if (granularity === 'week') {
    const weekday = new Date(Date.UTC(cursor.year, cursor.month - 1, cursor.day)).getUTCDay();
    cursor = normalizeLocal(cursor, -((weekday + 6) % 7) * 24);
  }

  const result: string[] = [];
  const stepHours = granularity === 'hour' ? 1 : granularity === 'day' ? 24 : 168;
  for (let guard = 0; guard < 9_000; guard += 1) {
    const utc = localDateTimeToUtc(cursor);
    if (utc >= end) break;
    result.push(utc.toISOString());
    cursor = normalizeLocal(cursor, stepHours);
  }
  return result;
}

export function trafficGroup(value: string | null): 'qualified' | 'technical' | 'unknown' {
  if (value === 'qualified') return 'qualified';
  if (['bot', 'scanner', 'technical', 'duplicate'].includes(value || '')) return 'technical';
  return 'unknown';
}
