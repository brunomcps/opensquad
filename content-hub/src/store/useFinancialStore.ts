import { create } from 'zustand';

export interface HotmartSale {
  transactionId: string;
  productName: string;
  productId: number;
  buyerName: string;
  buyerEmail: string;
  price: number;
  priceBRL: number;
  netPrice: number;
  hotmartFee: number;
  currency: string;
  status: string;
  paymentMethod: string;
  purchaseDate: string;
  approvedDate?: string;
  source?: string;
}

export interface ProductSummary {
  name: string;
  sales: number;
  revenue: number;
}

export interface HotmartSummary {
  totalSales: number;
  totalRevenue: number;
  totalRefunds: number;
  netRevenue: number;
  products: ProductSummary[];
  periodStart: string;
  periodEnd: string;
}

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: string;
  end: string;
  allDay: boolean;
  location?: string;
  htmlLink?: string;
  colorId?: string;
}

interface FinancialState {
  // Hotmart
  summary: HotmartSummary | null;
  sales: HotmartSale[];
  hotmartLoading: boolean;
  hotmartError: string | null;
  hotmartSyncedAt: string | null;

  // Calendar
  todayEvents: CalendarEvent[];
  upcomingEvents: CalendarEvent[];
  calendarLoading: boolean;
  calendarError: string | null;
  calendarSyncedAt: string | null;

  // Actions
  fetchSummary: (start?: string, end?: string) => Promise<void>;
  fetchSales: (start?: string, end?: string) => Promise<void>;
  fetchTodayEvents: () => Promise<void>;
  fetchUpcomingEvents: (days?: number) => Promise<void>;
  quickAddEvent: (text: string) => Promise<CalendarEvent | null>;
  createCalendarEvent: (summary: string, startDateTime: string, endDateTime: string, description?: string) => Promise<CalendarEvent | null>;
  monthlyData: any[];
  fetchMonthly: (months?: number) => Promise<void>;
  refreshAll: () => Promise<void>;
}

export const useFinancialStore = create<FinancialState>((set, get) => ({
  summary: null,
  sales: [],
  hotmartLoading: false,
  hotmartError: null,
  hotmartSyncedAt: null,

  todayEvents: [],
  upcomingEvents: [],
  calendarLoading: false,
  calendarError: null,
  calendarSyncedAt: null,
  monthlyData: [],

  fetchSummary: async (start?: string, end?: string) => {
    set({ hotmartLoading: true, hotmartError: null });
    try {
      const params = new URLSearchParams();
      if (start) params.set('start', start);
      if (end) params.set('end', end);
      const res = await fetch(`/api/hotmart/summary?${params}`);
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      set({ summary: data.summary, hotmartSyncedAt: new Date().toISOString() });
    } catch (err: any) {
      set({ hotmartError: err.message });
    } finally {
      set({ hotmartLoading: false });
    }
  },

  fetchSales: async (start?: string, end?: string) => {
    set({ hotmartLoading: true, hotmartError: null });
    try {
      const params = new URLSearchParams();
      if (start) params.set('start', start);
      if (end) params.set('end', end);
      const res = await fetch(`/api/hotmart/sales?${params}`);
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      set({ sales: data.sales, hotmartSyncedAt: new Date().toISOString() });
    } catch (err: any) {
      set({ hotmartError: err.message });
    } finally {
      set({ hotmartLoading: false });
    }
  },

  fetchTodayEvents: async () => {
    set({ calendarLoading: true, calendarError: null });
    try {
      const res = await fetch('/api/calendar/today');
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      set({ todayEvents: data.events, calendarSyncedAt: new Date().toISOString() });
    } catch (err: any) {
      set({ calendarError: err.message });
    } finally {
      set({ calendarLoading: false });
    }
  },

  fetchUpcomingEvents: async (days = 7) => {
    set({ calendarLoading: true, calendarError: null });
    try {
      const res = await fetch(`/api/calendar/upcoming?days=${days}`);
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      set({ upcomingEvents: data.events, calendarSyncedAt: new Date().toISOString() });
    } catch (err: any) {
      set({ calendarError: err.message });
    } finally {
      set({ calendarLoading: false });
    }
  },

  quickAddEvent: async (text: string) => {
    try {
      const res = await fetch('/api/calendar/quick-add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      // Refresh events after creating
      get().fetchTodayEvents();
      get().fetchUpcomingEvents();
      return data.event;
    } catch (err: any) {
      set({ calendarError: err.message });
      return null;
    }
  },

  createCalendarEvent: async (summary: string, startDateTime: string, endDateTime: string, description?: string) => {
    try {
      const res = await fetch('/api/calendar/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary, startDateTime, endDateTime, description }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      get().fetchTodayEvents();
      get().fetchUpcomingEvents();
      return data.event;
    } catch (err: any) {
      set({ calendarError: err.message });
      return null;
    }
  },

  fetchMonthly: async (months = 6) => {
    try {
      const res = await fetch(`/api/hotmart/monthly?months=${months}`);
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      set({ monthlyData: data.months });
    } catch (err: any) {
      set({ hotmartError: err.message });
    }
  },

  refreshAll: async () => {
    const { fetchSummary, fetchTodayEvents, fetchUpcomingEvents } = get();
    await Promise.all([fetchSummary(), fetchTodayEvents(), fetchUpcomingEvents()]);
  },
}));
