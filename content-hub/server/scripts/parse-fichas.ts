/**
 * parse-fichas.ts
 *
 * Reads all 34 ficha-roteiro.md files from squads/yt-fichas/output/
 * and generates a structured data/fichas.json for the Content Hub.
 *
 * Run: npx tsx server/scripts/parse-fichas.ts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FICHAS_OUTPUT = path.resolve(__dirname, '../../../squads/yt-fichas/output');
const DATA_OUTPUT = path.resolve(__dirname, '../../data/fichas.json');

interface FichaBlock {
  name: string;
  timeStart: string;
  timeEnd: string;
  function: string;
  duration: string;
}

interface FichaData {
  videoId: string;
  runId: string;
  title: string;
  durationText: string;
  durationSeconds: number;
  publishedAt: string;
  structureType: string;
  blocks: FichaBlock[];
  proportions: { hook: number; content: number; closing: number };
  hookElementCount: number;
  blockCount: number;
  sections: Record<string, string>;
}

function extractHeader(content: string): {
  title: string;
  videoId: string;
  durationText: string;
  durationSeconds: number;
  publishedAt: string;
} {
  const titleMatch = content.match(/^# Ficha de Roteiro — (.+)$/m);
  const idMatch = content.match(/\*\*ID:\*\* (.+)/);
  const durationMatch = content.match(/\*\*Duração:\*\* (.+?) \((\d+)s\)/);
  const dateMatch = content.match(/\*\*Publicado:\*\* (\d{4}-\d{2}-\d{2})/);

  return {
    title: titleMatch?.[1]?.trim() || 'Sem título',
    videoId: idMatch?.[1]?.trim() || '',
    durationText: durationMatch?.[1]?.trim() || '',
    durationSeconds: durationMatch ? parseInt(durationMatch[2]) : 0,
    publishedAt: dateMatch?.[1]?.trim() || '',
  };
}

function extractStructureType(sectionContent: string): string {
  // Format 1: **Tipo de estrutura:** text
  const inlineMatch = sectionContent.match(/\*\*Tipo de estrutura:\*\*\s*(.+)/);
  if (inlineMatch) return inlineMatch[1].trim();

  // Format 2: ### Tipo de estrutura\ntext (on next line)
  const headerMatch = sectionContent.match(/###?\s*Tipo de estrutura\s*\n+(.+)/);
  if (headerMatch) return headerMatch[1].trim();

  // Format 3: just grab the first substantive line after the section header
  const lines = sectionContent.split('\n').filter(l => l.trim() && !l.startsWith('#') && !l.startsWith('|') && !l.startsWith('-'));
  return lines[0]?.trim() || '';
}

function extractProportions(sectionContent: string): { hook: number; content: number; closing: number } {
  // Various patterns: "3.4% : 88.3% : 8.3%" or "4.8% : 91.2% : 4.0%"
  const match = sectionContent.match(/(\d+\.?\d*)%\s*:\s*(\d+\.?\d*)%\s*:\s*(\d+\.?\d*)%/);
  if (match) {
    return {
      hook: parseFloat(match[1]),
      content: parseFloat(match[2]),
      closing: parseFloat(match[3]),
    };
  }
  return { hook: 0, content: 0, closing: 0 };
}

function countTableRows(sectionContent: string): number {
  const lines = sectionContent.split('\n');
  let count = 0;
  let inTable = false;
  for (const line of lines) {
    if (line.trim().startsWith('|')) {
      if (!inTable) {
        inTable = true;
        continue; // skip header
      }
      if (line.includes('---')) continue; // skip separator
      count++;
    } else if (inTable) {
      break; // end of first table
    }
  }
  return count;
}

function splitSections(content: string): Record<string, string> {
  const sections: Record<string, string> = {};

  // Split on ### N. (section headers)
  // Match patterns: ### 1. , ### 2. , ### 5b. , ### 10.
  const sectionRegex = /^### (\d+b?)\.\s+/m;

  const parts = content.split(/(?=^### \d+b?\.\s+)/m);

  for (const part of parts) {
    const match = part.match(/^### (\d+b?)\.\s+/);
    if (match) {
      const sectionNum = match[1];
      sections[sectionNum] = part.trim();
    }
  }

  return sections;
}

function parseFicha(fichaPath: string, runId: string): FichaData | null {
  try {
    const content = fs.readFileSync(fichaPath, 'utf-8');
    const header = extractHeader(content);

    if (!header.videoId) {
      console.warn(`  Skipping ${runId}: no video ID found`);
      return null;
    }

    const sections = splitSections(content);
    const section1 = sections['1'] || '';
    const section2 = sections['2'] || '';

    const structureType = extractStructureType(section1);
    const proportions = extractProportions(section1);
    const blockCount = countTableRows(section1);
    const hookElementCount = countTableRows(section2);

    // Extract blocks from section 1 table (best effort)
    const blocks: FichaBlock[] = [];
    const tableLines = section1.split('\n').filter(l => l.trim().startsWith('|'));
    for (let i = 2; i < tableLines.length; i++) { // skip header + separator
      const cells = tableLines[i].split('|').map(c => c.trim()).filter(Boolean);
      if (cells.length >= 3) {
        // Handle various column layouts
        const hasIndex = /^\d+$/.test(cells[0]);
        const offset = hasIndex ? 1 : 0;
        blocks.push({
          name: cells[offset] || '',
          timeStart: cells[offset + 1]?.match(/\[?(\d{2}:\d{2})\]?/)?.[1] || cells[offset + 1] || '',
          timeEnd: cells[offset + 2]?.match(/\[?(\d{2}:\d{2})\]?/)?.[1] || '',
          function: cells[offset + (hasIndex ? 4 : 2)] || '',
          duration: cells[cells.length - 1] || '',
        });
      }
    }

    return {
      videoId: header.videoId,
      runId,
      title: header.title,
      durationText: header.durationText,
      durationSeconds: header.durationSeconds,
      publishedAt: header.publishedAt,
      structureType,
      blocks,
      proportions,
      hookElementCount,
      blockCount,
      sections,
    };
  } catch (err: any) {
    console.error(`  Error parsing ${fichaPath}: ${err.message}`);
    return null;
  }
}

function main() {
  console.log('Parsing fichas de roteiro...');
  console.log(`Source: ${FICHAS_OUTPUT}`);

  const runDirs = fs.readdirSync(FICHAS_OUTPUT)
    .filter(d => fs.statSync(path.join(FICHAS_OUTPUT, d)).isDirectory())
    .filter(d => d.match(/^\d{4}-\d{2}-\d{2}-/)) // only run folders
    .sort();

  console.log(`Found ${runDirs.length} run directories`);

  const fichas: FichaData[] = [];

  for (const runId of runDirs) {
    const fichaPath = path.join(FICHAS_OUTPUT, runId, 'v1', 'ficha-roteiro.md');
    if (!fs.existsSync(fichaPath)) {
      console.warn(`  ${runId}: no ficha-roteiro.md found, skipping`);
      continue;
    }

    console.log(`  Parsing ${runId}...`);
    const ficha = parseFicha(fichaPath, runId);
    if (ficha) {
      fichas.push(ficha);
    }
  }

  // Sort by publishedAt descending (newest first)
  fichas.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

  // Write output
  fs.writeFileSync(DATA_OUTPUT, JSON.stringify(fichas, null, 2), 'utf-8');
  console.log(`\nDone! ${fichas.length} fichas written to ${DATA_OUTPUT}`);

  // Print summary
  const avgHook = fichas.reduce((s, f) => s + f.proportions.hook, 0) / fichas.length;
  const avgContent = fichas.reduce((s, f) => s + f.proportions.content, 0) / fichas.length;
  const avgHookElements = fichas.reduce((s, f) => s + f.hookElementCount, 0) / fichas.length;
  console.log(`  Avg hook: ${avgHook.toFixed(1)}% | Avg content: ${avgContent.toFixed(1)}% | Avg hook elements: ${avgHookElements.toFixed(1)}`);
}

main();
