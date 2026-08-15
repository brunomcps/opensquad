import { create } from 'zustand';

interface ProductMetrics {
  sales: number;
  revenueGross: number;
  revenueNet: number;
  refundRate: number;
  refunds: number;
  attachRate?: number;
  avgTicket?: number;
  couponUsageRate?: number;
}

interface MonthlyTrend {
  month: string;
  sales: number;
  revenueNet: number;
}

interface ProductProfile {
  id: string;
  name: string;
  fullName: string;
  price: number;
  priceOriginal?: number;
  format: string;
  funnelPosition: 'principal' | 'order-bump';
  parentProduct?: string;
  lifecycleStage: string;
  healthScore: number;
  launchDate?: string;
  description?: string;
  metrics: ProductMetrics;
  monthlyTrend: MonthlyTrend[];
  recommendations: string[];
}

interface Summary {
  totalRevenueNet: number;
  totalSales: number;
  avgRefundRate: number;
  avgHealthScore: number;
  monthlyTarget: number;
  gapToTarget: number;
  organicPct: number;
}

interface InfoprodutosState {
  products: ProductProfile[];
  summary: Summary | null;
  selectedProduct: string | null;
  productContent: any | null;
  loadingContent: boolean;
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;
  fetch: () => Promise<void>;
  selectProduct: (id: string | null) => void;
  fetchContent: (productId: string) => Promise<void>;
}

export const useInfoprodutosStore = create<InfoprodutosState>((set) => ({
  products: [],
  summary: null,
  selectedProduct: null,
  productContent: null,
  loadingContent: false,
  loading: false,
  error: null,
  lastUpdated: null,
  fetch: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch('/api/infoprodutos');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Unknown error');
      set({
        products: data.products,
        summary: data.summary,
        lastUpdated: data.lastUpdated,
        loading: false,
      });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },
  selectProduct: (id) => set({ selectedProduct: id, productContent: null }),
  fetchContent: async (productId: string) => {
    set({ loadingContent: true });
    try {
      const res = await fetch(`/api/infoprodutos/${productId}/content`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      set({ productContent: data.ok ? data.content : null, loadingContent: false });
    } catch {
      set({ productContent: null, loadingContent: false });
    }
  },
}));
