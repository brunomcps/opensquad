/**
 * Vault Writer — writes extracted health data to daily metric files.
 *
 * Creates/updates saude/metricas/metricas-YYYY-MM-DD.md via OneDrive.
 * Handles frontmatter updates and body section appends.
 */

import { readFile, writeFile, fileExists } from './onedrive.js';

// --- Types ---

export interface MetricUpdate {
  date: string;               // YYYY-MM-DD
  frontmatter?: Record<string, any>; // fields to update in YAML
  sections?: {                 // body sections to APPEND to
    treino?: string;
    refeicoes?: string;
    habitos?: string;
    humor?: string;
    notas?: string;
  };
  replace?: {                  // body sections to REPLACE entirely
    treino?: string;
    refeicoes?: string;
    habitos?: string;
    humor?: string;
    notas?: string;
  };
}

// --- Helpers ---

function todayBRT(): string {
  const now = new Date();
  const brt = new Date(now.getTime() - 3 * 3600000);
  // Horario logico: 00-04:59 pode ser dia anterior
  const hour = brt.getHours();
  if (hour < 5) {
    // Ambiguous zone — default to previous day for health metrics
    brt.setDate(brt.getDate() - 1);
  }
  return brt.toISOString().slice(0, 10);
}

function metricsPath(date: string): string {
  return `saude/metricas/metricas-${date}.md`;
}

// --- Template for new daily metric file ---

function newDailyTemplate(date: string): string {
  return `---
date: ${date}
type: metrica-diaria
pillar: saude
tags: [metrica, saude]
---

## Sono

## Treino

## Refeicoes

## Habitos

## Humor

## Notas
`;
}

// --- Parse existing file ---

function parseMetricFile(content: string): { frontmatter: Record<string, any>; body: string } {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)/);
  if (!match) return { frontmatter: {}, body: content };

  const frontmatter: Record<string, any> = {};
  for (const line of match[1].split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) continue;
    const key = trimmed.slice(0, colonIdx).trim();
    let value: any = trimmed.slice(colonIdx + 1).trim();
    if (value === 'null') value = null;
    else if (value === 'true') value = true;
    else if (value === 'false') value = false;
    else if (/^-?\d+(\.\d+)?$/.test(value)) value = Number(value);
    else if (value.startsWith('[')) {
      value = value.slice(1, -1).split(',').map((s: string) => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
    } else if ((value.startsWith('"') && value.endsWith('"'))) {
      value = value.slice(1, -1);
    }
    frontmatter[key] = value;
  }

  return { frontmatter, body: match[2] };
}

// --- Serialize frontmatter ---

function serializeFrontmatter(fm: Record<string, any>): string {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(fm)) {
    if (value === null || value === undefined) {
      lines.push(`${key}: null`);
    } else if (Array.isArray(value)) {
      lines.push(`${key}: [${value.map(v => typeof v === 'string' ? v : String(v)).join(', ')}]`);
    } else if (typeof value === 'boolean') {
      lines.push(`${key}: ${value}`);
    } else if (typeof value === 'number') {
      lines.push(`${key}: ${value}`);
    } else {
      lines.push(`${key}: ${value}`);
    }
  }
  return lines.join('\n');
}

// --- Section operations ---

function appendToSection(body: string, section: string, text: string): string {
  const sectionHeader = `## ${section}`;
  const idx = body.indexOf(sectionHeader);
  if (idx === -1) {
    return body.trimEnd() + `\n\n${sectionHeader}\n\n${text}\n`;
  }

  const afterHeader = idx + sectionHeader.length;
  const nextSection = body.indexOf('\n## ', afterHeader);
  const insertAt = nextSection !== -1 ? nextSection : body.length;

  const before = body.slice(0, insertAt).trimEnd();
  const after = body.slice(insertAt);
  return `${before}\n${text}\n${after}`;
}

function replaceSection(body: string, section: string, text: string): string {
  const sectionHeader = `## ${section}`;
  const idx = body.indexOf(sectionHeader);
  if (idx === -1) {
    return body.trimEnd() + `\n\n${sectionHeader}\n\n${text}\n`;
  }

  const afterHeader = idx + sectionHeader.length;
  const nextSection = body.indexOf('\n## ', afterHeader);
  const before = body.slice(0, idx + sectionHeader.length);
  const after = nextSection !== -1 ? body.slice(nextSection) : '';
  return `${before}\n\n${text}\n${after}`;
}

// --- Main write function ---

export async function writeMetrics(update: MetricUpdate): Promise<void> {
  const date = update.date || todayBRT();
  const path = metricsPath(date);

  let content: string;
  let fm: Record<string, any>;
  let body: string;

  // Read existing or create new
  const exists = await fileExists(path);
  if (exists) {
    content = await readFile(path);
    const parsed = parseMetricFile(content);
    fm = parsed.frontmatter;
    body = parsed.body;
  } else {
    content = newDailyTemplate(date);
    const parsed = parseMetricFile(content);
    fm = parsed.frontmatter;
    body = parsed.body;
  }

  // Update frontmatter
  if (update.frontmatter) {
    for (const [key, value] of Object.entries(update.frontmatter)) {
      if (value !== undefined && value !== null) {
        fm[key] = value;
      }
    }
  }

  const sectionMap: Record<string, string> = {
    treino: 'Treino',
    refeicoes: 'Refeicoes',
    habitos: 'Habitos',
    humor: 'Humor',
    notas: 'Notas',
  };

  // Replace sections (corrections — overwrites entire section content)
  if (update.replace) {
    for (const [key, text] of Object.entries(update.replace)) {
      if (text) {
        const sectionName = sectionMap[key] || key;
        body = replaceSection(body, sectionName, text);
      }
    }
  }

  // Append to sections (new data — adds to existing)
  if (update.sections) {
    for (const [key, text] of Object.entries(update.sections)) {
      if (text) {
        const sectionName = sectionMap[key] || key;
        body = appendToSection(body, sectionName, text);
      }
    }
  }

  // Serialize and write
  const newContent = `---\n${serializeFrontmatter(fm)}\n---\n\n${body.trim()}\n`;
  await writeFile(path, newContent);
  console.log(`[VaultWriter] Updated ${path}`);
}

export { todayBRT };
