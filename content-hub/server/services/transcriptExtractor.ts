import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const exec = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../../data/competitors');

interface TranscriptResult {
  videoId: string;
  competitorId: string;
  platform: string;
  text: string;
  segments: { start: number; end: number; text: string }[];
  method: 'youtube-captions' | 'whisper';
  duration: number | null;
  savedAt: string;
  filePath: string;
}

// Format seconds to [MM:SS]
function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `[${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}]`;
}

/**
 * Extract transcript from a YouTube video.
 * Strategy: 1) Try auto-captions via yt-dlp  2) Fall back to download + whisper
 */
export async function extractYouTubeTranscript(
  videoId: string,
  competitorId: string,
  videoUrl: string
): Promise<TranscriptResult> {
  const transcriptDir = path.join(DATA_DIR, competitorId, 'transcripts');
  await fs.mkdir(transcriptDir, { recursive: true });

  const outputPath = path.join(transcriptDir, `${videoId}.txt`);

  // Check if already exists
  try {
    const existing = await fs.readFile(outputPath, 'utf-8');
    if (existing.length > 50) {
      return {
        videoId, competitorId, platform: 'youtube',
        text: existing, segments: [], method: 'youtube-captions',
        duration: null, savedAt: new Date().toISOString(), filePath: outputPath
      };
    }
  } catch { /* doesn't exist yet */ }

  // Strategy 1: Try YouTube auto-captions
  const tmpDir = path.join(os.tmpdir(), `transcript_${videoId}`);
  await fs.mkdir(tmpDir, { recursive: true });

  try {
    // Try Portuguese captions first, then English, then any
    await exec('python3', [
      '-m', 'yt_dlp',
      '--write-auto-sub',
      '--sub-lang', 'pt,en',
      '--sub-format', 'vtt',
      '--skip-download',
      '--output', path.join(tmpDir, '%(id)s.%(ext)s'),
      videoUrl
    ], { timeout: 60_000 });

    // Find the VTT file
    const files = await fs.readdir(tmpDir);
    const vttFile = files.find(f => f.endsWith('.vtt'));

    if (vttFile) {
      const vttContent = await fs.readFile(path.join(tmpDir, vttFile), 'utf-8');
      const { text, segments } = parseVTT(vttContent);

      // Save as timestamped text
      const formatted = segments.map(s => `${formatTimestamp(s.start)} ${s.text}`).join('\n');
      await fs.writeFile(outputPath, formatted, 'utf-8');

      // Cleanup
      await fs.rm(tmpDir, { recursive: true, force: true });

      return {
        videoId, competitorId, platform: 'youtube',
        text: formatted, segments, method: 'youtube-captions',
        duration: segments.length > 0 ? segments[segments.length - 1].end : null,
        savedAt: new Date().toISOString(), filePath: outputPath
      };
    }
  } catch (err) {
    console.log(`[transcript] YouTube captions failed for ${videoId}, trying whisper...`);
  }

  // Strategy 2: Download audio + whisper
  return await downloadAndTranscribe(videoId, competitorId, 'youtube', videoUrl, tmpDir, outputPath);
}

/**
 * Extract transcript from a TikTok or Instagram Reel video.
 * Always uses download + whisper (no captions available).
 */
export async function extractShortVideoTranscript(
  videoId: string,
  competitorId: string,
  platform: string,
  videoUrl: string
): Promise<TranscriptResult> {
  const transcriptDir = path.join(DATA_DIR, competitorId, 'transcripts');
  await fs.mkdir(transcriptDir, { recursive: true });

  const outputPath = path.join(transcriptDir, `${videoId}.txt`);

  // Check if already exists
  try {
    const existing = await fs.readFile(outputPath, 'utf-8');
    if (existing.length > 50) {
      return {
        videoId, competitorId, platform,
        text: existing, segments: [], method: 'whisper',
        duration: null, savedAt: new Date().toISOString(), filePath: outputPath
      };
    }
  } catch { /* doesn't exist yet */ }

  const tmpDir = path.join(os.tmpdir(), `transcript_${videoId}`);
  await fs.mkdir(tmpDir, { recursive: true });

  return await downloadAndTranscribe(videoId, competitorId, platform, videoUrl, tmpDir, outputPath);
}

/**
 * Download audio and transcribe with faster-whisper
 */
async function downloadAndTranscribe(
  videoId: string,
  competitorId: string,
  platform: string,
  videoUrl: string,
  tmpDir: string,
  outputPath: string
): Promise<TranscriptResult> {
  const audioPath = path.join(tmpDir, `${videoId}.mp3`);

  try {
    // Download audio only
    await exec('python3', [
      '-m', 'yt_dlp',
      '-x', '--audio-format', 'mp3',
      '--output', audioPath,
      '--no-playlist',
      videoUrl
    ], { timeout: 120_000 });

    // Transcribe with faster-whisper
    const whisperScript = `
import json, sys
from faster_whisper import WhisperModel
model = WhisperModel("medium", device="cpu", compute_type="int8")
segments, info = model.transcribe("${audioPath.replace(/\\/g, '\\\\')}", language=None)
result = []
for seg in segments:
    result.append({"start": round(seg.start, 2), "end": round(seg.end, 2), "text": seg.text.strip()})
print(json.dumps({"segments": result, "language": info.language, "duration": info.duration}))
`;

    const { stdout } = await exec('python3', ['-c', whisperScript], {
      timeout: 300_000,  // 5 min for transcription
      maxBuffer: 10 * 1024 * 1024
    });

    const result = JSON.parse(stdout.trim());
    const segments = result.segments.map((s: any) => ({
      start: s.start,
      end: s.end,
      text: s.text
    }));

    // Save as timestamped text
    const formatted = segments.map((s: any) => `${formatTimestamp(s.start)} ${s.text}`).join('\n');
    await fs.writeFile(outputPath, formatted, 'utf-8');

    return {
      videoId, competitorId, platform,
      text: formatted, segments, method: 'whisper',
      duration: result.duration || null,
      savedAt: new Date().toISOString(), filePath: outputPath
    };
  } finally {
    // Cleanup temp files
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

/**
 * Parse VTT subtitle file into segments
 */
function parseVTT(vtt: string): { text: string; segments: { start: number; end: number; text: string }[] } {
  const lines = vtt.split('\n');
  const segments: { start: number; end: number; text: string }[] = [];
  const seenTexts = new Set<string>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Match timestamp lines: 00:00:01.234 --> 00:00:03.456
    const match = line.match(/(\d{2}):(\d{2}):(\d{2})[.,](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[.,](\d{3})/);
    if (match) {
      const start = parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseInt(match[3]) + parseInt(match[4]) / 1000;
      const end = parseInt(match[5]) * 3600 + parseInt(match[6]) * 60 + parseInt(match[7]) + parseInt(match[8]) / 1000;

      // Collect text lines until empty line
      const textLines: string[] = [];
      for (let j = i + 1; j < lines.length && lines[j].trim() !== ''; j++) {
        const cleaned = lines[j].replace(/<[^>]+>/g, '').trim();
        if (cleaned) textLines.push(cleaned);
      }

      const text = textLines.join(' ').trim();
      if (text && !seenTexts.has(text)) {
        seenTexts.add(text);
        segments.push({ start, end, text });
      }
    }
  }

  return { text: segments.map(s => s.text).join(' '), segments };
}

/**
 * Check if transcript exists for a video
 */
export async function hasTranscript(competitorId: string, videoId: string): Promise<boolean> {
  const filePath = path.join(DATA_DIR, competitorId, 'transcripts', `${videoId}.txt`);
  try {
    const stat = await fs.stat(filePath);
    return stat.size > 50;
  } catch {
    return false;
  }
}

/**
 * Get transcript text for a video
 */
export async function getTranscript(competitorId: string, videoId: string): Promise<string | null> {
  const filePath = path.join(DATA_DIR, competitorId, 'transcripts', `${videoId}.txt`);
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch {
    return null;
  }
}
