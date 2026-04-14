import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LONGOS_DIR = path.resolve(__dirname, '../../../youtube/by-video/longos');

const oauth2Client = new google.auth.OAuth2(
  process.env.YOUTUBE_CLIENT_ID,
  process.env.YOUTUBE_CLIENT_SECRET,
  'http://localhost:3000/callback'
);
oauth2Client.setCredentials({ refresh_token: process.env.YOUTUBE_REFRESH_TOKEN });
const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
const youtubeAnalytics = google.youtubeAnalytics({ version: 'v2', auth: oauth2Client });

function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

const dirs = fs.readdirSync(LONGOS_DIR).filter(d => fs.statSync(path.join(LONGOS_DIR, d)).isDirectory());
console.log(`Syncing analytics for ${dirs.length} videos...\n`);

// Fetch publishedAt for all videos in one API call (batch of 50)
const videoIds = dirs.join(',');
const videoRes = await youtube.videos.list({ part: ['snippet'], id: [videoIds] });
const publishedMap = new Map<string, string>();
for (const item of videoRes.data.items || []) {
  if (item.id && item.snippet?.publishedAt) {
    publishedMap.set(item.id, item.snippet.publishedAt.slice(0, 10));
  }
}
console.log(`Got publishedAt for ${publishedMap.size} videos\n`);

let synced = 0, errors = 0;
for (const videoId of dirs) {
  const startDate = publishedMap.get(videoId);
  if (!startDate) { console.log(`[${synced+errors+1}/${dirs.length}] ${videoId} - not found on YouTube, skip`); errors++; continue; }

  try {
    console.log(`[${synced+errors+1}/${dirs.length}] ${videoId} (from ${startDate})...`);

    const res = await youtubeAnalytics.reports.query({
      ids: 'channel==MINE',
      startDate,
      endDate: getToday(),
      metrics: 'views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,likes,comments,shares,subscribersGained',
      filters: `video==${videoId}`,
    });

    const row = res.data.rows?.[0] ?? [0, 0, 0, 0, 0, 0, 0, 0];
    const data = {
      videoId,
      fetchedAt: new Date().toISOString(),
      period: { start: startDate, end: getToday() },
      metrics: {
        views: row[0], estimatedMinutesWatched: row[1], averageViewDuration: row[2],
        averageViewPercentage: row[3], likes: row[4], comments: row[5],
        shares: row[6], subscribersGained: row[7],
      },
    };

    fs.writeFileSync(path.join(LONGOS_DIR, videoId, 'analytics.json'), JSON.stringify(data, null, 2), 'utf-8');
    console.log(`  ✅ views:${row[0]} watchTime:${Math.round(row[1] as number)}min retention:${(row[3] as number).toFixed(1)}%`);
    synced++;
    await new Promise(r => setTimeout(r, 200));
  } catch (err: any) {
    console.error(`  ❌ ${err.message}`);
    errors++;
  }
}
console.log(`\nDone! ${synced} synced, ${errors} errors.`);
