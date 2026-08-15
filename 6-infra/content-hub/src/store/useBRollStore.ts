import { create } from 'zustand';
import type { BRoll, BRollSource } from '../types/content';

export type BRollSortField = 'date' | 'duration' | 'name' | 'usage';

interface BRollState {
  brolls: BRoll[];
  loading: boolean;
  error: string | null;

  // Filters
  searchQuery: string;
  sourceFilter: BRollSource | 'all';
  tagFilter: string;
  sortField: BRollSortField;
  sortAsc: boolean;

  // Detail
  selectedBRollId: string | null;

  // Import dialog
  showImportDialog: boolean;

  // Actions
  setBRolls: (brolls: BRoll[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSearchQuery: (q: string) => void;
  setSourceFilter: (source: BRollSource | 'all') => void;
  setTagFilter: (tag: string) => void;
  setSortField: (field: BRollSortField) => void;
  toggleSortOrder: () => void;
  setSelectedBRollId: (id: string | null) => void;
  setShowImportDialog: (show: boolean) => void;
  updateBRoll: (id: string, updates: Partial<BRoll>) => void;
  removeBRoll: (id: string) => void;
  addBRolls: (newBRolls: BRoll[]) => void;
}

export const useBRollStore = create<BRollState>((set) => ({
  brolls: [],
  loading: false,
  error: null,

  searchQuery: '',
  sourceFilter: 'all',
  tagFilter: '',
  sortField: 'date',
  sortAsc: false,

  selectedBRollId: null,
  showImportDialog: false,

  setBRolls: (brolls) => set({ brolls }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSourceFilter: (sourceFilter) => set({ sourceFilter }),
  setTagFilter: (tagFilter) => set({ tagFilter }),
  setSortField: (sortField) => set({ sortField }),
  toggleSortOrder: () => set((s) => ({ sortAsc: !s.sortAsc })),
  setSelectedBRollId: (selectedBRollId) => set({ selectedBRollId }),
  setShowImportDialog: (showImportDialog) => set({ showImportDialog }),
  updateBRoll: (id, updates) =>
    set((s) => ({
      brolls: s.brolls.map((b) => (b.id === id ? { ...b, ...updates } : b)),
    })),
  removeBRoll: (id) =>
    set((s) => ({
      brolls: s.brolls.filter((b) => b.id !== id),
      selectedBRollId: s.selectedBRollId === id ? null : s.selectedBRollId,
    })),
  addBRolls: (newBRolls) =>
    set((s) => ({ brolls: [...s.brolls, ...newBRolls] })),
}));
