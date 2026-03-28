import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { PlatformColumn } from './PlatformColumn';
import { ContentCard } from './ContentCard';
import { YouTubeIcon, ShortsIcon, TikTokIcon, InstagramIcon, FacebookIcon, ThreadsIcon, LinkedInIcon, XIcon } from './icons/PlatformIcons';
import { useContentStore } from '../store/useContentStore';
import { useTikTokSync, useInstagramSync, useFacebookSync, useThreadsSync, useLinkedinSync, useTwitterSync } from '../hooks/usePublications';
import type { SortField, SortOrder, StatusFilter, Platform } from '../store/useContentStore';
import type { YouTubeVideo } from '../types/content';

const container: CSSProperties = {
  display: 'flex',
  gap: '16px',
  padding: '20px',
  flex: 1,
  overflowX: 'auto',
  overflowY: 'hidden',
  alignItems: 'flex-start',
};

const loadingStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flex: 1,
  height: '100%',
  color: 'var(--text-secondary)',
  fontSize: '14px',
};

const errorStyle: CSSProperties = {
  ...loadingStyle,
  color: 'var(--accent-red)',
};

function getVideoStatus(v: YouTubeVideo): string {
  if (v.scheduledAt && new Date(v.scheduledAt).getTime() > Date.now()) return 'scheduled';
  return v.privacyStatus || 'public';
}

function filterVideos(
  videos: YouTubeVideo[],
  statusFilter: StatusFilter,
  searchQuery: string,
): YouTubeVideo[] {
  let filtered = videos;

  if (statusFilter !== 'all') {
    filtered = filtered.filter((v) => {
      const status = getVideoStatus(v);
      if (statusFilter === 'published') return status === 'public';
      if (statusFilter === 'scheduled') return status === 'scheduled';
      if (statusFilter === 'private') return status === 'private';
      return true;
    });
  }

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter((v) => v.title.toLowerCase().includes(q));
  }

  return filtered;
}

function sortVideos(
  videos: YouTubeVideo[],
  field: SortField,
  order: SortOrder,
): YouTubeVideo[] {
  const sorted = [...videos].sort((a, b) => {
    let diff = 0;
    switch (field) {
      case 'date':
        diff =
          new Date(a.scheduledAt || a.publishedAt).getTime() -
          new Date(b.scheduledAt || b.publishedAt).getTime();
        break;
      case 'views':
        diff = (a.viewCount || 0) - (b.viewCount || 0);
        break;
      case 'likes':
        diff = (a.likeCount || 0) - (b.likeCount || 0);
        break;
      case 'duration':
        diff = a.durationSeconds - b.durationSeconds;
        break;
    }
    return order === 'desc' ? -diff : diff;
  });
  return sorted;
}

function formatDuration(seconds: number): string {
  if (seconds >= 3600) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function Timeline() {
  const youtubeVideos = useContentStore((s) => s.youtubeVideos);
  const tiktokVideos = useContentStore((s) => s.tiktokVideos);
  const tiktokSyncedAt = useContentStore((s) => s.tiktokSyncedAt);
  const loading = useContentStore((s) => s.loading);
  const error = useContentStore((s) => s.error);
  const sortField = useContentStore((s) => s.sortField);
  const sortOrder = useContentStore((s) => s.sortOrder);
  const statusFilter = useContentStore((s) => s.statusFilter);
  const platformFilters = useContentStore((s) => s.platformFilters);
  const collapsedPlatforms = useContentStore((s) => s.collapsedPlatforms);
  const toggleCollapsed = useContentStore((s) => s.toggleCollapsed);
  const searchQuery = useContentStore((s) => s.searchQuery);
  const setSelectedVideoId = useContentStore((s) => s.setSelectedVideoId);
  const setSelectedTikTokId = useContentStore((s) => s.setSelectedTikTokId);
  const { syncTikTok, syncing: tiktokSyncing } = useTikTokSync();
  const instagramPosts = useContentStore((s) => s.instagramPosts);
  const instagramSyncedAt = useContentStore((s) => s.instagramSyncedAt);
  const { syncInstagram, syncing: igSyncing } = useInstagramSync();
  const setSelectedInstagramId = useContentStore((s) => s.setSelectedInstagramId);
  const facebookPosts = useContentStore((s) => s.facebookPosts);
  const facebookSyncedAt = useContentStore((s) => s.facebookSyncedAt);
  const { syncFacebook, syncing: fbSyncing } = useFacebookSync();
  const setSelectedFacebookId = useContentStore((s) => s.setSelectedFacebookId);
  const threadsPosts = useContentStore((s) => s.threadsPosts);
  const threadsSyncedAt = useContentStore((s) => s.threadsSyncedAt);
  const { syncThreads, syncing: threadsSyncing } = useThreadsSync();
  const setSelectedThreadsId = useContentStore((s) => s.setSelectedThreadsId);
  const linkedinPosts = useContentStore((s) => s.linkedinPosts);
  const linkedinSyncedAt = useContentStore((s) => s.linkedinSyncedAt);
  const { syncLinkedin, syncing: linkedinSyncing } = useLinkedinSync();
  const setSelectedLinkedinId = useContentStore((s) => s.setSelectedLinkedinId);
  const twitterPosts = useContentStore((s) => s.twitterPosts);
  const twitterSyncedAt = useContentStore((s) => s.twitterSyncedAt);
  const { syncTwitter, syncing: twitterSyncing } = useTwitterSync();
  const setSelectedTwitterId = useContentStore((s) => s.setSelectedTwitterId);

  const { ytLong, ytShorts } = useMemo(() => {
    const filtered = filterVideos(youtubeVideos, statusFilter, searchQuery);
    const long = sortVideos(filtered.filter((v) => !v.isShort), sortField, sortOrder);
    const shorts = sortVideos(filtered.filter((v) => v.isShort), sortField, sortOrder);
    return { ytLong: long, ytShorts: shorts };
  }, [youtubeVideos, sortField, sortOrder, statusFilter, searchQuery]);

  const filteredTikTok = useMemo(() => {
    let filtered = [...tiktokVideos];

    // Status filter — scheduledAt in the future = scheduled, otherwise published
    const now = Date.now();
    if (statusFilter === 'published') {
      filtered = filtered.filter((v) => !v.scheduledAt || new Date(v.scheduledAt).getTime() <= now);
    } else if (statusFilter === 'scheduled') {
      filtered = filtered.filter((v) => v.scheduledAt && new Date(v.scheduledAt).getTime() > now);
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((v) => v.title.toLowerCase().includes(q));
    }

    // Sort
    filtered.sort((a, b) => {
      let diff = 0;
      switch (sortField) {
        case 'date':
          diff = new Date(a.scheduledAt || a.createTime).getTime() - new Date(b.scheduledAt || b.createTime).getTime();
          break;
        case 'views':
          diff = a.viewCount - b.viewCount;
          break;
        case 'likes':
          diff = a.likeCount - b.likeCount;
          break;
        case 'duration':
          diff = a.duration - b.duration;
          break;
      }
      return sortOrder === 'desc' ? -diff : diff;
    });

    return filtered;
  }, [tiktokVideos, sortField, sortOrder, statusFilter, searchQuery]);

  const showAll = platformFilters.length === 0;
  const showYT = showAll || platformFilters.includes('youtube');
  const showTT = showAll || platformFilters.includes('tiktok');
  const showIG = showAll || platformFilters.includes('instagram');
  const showFB = showAll || platformFilters.includes('facebook');
  const showTH = showAll || platformFilters.includes('threads');
  const showLI = showAll || platformFilters.includes('linkedin');
  const showTW = showAll || platformFilters.includes('twitter');

  const filteredIG = useMemo(() => {
    let filtered = [...instagramPosts];
    if (statusFilter === 'scheduled') return [];
    if (statusFilter === 'private') return [];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((p) => p.caption.toLowerCase().includes(q));
    }
    filtered.sort((a, b) => {
      let diff = 0;
      switch (sortField) {
        case 'date': diff = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(); break;
        case 'views': diff = a.likeCount - b.likeCount; break; // IG doesn't have views, use likes
        case 'likes': diff = a.likeCount - b.likeCount; break;
        default: diff = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      }
      return sortOrder === 'desc' ? -diff : diff;
    });
    return filtered;
  }, [instagramPosts, sortField, sortOrder, statusFilter, searchQuery]);

  const filteredFB = useMemo(() => {
    let filtered = [...facebookPosts];
    if (statusFilter === 'scheduled') return [];
    if (statusFilter === 'private') return [];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((p) => p.message.toLowerCase().includes(q));
    }
    filtered.sort((a, b) => {
      let diff = 0;
      switch (sortField) {
        case 'date': diff = new Date(a.createdTime).getTime() - new Date(b.createdTime).getTime(); break;
        case 'views': diff = a.likeCount - b.likeCount; break;
        case 'likes': diff = a.likeCount - b.likeCount; break;
        default: diff = new Date(a.createdTime).getTime() - new Date(b.createdTime).getTime();
      }
      return sortOrder === 'desc' ? -diff : diff;
    });
    return filtered;
  }, [facebookPosts, sortField, sortOrder, statusFilter, searchQuery]);

  const filteredThreads = useMemo(() => {
    let filtered = [...threadsPosts];
    if (statusFilter === 'scheduled') return [];
    if (statusFilter === 'private') return [];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((p) => p.text.toLowerCase().includes(q));
    }
    filtered.sort((a, b) => {
      let diff = 0;
      switch (sortField) {
        case 'date': diff = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(); break;
        case 'views': diff = a.likeCount - b.likeCount; break;
        case 'likes': diff = a.likeCount - b.likeCount; break;
        default: diff = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      }
      return sortOrder === 'desc' ? -diff : diff;
    });
    return filtered;
  }, [threadsPosts, sortField, sortOrder, statusFilter, searchQuery]);

  const filteredLinkedin = useMemo(() => {
    let filtered = [...linkedinPosts];
    if (statusFilter === 'scheduled') return [];
    if (statusFilter === 'private') return [];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((p) => p.text.toLowerCase().includes(q));
    }
    filtered.sort((a, b) => {
      let diff = 0;
      switch (sortField) {
        case 'date': diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(); break;
        case 'views': diff = a.likeCount - b.likeCount; break;
        case 'likes': diff = a.likeCount - b.likeCount; break;
        default: diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return sortOrder === 'desc' ? -diff : diff;
    });
    return filtered;
  }, [linkedinPosts, sortField, sortOrder, statusFilter, searchQuery]);

  const filteredTwitter = useMemo(() => {
    let filtered = [...twitterPosts];
    if (statusFilter === 'scheduled') return [];
    if (statusFilter === 'private') return [];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((p) => p.text.toLowerCase().includes(q));
    }
    filtered.sort((a, b) => {
      let diff = 0;
      switch (sortField) {
        case 'date': diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(); break;
        case 'views': diff = a.viewCount - b.viewCount; break;
        case 'likes': diff = a.likeCount - b.likeCount; break;
        default: diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return sortOrder === 'desc' ? -diff : diff;
    });
    return filtered;
  }, [twitterPosts, sortField, sortOrder, statusFilter, searchQuery]);

  if (loading && youtubeVideos.length === 0) {
    return <div style={loadingStyle}>Carregando dados do YouTube...</div>;
  }

  if (error && youtubeVideos.length === 0) {
    return <div style={errorStyle}>Erro: {error}</div>;
  }

  return (
    <div style={container}>
      {showYT && (
        <PlatformColumn
          name="YouTube"
          icon={<YouTubeIcon size={20} />}
          accentColor="#ff0000"
          count={ytLong.length}
          collapsed={collapsedPlatforms.includes('youtube')}
          onToggleCollapse={() => toggleCollapsed('youtube')}
        >
          {ytLong.map((video) => (
            <ContentCard
              key={video.id}
              title={video.title}
              thumbnail={video.thumbnail}
              status={getVideoStatus(video)}
              date={video.scheduledAt || video.publishedAt}
              views={video.viewCount}
              likes={video.likeCount}
              duration={formatDuration(video.durationSeconds)}
              onClick={() => setSelectedVideoId(video.id)}
            />
          ))}
        </PlatformColumn>
      )}

      {showYT && (
        <PlatformColumn
          name="YT Shorts"
          icon={<ShortsIcon size={20} />}
          accentColor="#ff4444"
          count={ytShorts.length}
          collapsed={collapsedPlatforms.includes('youtube')}
          onToggleCollapse={() => toggleCollapsed('youtube')}
        >
          {ytShorts.map((video) => (
            <ContentCard
              key={video.id}
              title={video.title}
              thumbnail={video.thumbnail}
              status={getVideoStatus(video)}
              date={video.scheduledAt || video.publishedAt}
              views={video.viewCount}
              likes={video.likeCount}
              duration={formatDuration(video.durationSeconds)}
              onClick={() => setSelectedVideoId(video.id)}
            />
          ))}
        </PlatformColumn>
      )}

      {showTT && (
        <PlatformColumn
          name="TikTok"
          icon={<TikTokIcon size={20} />}
          accentColor="#00f2ea"
          count={filteredTikTok.length}
          collapsed={collapsedPlatforms.includes('tiktok')}
          onToggleCollapse={() => toggleCollapsed('tiktok')}
          syncButton={{
            label: tiktokSyncing ? 'Sincronizando...' : 'Sincronizar',
            onClick: syncTikTok,
            loading: tiktokSyncing,
            lastSync: tiktokSyncedAt || undefined,
          }}
        >
          {filteredTikTok.map((video) => {
            const isScheduled = !!(video.scheduledAt && new Date(video.scheduledAt).getTime() > Date.now());
            return (
              <ContentCard
                key={video.id}
                title={video.title}
                thumbnail={video.thumbnail}
                status={isScheduled ? 'scheduled' : 'published'}
                date={isScheduled ? video.scheduledAt! : video.createTime}
                views={video.viewCount}
                likes={video.likeCount}
                duration={video.duration ? formatDuration(video.duration) : undefined}
                onClick={() => setSelectedTikTokId(video.id)}
              />
            );
          })}
        </PlatformColumn>
      )}

      {showIG && (
        <PlatformColumn
          name="Instagram"
          icon={<InstagramIcon size={20} />}
          accentColor="#e1306c"
          count={filteredIG.length}
          collapsed={collapsedPlatforms.includes('instagram')}
          onToggleCollapse={() => toggleCollapsed('instagram')}
          syncButton={{
            label: igSyncing ? 'Sincronizando...' : 'Sincronizar',
            onClick: syncInstagram,
            loading: igSyncing,
            lastSync: instagramSyncedAt || undefined,
          }}
        >
          {filteredIG.map((post) => (
            <ContentCard
              key={post.id}
              title={post.caption.replace(/#\w+/g, '').trim().slice(0, 80) || 'Sem legenda'}
              thumbnail={post.thumbnailUrl}
              status="published"
              date={post.timestamp}
              likes={post.likeCount}
              onClick={() => setSelectedInstagramId(post.id)}
            />
          ))}
        </PlatformColumn>
      )}

      {showFB && (
        <PlatformColumn
          name="Facebook"
          icon={<FacebookIcon size={20} />}
          accentColor="#1877F2"
          count={filteredFB.length}
          collapsed={collapsedPlatforms.includes('facebook')}
          onToggleCollapse={() => toggleCollapsed('facebook')}
          syncButton={{
            label: fbSyncing ? 'Sincronizando...' : 'Sincronizar',
            onClick: syncFacebook,
            loading: fbSyncing,
            lastSync: facebookSyncedAt || undefined,
          }}
        >
          {filteredFB.map((post) => (
            <ContentCard
              key={post.id}
              title={post.message.replace(/#\w+/g, '').trim().slice(0, 80) || 'Sem texto'}
              thumbnail={post.fullPicture}
              status="published"
              date={post.createdTime}
              likes={post.likeCount}
              onClick={() => setSelectedFacebookId(post.id)}
            />
          ))}
        </PlatformColumn>
      )}

      {showTH && (
        <PlatformColumn
          name="Threads"
          icon={<ThreadsIcon size={20} />}
          accentColor="#000000"
          count={filteredThreads.length}
          collapsed={collapsedPlatforms.includes('threads')}
          onToggleCollapse={() => toggleCollapsed('threads')}
          syncButton={{
            label: threadsSyncing ? 'Sincronizando...' : 'Sincronizar',
            onClick: syncThreads,
            loading: threadsSyncing,
            lastSync: threadsSyncedAt || undefined,
          }}
        >
          {filteredThreads.map((post) => (
            <ContentCard
              key={post.id}
              title={post.text.replace(/#\w+/g, '').trim().slice(0, 80) || 'Sem texto'}
              thumbnail={post.mediaUrl}
              status="published"
              date={post.timestamp}
              likes={post.likeCount}
              onClick={() => setSelectedThreadsId(post.id)}
            />
          ))}
        </PlatformColumn>
      )}

      {showLI && (
        <PlatformColumn
          name="LinkedIn"
          icon={<LinkedInIcon size={20} />}
          accentColor="#0A66C2"
          count={filteredLinkedin.length}
          collapsed={collapsedPlatforms.includes('linkedin')}
          onToggleCollapse={() => toggleCollapsed('linkedin')}
          syncButton={{
            label: linkedinSyncing ? 'Sincronizando...' : 'Sincronizar',
            onClick: syncLinkedin,
            loading: linkedinSyncing,
            lastSync: linkedinSyncedAt || undefined,
          }}
        >
          {filteredLinkedin.map((post) => (
            <ContentCard
              key={post.id}
              title={post.text.replace(/#\w+/g, '').trim().slice(0, 80) || 'Sem texto'}
              thumbnail={post.mediaUrl}
              status="published"
              date={post.createdAt}
              likes={post.likeCount}
              onClick={() => setSelectedLinkedinId(post.id)}
            />
          ))}
        </PlatformColumn>
      )}

      {showTW && (
        <PlatformColumn
          name="X"
          icon={<XIcon size={20} />}
          accentColor="#1DA1F2"
          count={filteredTwitter.length}
          collapsed={collapsedPlatforms.includes('twitter')}
          onToggleCollapse={() => toggleCollapsed('twitter')}
          syncButton={{
            label: twitterSyncing ? 'Sincronizando...' : 'Sincronizar',
            onClick: syncTwitter,
            loading: twitterSyncing,
            lastSync: twitterSyncedAt || undefined,
          }}
        >
          {filteredTwitter.map((post) => (
            <ContentCard
              key={post.id}
              title={post.text.replace(/#\w+/g, '').trim().slice(0, 80) || 'Sem texto'}
              thumbnail={post.mediaUrl}
              status="published"
              date={post.createdAt}
              views={post.viewCount}
              likes={post.likeCount}
              onClick={() => setSelectedTwitterId(post.id)}
            />
          ))}
        </PlatformColumn>
      )}
    </div>
  );
}
