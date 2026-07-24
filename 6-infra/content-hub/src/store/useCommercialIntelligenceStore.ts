import { create } from 'zustand';
import type { DataQualityReport } from '../types/commercialIntelligence';

interface CommercialIntelligenceState {
  quality: DataQualityReport | null;
  loading: boolean;
  error: string | null;
  fetchQuality: () => Promise<void>;
}

type QualityLoader = () => Promise<DataQualityReport>;

let qualityLoader: QualityLoader = async () => {
  const response = await fetch('/api/commercial-intel/data-quality');
  const payload = await response.json();
  if (!response.ok || !payload.ok) throw new Error(errorMessage(payload));
  return payload.quality;
};

export function configureCommercialIntelligenceQualityLoader(loader: QualityLoader): void {
  qualityLoader = loader;
}

function errorMessage(payload: any): string {
  return payload?.error?.message || payload?.error || 'Falha ao carregar qualidade dos dados.';
}

export const useCommercialIntelligenceStore = create<CommercialIntelligenceState>(set => ({
  quality: null,
  loading: false,
  error: null,
  fetchQuality: async () => {
    set({ loading: true, error: null });
    try {
      set({ quality: await qualityLoader() });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Falha ao carregar qualidade dos dados.' });
    } finally {
      set({ loading: false });
    }
  },
}));
