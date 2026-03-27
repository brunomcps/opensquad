import { create } from 'zustand';
import type { Production, ProductionStatus } from '../types/content';

interface ProductionState {
  productions: Production[];
  loading: boolean;
  error: string | null;

  // Filters
  statusFilter: ProductionStatus | 'all';
  searchQuery: string;

  // Navigation
  selectedProductionId: string | null;
  editorTab: 'general' | 'script' | 'editing' | 'thumbnail';

  // Actions
  setProductions: (productions: Production[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setStatusFilter: (status: ProductionStatus | 'all') => void;
  setSearchQuery: (q: string) => void;
  setSelectedProductionId: (id: string | null) => void;
  setEditorTab: (tab: 'general' | 'script' | 'editing' | 'thumbnail') => void;
  updateProduction: (id: string, updates: Partial<Production>) => void;
  addProduction: (production: Production) => void;
  removeProduction: (id: string) => void;
}

export const useProductionStore = create<ProductionState>((set) => ({
  productions: [],
  loading: false,
  error: null,

  statusFilter: 'all',
  searchQuery: '',

  selectedProductionId: null,
  editorTab: 'general',

  setProductions: (productions) => set({ productions }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setStatusFilter: (statusFilter) => set({ statusFilter }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSelectedProductionId: (selectedProductionId) => set({ selectedProductionId, editorTab: 'general' }),
  setEditorTab: (editorTab) => set({ editorTab }),
  updateProduction: (id, updates) =>
    set((s) => ({
      productions: s.productions.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    })),
  addProduction: (production) =>
    set((s) => ({ productions: [production, ...s.productions] })),
  removeProduction: (id) =>
    set((s) => ({
      productions: s.productions.filter((p) => p.id !== id),
      selectedProductionId: s.selectedProductionId === id ? null : s.selectedProductionId,
    })),
}));
