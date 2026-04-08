// Catalogo Service — loads metric/exercise catalog from vault
// Used by Haiku (PC off) for fuzzy matching of user messages
// Reads from OneDrive via rclone (Railway) or filesystem (local dev)
// Optimized: uses single rclone copy to download entire catalog folder at once

import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execFileAsync = promisify(execFile);
// Note: does NOT import from onedrive.js — uses rclone copy directly for bulk download

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

// --- rclone config ---

const RCLONE_REMOTE = 'opensquad-vault';
const VAULT_PATH = process.env.ONEDRIVE_VAULT_PATH || 'Bruno Salles/Projetos/OpenSquad';
const RCLONE_BIN = process.env.RCLONE_BIN || 'rclone';
const RCLONE_CONFIG_PATH = process.env.RCLONE_CONFIG_PATH || '/tmp/rclone.conf';
const LOCAL_CACHE_DIR = '/tmp/catalogo-cache';

// --- Load catalog ---

function readLocalDir(baseDir: string): CatalogEntry[] {
  const entries: CatalogEntry[] = [];
  for (const folder of SUBFOLDERS) {
    const folderPath = path.join(baseDir, folder);
    if (!fs.existsSync(folderPath)) continue;

    const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.md'));
    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(folderPath, file), 'utf-8');
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
  }
  return entries;
}

export async function loadCatalog(): Promise<CatalogEntry[]> {
  const useLocal = process.env.NODE_ENV !== 'production' && !process.env.RCLONE_CONFIG_B64;

  let entries: CatalogEntry[];

  if (useLocal) {
    // Local dev: read from filesystem (project root)
    const localDir = path.resolve(process.cwd(), CATALOG_VAULT_PATH);
    console.log(`[Catalogo] Loading from filesystem: ${localDir}`);
    entries = readLocalDir(localDir);
  } else {
    // Production: single rclone copy to download entire catalog, then read locally
    console.log('[Catalogo] Downloading catalog from OneDrive via rclone copy...');
    const remotePath = `${RCLONE_REMOTE}:${VAULT_PATH}/${CATALOG_VAULT_PATH}`;

    // Clean and recreate cache dir
    if (fs.existsSync(LOCAL_CACHE_DIR)) {
      fs.rmSync(LOCAL_CACHE_DIR, { recursive: true });
    }
    fs.mkdirSync(LOCAL_CACHE_DIR, { recursive: true });

    try {
      await execFileAsync(RCLONE_BIN, [
        '--config', RCLONE_CONFIG_PATH,
        'copy', remotePath, LOCAL_CACHE_DIR,
        '--include', '*.md',
      ], {
        maxBuffer: 10 * 1024 * 1024,
        timeout: 60000, // 60s for entire copy
      });
      console.log('[Catalogo] Download complete, reading files...');
      entries = readLocalDir(LOCAL_CACHE_DIR);
    } catch (e: any) {
      console.error('[Catalogo] rclone copy failed:', e.message);
      entries = [];
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

// --- Multi-match: find all catalog entries mentioned in a message ---

export function findByAliasMulti(text: string): Array<{ entry: CatalogEntry; score: number; matchedTerm: string }> {
  const normalized = normalize(text);
  const words = normalized.split(/\s+/);
  const seen = new Set<string>();
  const results: Array<{ entry: CatalogEntry; score: number; matchedTerm: string }> = [];

  // Try 1-grams, 2-grams, 3-grams
  for (let n = 3; n >= 1; n--) {
    for (let i = 0; i <= words.length - n; i++) {
      const gram = words.slice(i, i + n).join(' ');
      if (gram.length < 3) continue; // skip very short grams

      const matches = findByAlias(gram);
      for (const entry of matches) {
        if (seen.has(entry.file)) continue;

        // Score threshold: only strong matches
        const q = normalize(gram);
        let score = 0;
        if (normalize(entry.nome) === q) score = 100;
        else if (entry.aliases.some(a => normalize(a) === q)) score = 95;
        else if (normalize(entry.nome).includes(q)) score = 80;
        else if (entry.aliases.some(a => normalize(a).includes(q))) score = 70;
        else if (q.includes(normalize(entry.nome))) score = 60;
        else if (entry.aliases.some(a => q.includes(normalize(a)))) score = 50;

        if (score >= 50) {
          seen.add(entry.file);
          results.push({ entry, score, matchedTerm: gram });
        }
      }
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results;
}

// --- Field map for Haiku: maps catalog IDs to frontmatter field names ---

export interface FieldMapEntry {
  id: string;              // file slug e.g. "supino-reto-barra"
  nome: string;
  campo_frontmatter: string | null;  // null = goes in body sections, not frontmatter
  tipo_valor: string;
  unidade: string;
  wikilink: string;        // "[[supino-reto-barra]]"
  categoria: string;
}

export function getFieldMap(matches: Array<{ entry: CatalogEntry }>): FieldMapEntry[] {
  return matches.map(({ entry }) => {
    const slug = entry.file.replace(/\.md$/, '').split('/').pop() || '';
    return {
      id: slug,
      nome: entry.nome,
      campo_frontmatter: entry.campo_frontmatter || null,
      tipo_valor: entry.tipo_valor,
      unidade: entry.unidade,
      wikilink: `[[${slug}]]`,
      categoria: entry.categoria,
    };
  });
}

// --- Compact format for Haiku with only matched entries + training plan ---

export function getCatalogForPrompt(
  fieldMap: FieldMapEntry[],
  treinoDia?: { label: string; exercises: Array<{ nome: string; series: string; reps: string; carga: string; gif: string | null }> } | null,
): string {
  const lines: string[] = [];

  if (fieldMap.length > 0) {
    lines.push('METRICAS RECONHECIDAS na mensagem:');
    for (const f of fieldMap) {
      const field = f.campo_frontmatter ? ` → frontmatter: ${f.campo_frontmatter}` : ` → body section`;
      lines.push(`- ${f.wikilink} ${f.nome} (${f.tipo_valor}, ${f.unidade})${field}`);
    }
    lines.push('');
  }

  if (treinoDia && treinoDia.exercises.length > 0) {
    lines.push(`PLANO DE TREINO HOJE: ${treinoDia.label}`);
    for (const ex of treinoDia.exercises) {
      const slug = normalize(ex.nome).replace(/\s+/g, '-');
      lines.push(`- [[${slug}]] ${ex.series}x${ex.reps} ${ex.carga}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

// --- Create new catalog entry ---

export async function createCatalogEntry(
  nome: string,
  categoria: string,
  subcategoria: string,
  tipo_valor: string,
  unidade: string,
  aliasList: string[],
): Promise<string> {
  const { writeFile } = await import('./onedrive.js');

  const slug = normalize(nome).replace(/\s+/g, '-');
  const folderMap: Record<string, string> = {
    exercicio: 'exercicios',
    habito: 'habitos',
    corpo: 'corpo',
    humor: 'humor',
    refeicao: 'refeicoes',
    sintoma: 'corpo',
  };
  const folder = folderMap[categoria] || 'habitos';
  const filePath = `catalogo/${folder}/${slug}.md`;

  const content = `---
nome: "${nome}"
aliases: [${aliasList.map(a => `"${a}"`).join(', ')}]
categoria: "${categoria}"
${subcategoria ? `grupo_muscular: "${subcategoria}"\n` : ''}tipo_valor: "${tipo_valor}"
unidade: "${unidade}"
campo_frontmatter: "${slug.replace(/-/g, '_')}"
origem: "conversa"
ativo: true
---
`;

  await writeFile(filePath, content);
  console.log(`[Catalogo] Created new entry: ${filePath}`);

  // Reload catalog to include the new entry
  await loadCatalog();

  return slug;
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
