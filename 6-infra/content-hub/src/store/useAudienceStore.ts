import { create } from 'zustand';

export type CommentExample = { author: string; content: string; likes: number; video: string };

export interface AudienceInsights {
  meta: { generatedAt: string; totalComments: number; audienceComments: number; channelOwner: number; videosAnalyzed: number; period: string };
  kpis: { totalComments: number; audienceComments: number; contentDemands: number; productDemands: number; painSignals: number; pmfScore: string };
  contentDemands: { topic: string; mentions: number; exists: string; type: string; confidence: string; examples?: CommentExample[] }[];
  productDemands: { type: string; mentions: number; engagement: string; confidence: string; examples?: CommentExample[] }[];
  painPoints: { pain: string; frequency: number; videos: number; urgency: string; examples?: CommentExample[] }[];
  audienceSegments: { segment: string; description: string; size: number; pct: number; need: string; funnel: string; examples?: CommentExample[] }[];
  categoryDistribution: { category: string; count: number; pct: number }[];
  recommendations: { rank: number; title: string; confidence: string; evidence: string; impact: string; effort: string; priority: string; timeline: string; examples?: CommentExample[] }[];
  gapMap: { pain: string; freq: number; currentProduct: string | null; gap: boolean; opportunity: string }[];
}

interface AudienceState {
  data: AudienceInsights | null;
  loading: boolean;
  fetch: () => Promise<void>;
}

export const useAudienceStore = create<AudienceState>((set) => ({
  data: null,
  loading: false,
  fetch: async () => {
    set({ loading: true });
    try {
      const res = await fetch('/api/audience');
      const json = await res.json();
      set({ data: json, loading: false });
    } catch {
      set({ loading: false });
    }
  },
}));
