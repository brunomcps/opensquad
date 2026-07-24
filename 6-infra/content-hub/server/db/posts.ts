import { supabase } from './client.js';

interface SocialPost {
  id: string;
  platform: string;
  text_content?: string;
  permalink?: string;
  media_url?: string;
  media_type?: string;
  published_at?: string;
  scheduled_at?: string;
  like_count?: number;
  comment_count?: number;
  share_count?: number;
  view_count?: number;
  reply_count?: number;
  retweet_count?: number;
  duration?: number;
  extra?: Record<string, any>;
  synced_at: string;
}

// -- Instagram --
export async function getInstagramPosts() {
  const { data: posts } = await supabase
    .from('social_posts')
    .select('*')
    .eq('platform', 'instagram')
    .order('published_at', { ascending: false });

  const { data: meta } = await supabase
    .from('sync_metadata')
    .select('*')
    .eq('platform', 'instagram')
    .single();

  return {
    posts: (posts || []).map(p => ({
      id: p.id,
      caption: p.text_content || '',
      mediaType: p.media_type || '',
      thumbnailUrl: p.extra?.thumbnailUrl || '',
      mediaUrl: p.media_url || '',
      permalink: p.permalink || '',
      timestamp: p.published_at || '',
      likeCount: p.like_count || 0,
      commentsCount: p.comment_count || 0,
    })),
    syncedAt: meta?.synced_at || '',
  };
}

export async function saveInstagramPosts(posts: any[], syncedAt: string) {
  const rows: SocialPost[] = posts.map(p => ({
    id: p.id,
    platform: 'instagram',
    text_content: p.caption,
    permalink: p.permalink,
    media_url: p.mediaUrl,
    media_type: p.mediaType,
    published_at: p.timestamp,
    like_count: p.likeCount || 0,
    comment_count: p.commentsCount || 0,
    extra: { thumbnailUrl: p.thumbnailUrl },
    synced_at: syncedAt,
  }));

  await supabase.from('social_posts').delete().eq('platform', 'instagram');
  if (rows.length > 0) await supabase.from('social_posts').insert(rows);
  await supabase.from('sync_metadata').upsert({ platform: 'instagram', synced_at: syncedAt, source: 'api', post_count: rows.length });
}

// -- Facebook --
export async function getFacebookPosts() {
  const { data: posts } = await supabase
    .from('social_posts')
    .select('*')
    .eq('platform', 'facebook')
    .order('published_at', { ascending: false });

  const { data: meta } = await supabase
    .from('sync_metadata')
    .select('*')
    .eq('platform', 'facebook')
    .single();

  return {
    posts: (posts || []).map(p => ({
      id: p.id,
      message: p.text_content || '',
      fullPicture: p.media_url || '',
      permalink: p.permalink || '',
      createdTime: p.published_at || '',
      type: p.media_type || 'status',
      likeCount: p.like_count || 0,
      commentCount: p.comment_count || 0,
      shareCount: p.share_count || 0,
    })),
    syncedAt: meta?.synced_at || '',
  };
}

export async function saveFacebookPosts(posts: any[], syncedAt: string) {
  const rows: SocialPost[] = posts.map(p => ({
    id: p.id,
    platform: 'facebook',
    text_content: p.message,
    permalink: p.permalink,
    media_url: p.fullPicture,
    media_type: p.type,
    published_at: p.createdTime,
    like_count: p.likeCount || 0,
    comment_count: p.commentCount || 0,
    share_count: p.shareCount || 0,
    synced_at: syncedAt,
  }));

  await supabase.from('social_posts').delete().eq('platform', 'facebook');
  if (rows.length > 0) await supabase.from('social_posts').insert(rows);
  await supabase.from('sync_metadata').upsert({ platform: 'facebook', synced_at: syncedAt, source: 'api', post_count: rows.length });
}

// -- Threads --
export async function getThreadsPosts() {
  const { data: posts } = await supabase
    .from('social_posts')
    .select('*')
    .eq('platform', 'threads')
    .order('published_at', { ascending: false });

  const { data: meta } = await supabase
    .from('sync_metadata')
    .select('*')
    .eq('platform', 'threads')
    .single();

  return {
    posts: (posts || []).map(p => ({
      id: p.id,
      text: p.text_content || '',
      mediaType: p.media_type || '',
      mediaUrl: p.media_url || '',
      permalink: p.permalink || '',
      timestamp: p.published_at || '',
      likeCount: p.like_count || 0,
      replyCount: p.reply_count || 0,
    })),
    syncedAt: meta?.synced_at || '',
  };
}

export async function saveThreadsPosts(posts: any[], syncedAt: string) {
  const rows: SocialPost[] = posts.map(p => ({
    id: p.id,
    platform: 'threads',
    text_content: p.text,
    permalink: p.permalink,
    media_url: p.mediaUrl,
    media_type: p.mediaType,
    published_at: p.timestamp,
    like_count: p.likeCount || 0,
    reply_count: p.replyCount || 0,
    synced_at: syncedAt,
  }));

  await supabase.from('social_posts').delete().eq('platform', 'threads');
  if (rows.length > 0) await supabase.from('social_posts').insert(rows);
  await supabase.from('sync_metadata').upsert({ platform: 'threads', synced_at: syncedAt, source: 'api', post_count: rows.length });
}

// -- Twitter --
export async function getTwitterPosts() {
  const { data: posts } = await supabase
    .from('social_posts')
    .select('*')
    .eq('platform', 'twitter')
    .order('published_at', { ascending: false });

  const { data: meta } = await supabase
    .from('sync_metadata')
    .select('*')
    .eq('platform', 'twitter')
    .single();

  return {
    posts: (posts || []).map(p => ({
      id: p.id,
      text: p.text_content || '',
      permalink: p.permalink || '',
      createdAt: p.published_at || '',
      likeCount: p.like_count || 0,
      retweetCount: p.retweet_count || 0,
      replyCount: p.reply_count || 0,
      viewCount: p.view_count || 0,
      mediaUrl: p.media_url,
    })),
    syncedAt: meta?.synced_at || '',
    source: 'cache' as const,
  };
}

export async function saveTwitterPosts(posts: any[], syncedAt: string) {
  const rows: SocialPost[] = posts.map(p => ({
    id: p.id,
    platform: 'twitter',
    text_content: p.text,
    permalink: p.permalink,
    media_url: p.mediaUrl,
    published_at: p.createdAt,
    like_count: p.likeCount || 0,
    retweet_count: p.retweetCount || 0,
    reply_count: p.replyCount || 0,
    view_count: p.viewCount || 0,
    synced_at: syncedAt,
  }));

  await supabase.from('social_posts').delete().eq('platform', 'twitter');
  if (rows.length > 0) await supabase.from('social_posts').insert(rows);
  await supabase.from('sync_metadata').upsert({ platform: 'twitter', synced_at: syncedAt, source: 'scrape', post_count: rows.length });
}

// -- LinkedIn --
export async function getLinkedInPosts() {
  const { data: posts } = await supabase
    .from('social_posts')
    .select('*')
    .eq('platform', 'linkedin')
    .order('published_at', { ascending: false });

  const { data: meta } = await supabase
    .from('sync_metadata')
    .select('*')
    .eq('platform', 'linkedin')
    .single();

  return {
    posts: (posts || []).map(p => ({
      id: p.id,
      text: p.text_content || '',
      permalink: p.permalink || '',
      createdAt: p.published_at || '',
      likeCount: p.like_count || 0,
      commentCount: p.comment_count || 0,
      shareCount: p.share_count || 0,
      mediaUrl: p.media_url,
    })),
    syncedAt: meta?.synced_at || '',
    source: 'cache' as const,
  };
}

export async function saveLinkedInPosts(posts: any[], syncedAt: string) {
  const rows: SocialPost[] = posts.map(p => ({
    id: p.id,
    platform: 'linkedin',
    text_content: p.text,
    permalink: p.permalink,
    media_url: p.mediaUrl,
    published_at: p.createdAt && /^\d{4}-\d{2}/.test(p.createdAt) ? p.createdAt : null,
    like_count: p.likeCount || 0,
    comment_count: p.commentCount || 0,
    share_count: p.shareCount || 0,
    synced_at: syncedAt,
  }));

  await supabase.from('social_posts').delete().eq('platform', 'linkedin');
  if (rows.length > 0) await supabase.from('social_posts').insert(rows);
  await supabase.from('sync_metadata').upsert({ platform: 'linkedin', synced_at: syncedAt, source: 'scrape', post_count: rows.length });
}

// -- TikTok --
export async function getTikTokVideos() {
  const { data: posts } = await supabase
    .from('social_posts')
    .select('*')
    .eq('platform', 'tiktok')
    .order('published_at', { ascending: false });

  const { data: meta } = await supabase
    .from('sync_metadata')
    .select('*')
    .eq('platform', 'tiktok')
    .single();

  return {
    videos: (posts || []).map(p => ({
      id: p.id,
      title: p.text_content || '',
      thumbnail: p.extra?.thumbnail || '',
      url: p.extra?.url || '',
      createTime: p.published_at || '',
      duration: p.duration || 0,
      viewCount: p.view_count || 0,
      likeCount: p.like_count || 0,
      commentCount: p.comment_count || 0,
      shareCount: p.share_count || 0,
      scheduledAt: p.scheduled_at && new Date(p.scheduled_at).getTime() > Date.now() ? p.scheduled_at : undefined,
    })),
    syncedAt: meta?.synced_at || '',
    source: 'cache' as const,
  };
}

export async function saveTikTokVideos(videos: any[], syncedAt: string) {
  const rows: SocialPost[] = videos.map(v => ({
    id: v.id,
    platform: 'tiktok',
    text_content: v.title,
    published_at: v.createTime,
    scheduled_at: v.scheduledAt,
    like_count: v.likeCount || 0,
    comment_count: v.commentCount || 0,
    share_count: v.shareCount || 0,
    view_count: v.viewCount || 0,
    duration: v.duration,
    extra: { thumbnail: v.thumbnail, url: v.url },
    synced_at: syncedAt,
  }));

  await supabase.from('social_posts').delete().eq('platform', 'tiktok');
  if (rows.length > 0) await supabase.from('social_posts').insert(rows);
  await supabase.from('sync_metadata').upsert({ platform: 'tiktok', synced_at: syncedAt, source: 'scrape', post_count: rows.length });
}
