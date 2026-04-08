/**
 * Vault Reader — reads treino and metricas from Obsidian vault.
 *
 * Source of truth is the vault (OneDrive), NOT Supabase.
 * Replaces Supabase calls for health/treino data.
 */

import { readFile } from './onedrive.js';

// --- Types (compatible with existing bot.ts types) ---

export interface VaultMetrica {
  date: string;
  sono: number | null;
  peso: number | null;
  hr_repouso: number | null;
  hr_media: number | null;
  passos: number | null;
  calorias: number | null;
  humor: number | null;
  sono_profundo: number | null;
  sono_leve: number | null;
  sono_rem: number | null;
}

export interface VaultExercicio {
  nome: string;
  musculo: string;
  series: string;
  reps: string;
  carga: string;
  descanso: string;
  rpe: string;
  gif: string | null;
}

export interface VaultTreinoDia {
  label: string;       // "Push A (Pesado) + Escada"
  exercises: VaultExercicio[];
}

export interface VaultTreinoSemana {
  semana: number;
  ano: number;
  meta_sessoes: number;
  concluidos: number;
  treino_1: string | null;
  treino_2: string | null;
  treino_3: string | null;
  treino_4: string | null;
  treino_5: string | null;
  treino_6: string | null;
  dias: Record<string, VaultTreinoDia>; // "Segunda" → { label, exercises }
}

// --- Helpers ---

function parseFrontmatter(content: string): { meta: Record<string, any>; body: string } {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)/);
  if (!match) return { meta: {}, body: content };

  const meta: Record<string, any> = {};
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
    else if ((value.startsWith('"') && value.endsWith('"')) ||
             (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    meta[key] = value;
  }

  return { meta, body: match[2] };
}

function getISOWeek(d: Date): number {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
  const week1 = new Date(date.getFullYear(), 0, 4);
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

function parseExerciseTable(tableBlock: string): VaultExercicio[] {
  const exercises: VaultExercicio[] = [];
  const lines = tableBlock.split('\n');

  for (const line of lines) {
    if (!line.includes('|') || line.includes('---') || line.includes('Exercicio') || line.includes('Exercício')) continue;
    const cols = line.split('|').map(c => c.trim()).filter(Boolean);
    if (cols.length < 7) continue;

    // Extract GIF URL from Ref column
    let gif: string | null = null;
    const refCol = cols[7] || '';
    const gifMatch = refCol.match(/\(([^)]+exrx\.net[^)]+)\)/);
    if (gifMatch) gif = gifMatch[1];

    exercises.push({
      nome: cols[0],
      musculo: cols[1],
      series: cols[2],
      reps: cols[3],
      carga: cols[4],
      descanso: cols[5],
      rpe: cols[6],
      gif,
    });
  }

  return exercises;
}

// --- Public API ---

export async function readMetricasFromVault(date: string): Promise<VaultMetrica | null> {
  try {
    const content = await readFile(`saude/metricas/metricas-${date}.md`);
    const { meta } = parseFrontmatter(content);

    return {
      date: meta.date || date,
      sono: meta.sono ?? null,
      peso: meta.peso ?? null,
      hr_repouso: meta.hr_repouso ?? null,
      hr_media: meta.hr_media ?? null,
      passos: meta.passos ?? null,
      calorias: meta.calorias ?? null,
      humor: meta.humor ?? null,
      sono_profundo: meta.sono_profundo ?? null,
      sono_leve: meta.sono_leve ?? null,
      sono_rem: meta.sono_rem ?? null,
    };
  } catch (e: any) {
    console.error(`[VaultReader] metricas ${date} not found:`, e.message);
    return null;
  }
}

export async function readTreinoFromVault(): Promise<VaultTreinoSemana | null> {
  const now = new Date();
  const brt = new Date(now.getTime() - 3 * 3600000);
  const week = getISOWeek(brt);
  const year = brt.getFullYear();
  const path = `saude/treino-semana-${year}-W${String(week).padStart(2, '0')}.md`;

  try {
    const content = await readFile(path);
    const { meta, body } = parseFrontmatter(content);

    // Parse each day's exercises from ## headers
    const dias: Record<string, VaultTreinoDia> = {};
    const dayNames = ['Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado', 'Domingo'];

    for (const dayName of dayNames) {
      // Match section header: ## Segunda — Push A (Pesado) + Escada
      const headerRegex = new RegExp(`## ${dayName}\\s*[—–-]\\s*(.+?)\\n([\\s\\S]*?)(?=\\n## |$)`, 'i');
      const match = body.match(headerRegex);
      if (match) {
        const label = match[1].trim();
        const sectionBody = match[2];

        if (label.toUpperCase().includes('REST') || label.toUpperCase().includes('DESCANSO')) {
          continue; // Skip rest days
        }

        const exercises = parseExerciseTable(sectionBody);
        if (exercises.length > 0) {
          dias[dayName] = { label, exercises };
        }
      }
    }

    return {
      semana: meta.semana || week,
      ano: meta.ano || year,
      meta_sessoes: meta.meta_sessoes || 6,
      concluidos: meta.concluidos || 0,
      treino_1: meta.treino_1,
      treino_2: meta.treino_2,
      treino_3: meta.treino_3,
      treino_4: meta.treino_4,
      treino_5: meta.treino_5,
      treino_6: meta.treino_6,
      dias,
    };
  } catch (e: any) {
    console.error(`[VaultReader] treino ${path} not found:`, e.message);
    return null;
  }
}
