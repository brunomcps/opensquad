import { create } from 'zustand';
import type { YouTubeVideo, TikTokVideo, InstagramPost, FacebookPost, ThreadsPost, LinkedInPost, TwitterPost } from '../types/content';

export type SortField = 'date' | 'views' | 'likes' | 'duration';
export type SortOrder = 'asc' | 'desc';
export type StatusFilter = 'all' | 'published' | 'scheduled' | 'private';
export type Platform = 'youtube' | 'tiktok' | 'instagram' | 'facebook' | 'threads' | 'linkedin' | 'twitter';
export type PlatformFilter = 'all' | Platform;

export interface ChannelStats {
  channelId: string;
  title: string;
  thumbnail: string;
  customUrl: string;
  subscriberCount: number;
  viewCount: number;
  videoCount: number;
}

interface ContentState {
  youtubeVideos: YouTubeVideo[];
  tiktokVideos: TikTokVideo[];
  tiktokSyncedAt: string | null;
  tiktokSyncing: boolean;
  instagramPosts: InstagramPost[];
  instagramSyncedAt: string | null;
  instagramSyncing: boolean;
  facebookPosts: FacebookPost[];
  facebookSyncedAt: string | null;
  facebookSyncing: boolean;
  threadsPosts: ThreadsPost[];
  threadsSyncedAt: string | null;
  threadsSyncing: boolean;
  linkedinPosts: LinkedInPost[];
  linkedinSyncedAt: string | null;
  linkedinSyncing: boolean;
  twitterPosts: TwitterPost[];
  twitterSyncedAt: string | null;
  twitterSyncing: boolean;
  channelStats: ChannelStats | null;
  loading: boolean;
  error: string | null;
  lastFetch: number | null;

  // Filters
  sortField: SortField;
  sortOrder: SortOrder;
  statusFilter: StatusFilter;
  platformFilters: Platform[];
  searchQuery: string;
  collapsedPlatforms: Platform[];

  // Detail view
  selectedVideoId: string | null;
  selectedTikTokId: string | null;
  selectedInstagramId: string | null;
  selectedFacebookId: string | null;
  selectedThreadsId: string | null;
  selectedLinkedinId: string | null;
  selectedTwitterId: string | null;

  setYouTubeVideos: (videos: YouTubeVideo[]) => void;
  setTikTokVideos: (videos: TikTokVideo[], syncedAt: string) => void;
  setTikTokSyncing: (syncing: boolean) => void;
  setInstagramPosts: (posts: InstagramPost[], syncedAt: string) => void;
  setInstagramSyncing: (syncing: boolean) => void;
  setFacebookPosts: (posts: FacebookPost[], syncedAt: string) => void;
  setFacebookSyncing: (syncing: boolean) => void;
  setThreadsPosts: (posts: ThreadsPost[], syncedAt: string) => void;
  setThreadsSyncing: (syncing: boolean) => void;
  setLinkedinPosts: (posts: LinkedInPost[], syncedAt: string) => void;
  setLinkedinSyncing: (syncing: boolean) => void;
  setTwitterPosts: (posts: TwitterPost[], syncedAt: string) => void;
  setTwitterSyncing: (syncing: boolean) => void;
  setChannelStats: (stats: ChannelStats) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSortField: (field: SortField) => void;
  setSortOrder: (order: SortOrder) => void;
  setStatusFilter: (filter: StatusFilter) => void;
  togglePlatformFilter: (platform: Platform) => void;
  selectAllPlatforms: () => void;
  toggleCollapsed: (platform: Platform) => void;
  setSearchQuery: (query: string) => void;
  setSelectedVideoId: (id: string | null) => void;
  setSelectedTikTokId: (id: string | null) => void;
  setSelectedInstagramId: (id: string | null) => void;
  setSelectedFacebookId: (id: string | null) => void;
  setSelectedThreadsId: (id: string | null) => void;
  setSelectedLinkedinId: (id: string | null) => void;
  setSelectedTwitterId: (id: string | null) => void;
}

export const useContentStore = create<ContentState>((set) => ({
  youtubeVideos: [],
  tiktokVideos: [],
  tiktokSyncedAt: null,
  tiktokSyncing: false,
  instagramPosts: [],
  instagramSyncedAt: null,
  instagramSyncing: false,
  facebookPosts: [],
  facebookSyncedAt: null,
  facebookSyncing: false,
  threadsPosts: [],
  threadsSyncedAt: null,
  threadsSyncing: false,
  linkedinPosts: [],
  linkedinSyncedAt: null,
  linkedinSyncing: false,
  twitterPosts: [],
  twitterSyncedAt: null,
  twitterSyncing: false,
  channelStats: null,
  loading: false,
  error: null,
  lastFetch: null,

  sortField: 'date',
  sortOrder: 'desc',
  statusFilter: 'all',
  platformFilters: [],
  searchQuery: '',
  collapsedPlatforms: [],
  selectedVideoId: null,
  selectedTikTokId: null,
  selectedInstagramId: null,
  selectedFacebookId: null,
  selectedThreadsId: null,
  selectedLinkedinId: null,
  selectedTwitterId: null,

  setYouTubeVideos: (videos) => set({ youtubeVideos: videos, lastFetch: Date.now() }),
  setTikTokVideos: (tiktokVideos, tiktokSyncedAt) => set({ tiktokVideos, tiktokSyncedAt }),
  setTikTokSyncing: (tiktokSyncing) => set({ tiktokSyncing }),
  setInstagramPosts: (instagramPosts, instagramSyncedAt) => set({ instagramPosts, instagramSyncedAt }),
  setInstagramSyncing: (instagramSyncing) => set({ instagramSyncing }),
  setFacebookPosts: (facebookPosts, facebookSyncedAt) => set({ facebookPosts, facebookSyncedAt }),
  setFacebookSyncing: (facebookSyncing) => set({ facebookSyncing }),
  setThreadsPosts: (threadsPosts, threadsSyncedAt) => set({ threadsPosts, threadsSyncedAt }),
  setThreadsSyncing: (threadsSyncing) => set({ threadsSyncing }),
  setLinkedinPosts: (linkedinPosts, linkedinSyncedAt) => set({ linkedinPosts, linkedinSyncedAt }),
  setLinkedinSyncing: (linkedinSyncing) => set({ linkedinSyncing }),
  setTwitterPosts: (twitterPosts, twitterSyncedAt) => set({ twitterPosts, twitterSyncedAt }),
  setTwitterSyncing: (twitterSyncing) => set({ twitterSyncing }),
  setChannelStats: (channelStats) => set({ channelStats }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setSortField: (sortField) => set({ sortField }),
  setSortOrder: (sortOrder) => set({ sortOrder }),
  setStatusFilter: (statusFilter) => set({ statusFilter }),
  togglePlatformFilter: (platform) => set((state) => {
    const current = state.platformFilters;
    if (current.includes(platform)) {
      return { platformFilters: current.filter((p) => p !== platform) };
    }
    return { platformFilters: [...current, platform] };
  }),
  selectAllPlatforms: () => set({ platformFilters: [] }),
  toggleCollapsed: (platform) => set((state) => {
    const current = state.collapsedPlatforms;
    if (current.includes(platform)) {
      return { collapsedPlatforms: current.filter((p) => p !== platform) };
    }
    return { collapsedPlatforms: [...current, platform] };
  }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSelectedVideoId: (selectedVideoId) => set({ selectedVideoId, selectedTikTokId: null, selectedInstagramId: null, selectedFacebookId: null, selectedThreadsId: null, selectedLinkedinId: null, selectedTwitterId: null }),
  setSelectedTikTokId: (selectedTikTokId) => set({ selectedTikTokId, selectedVideoId: null, selectedInstagramId: null, selectedFacebookId: null, selectedThreadsId: null, selectedLinkedinId: null, selectedTwitterId: null }),
  setSelectedInstagramId: (selectedInstagramId) => set({ selectedInstagramId, selectedVideoId: null, selectedTikTokId: null, selectedFacebookId: null, selectedThreadsId: null, selectedLinkedinId: null, selectedTwitterId: null }),
  setSelectedFacebookId: (selectedFacebookId) => set({ selectedFacebookId, selectedVideoId: null, selectedTikTokId: null, selectedInstagramId: null, selectedThreadsId: null, selectedLinkedinId: null, selectedTwitterId: null }),
  setSelectedThreadsId: (selectedThreadsId) => set({ selectedThreadsId, selectedVideoId: null, selectedTikTokId: null, selectedInstagramId: null, selectedFacebookId: null, selectedLinkedinId: null, selectedTwitterId: null }),
  setSelectedLinkedinId: (selectedLinkedinId) => set({ selectedLinkedinId, selectedVideoId: null, selectedTikTokId: null, selectedInstagramId: null, selectedFacebookId: null, selectedThreadsId: null, selectedTwitterId: null }),
  setSelectedTwitterId: (selectedTwitterId) => set({ selectedTwitterId, selectedVideoId: null, selectedTikTokId: null, selectedInstagramId: null, selectedFacebookId: null, selectedThreadsId: null, selectedLinkedinId: null }),
}));
