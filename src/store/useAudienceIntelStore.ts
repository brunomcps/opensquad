import { create } from 'zustand';

export interface Breadcrumb {
  level: number;
  label: string;
  dimension?: string;
  value?: string;
}

export interface DimensionCard {
  key: string;
  label: string;
  metric: number;
  subtitle: string;
  detail: string;
}

export interface AudienceIntelState {
  // Navigation
  currentLevel: number;
  currentDimension: string | null;
  currentValue: string | null;
  breadcrumbs: Breadcrumb[];

  // Filters
  filters: Record<string, any>;

  // Data
  stats: any | null;
  dimensionCards: DimensionCard[];
  dimensionDetail: any | null;
  comments: { items: any[]; total: number };
  selectedComment: any | null;
  subclusters: any[];
  insights: any[];
  superfans: any[];

  // UI
  loading: boolean;

  // Actions
  fetchStats: () => Promise<void>;
  fetchDimensionCards: () => Promise<void>;
  fetchDimensionDetail: (dim: string) => Promise<void>;
  fetchComments: (extraFilters?: Record<string, any>) => Promise<void>;
  fetchCommentDetail: (id: string) => Promise<void>;
  fetchSuperfans: (loadMore?: boolean) => Promise<void>;
  fetchSuperfanProfile: (authorUrl: string) => Promise<void>;
  selectedSuperfan: any | null;
  fetchSubclusters: (dim: string, val: string) => Promise<void>;
  fetchInsights: () => Promise<void>;
  drillDown: (level: number, label: string, dimension?: string, value?: string) => void;
  navigateTo: (level: number) => void;
  setFilter: (key: string, value: any) => void;
  clearFilters: () => void;
  goHome: () => void;
}

const API = '/api/audience/v2';

export const useAudienceIntelStore = create<AudienceIntelState>((set, get) => ({
  currentLevel: 2,
  currentDimension: null,
  currentValue: null,
  breadcrumbs: [{ level: 2, label: 'Audience Intelligence' }],
  filters: {},
  stats: null,
  dimensionCards: [],
  dimensionDetail: null,
  comments: { items: [], total: 0 },
  selectedComment: null,
  subclusters: [],
  insights: [],
  superfans: { items: [], total: 0 },
  selectedSuperfan: null,
  loading: false,

  fetchStats: async () => {
    const res = await fetch(`${API}/stats`);
    const stats = await res.json();
    set({ stats });
  },

  fetchDimensionCards: async () => {
    set({ loading: true });
    const res = await fetch(`${API}/dimensions`);
    const cards = await res.json();
    set({ dimensionCards: cards, loading: false });
  },

  fetchDimensionDetail: async (dim: string) => {
    set({ loading: true });
    const res = await fetch(`${API}/dimension/${dim}`);
    const data = await res.json();
    set({ dimensionDetail: data, loading: false });
  },

  fetchComments: async (extraFilters = {}) => {
    set({ loading: true });
    const { filters } = get();
    const merged = { ...filters, ...extraFilters };
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) {
      if (v !== undefined && v !== null && v !== '') {
        params.set(k, Array.isArray(v) ? JSON.stringify(v) : String(v));
      }
    }
    const res = await fetch(`${API}/comments?${params}`);
    const data = await res.json();
    set({ comments: data, loading: false });
  },

  fetchCommentDetail: async (id: string) => {
    const res = await fetch(`${API}/comments/${encodeURIComponent(id)}`);
    const data = await res.json();
    set({ selectedComment: data });
  },

  fetchSuperfans: async (loadMore = false) => {
    set({ loading: true });
    const current = get().superfans;
    const offset = loadMore ? current.items.length : 0;
    const res = await fetch(`${API}/superfans?limit=200&offset=${offset}`);
    const data = await res.json();
    if (loadMore) {
      set({ superfans: { items: [...current.items, ...data.items], total: data.total }, loading: false });
    } else {
      set({ superfans: data, loading: false });
    }
  },

  fetchSuperfanProfile: async (authorUrl: string) => {
    const res = await fetch(`${API}/superfans/profile/${encodeURIComponent(authorUrl)}`);
    const data = await res.json();
    set({ selectedSuperfan: data });
  },

  fetchSubclusters: async (dim: string, val: string) => {
    const url = val ? `${API}/subclusters/${dim}/${encodeURIComponent(val)}` : `${API}/subclusters-all/${dim}`;
    const res = await fetch(url);
    const data = await res.json();
    set({ subclusters: data });
  },

  fetchInsights: async () => {
    const res = await fetch(`${API}/insights`);
    const data = await res.json();
    set({ insights: data });
  },

  drillDown: (level, label, dimension, value) => {
    const { breadcrumbs } = get();
    const newBreadcrumbs = [...breadcrumbs, { level, label, dimension, value }];
    set({
      currentLevel: level,
      currentDimension: dimension || get().currentDimension,
      currentValue: value || get().currentValue,
      breadcrumbs: newBreadcrumbs,
    });
  },

  navigateTo: (level) => {
    const { breadcrumbs } = get();
    const idx = breadcrumbs.findIndex(b => b.level === level);
    const newBreadcrumbs = idx >= 0 ? breadcrumbs.slice(0, idx + 1) : breadcrumbs;
    const target = newBreadcrumbs[newBreadcrumbs.length - 1];
    set({
      currentLevel: level,
      currentDimension: target?.dimension || null,
      currentValue: target?.value || null,
      breadcrumbs: newBreadcrumbs,
      selectedComment: null,
    });
  },

  setFilter: (key, value) => {
    const { filters } = get();
    if (value === null || value === undefined || value === '') {
      const { [key]: _, ...rest } = filters;
      set({ filters: rest });
    } else {
      set({ filters: { ...filters, [key]: value } });
    }
  },

  clearFilters: () => set({ filters: {} }),

  goHome: () => set({
    currentLevel: 2,
    currentDimension: null,
    currentValue: null,
    breadcrumbs: [{ level: 2, label: 'Audience Intelligence' }],
    selectedComment: null,
    dimensionDetail: null,
    subclusters: [],
    filters: {},
  }),
}));
