import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VIDEOS_ROOT = path.resolve(__dirname, '../../../youtube/by-video/longos');
const GEMINI_API_KEY = process.env.GOOGLE_AI_STUDIO_API_KEY;
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

const oauth2Client = new google.auth.OAuth2(
  process.env.YOUTUBE_CLIENT_ID, process.env.YOUTUBE_CLIENT_SECRET, 'http://localhost:3000/callback'
);
oauth2Client.setCredentials({ refresh_token: process.env.YOUTUBE_REFRESH_TOKEN });
const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

interface VideoComment { id: string; authorName: string; text: string; likeCount: number; publishedAt: string; isReply: boolean; category?: string; }

async function fetchVideoComments(videoId: string): Promise<VideoComment[]> {
  const comments: VideoComment[] = [];
  let nextPageToken: string | undefined;
  do {
    const res = await youtube.commentThreads.list({ part: ['snippet', 'replies'], videoId, maxResults: 100, order: 'relevance', pageToken: nextPageToken });
    for (const item of res.data.items || []) {
      const top = item.snippet?.topLevelComment?.snippet;
      if (top) comments.push({ id: item.snippet?.topLevelComment?.id || '', authorName: top.authorDisplayName || '', text: top.textDisplay || '', likeCount: top.likeCount || 0, publishedAt: top.publishedAt || '', isReply: false });
      for (const reply of item.replies?.comments || []) {
        const rs = reply.snippet;
        if (rs) comments.push({ id: reply.id || '', authorName: rs.authorDisplayName || '', text: rs.textDisplay || '', likeCount: rs.likeCount || 0, publishedAt: rs.publishedAt || '', isReply: true });
      }
    }
    nextPageToken = res.data.nextPageToken || undefined;
  } while (nextPageToken);
  return comments;
}

async function categorizeComments(comments: VideoComment[]): Promise<VideoComment[]> {
  if (!GEMINI_API_KEY || comments.length === 0) return comments;
  const BATCH_SIZE = 50;
  const categorized = [...comments];
  for (let i = 0; i < comments.length; i += BATCH_SIZE) {
    const batch = comments.slice(i, i + BATCH_SIZE);
    const commentTexts = batch.map((c, idx) => `[${idx}] ${c.text.substring(0, 150)}`).join('\n');
    try {
      const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `Categorize each YouTube comment into ONE category: identification, testimony, question, gratitude, objection, sharing. Return ONLY a JSON array of strings.\n\nComments:\n${commentTexts}` }] }],
          generationConfig: { temperature: 0.1 },
        }),
      });
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const jsonMatch = text.match(/\[[\s\S]*?\]/);
      if (jsonMatch) {
        const categories: string[] = JSON.parse(jsonMatch[0]);
        for (let j = 0; j < Math.min(categories.length, batch.length); j++) categorized[i + j].category = categories[j];
      }
    } catch (err: any) { console.error(`  Batch ${i} failed: ${err.message}`); }
    if (i + BATCH_SIZE < comments.length) await new Promise(r => setTimeout(r, 1000));
  }
  return categorized;
}

const dirs = fs.readdirSync(VIDEOS_ROOT).filter(d => fs.statSync(path.join(VIDEOS_ROOT, d)).isDirectory());
const remaining = dirs.filter(d => !fs.existsSync(path.join(VIDEOS_ROOT, d, 'comments.json')));
console.log(`${remaining.length} videos remaining (${dirs.length - remaining.length} already done)\n`);

let synced = 0, errors = 0;
for (const videoId of remaining) {
  try {
    console.log(`[${synced+errors+1}/${remaining.length}] ${videoId}...`);
    const comments = await fetchVideoComments(videoId);
    console.log(`  ${comments.length} comments, categorizing...`);
    const categorized = await categorizeComments(comments);
    const summary: Record<string, number> = {};
    for (const c of categorized) { const cat = c.category || 'uncategorized'; summary[cat] = (summary[cat] || 0) + 1; }
    const data = { videoId, fetchedAt: new Date().toISOString(), totalComments: categorized.length, comments: categorized, categorySummary: summary };
    fs.writeFileSync(path.join(VIDEOS_ROOT, videoId, 'comments.json'), JSON.stringify(data, null, 2), 'utf-8');
    console.log(`  ✅ ${Object.entries(summary).map(([k,v]) => `${k}:${v}`).join(', ')}`);
    synced++;
    await new Promise(r => setTimeout(r, 1500));
  } catch (err: any) {
    console.error(`  ❌ ${err.message}`);
    errors++;
  }
}
console.log(`\nDone! ${synced} synced, ${errors} errors.`);
