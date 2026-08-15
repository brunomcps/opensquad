// Relatório do Radar de Viral do Nicho: monta os achados e entrega nos destinos.

import { getFindings } from '../../db/nicheRadar.js';
import { sendMessage } from '../telegram.js';

export interface ReportItem {
  video_id: string;
  title: string;
  channel_id: string;
  score: number;
  outlier: number | null;
  velocity: number | null;
}

export interface Report {
  date: string; // ISO YYYY-MM-DD
  br: ReportItem[];
  gringo: ReportItem[];
}

function mapRows(rows: any[]): ReportItem[] {
  return rows.map((r) => ({
    video_id: r.video_id,
    title: r.radar_videos?.title ?? r.video_id,
    channel_id: r.radar_videos?.channel_id ?? '',
    score: r.score,
    outlier: r.outlier_score,
    velocity: r.velocity,
  }));
}

export async function buildReport(date?: string): Promise<Report> {
  const d = date ?? new Date().toISOString().slice(0, 10);
  const [br, gringo] = await Promise.all([getFindings('br', d), getFindings('gringo', d)]);
  return { date: d, br: mapRows(br), gringo: mapRows(gringo) };
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function fmtDateBR(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

// --- Destino: Telegram (bot Chefe Bruno) ---
export async function deliverTelegram(report: Report, topN = 5): Promise<void> {
  const list = (items: ReportItem[]) =>
    items.slice(0, topN)
      .map((f, i) => `${i + 1}. <b>${Math.round(f.score)}</b> · ${escapeHtml(f.title).slice(0, 70)}\nhttps://youtu.be/${f.video_id}`)
      .join('\n');

  const parts: string[] = [`🎯 <b>Radar de Viral do Nicho</b> · ${fmtDateBR(report.date)}`, ''];
  if (report.br.length) parts.push('🇧🇷 <b>Brasil</b>', list(report.br), '');
  if (report.gringo.length) parts.push('🌎 <b>Gringo</b>', list(report.gringo));
  if (!report.br.length && !report.gringo.length) parts.push('Nenhum viral hoje.');

  await sendMessage(parts.join('\n'));
}
