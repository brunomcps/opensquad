import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { youtube } from './youtubeClient.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VIDEOS_ROOT = path.resolve(__dirname, '../../../youtube/by-video/longos');
const GEMINI_API_KEY = process.env.GOOGLE_AI_STUDIO_API_KEY;
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

export interface VideoComment {
  id: string;
  authorName: string;
  text: string;
  likeCount: number;
  publishedAt: string;
  isReply: boolean;
  category?: string;
}

export interface CommentsData {
  videoId: string;
  fetchedAt: string;
  totalComments: number;
  comments: VideoComment[];
  categorySummary: Record<string, number>;
}

/**
 * Fetch all comments for a video from YouTube API
 */
export async function fetchVideoComments(videoId: string): Promise<VideoComment[]> {
  const comments: VideoComment[] = [];
  let nextPageToken: string | undefined;

  do {
    const res = await youtube.commentThreads.list({
      part: ['snippet', 'replies'],
      videoId,
      maxResults: 100,
      order: 'relevance',
      pageToken: nextPageToken,
    });

    for (const item of res.data.items || []) {
      const top = item.snippet?.topLevelComment?.snippet;
      if (top) {
        comments.push({
          id: item.snippet?.topLevelComment?.id || '',
          authorName: top.authorDisplayName || '',
          text: top.textDisplay || '',
          likeCount: top.likeCount || 0,
          publishedAt: top.publishedAt || '',
          isReply: false,
        });
      }
      // Include replies
      for (const reply of item.replies?.comments || []) {
        const rs = reply.snippet;
        if (rs) {
          comments.push({
            id: reply.id || '',
            authorName: rs.authorDisplayName || '',
            text: rs.textDisplay || '',
            likeCount: rs.likeCount || 0,
            publishedAt: rs.publishedAt || '',
            isReply: true,
          });
        }
      }
    }

    nextPageToken = res.data.nextPageToken || undefined;
  } while (nextPageToken);

  return comments;
}

/**
 * Categorize comments using Gemini AI
 */
async function categorizeComments(comments: VideoComment[]): Promise<VideoComment[]> {
  if (!GEMINI_API_KEY || comments.length === 0) return comments;

  const BATCH_SIZE = 30;
  const categorized = [...comments];

  for (let i = 0; i < comments.length; i += BATCH_SIZE) {
    const batch = comments.slice(i, i + BATCH_SIZE);
    const commentTexts = batch.map((c, idx) => `[${idx}] ${c.text.substring(0, 200)}`).join('\n');

    try {
      const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Categorize each YouTube comment below into ONE of these categories:
- identification: viewer recognizes themselves ("isso sou eu", "caramba, é exatamente isso")
- testimony: viewer shares personal experience ("eu passei por isso quando...")
- question: viewer asks a question ("e no caso de quem...?")
- gratitude: viewer thanks or praises ("melhor vídeo que já vi")
- objection: viewer disagrees or challenges ("mas nem todo mundo que...")
- sharing: viewer mentions sharing with someone ("mandei pro meu parceiro")

Return ONLY a JSON array of category strings, one per comment, in order. Example: ["identification","testimony","question"]

Comments:
${commentTexts}`
            }]
          }],
          generationConfig: { temperature: 0.1 },
        }),
      });

      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const jsonMatch = text.match(/\[[\s\S]*?\]/);
      if (jsonMatch) {
        const categories: string[] = JSON.parse(jsonMatch[0]);
        for (let j = 0; j < Math.min(categories.length, batch.length); j++) {
          categorized[i + j].category = categories[j];
        }
      }
    } catch (err) {
      console.error(`Categorization batch ${i} failed:`, err);
    }

    // Rate limit between batches
    if (i + BATCH_SIZE < comments.length) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  return categorized;
}

/**
 * Build category summary counts
 */
function buildSummary(comments: VideoComment[]): Record<string, number> {
  const summary: Record<string, number> = {};
  for (const c of comments) {
    const cat = c.category || 'uncategorized';
    summary[cat] = (summary[cat] || 0) + 1;
  }
  return summary;
}

/**
 * Fetch, categorize, and save comments for a single video
 */
export async function syncVideoComments(videoId: string): Promise<CommentsData> {
  console.log(`  [comments] Fetching ${videoId}...`);
  const comments = await fetchVideoComments(videoId);
  console.log(`  [comments] ${comments.length} comments fetched, categorizing...`);
  const categorized = await categorizeComments(comments);
  const summary = buildSummary(categorized);

  const data: CommentsData = {
    videoId,
    fetchedAt: new Date().toISOString(),
    totalComments: categorized.length,
    comments: categorized,
    categorySummary: summary,
  };

  const outPath = path.join(VIDEOS_ROOT, videoId, 'comments.json');
  if (fs.existsSync(path.dirname(outPath))) {
    fs.writeFileSync(outPath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`  [comments] Saved ${outPath}`);
  }

  return data;
}

/**
 * Get cached comments for a video (or null if not cached)
 */
export function getCachedComments(videoId: string): CommentsData | null {
  const filePath = path.join(VIDEOS_ROOT, videoId, 'comments.json');
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

/**
 * Sync comments for all videos that have a directory
 */
export async function syncAllComments(): Promise<{ synced: number; errors: string[] }> {
  const dirs = fs.readdirSync(VIDEOS_ROOT).filter(d =>
    fs.statSync(path.join(VIDEOS_ROOT, d)).isDirectory()
  );

  let synced = 0;
  const errors: string[] = [];

  for (const videoId of dirs) {
    try {
      await syncVideoComments(videoId);
      synced++;
      // Rate limit between videos
      await new Promise(r => setTimeout(r, 1000));
    } catch (err: any) {
      console.error(`  [comments] Error on ${videoId}: ${err.message}`);
      errors.push(`${videoId}: ${err.message}`);
    }
  }

  return { synced, errors };
}
