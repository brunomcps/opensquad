import { CommercialIntelligenceError } from './contracts.js';

export const BUSINESS_TIME_ZONE = 'America/Sao_Paulo';

export function businessDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function shiftDate(date: string, days: number): string {
  const parsed = new Date(`${date}T12:00:00.000Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

export function defaultDateRange(days = 35, now = new Date()): { startDate: string; endDate: string } {
  const endDate = businessDate(now);
  return { startDate: shiftDate(endDate, -(days - 1)), endDate };
}

export function validateDateRange(
  startDate: string,
  endDate: string,
  maxDays = 370,
): { startDate: string; endDate: string; days: number } {
  const format = /^\d{4}-\d{2}-\d{2}$/;
  if (!format.test(startDate) || !format.test(endDate)) {
    throw new CommercialIntelligenceError(
      'invalid_date_range',
      'Datas devem usar o formato YYYY-MM-DD.',
      400,
    );
  }
  const start = Date.parse(`${startDate}T12:00:00.000Z`);
  const end = Date.parse(`${endDate}T12:00:00.000Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) {
    throw new CommercialIntelligenceError(
      'invalid_date_range',
      'Intervalo de datas inválido.',
      400,
    );
  }
  const days = Math.floor((end - start) / 86_400_000) + 1;
  if (days > maxDays) {
    throw new CommercialIntelligenceError(
      'date_range_too_large',
      `O intervalo máximo é de ${maxDays} dias.`,
      400,
    );
  }
  return { startDate, endDate, days };
}

export function enumerateDates(startDate: string, endDate: string): string[] {
  const result: string[] = [];
  for (let cursor = startDate; cursor <= endDate; cursor = shiftDate(cursor, 1)) {
    result.push(cursor);
  }
  return result;
}
