/**
 * Dynamic Agent Loader — reads .agent.md files from vault folders.
 *
 * Loads agents from:
 *   - _opensquad/agents/*.agent.md (core agents)
 *   - squads/treino-recomp/agents/*.agent.md (squad agents)
 *
 * Creating a new agent = creating a .agent.md file = it works.
 * No hardcoded list.
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execFileAsync = promisify(execFile);

const RCLONE_BIN = process.env.RCLONE_BIN || 'rclone';
const RCLONE_CONFIG_PATH = process.env.RCLONE_CONFIG_PATH || '/tmp/rclone.conf';
const RCLONE_REMOTE = 'opensquad-vault';
const VAULT_PATH = process.env.ONEDRIVE_VAULT_PATH || 'Bruno Salles/Projetos/OpenSquad';

const LOCAL_CACHE_DIR = '/tmp/agents-cache';

// --- Types ---

export interface AgentDef {
  id: string;
  name: string;
  title: string;
  icon: string;
  squad: string;
  content: string;   // full markdown body (for Claude prompt)
  summary: string;   // compact 1-line summary (for Haiku prompt)
}

// --- State ---

let agents: AgentDef[] = [];
let agentsLoadedAt: number = 0;
const AGENTS_TTL = 60 * 60 * 1000; // 1 hour

// Folders to scan for agents
const AGENT_FOLDERS = [
  '_opensquad/agents',
  'squads/treino-recomp/agents',
];

// --- YAML frontmatter parser (same as catalogo) ---

function parseFrontmatter(content: string): { meta: Record<string, any>; body: string } | null {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)/);
  if (!match) return null;

  const yaml = match[1];
  const body = match[2].trim();
  const meta: Record<string, any> = {};

  for (const line of yaml.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) continue;
    const key = trimmed.slice(0, colonIdx).trim();
    let value: any = trimmed.slice(colonIdx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (value.startsWith('[') && value.endsWith(']')) {
      value = value.slice(1, -1).split(',').map((s: string) => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
    }
    meta[key] = value;
  }

  return { meta, body };
}

// --- Load ---

function readAgentsFromDir(baseDir: string): AgentDef[] {
  const result: AgentDef[] = [];
  for (const folder of AGENT_FOLDERS) {
    const dir = path.join(baseDir, folder);
    if (!fs.existsSync(dir)) continue;

    const files = fs.readdirSync(dir).filter(f => f.endsWith('.agent.md'));
    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(dir, file), 'utf-8');
        const parsed = parseFrontmatter(content);
        if (!parsed || !parsed.meta.name) continue;

        const m = parsed.meta;
        result.push({
          id: m.id || `${folder}/${file}`,
          name: m.name,
          title: m.title || '',
          icon: m.icon || '',
          squad: m.squad || '',
          content: parsed.body,
          summary: `${m.icon || ''} ${m.name} (${m.title}): ${extractFirstSentence(parsed.body)}`,
        });
      } catch (e: any) {
        console.error(`[AgentLoader] Failed to read ${folder}/${file}:`, e.message);
      }
    }
  }
  return result;
}

function extractFirstSentence(body: string): string {
  // Get the Role description as summary
  const roleMatch = body.match(/### Role\s*\n+([\s\S]*?)(?=\n#|\n\n##|\n\n\n)/);
  if (roleMatch) {
    const first = roleMatch[1].trim().split('\n')[0].trim();
    return first.slice(0, 120);
  }
  return body.split('\n').find(l => l.trim() && !l.startsWith('#'))?.trim().slice(0, 120) || '';
}

export async function loadAgents(): Promise<AgentDef[]> {
  const useLocal = process.env.NODE_ENV !== 'production' && !process.env.RCLONE_CONFIG_B64;

  if (useLocal) {
    console.log('[AgentLoader] Loading from filesystem...');
    agents = readAgentsFromDir(process.cwd());
  } else {
    console.log('[AgentLoader] Downloading agents from OneDrive...');
    if (fs.existsSync(LOCAL_CACHE_DIR)) fs.rmSync(LOCAL_CACHE_DIR, { recursive: true });
    fs.mkdirSync(LOCAL_CACHE_DIR, { recursive: true });

    for (const folder of AGENT_FOLDERS) {
      const remotePath = `${RCLONE_REMOTE}:${VAULT_PATH}/${folder}`;
      const localPath = path.join(LOCAL_CACHE_DIR, folder);
      fs.mkdirSync(localPath, { recursive: true });

      try {
        await execFileAsync(RCLONE_BIN, [
          '--config', RCLONE_CONFIG_PATH,
          'copy', remotePath, localPath,
          '--include', '*.agent.md',
        ], { maxBuffer: 5 * 1024 * 1024, timeout: 30000 });
      } catch (e: any) {
        console.error(`[AgentLoader] rclone copy ${folder} failed:`, e.message);
      }
    }

    agents = readAgentsFromDir(LOCAL_CACHE_DIR);
  }

  agentsLoadedAt = Date.now();
  console.log(`[AgentLoader] Loaded ${agents.length} agents: ${agents.map(a => a.name).join(', ')}`);
  return agents;
}

export async function getAgents(): Promise<AgentDef[]> {
  if (agents.length === 0 || Date.now() - agentsLoadedAt > AGENTS_TTL) {
    await loadAgents();
  }
  return agents;
}

/** Compact agent list for Haiku prompt */
export function getAgentsCompact(): string {
  if (agents.length === 0) return '(nenhum agente carregado)';
  return agents.map(a => a.summary).join('\n');
}

/** Full agent content for system prompt */
export function getAgentsFullPrompt(): string {
  return agents.map(a => a.content).join('\n\n---\n\n');
}
