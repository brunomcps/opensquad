import { parse } from 'csv-parse/sync';
import { readFile } from 'fs/promises';
import { join } from 'path';

export interface Comment {
  video: string;
  author: string;
  content: string;
  authorUrl: string;
  isChannelOwner: boolean;
  replies: number;
  likes: number;
  isLiked: boolean;
  publishedTime: string;
  isReply: boolean;
  relevancia: string;
  categoria: string;
  nota: string;
}

export interface SearchFilters {
  video?: string;
  category?: string;
  search?: string;
  minLikes?: number;
  relevancia?: string;
  isChannelOwner?: boolean;
  limit?: number;
  offset?: number;
}

const CSV_PATH = join(import.meta.dirname, '..', '..', '..', 'TODOS_COMENTARIOS_CATEGORIZADOS.csv');

let cachedComments: Comment[] | null = null;

export async function loadComments(): Promise<Comment[]> {
  if (cachedComments) return cachedComments;

  const raw = await readFile(CSV_PATH, 'utf-8');
  const clean = raw.replace(/^\uFEFF/, '');

  const records = parse(clean, {
    delimiter: ';',
    columns: true,
    relax_column_count: true,
    skip_empty_lines: true,
    quote: '"',
  });

  cachedComments = records.map((r: any) => ({
    video: (r['video'] || '').trim(),
    author: r['Author'] || '',
    content: r['Content'] || '',
    authorUrl: r['Author URL'] || '',
    isChannelOwner: (r['Channel Owner?'] || '').toLowerCase() === 'true',
    replies: parseInt(r['Number of Replies'] || '0') || 0,
    likes: parseInt(r['Number of Thumbs Up'] || '0') || 0,
    isLiked: (r['Is Liked?'] || '').toLowerCase() === 'true',
    publishedTime: r['Published Time'] || '',
    isReply: (r['Is Reply?'] || '').toLowerCase() === 'yes',
    relevancia: (r['relevancia'] || '').trim(),
    categoria: (r['categoria'] || '').trim(),
    nota: r['nota'] || '',
  }));

  return cachedComments;
}

export async function searchComments(filters: SearchFilters = {}): Promise<{
  total: number;
  comments: Comment[];
  limit: number;
  offset: number;
}> {
  const all = await loadComments();
  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;

  let filtered = all;

  if (filters.video) {
    filtered = filtered.filter((c) => c.video === filters.video);
  }

  if (filters.category) {
    filtered = filtered.filter((c) => c.categoria === filters.category);
  }

  if (filters.search) {
    const term = filters.search.toLowerCase();
    // Match whole words only: term must NOT be preceded or followed by a letter (including accented)
    // "curso" → matches "curso", "cursos?" but NOT "concurso", "recurso"
    // "teste" → matches "teste", "testes" but NOT "testemunho", "protestei"
    // Multi-word terms like "não consigo" use simple includes (no word boundary needed)
    const isMultiWord = term.includes(' ');
    if (isMultiWord) {
      filtered = filtered.filter((c) => c.content.toLowerCase().includes(term));
    } else {
      filtered = filtered.filter((c) => {
        const text = c.content.toLowerCase();
        let idx = text.indexOf(term);
        while (idx !== -1) {
          const before = idx > 0 ? text.charCodeAt(idx - 1) : 32;
          const after = idx + term.length < text.length ? text.charCodeAt(idx + term.length) : 32;
          const isLetterBefore = (before >= 97 && before <= 122) || (before >= 65 && before <= 90) || (before >= 192 && before <= 687);
          const afterChar = text[idx + term.length] || '';
          const isLetterAfter = afterChar === 's'
            ? (idx + term.length + 1 < text.length ? /[a-zA-ZÀ-ÿ]/.test(text[idx + term.length + 1]) : false)
            : ((after >= 97 && after <= 122) || (after >= 65 && after <= 90) || (after >= 192 && after <= 687));
          if (!isLetterBefore && !isLetterAfter) return true;
          idx = text.indexOf(term, idx + 1);
        }
        return false;
      });
    }
  }

  if (filters.minLikes !== undefined) {
    filtered = filtered.filter((c) => c.likes >= filters.minLikes!);
  }

  if (filters.relevancia) {
    filtered = filtered.filter((c) => c.relevancia === filters.relevancia);
  }

  if (filters.isChannelOwner !== undefined) {
    filtered = filtered.filter((c) => c.isChannelOwner === filters.isChannelOwner);
  }

  // Sort by likes descending
  filtered.sort((a, b) => b.likes - a.likes);

  const total = filtered.length;
  const comments = filtered.slice(offset, offset + limit);

  return { total, comments, limit, offset };
}

export async function getFilterOptions(): Promise<{
  videos: string[];
  categories: string[];
}> {
  const all = await loadComments();

  const videos = [...new Set(all.map((c) => c.video).filter(Boolean))].sort();
  const categories = [...new Set(all.map((c) => c.categoria).filter(Boolean))].sort();

  return { videos, categories };
}

export async function getStats(): Promise<{
  totalComments: number;
  audienceComments: number;
  byCategory: Record<string, number>;
  byVideo: Record<string, number>;
}> {
  const all = await loadComments();

  const audienceOnly = all.filter((c) => !c.isChannelOwner);

  const byCategory: Record<string, number> = {};
  for (const c of all) {
    const key = c.categoria || '(sem categoria)';
    byCategory[key] = (byCategory[key] || 0) + 1;
  }

  const byVideo: Record<string, number> = {};
  for (const c of all) {
    const key = c.video || '(sem video)';
    byVideo[key] = (byVideo[key] || 0) + 1;
  }

  return {
    totalComments: all.length,
    audienceComments: audienceOnly.length,
    byCategory,
    byVideo,
  };
}
