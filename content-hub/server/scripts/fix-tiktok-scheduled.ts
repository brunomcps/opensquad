import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.resolve(__dirname, '../../data/tiktok-videos.json');

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

async function main() {
  const d = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
  const now = new Date();
  let updated = 0;

  for (const v of d.videos) {
    if (v.scheduledAt && new Date(v.scheduledAt) < now) {
      console.log(`  ${v.title?.substring(0, 50)} | scheduled: ${v.scheduledAt}`);
      delete v.scheduledAt;
      updated++;
    }
  }

  console.log(`\n${updated} videos: scheduled -> published`);

  // Update Supabase
  const { error: delErr } = await supabase.from('social_posts').delete().eq('platform', 'tiktok');
  console.log('Delete old:', delErr?.message || 'OK');

  const rows = d.videos.map((v: any) => ({
    id: v.id,
    platform: 'tiktok',
    text_content: v.title,
    published_at: v.createTime,
    scheduled_at: v.scheduledAt || null,
    like_count: v.likeCount || 0,
    comment_count: v.commentCount || 0,
    share_count: v.shareCount || 0,
    view_count: v.viewCount || 0,
    duration: v.duration,
    extra: { thumbnail: v.thumbnail, url: v.url },
    synced_at: new Date().toISOString(),
  }));

  const { error: insErr } = await supabase.from('social_posts').insert(rows);
  console.log('Insert:', insErr?.message || `OK (${rows.length} rows)`);

  await supabase.from('sync_metadata').upsert({
    platform: 'tiktok', synced_at: new Date().toISOString(), source: 'scrape', post_count: rows.length,
  });

  // Update local JSON too
  d.syncedAt = new Date().toISOString();
  fs.writeFileSync(DATA_PATH, JSON.stringify(d, null, 2), 'utf-8');
  console.log('Local JSON updated');
  console.log('Done!');
}

main().catch(e => console.error('FATAL:', e));
