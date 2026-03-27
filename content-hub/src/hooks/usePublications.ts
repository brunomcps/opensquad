import { useState, useEffect, useCallback } from 'react';
import { useContentStore } from '../store/useContentStore';
import type { YouTubeVideo } from '../types/content';

export function useYouTubeVideos() {
  const { youtubeVideos, loading, error, setYouTubeVideos, setChannelStats, setTikTokVideos, setInstagramPosts, setFacebookPosts, setThreadsPosts, setLinkedinPosts, setTwitterPosts, setLoading, setError } =
    useContentStore();

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [videosRes, statsRes, tiktokRes, igRes, fbRes, threadsRes, linkedinRes, twitterRes] = await Promise.all([
        fetch('/api/youtube/videos'),
        fetch('/api/youtube/channel-stats'),
        fetch('/api/tiktok/videos'),
        fetch('/api/instagram/posts'),
        fetch('/api/facebook/posts'),
        fetch('/api/threads/posts'),
        fetch('/api/linkedin/posts'),
        fetch('/api/twitter/posts'),
      ]);

      const videosData = await videosRes.json();
      const statsData = await statsRes.json();
      const tiktokData = await tiktokRes.json();
      const igData = await igRes.json();
      const fbData = await fbRes.json();
      const threadsData = await threadsRes.json();
      const linkedinData = await linkedinRes.json();
      const twitterData = await twitterRes.json();

      if (!videosRes.ok) throw new Error(videosData.error || 'Failed to fetch videos');

      const videos: YouTubeVideo[] = videosData.videos.map((v: any) => ({
        id: v.id,
        title: v.title,
        description: v.description,
        thumbnail: v.thumbnail,
        thumbnailHigh: v.thumbnailHigh,
        publishedAt: v.publishedAt,
        scheduledAt: v.scheduledAt,
        privacyStatus: v.privacyStatus,
        viewCount: v.viewCount,
        likeCount: v.likeCount,
        commentCount: v.commentCount,
        durationSeconds: v.durationSeconds,
        isShort: v.isShort,
        tags: v.tags,
        categoryId: v.categoryId,
        defaultLanguage: v.defaultLanguage,
      }));

      setYouTubeVideos(videos);

      if (statsRes.ok && statsData.stats) {
        setChannelStats(statsData.stats);
      }

      if (tiktokRes.ok && tiktokData.videos) {
        setTikTokVideos(tiktokData.videos, tiktokData.syncedAt || '');
      }

      if (igRes.ok && igData.posts) {
        setInstagramPosts(igData.posts, igData.syncedAt || '');
      }

      if (fbRes.ok && fbData.posts) {
        setFacebookPosts(fbData.posts, fbData.syncedAt || '');
      }

      if (threadsRes.ok && threadsData.posts) {
        setThreadsPosts(threadsData.posts, threadsData.syncedAt || '');
      }

      if (linkedinRes.ok && linkedinData.posts) {
        setLinkedinPosts(linkedinData.posts, linkedinData.syncedAt || '');
      }

      if (twitterRes.ok && twitterData.posts) {
        setTwitterPosts(twitterData.posts, twitterData.syncedAt || '');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [setYouTubeVideos, setChannelStats, setTikTokVideos, setInstagramPosts, setFacebookPosts, setThreadsPosts, setLinkedinPosts, setTwitterPosts, setLoading, setError]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { youtubeVideos, loading, error, refresh };
}

export function useTikTokSync() {
  const { setTikTokVideos, setTikTokSyncing } = useContentStore();
  const syncing = useContentStore((s) => s.tiktokSyncing);
  const [syncError, setSyncError] = useState<string | null>(null);

  const syncTikTok = useCallback(async () => {
    setTikTokSyncing(true);
    setSyncError(null);
    try {
      const res = await fetch('/api/tiktok/sync', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sync failed');
      setTikTokVideos(data.videos, data.syncedAt);
    } catch (err: any) {
      console.error('TikTok sync error:', err.message);
      setSyncError(err.message);
    } finally {
      setTikTokSyncing(false);
    }
  }, [setTikTokVideos, setTikTokSyncing]);

  return { syncTikTok, syncing, syncError };
}

export function useInstagramSync() {
  const { setInstagramPosts, setInstagramSyncing } = useContentStore();
  const syncing = useContentStore((s) => s.instagramSyncing);

  const syncInstagram = useCallback(async () => {
    setInstagramSyncing(true);
    try {
      const res = await fetch('/api/instagram/sync', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sync failed');
      setInstagramPosts(data.posts, data.syncedAt);
    } catch (err: any) {
      console.error('Instagram sync error:', err.message);
    } finally {
      setInstagramSyncing(false);
    }
  }, [setInstagramPosts, setInstagramSyncing]);

  return { syncInstagram, syncing };
}

export function useFacebookSync() {
  const { setFacebookPosts, setFacebookSyncing } = useContentStore();
  const syncing = useContentStore((s) => s.facebookSyncing);

  const syncFacebook = useCallback(async () => {
    setFacebookSyncing(true);
    try {
      const res = await fetch('/api/facebook/sync', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sync failed');
      setFacebookPosts(data.posts, data.syncedAt);
    } catch (err: any) {
      console.error('Facebook sync error:', err.message);
    } finally {
      setFacebookSyncing(false);
    }
  }, [setFacebookPosts, setFacebookSyncing]);

  return { syncFacebook, syncing };
}

export function useThreadsSync() {
  const { setThreadsPosts, setThreadsSyncing } = useContentStore();
  const syncing = useContentStore((s) => s.threadsSyncing);

  const syncThreads = useCallback(async () => {
    setThreadsSyncing(true);
    try {
      const res = await fetch('/api/threads/sync', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sync failed');
      setThreadsPosts(data.posts, data.syncedAt);
    } catch (err: any) {
      console.error('Threads sync error:', err.message);
    } finally {
      setThreadsSyncing(false);
    }
  }, [setThreadsPosts, setThreadsSyncing]);

  return { syncThreads, syncing };
}

export function useLinkedinSync() {
  const { setLinkedinPosts, setLinkedinSyncing } = useContentStore();
  const syncing = useContentStore((s) => s.linkedinSyncing);

  const syncLinkedin = useCallback(async () => {
    setLinkedinSyncing(true);
    try {
      const res = await fetch('/api/linkedin/sync', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sync failed');
      setLinkedinPosts(data.posts, data.syncedAt);
    } catch (err: any) {
      console.error('LinkedIn sync error:', err.message);
    } finally {
      setLinkedinSyncing(false);
    }
  }, [setLinkedinPosts, setLinkedinSyncing]);

  return { syncLinkedin, syncing };
}

export function useTwitterSync() {
  const { setTwitterPosts, setTwitterSyncing } = useContentStore();
  const syncing = useContentStore((s) => s.twitterSyncing);

  const syncTwitter = useCallback(async () => {
    setTwitterSyncing(true);
    try {
      const res = await fetch('/api/twitter/sync', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sync failed');
      setTwitterPosts(data.posts, data.syncedAt);
    } catch (err: any) {
      console.error('Twitter sync error:', err.message);
    } finally {
      setTwitterSyncing(false);
    }
  }, [setTwitterPosts, setTwitterSyncing]);

  return { syncTwitter, syncing };
}
