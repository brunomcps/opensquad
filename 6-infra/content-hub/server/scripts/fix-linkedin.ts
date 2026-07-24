import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

async function main() {
  const d = JSON.parse(fs.readFileSync('data/linkedin-posts.json', 'utf-8'));
  console.log('Posts to insert:', d.posts.length);

  const { error: delErr } = await supabase.from('social_posts').delete().eq('platform', 'linkedin');
  console.log('Delete:', delErr?.message || 'OK');

  const rows = d.posts.map((p: any) => ({
    id: p.id,
    platform: 'linkedin',
    text_content: p.text,
    permalink: p.permalink,
    media_url: p.mediaUrl || null,
    published_at: p.createdAt && /^\d{4}-\d{2}/.test(p.createdAt) ? p.createdAt : null,
    like_count: p.likeCount || 0,
    comment_count: p.commentCount || 0,
    share_count: p.shareCount || 0,
    synced_at: d.syncedAt,
  }));

  const { error: insErr } = await supabase.from('social_posts').insert(rows);
  console.log('Insert:', insErr?.message || `OK (${rows.length} rows)`);

  await supabase.from('sync_metadata').upsert({
    platform: 'linkedin', synced_at: d.syncedAt, source: 'scrape', post_count: rows.length,
  });
  console.log('Done!');
}

main().catch(e => console.error('FATAL:', e));
