import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VIDEOS_ROOT = path.resolve(__dirname, '../../../youtube/by-video/longos');

const oauth2Client = new google.auth.OAuth2(
  process.env.YOUTUBE_CLIENT_ID, process.env.YOUTUBE_CLIENT_SECRET, 'http://localhost:3000/callback'
);
oauth2Client.setCredentials({ refresh_token: process.env.YOUTUBE_REFRESH_TOKEN });
const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

interface VideoComment { id: string; authorName: string; text: string; likeCount: number; publishedAt: string; isReply: boolean; }

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

const dirs = fs.readdirSync(VIDEOS_ROOT).filter(d => fs.statSync(path.join(VIDEOS_ROOT, d)).isDirectory());
const remaining = dirs.filter(d => !fs.existsSync(path.join(VIDEOS_ROOT, d, 'comments.json')));
console.log(`${remaining.length} videos remaining\n`);

let synced = 0, errors = 0;
for (const videoId of remaining) {
  try {
    process.stdout.write(`[${synced+errors+1}/${remaining.length}] ${videoId}...`);
    const comments = await fetchVideoComments(videoId);
    const data = { videoId, fetchedAt: new Date().toISOString(), totalComments: comments.length, comments, categorySummary: {} };
    fs.writeFileSync(path.join(VIDEOS_ROOT, videoId, 'comments.json'), JSON.stringify(data, null, 2), 'utf-8');
    console.log(` ✅ ${comments.length} comments`);
    synced++;
    await new Promise(r => setTimeout(r, 500));
  } catch (err: any) {
    console.log(` ❌ ${err.message?.substring(0, 80)}`);
    errors++;
  }
}
console.log(`\nDone! ${synced} synced, ${errors} errors.`);
