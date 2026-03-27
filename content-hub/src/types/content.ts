export type Platform = 'youtube' | 'tiktok' | 'instagram' | 'facebook' | 'threads' | 'linkedin' | 'twitter';

export type PublicationStatus = 'scheduled' | 'published' | 'draft' | 'failed';

export type ContentType = 'video' | 'carousel' | 'image';

export interface PlatformEntry {
  status: PublicationStatus;
  url?: string;
  publishAt?: string;
  publishedAt?: string;
  platformId?: string;
  error?: string;
}

export interface Publication {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  sourceFile?: string;
  contentType: ContentType;
  squad?: string;
  createdAt: string;
  platforms: Partial<Record<Platform, PlatformEntry>>;
}

// --- B-Roll Library ---

export type BRollSource = 'veo' | 'grok' | 'pexels' | 'pixabay' | 'filmed' | 'remotion' | 'other';

export interface BRollUsage {
  videoTitle: string;
  videoId?: string;
  timestamp: string;
  addedAt: string;
}

export interface BRoll {
  id: string;
  filename: string;
  filepath: string;
  thumbnailPath?: string;
  duration: number;
  resolution: string;
  aspectRatio: string;
  fileSize: number;
  description: string;
  tags: string[];
  source: BRollSource;
  prompt?: string;
  createdAt: string;
  usedIn: BRollUsage[];
}

// --- YouTube ---

export interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  thumbnailHigh?: string;
  publishedAt: string;
  scheduledAt?: string;
  privacyStatus: string;
  viewCount?: number;
  likeCount?: number;
  commentCount?: number;
  durationSeconds: number;
  isShort: boolean;
  tags?: string[];
  categoryId?: string;
  defaultLanguage?: string;
}

// --- Productions ---

export type ProductionStatus = 'idea' | 'script' | 'recording' | 'editing' | 'ready' | 'published';

export type LowerThirdType = 'name-id' | 'concept' | 'topic';

export interface LowerThird {
  type: LowerThirdType;
  text: string;
  subtitle?: string;
  pngPath?: string;
}

export interface AISuggestion {
  broll?: {
    brollId: string | null;
    newConcept: string | null;
    reason: string;
  };
  lowerThird?: {
    type: LowerThirdType;
    text: string;
    subtitle?: string;
    reason: string;
  };
}

export interface ScriptBlock {
  id: string;
  text: string;
  startTime: string;
  endTime: string;
  brollId?: string;
  lowerThird?: LowerThird;
  note?: string;
  aiSuggestion?: AISuggestion;
}

export interface TitleVariation {
  text: string;
  selected: boolean;
}

export interface ThumbnailTextVariation {
  text: string;
  selected: boolean;
}

export interface Production {
  id: string;
  title: string;
  titleVariations: TitleVariation[];
  description: string;
  tags: string[];
  status: ProductionStatus;
  plannedDate?: string;
  youtubeId?: string;
  script?: string;
  rawVideoPath?: string;
  thumbnailPath?: string;
  thumbnailText?: string;
  thumbnailTextVariations: ThumbnailTextVariation[];
  thumbnailPrompt?: string;
  blocks: ScriptBlock[];
  ideaNote?: string;
  ideaSource?: string;
  createdAt: string;
  updatedAt: string;
}

// --- TikTok ---

export interface TikTokVideo {
  id: string;
  title: string;
  thumbnail: string;
  url: string;
  createTime: string;
  scheduledAt?: string;
  duration: number;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
}

// --- Instagram ---

export interface InstagramPost {
  id: string;
  caption: string;
  mediaType: string;
  thumbnailUrl?: string;
  permalink: string;
  timestamp: string;
  likeCount: number;
  commentsCount: number;
}

// --- Facebook ---

export interface FacebookPost {
  id: string;
  message: string;
  fullPicture?: string;
  permalink: string;
  createdTime: string;
  type: string; // link, status, photo, video
  likeCount: number;
  commentCount: number;
  shareCount: number;
}

// --- Threads ---

export interface ThreadsPost {
  id: string;
  text: string;
  mediaType: string; // TEXT_POST, IMAGE, VIDEO, CAROUSEL_ALBUM
  mediaUrl?: string;
  permalink: string;
  timestamp: string;
  likeCount: number;
  replyCount: number;
}

// --- LinkedIn ---

export interface LinkedInPost {
  id: string;
  text: string;
  permalink: string;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  mediaUrl?: string;
}

// --- Twitter/X ---

export interface TwitterPost {
  id: string;
  text: string;
  permalink: string;
  createdAt: string;
  likeCount: number;
  retweetCount: number;
  replyCount: number;
  viewCount: number;
  mediaUrl?: string;
}

// --- Fichas de Roteiro ---

export interface FichaBlock {
  name: string;
  timeStart: string;
  timeEnd: string;
  function: string;
  duration: string;
}

export interface FichaListItem {
  videoId: string;
  runId: string;
  title: string;
  durationText: string;
  durationSeconds: number;
  publishedAt: string;
  structureType: string;
  proportions: { hook: number; content: number; closing: number };
  hookElementCount: number;
  blockCount: number;
  sectionCount: number;
}

export interface FichaFull extends FichaListItem {
  blocks: FichaBlock[];
  sections: Record<string, string>;
}

export interface FichaSummaryStats {
  totalFichas: number;
  avgDurationSeconds: number;
  avgHookPercent: number;
  avgContentPercent: number;
  avgClosingPercent: number;
  avgHookElementCount: number;
  avgBlockCount: number;
  structureTypes: { type: string; count: number }[];
  sectionPresence: Record<string, number>;
}
