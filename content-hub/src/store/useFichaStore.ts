import { create } from 'zustand';
import type { FichaListItem, FichaFull, FichaSummaryStats } from '../types/content';

interface FichaState {
  fichas: FichaListItem[];
  selectedFicha: FichaFull | null;
  stats: FichaSummaryStats | null;
  loading: boolean;
  error: string | null;
  searchQuery: string;

  setFichas: (fichas: FichaListItem[]) => void;
  setSelectedFicha: (ficha: FichaFull | null) => void;
  setStats: (stats: FichaSummaryStats) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSearchQuery: (q: string) => void;
}

export const useFichaStore = create<FichaState>((set) => ({
  fichas: [],
  selectedFicha: null,
  stats: null,
  loading: false,
  error: null,
  searchQuery: '',

  setFichas: (fichas) => set({ fichas }),
  setSelectedFicha: (selectedFicha) => set({ selectedFicha }),
  setStats: (stats) => set({ stats }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
}));
