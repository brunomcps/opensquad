import { getSalesHistory, getSalesSummary } from './hotmart.js';
import type { HotmartSale } from './hotmart.js';
import { readFile, readdir } from 'fs/promises';
import path from 'path';

const SQUADS_DIR = path.resolve(import.meta.dirname, '../../../squads/infoprodutos');

interface ProductProfile {
  id: string;
  name: string;
  fullName: string;
  price: number;
  priceOriginal?: number;
  format: string;
  funnelPosition: 'principal' | 'order-bump';
  parentProduct?: string;
  lifecycleStage: 'launch' | 'growth' | 'maturity' | 'decline';
  healthScore: number;
  launchDate?: string;
  description?: string;
  specs?: Record<string, string>;
  metrics: {
    sales: number;
    revenueGross: number;
    revenueNet: number;
    refundRate: number;
    refunds: number;
    attachRate?: number;
    avgTicket?: number;
    couponUsageRate?: number;
  };
  monthlyTrend: Array<{
    month: string;
    sales: number;
    revenueNet: number;
  }>;
  recommendations: string[];
}

interface InfproductosData {
  products: ProductProfile[];
  summary: {
    totalRevenueNet: number;
    totalSales: number;
    avgRefundRate: number;
    avgHealthScore: number;
    monthlyTarget: number;
    gapToTarget: number;
    organicPct: number;
  };
  lastUpdated: string;
}

// Hardcoded product metadata
const PRODUCT_META: Record<string, {
  id: string;
  name: string;
  fullName: string;
  price: number;
  priceOriginal?: number;
  format: string;
  funnelPosition: 'principal' | 'order-bump';
  parentProduct?: string;
  launchDate?: string;
  descriptionDir: string;
  description?: string;
}> = {
  mapa: {
    id: 'mapa-7p',
    name: 'MAPA 7P',
    fullName: 'MAPA-7P — Mapeamento de Atenção e Padrões de Ação',
    price: 147,
    format: 'Assessment digital + 2 relatórios PDF',
    funnelPosition: 'principal',
    launchDate: '2026-01-31',
    descriptionDir: 'mapa/prd',
    description: 'Triagem online de TDAH adulto. Assessment de 88 itens baseado na escala ASRS da OMS + 7 Padrões Funcionais proprietários. O comprador responde em ~25 minutos e recebe 2 relatórios personalizados por IA: um pessoal (15-20 páginas) e um clínico (5-8 páginas).',
  },
  guia: {
    id: 'guia-rapido',
    name: 'Guia Rápido',
    fullName: 'Guia Rápido de Ação TDAH v2.0',
    price: 49.20,
    priceOriginal: 88,
    format: 'PDF digital (47 páginas)',
    funnelPosition: 'order-bump',
    parentProduct: 'mapa-7p',
    descriptionDir: 'guia-rapido-acao',
    description: 'Mais de 70 estratégias práticas baseadas em neurociência para usar quando o cérebro travar. Complementa o MAPA: enquanto o MAPA diz ONDE agir, o Guia diz COMO agir. Cobre ativação, foco, memória, gestão de tempo, emoções e trabalho.',
  },
  rotina: {
    id: 'manual-rotina',
    name: 'Rotina Sob Medida',
    fullName: 'Manual de Rotina para TDAH Adulto + Kit de Templates',
    price: 27.90,
    priceOriginal: 55.90,
    format: 'PDF digital (56 páginas + templates)',
    funnelPosition: 'order-bump',
    parentProduct: 'mapa-7p',
    descriptionDir: 'rotina-sob-medida',
    description: 'Ensina a montar uma rotina personalizada baseada no perfil de energia do leitor. Inclui o Método de Blocos por Contexto, Versão Completa + Mínima, Mapa de Energia, 6 Sabotadores, e um Kit de Templates prontos para usar.',
  },
  '2as': {
    id: '2as',
    name: '2AS',
    fullName: '2AS — Autismo & Superdotação',
    price: 147,
    format: 'Assessment digital + 3 relatórios PDF',
    funnelPosition: 'principal',
    launchDate: '2026-03-01',
    descriptionDir: '2as',
    description: 'Questionário de rastreio integrado para TEA (Transtorno do Espectro Autista), Altas Habilidades/Superdotação e Dupla Excepcionalidade (2e) em adultos. 96 itens de escala + eixos de interação. Gera 3 relatórios personalizados por IA.',
  },
};

function identifyProduct(productName: string): string | null {
  const lower = productName.toLowerCase();
  if (lower.includes('mapa')) return 'mapa';
  if (lower.includes('guia')) return 'guia';
  if (lower.includes('rotina') || lower.includes('manual')) return 'rotina';
  if (lower.includes('2as') || lower.includes('autismo') || lower.includes('superdota')) return '2as';
  return null;
}

function stripMarkdown(text: string): string {
  return text
    .replace(/^#+\s+/gm, '')     // headers
    .replace(/\*\*([^*]+)\*\*/g, '$1') // bold
    .replace(/\*([^*]+)\*/g, '$1')     // italic
    .replace(/`([^`]+)`/g, '$1')       // inline code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links
    .replace(/^[-*]\s+/gm, '')   // list items
    .replace(/\n{2,}/g, ' ')     // multiple newlines
    .replace(/\n/g, ' ')         // single newlines
    .trim();
}

async function readProductDescription(dirPath: string): Promise<string | null> {
  try {
    const fullDir = path.join(SQUADS_DIR, dirPath);
    const files = await readdir(fullDir);
    const mdFile = files.find(f => f.endsWith('.md'));
    if (!mdFile) return null;
    const content = await readFile(path.join(fullDir, mdFile), 'utf-8');
    const cleaned = stripMarkdown(content);
    return cleaned.slice(0, 300).trim() + (cleaned.length > 300 ? '...' : '');
  } catch {
    return null;
  }
}

function computeHealthScore(
  refundRate: number,
  salesCount: number,
  monthlyTrend: Array<{ month: string; sales: number; revenueNet: number }>
): number {
  let score = 2; // base

  if (refundRate < 0.05) score += 3;
  else if (refundRate <= 0.10) score += 2;
  // > 10% adds nothing

  if (salesCount > 0) score += 2;

  if (monthlyTrend.length >= 2) {
    score += 1;
    const last = monthlyTrend[monthlyTrend.length - 1];
    const prev = monthlyTrend[monthlyTrend.length - 2];
    if (last.sales > prev.sales) score += 2;
  }

  return Math.min(score, 10);
}

function determineLifecycleStage(
  launchDate: string | undefined,
  monthlyTrend: Array<{ month: string; sales: number }>
): 'launch' | 'growth' | 'maturity' | 'decline' {
  if (!launchDate) return 'maturity';

  const monthsSinceLaunch = Math.floor(
    (Date.now() - new Date(launchDate).getTime()) / (1000 * 60 * 60 * 24 * 30)
  );

  if (monthsSinceLaunch <= 2) return 'launch';

  if (monthlyTrend.length >= 3) {
    const recent = monthlyTrend.slice(-3);
    const isGrowing = recent[2]?.sales > recent[0]?.sales;
    const isDeclining = recent[2]?.sales < recent[0]?.sales && recent[1]?.sales < recent[0]?.sales;
    if (isGrowing) return 'growth';
    if (isDeclining) return 'decline';
  }

  return 'maturity';
}

function generateRecommendations(product: {
  funnelPosition: string;
  metrics: { refundRate: number; sales: number; attachRate?: number };
  lifecycleStage: string;
}): string[] {
  const recs: string[] = [];

  if (product.metrics.refundRate > 0.10) {
    recs.push('Taxa de reembolso alta (>10%) - investigar qualidade percebida ou expectativa desalinhada');
  }
  if (product.funnelPosition === 'order-bump' && (product.metrics.attachRate ?? 0) < 0.20) {
    recs.push('Attach rate baixo (<20%) - testar nova copy ou posicionamento no checkout');
  }
  if (product.lifecycleStage === 'decline') {
    recs.push('Produto em declinio - considerar refresh de conteudo ou nova campanha');
  }
  if (product.metrics.sales === 0) {
    recs.push('Sem vendas no periodo - verificar se produto esta ativo no checkout');
  }
  if (product.funnelPosition === 'principal' && product.metrics.sales > 0 && product.metrics.refundRate < 0.05) {
    recs.push('Produto saudavel - considerar aumento de trafego ou teste de preco');
  }

  return recs;
}

export async function getProductProfiles(months: number = 6): Promise<InfproductosData> {
  // Fetch sales data from Hotmart
  let allSales: HotmartSale[] = [];
  let refundedSales: HotmartSale[] = [];

  try {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);
    allSales = await getSalesHistory(startDate.toISOString());
  } catch (err) {
    console.error('Failed to fetch sales history:', err);
  }

  try {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);
    refundedSales = await getSalesHistory(startDate.toISOString(), undefined, 'REFUNDED');
  } catch (err) {
    console.error('Failed to fetch refunded sales:', err);
  }

  // Group sales by product key
  const productSales: Record<string, HotmartSale[]> = {};
  const productRefunds: Record<string, HotmartSale[]> = {};

  for (const sale of allSales) {
    const key = identifyProduct(sale.productName);
    if (!key) continue;
    if (!productSales[key]) productSales[key] = [];
    productSales[key].push(sale);
  }

  for (const sale of refundedSales) {
    const key = identifyProduct(sale.productName);
    if (!key) continue;
    if (!productRefunds[key]) productRefunds[key] = [];
    productRefunds[key].push(sale);
  }

  // Build monthly trend per product
  function buildMonthlyTrend(sales: HotmartSale[]): Array<{ month: string; sales: number; revenueNet: number }> {
    const byMonth = new Map<string, { sales: number; revenueNet: number }>();
    for (const s of sales) {
      const d = new Date(s.purchaseDate);
      const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const existing = byMonth.get(month) || { sales: 0, revenueNet: 0 };
      existing.sales++;
      existing.revenueNet += s.netPrice;
      byMonth.set(month, existing);
    }
    return Array.from(byMonth.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({ month, ...data }));
  }

  // Main product sales count (for attach rate)
  const mainProductSalesCount = (productSales['mapa'] || []).length;

  // Read descriptions in parallel
  const descriptions = await Promise.all(
    Object.values(PRODUCT_META).map(async (meta) => ({
      key: meta.id,
      description: await readProductDescription(meta.descriptionDir),
    }))
  );
  const descMap = new Map(descriptions.map(d => [d.key, d.description]));

  // Build product profiles
  const products: ProductProfile[] = [];

  for (const [key, meta] of Object.entries(PRODUCT_META)) {
    const sales = productSales[key] || [];
    const refunds = productRefunds[key] || [];
    const salesCount = sales.length;
    const refundCount = refunds.length;
    const totalWithRefunds = salesCount + refundCount;
    const refundRate = totalWithRefunds > 0 ? refundCount / totalWithRefunds : 0;
    const revenueGross = sales.reduce((sum, s) => sum + s.priceBRL, 0);
    const revenueNet = sales.reduce((sum, s) => sum + s.netPrice, 0);
    const monthlyTrend = buildMonthlyTrend(sales);

    const attachRate = meta.funnelPosition === 'order-bump' && mainProductSalesCount > 0
      ? salesCount / mainProductSalesCount
      : undefined;

    const avgTicket = salesCount > 0 ? revenueGross / salesCount : undefined;

    const healthScore = computeHealthScore(refundRate, salesCount, monthlyTrend);
    const lifecycleStage = determineLifecycleStage(meta.launchDate, monthlyTrend);

    const profile: ProductProfile = {
      id: meta.id,
      name: meta.name,
      fullName: meta.fullName,
      price: meta.price,
      priceOriginal: meta.priceOriginal,
      format: meta.format,
      funnelPosition: meta.funnelPosition,
      parentProduct: meta.parentProduct,
      lifecycleStage,
      healthScore,
      launchDate: meta.launchDate,
      description: meta.description ?? descMap.get(meta.id) ?? undefined,
      metrics: {
        sales: salesCount,
        revenueGross: Math.round(revenueGross * 100) / 100,
        revenueNet: Math.round(revenueNet * 100) / 100,
        refundRate: Math.round(refundRate * 10000) / 10000,
        refunds: refundCount,
        attachRate: attachRate !== undefined ? Math.round(attachRate * 10000) / 10000 : undefined,
        avgTicket: avgTicket !== undefined ? Math.round(avgTicket * 100) / 100 : undefined,
      },
      monthlyTrend,
      recommendations: [],
    };

    profile.recommendations = generateRecommendations(profile);
    products.push(profile);
  }

  // Build summary
  const totalRevenueNet = products.reduce((sum, p) => sum + p.metrics.revenueNet, 0);
  const totalSales = products.reduce((sum, p) => sum + p.metrics.sales, 0);
  const totalRefunds = products.reduce((sum, p) => sum + p.metrics.refunds, 0);
  const avgRefundRate = (totalSales + totalRefunds) > 0
    ? totalRefunds / (totalSales + totalRefunds)
    : 0;
  const avgHealthScore = products.length > 0
    ? products.reduce((sum, p) => sum + p.healthScore, 0) / products.length
    : 0;

  // Monthly target from memory: R$50k/mo
  const monthlyTarget = 50000;
  const currentMonthRevenue = products.reduce((sum, p) => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const currentMonthData = p.monthlyTrend.find(m => m.month === currentMonth);
    return sum + (currentMonthData?.revenueNet ?? 0);
  }, 0);

  // Organic percentage: sales without tracking source
  const organicSales = allSales.filter(s => !s.source || s.source === 'organic').length;
  const organicPct = allSales.length > 0 ? organicSales / allSales.length : 0;

  return {
    products,
    summary: {
      totalRevenueNet: Math.round(totalRevenueNet * 100) / 100,
      totalSales,
      avgRefundRate: Math.round(avgRefundRate * 10000) / 10000,
      avgHealthScore: Math.round(avgHealthScore * 10) / 10,
      monthlyTarget,
      gapToTarget: Math.round((monthlyTarget - currentMonthRevenue) * 100) / 100,
      organicPct: Math.round(organicPct * 10000) / 10000,
    },
    lastUpdated: new Date().toISOString(),
  };
}

export async function getProductDetail(productId: string): Promise<ProductProfile | null> {
  const data = await getProductProfiles();
  return data.products.find(p => p.id === productId) ?? null;
}
