const HOTMART_API = 'https://developers.hotmart.com/payments/api/v1';
const HOTMART_ENV = process.env.HOTMART_ENVIRONMENT || 'production';
const BASE_URL = HOTMART_ENV === 'sandbox'
  ? 'https://sandbox.hotmart.com/payments/api/v1'
  : HOTMART_API;

let cachedToken: { access_token: string; expires_at: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expires_at) {
    return cachedToken.access_token;
  }

  const clientId = process.env.HOTMART_CLIENT_ID;
  const clientSecret = process.env.HOTMART_CLIENT_SECRET;
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const res = await fetch('https://api-sec-vlc.hotmart.com/security/oauth/token?grant_type=client_credentials', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Hotmart auth failed (${res.status}): ${text}`);
  }

  const data = await res.json() as { access_token: string; expires_in: number };
  cachedToken = {
    access_token: data.access_token,
    expires_at: Date.now() + (data.expires_in - 60) * 1000,
  };

  return cachedToken.access_token;
}

async function hotmartFetch(endpoint: string, params: Record<string, string> = {}): Promise<any> {
  const token = await getAccessToken();
  const url = new URL(`${BASE_URL}${endpoint}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString(), {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Hotmart API error (${res.status}): ${text}`);
  }

  return res.json();
}

export interface HotmartSale {
  transactionId: string;
  productName: string;
  productId: number;
  buyerName: string;
  buyerEmail: string;
  price: number;       // valor bruto em BRL (convertido se moeda estrangeira)
  priceBRL: number;    // valor base em BRL (hotmart_fee.base)
  netPrice: number;    // valor líquido (após taxa Hotmart)
  hotmartFee: number;  // taxa cobrada pelo Hotmart
  currency: string;    // moeda original
  status: string;
  paymentMethod: string;
  purchaseDate: string;
  approvedDate?: string;
  commissionValue?: number;
  source?: string;
}

export interface HotmartSummary {
  totalSales: number;
  totalRevenue: number;
  totalRefunds: number;
  netRevenue: number;
  products: { name: string; sales: number; revenue: number }[];
  periodStart: string;
  periodEnd: string;
}

export async function getSalesHistory(
  startDate?: string,
  endDate?: string,
  status: string = 'APPROVED,COMPLETE'
): Promise<HotmartSale[]> {
  const params: Record<string, string> = {};
  if (startDate) params.start_date = new Date(startDate).getTime().toString();
  if (endDate) params.end_date = new Date(endDate).getTime().toString();
  if (status) params.transaction_status = status;
  params.max_results = '500';

  const allSales: HotmartSale[] = [];
  let pageToken: string | undefined;

  do {
    if (pageToken) params.page_token = pageToken;
    const data = await hotmartFetch('/sales/history', params);
    const items = data.items || [];

    for (const item of items) {
      const purchase = item.purchase || {};
      const product = item.product || {};
      const buyer = item.buyer || {};
      const payment = purchase.payment || {};
      const fee = purchase.hotmart_fee || {};

      // Convert foreign currency to approximate BRL
      // hotmart_fee.base is NOT reliable for foreign currencies (returns original currency value)
      const currency = purchase.price?.currency_code || 'BRL';
      const rawPrice = purchase.price?.value || 0;
      const feeTotal = fee.total || 0;

      // Approximate conversion rates (updated periodically)
      const toBRL: Record<string, number> = {
        BRL: 1, USD: 5.7, EUR: 6.2, GBP: 7.3, CLP: 0.0058, ARS: 0.005,
        JPY: 0.038, MXN: 0.29, COP: 0.0013, PEN: 1.5,
      };
      const rate = toBRL[currency] || 1;
      const baseBRL = currency === 'BRL' ? rawPrice : rawPrice * rate;

      allSales.push({
        transactionId: purchase.transaction || '',
        productName: product.name || '',
        productId: product.id || 0,
        buyerName: buyer.name || '',
        buyerEmail: buyer.email || '',
        price: purchase.price?.value || 0,
        priceBRL: baseBRL,
        netPrice: baseBRL - feeTotal,
        hotmartFee: feeTotal,
        currency,
        status: purchase.status || '',
        paymentMethod: payment.type || '',
        purchaseDate: purchase.order_date ? new Date(purchase.order_date).toISOString() : '',
        approvedDate: purchase.approved_date ? new Date(purchase.approved_date).toISOString() : undefined,
        commissionValue: item.commission?.value || undefined,
        source: purchase.tracking?.source || undefined,
      });
    }

    pageToken = data.page_info?.next_page_token;
  } while (pageToken);

  return allSales;
}

export async function getSalesSummary(startDate?: string, endDate?: string): Promise<HotmartSummary> {
  const now = new Date();
  const start = startDate || new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const end = endDate || now.toISOString();

  // Use /sales/summary for accurate totals (already in BRL, separated by currency)
  const params: Record<string, string> = {};
  if (start) params.start_date = new Date(start).getTime().toString();
  if (end) params.end_date = new Date(end).getTime().toString();
  params.transaction_status = 'APPROVED,COMPLETE';

  const summaryData = await hotmartFetch('/sales/summary', params);
  const items = summaryData.items || [];

  // Hotmart summary separates by currency — sum BRL directly
  let totalSales = 0;
  let totalRevenue = 0;
  for (const item of items) {
    totalSales += item.total_items || 0;
    if (item.total_value?.currency_code === 'BRL') {
      totalRevenue += item.total_value.value || 0;
    }
    // For non-BRL, we'd need exchange rates — skip for now or estimate
  }

  // Get per-product breakdown using commissions endpoint (commission.value is always in BRL)
  const commParams: Record<string, string> = { ...params, max_results: '500' };
  const productMap = new Map<string, { name: string; sales: number; revenue: number }>();
  let pageToken: string | undefined;
  let totalCommission = 0;

  do {
    if (pageToken) commParams.page_token = pageToken;
    const commData = await hotmartFetch('/sales/commissions', commParams);
    for (const item of commData.items || []) {
      const productName = item.product?.name || 'Desconhecido';
      const commission = item.commissions?.find((c: any) => c.source === 'PRODUCER');
      const commValue = commission?.commission?.value || 0;
      totalCommission += commValue;

      const existing = productMap.get(productName) || { name: productName, sales: 0, revenue: 0 };
      existing.sales++;
      existing.revenue += commValue;
      productMap.set(productName, existing);
    }
    pageToken = commData.page_info?.next_page_token;
  } while (pageToken);

  // Refunds
  const refundParams: Record<string, string> = { ...params, transaction_status: 'REFUNDED' };
  let totalRefunds = 0;
  try {
    const refundData = await hotmartFetch('/sales/summary', refundParams);
    for (const item of refundData.items || []) {
      if (item.total_value?.currency_code === 'BRL') {
        totalRefunds += item.total_value.value || 0;
      }
    }
  } catch { /* no refunds */ }

  return {
    totalSales,
    totalRevenue,
    totalRefunds,
    netRevenue: totalCommission, // commission = what you actually receive (after Hotmart fees)
    products: Array.from(productMap.values()).sort((a, b) => b.revenue - a.revenue),
    periodStart: start,
    periodEnd: end,
  };
}
