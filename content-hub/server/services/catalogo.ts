// Catalogo Service — loads metric/exercise catalog from vault
// Used by Haiku (PC off) for fuzzy matching of user messages
// Reads from OneDrive via rclone (Railway) or filesystem (local dev)

import { readFile, listFolder } from './onedrive.js';
import fs from 'fs';
import path from 'path';

// --- Types ---

export interface CatalogEntry {
  file: string;           // e.g. "exercicios/supino-reto-barra.md"
  nome: string;
  aliases: string[];
  categoria: string;      // exercicio | corpo | habito | humor | refeicao
  grupo_muscular?: string;
  tipo_valor: string;
  unidade: string;
  equipamento?: string;
  fonte?: string;
  campo_frontmatter?: string;
  origem?: string;
  ativo: boolean;
}

// --- State ---

let catalog: CatalogEntry[] = [];
let catalogLoadedAt: number = 0;
const CATALOG_TTL = 60 * 60 * 1000; // 1 hour

const CATALOG_VAULT_PATH = 'catalogo';
const SUBFOLDERS = ['exercicios', 'corpo', 'habitos', 'humor', 'refeicoes'];

// --- Simple YAML frontmatter parser (no external deps) ---

function parseFrontmatter(content: string): Record<string, any> | null {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;

  const yaml = match[1];
  const result: Record<string, any> = {};

  for (const line of yaml.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) continue;

    const key = trimmed.slice(0, colonIdx).trim();
    let value: any = trimmed.slice(colonIdx + 1).trim();

    // Array: ["a", "b", "c"]
    if (value.startsWith('[') && value.endsWith(']')) {
      const inner = value.slice(1, -1);
      value = inner
        .split(',')
        .map((s: string) => s.trim().replace(/^["']|["']$/g, ''))
        .filter((s: string) => s.length > 0);
    }
    // Boolean
    else if (value === 'true') value = true;
    else if (value === 'false') value = false;
    // Number
    else if (/^-?\d+(\.\d+)?$/.test(value)) value = Number(value);
    // Quoted string
    else if ((value.startsWith('"') && value.endsWith('"')) ||
             (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    result[key] = value;
  }

  return result;
}

// --- Load catalog ---

export async function loadCatalog(): Promise<CatalogEntry[]> {
  const useLocal = process.env.NODE_ENV !== 'production' && !process.env.RCLONE_CONFIG_B64;
  const entries: CatalogEntry[] = [];

  console.log(`[Catalogo] Loading from ${useLocal ? 'filesystem' : 'OneDrive'}...`);

  for (const folder of SUBFOLDERS) {
    try {
      let files: string[];

      if (useLocal) {
        // Local dev: read from filesystem
        const localDir = path.resolve(process.cwd(), CATALOG_VAULT_PATH, folder);
        if (!fs.existsSync(localDir)) {
          console.log(`[Catalogo] Folder not found: ${localDir}`);
          continue;
        }
        files = fs.readdirSync(localDir).filter(f => f.endsWith('.md'));
        for (const file of files) {
          try {
            const content = fs.readFileSync(path.join(localDir, file), 'utf-8');
            const parsed = parseFrontmatter(content);
            if (parsed && parsed.nome) {
              entries.push({
                file: `${folder}/${file}`,
                nome: parsed.nome,
                aliases: parsed.aliases || [],
                categoria: parsed.categoria || folder,
                grupo_muscular: parsed.grupo_muscular,
                tipo_valor: parsed.tipo_valor || 'texto',
                unidade: parsed.unidade || '',
                equipamento: parsed.equipamento,
                fonte: parsed.fonte,
                campo_frontmatter: parsed.campo_frontmatter,
                origem: parsed.origem,
                ativo: parsed.ativo !== false,
              });
            }
          } catch (e: any) {
            console.error(`[Catalogo] Failed to read ${folder}/${file}:`, e.message);
          }
        }
      } else {
        // Production: read from OneDrive via rclone
        const items = await listFolder(`${CATALOG_VAULT_PATH}/${folder}`);
        for (const item of items) {
          if (!item.Name.endsWith('.md')) continue;
          try {
            const content = await readFile(`${CATALOG_VAULT_PATH}/${folder}/${item.Name}`);
            const parsed = parseFrontmatter(content);
            if (parsed && parsed.nome) {
              entries.push({
                file: `${folder}/${item.Name}`,
                nome: parsed.nome,
                aliases: parsed.aliases || [],
                categoria: parsed.categoria || folder,
                grupo_muscular: parsed.grupo_muscular,
                tipo_valor: parsed.tipo_valor || 'texto',
                unidade: parsed.unidade || '',
                equipamento: parsed.equipamento,
                fonte: parsed.fonte,
                campo_frontmatter: parsed.campo_frontmatter,
                origem: parsed.origem,
                ativo: parsed.ativo !== false,
              });
            }
          } catch (e: any) {
            console.error(`[Catalogo] Failed to read ${folder}/${item.Name}:`, e.message);
          }
        }
      }
    } catch (e: any) {
      console.error(`[Catalogo] Failed to process ${folder}:`, e.message);
    }
  }

  catalog = entries;
  catalogLoadedAt = Date.now();
  console.log(`[Catalogo] Loaded ${entries.length} entries (${SUBFOLDERS.map(f => `${f}: ${entries.filter(e => e.file.startsWith(f)).length}`).join(', ')})`);
  return entries;
}

// --- Access ---

export async function getCatalog(): Promise<CatalogEntry[]> {
  if (catalog.length === 0 || Date.now() - catalogLoadedAt > CATALOG_TTL) {
    await loadCatalog();
  }
  return catalog;
}

// --- Compact format for Haiku prompt ---

export function getCatalogCompact(): string {
  if (catalog.length === 0) return '(catalogo vazio)';

  const byCategory: Record<string, CatalogEntry[]> = {};
  for (const entry of catalog) {
    if (!entry.ativo) continue;
    const cat = entry.categoria;
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(entry);
  }

  const lines: string[] = [];
  for (const [cat, entries] of Object.entries(byCategory)) {
    lines.push(`## ${cat.toUpperCase()}`);
    for (const e of entries) {
      const aliases = e.aliases.slice(0, 4).join(', '); // max 4 aliases for prompt size
      const extra = e.grupo_muscular ? ` [${e.grupo_muscular}]` : '';
      const field = e.campo_frontmatter ? ` → ${e.campo_frontmatter}` : '';
      lines.push(`- ${e.nome}${extra}: ${aliases}${field}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

// --- Fuzzy match ---

export function findByAlias(query: string): CatalogEntry[] {
  const q = normalize(query);
  if (!q) return [];

  const results: Array<{ entry: CatalogEntry; score: number }> = [];

  for (const entry of catalog) {
    if (!entry.ativo) continue;

    // Exact name match
    if (normalize(entry.nome) === q) {
      results.push({ entry, score: 100 });
      continue;
    }

    // Exact alias match
    if (entry.aliases.some(a => normalize(a) === q)) {
      results.push({ entry, score: 95 });
      continue;
    }

    // Name contains query
    if (normalize(entry.nome).includes(q)) {
      results.push({ entry, score: 80 });
      continue;
    }

    // Alias contains query
    const aliasMatch = entry.aliases.find(a => normalize(a).includes(q));
    if (aliasMatch) {
      results.push({ entry, score: 70 });
      continue;
    }

    // Query contains name
    if (q.includes(normalize(entry.nome))) {
      results.push({ entry, score: 60 });
      continue;
    }

    // Query contains alias
    if (entry.aliases.some(a => q.includes(normalize(a)))) {
      results.push({ entry, score: 50 });
      continue;
    }

    // Word overlap scoring
    const qWords = q.split(/\s+/);
    const entryWords = [
      ...normalize(entry.nome).split(/\s+/),
      ...entry.aliases.flatMap(a => normalize(a).split(/\s+/)),
    ];
    const overlap = qWords.filter(w => entryWords.some(ew => ew.includes(w) || w.includes(ew)));
    if (overlap.length > 0) {
      const score = Math.round((overlap.length / qWords.length) * 40);
      if (score >= 15) results.push({ entry, score });
    }
  }

  // Sort by score descending, return top matches
  results.sort((a, b) => b.score - a.score);
  return results.map(r => r.entry);
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9\s]/g, ' ')    // non-alphanumeric → space
    .replace(/\s+/g, ' ')
    .trim();
}

// --- Stats ---

export function getCatalogStats() {
  const byCategory: Record<string, number> = {};
  for (const entry of catalog) {
    byCategory[entry.categoria] = (byCategory[entry.categoria] || 0) + 1;
  }

  return {
    total: catalog.length,
    byCategory,
    loadedAt: catalogLoadedAt ? new Date(catalogLoadedAt).toISOString() : null,
    ttlRemaining: catalogLoadedAt
      ? Math.max(0, Math.round((CATALOG_TTL - (Date.now() - catalogLoadedAt)) / 1000))
      : 0,
  };
}
