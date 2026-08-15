import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// --- Text cleaning ---

function cleanText(text: string): string {
  return text
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, '')           // URLs
    .replace(/#\w+/g, '')                       // hashtags
    .replace(/\b(shorts?|short)\b/gi, '')       // "shorts"
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, '')    // emojis block 1
    .replace(/[\u{2600}-\u{27BF}]/gu, '')      // emojis block 2
    .replace(/[\u{FE00}-\u{FEFF}]/gu, '')      // variation selectors
    .replace(/[^\w\sàáâãéêíóôõúüç]/gi, ' ')    // special chars (keep pt-BR accents)
    .replace(/\s+/g, ' ')
    .trim();
}

function getWords(text: string): Set<string> {
  return new Set(cleanText(text).split(' ').filter((w) => w.length > 2));
}

// --- Title matching (word overlap) ---

export function titleScore(a: string, b: string): number {
  const wordsA = getWords(a);
  const wordsB = getWords(b);
  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let overlap = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) overlap++;
  }

  const maxSize = Math.max(wordsA.size, wordsB.size);
  return (overlap / maxSize) * 100;
}

// --- Description matching (substring + word overlap) ---

export function descriptionScore(ytDesc: string, ttDesc: string): number {
  const cleanYT = cleanText(ytDesc);
  const cleanTT = cleanText(ttDesc);

  if (!cleanYT || !cleanTT) return 0;

  // Substring match: TikTok desc (short) found inside YouTube desc (long)?
  if (cleanTT.length > 15 && cleanYT.includes(cleanTT)) return 95;

  // First N chars of TikTok inside YouTube?
  const ttSnippet = cleanTT.slice(0, 80);
  if (ttSnippet.length > 15 && cleanYT.includes(ttSnippet)) return 85;

  // Word overlap
  const wordsYT = getWords(ytDesc);
  const wordsTT = getWords(ttDesc);
  if (wordsYT.size === 0 || wordsTT.size === 0) return 0;

  let overlap = 0;
  for (const w of wordsTT) {
    if (wordsYT.has(w)) overlap++;
  }

  return (overlap / wordsTT.size) * 100;
}

// --- Thumbnail matching (perceptual hash) ---

async function getImageHash(imagePath: string): Promise<string | null> {
  try {
    if (!fs.existsSync(imagePath)) return null;

    // Resize to 8x8 grayscale, get raw pixel data
    const data = await sharp(imagePath)
      .resize(8, 8, { fit: 'fill' })
      .grayscale()
      .raw()
      .toBuffer();

    // Average hash: compare each pixel to mean
    const pixels = Array.from(data);
    const mean = pixels.reduce((s, p) => s + p, 0) / pixels.length;
    const bits = pixels.map((p) => (p >= mean ? '1' : '0')).join('');

    return bits; // 64-bit binary string
  } catch {
    return null;
  }
}

function hammingDistance(a: string, b: string): number {
  let diff = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] !== b[i]) diff++;
  }
  return diff;
}

export async function thumbnailScore(thumbPathA: string, thumbPathB: string): Promise<number> {
  const hashA = await getImageHash(thumbPathA);
  const hashB = await getImageHash(thumbPathB);

  if (!hashA || !hashB) return 0;

  const distance = hammingDistance(hashA, hashB);
  const maxBits = 64;

  // 0 distance = identical, 64 = completely different
  // Score: 100% at distance 0, 0% at distance 32+
  const score = Math.max(0, (1 - distance / 32) * 100);
  return score;
}

// --- Combined matching ---

export interface MatchResult {
  ytVideoId: string;
  ttVideoId: string;
  titleScore: number;
  descScore: number;
  thumbScore: number;
  totalScore: number;
  confidence: 'high' | 'medium' | 'low';
}

interface VideoData {
  id: string;
  title: string;
  description: string;
  thumbnailPath?: string; // local file path
}

export async function findMatches(
  ytVideos: VideoData[],
  ttVideos: VideoData[],
): Promise<MatchResult[]> {
  const results: MatchResult[] = [];

  for (const tt of ttVideos) {
    let bestMatch: MatchResult | null = null;

    for (const yt of ytVideos) {
      const tScore = titleScore(yt.title, tt.title);
      const dScore = descriptionScore(yt.description, tt.title + ' ' + (tt.description || ''));

      let thScore = 0;
      if (yt.thumbnailPath && tt.thumbnailPath) {
        thScore = await thumbnailScore(yt.thumbnailPath, tt.thumbnailPath);
      }

      const total = (dScore * 0.50) + (tScore * 0.25) + (thScore * 0.25);

      if (total > 40 && (!bestMatch || total > bestMatch.totalScore)) {
        bestMatch = {
          ytVideoId: yt.id,
          ttVideoId: tt.id,
          titleScore: Math.round(tScore),
          descScore: Math.round(dScore),
          thumbScore: Math.round(thScore),
          totalScore: Math.round(total),
          confidence: total > 85 ? 'high' : total > 60 ? 'medium' : 'low',
        };
      }
    }

    if (bestMatch) results.push(bestMatch);
  }

  return results.sort((a, b) => b.totalScore - a.totalScore);
}

// --- Resolve thumbnail paths ---

const YT_THUMB_DIR = path.resolve(__dirname, '../../data/yt-thumbs');

export async function ensureYTThumbnail(videoId: string, thumbUrl: string): Promise<string | undefined> {
  if (!fs.existsSync(YT_THUMB_DIR)) fs.mkdirSync(YT_THUMB_DIR, { recursive: true });
  const p = path.join(YT_THUMB_DIR, `${videoId}.jpg`);
  if (fs.existsSync(p)) return p;

  try {
    const res = await fetch(thumbUrl);
    if (!res.ok) return undefined;
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length > 500) {
      fs.writeFileSync(p, buffer);
      return p;
    }
  } catch {}
  return undefined;
}

export function getYTThumbPath(videoId: string): string | undefined {
  const p = path.join(YT_THUMB_DIR, `${videoId}.jpg`);
  return fs.existsSync(p) ? p : undefined;
}

export function getTTThumbPath(videoId: string): string | undefined {
  const p = path.resolve(__dirname, `../../data/tiktok-thumbs/${videoId}.jpg`);
  return fs.existsSync(p) ? p : undefined;
}
