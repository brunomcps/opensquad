import { supabase } from '../db/client.js';

interface AggregatedProfile {
  competitorId: string;
  fichaCount: number;
  structurePatterns: {
    mostCommonType: string;
    types: { type: string; count: number }[];
    avgHookProportion: number;
    avgContentProportion: number;
    avgClosingProportion: number;
    avgHookElements: number;
    avgBlockCount: number;
  };
  hookStrategies: string[];
  ctaPatterns: string[];
  vocabularyPatterns: {
    bordoes: string[];
    emotionalTerms: string[];
    rhetoricalDevices: { device: string; count: number }[];
    register: string;
  };
  contentStats: {
    totalVideos: number;
    totalOutliers: number;
    totalFlops: number;
    avgViews: number;
    avgDuration: number;
    platforms: { platform: string; count: number }[];
  };
  generatedAt: string;
}

/**
 * Generate an aggregated profile for a competitor based on their fichas and content data.
 */
export async function generateAggregatedProfile(competitorId: string): Promise<AggregatedProfile> {
  // Get all fichas for this competitor
  const { data: fichas } = await supabase
    .from('competitor_fichas')
    .select('*')
    .eq('competitor_id', competitorId);

  // Get content data
  const { data: platforms } = await supabase
    .from('competitor_platform_data')
    .select('platform, items, profile')
    .eq('competitor_id', competitorId);

  const allFichas = fichas || [];
  const allPlatforms = platforms || [];

  // --- Structure Patterns ---
  const typeCounts = new Map<string, number>();
  let totalHookProp = 0, totalContentProp = 0, totalClosingProp = 0;
  let totalHookElements = 0, totalBlockCount = 0;
  let propCount = 0;

  for (const f of allFichas) {
    const st = f.structure_type || 'Não identificado';
    typeCounts.set(st, (typeCounts.get(st) || 0) + 1);

    if (f.proportions && typeof f.proportions === 'object') {
      const p = f.proportions as any;
      if (p.hook != null) { totalHookProp += p.hook; propCount++; }
      if (p.content != null) totalContentProp += p.content;
      if (p.closing != null) totalClosingProp += p.closing;
    }

    totalHookElements += f.hook_element_count || 0;
    totalBlockCount += f.block_count || 0;
  }

  const types = Array.from(typeCounts.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);

  // --- Extract patterns from ficha sections ---
  const hookStrategies: string[] = [];
  const ctaPatterns: string[] = [];
  const bordoes: string[] = [];
  const emotionalTerms: string[] = [];
  const rhetoricalDevices = new Map<string, number>();
  let register = '';

  for (const f of allFichas) {
    const sections = f.sections || {};

    // Extract hook strategies from §2
    const s2 = sections['2'] || '';
    if (s2) {
      const hookType = s2.match(/\*\*Tipo:\*\*\s*(.+)/i) || s2.match(/Tipo[:\s]+(.+)/i);
      if (hookType) hookStrategies.push(hookType[1].trim().slice(0, 100));
    }

    // Extract CTA patterns from §5b and §7
    const s5b = sections['5b'] || '';
    const s7 = sections['7'] || '';
    if (s5b && s5b.length > 50) ctaPatterns.push('CTAs intermediários presentes');
    if (s7.toLowerCase().includes('cta') || s7.toLowerCase().includes('inscreva')) {
      ctaPatterns.push('CTA no fechamento');
    }
    if (!s5b && !s7.toLowerCase().includes('cta') && !s7.toLowerCase().includes('inscr')) {
      ctaPatterns.push('Ausência de CTAs tradicionais');
    }

    // Extract vocabulary from §10
    const s10 = sections['10'] || '';
    if (s10) {
      // Extract register
      const regMatch = s10.match(/\*\*Registro:\*\*\s*(.+)/i) || s10.match(/Registro[:\s]+(.+)/i);
      if (regMatch && !register) register = regMatch[1].trim().slice(0, 80);

      // Extract bordões
      const bordaoMatch = s10.match(/[Bb]ord[oõ][eê]s[:\s]*(.+)/);
      if (bordaoMatch) {
        const terms = bordaoMatch[1].split(/[,;]/).map(t => t.trim().replace(/[()]/g, '')).filter(t => t.length > 1 && t.length < 30);
        bordoes.push(...terms.slice(0, 5));
      }

      // Extract rhetorical devices
      const deviceMatches = s10.matchAll(/\|\s*\d+\s*\|\s*([^|]+)\s*\|/g);
      for (const dm of deviceMatches) {
        const device = dm[1].trim();
        if (device && device.length > 2 && device.length < 50 && !device.match(/^[\d\s]+$/)) {
          rhetoricalDevices.set(device, (rhetoricalDevices.get(device) || 0) + 1);
        }
      }
    }
  }

  // --- Content Stats ---
  let totalVideos = 0, totalOutliers = 0, totalFlops = 0;
  let totalViews = 0, totalDuration = 0, viewCount = 0;
  const platformCounts = new Map<string, number>();

  for (const pd of allPlatforms) {
    const items = pd.items || [];
    platformCounts.set(pd.platform, items.length);
    for (const item of items) {
      totalVideos++;
      if (item.isOutlier) totalOutliers++;
      if (item.isFlop) totalFlops++;
      if (item.views) { totalViews += item.views; viewCount++; }
      if (item.duration) totalDuration += item.duration;
    }
  }

  // Deduplicate arrays
  const uniqueHookStrategies = [...new Set(hookStrategies)];
  const uniqueCtaPatterns = [...new Set(ctaPatterns)];
  const uniqueBordoes = [...new Set(bordoes)];

  const sortedDevices = Array.from(rhetoricalDevices.entries())
    .map(([device, count]) => ({ device, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  return {
    competitorId,
    fichaCount: allFichas.length,
    structurePatterns: {
      mostCommonType: types[0]?.type || 'N/A',
      types,
      avgHookProportion: propCount > 0 ? Math.round((totalHookProp / propCount) * 10) / 10 : 0,
      avgContentProportion: propCount > 0 ? Math.round((totalContentProp / propCount) * 10) / 10 : 0,
      avgClosingProportion: propCount > 0 ? Math.round((totalClosingProp / propCount) * 10) / 10 : 0,
      avgHookElements: allFichas.length > 0 ? Math.round((totalHookElements / allFichas.length) * 10) / 10 : 0,
      avgBlockCount: allFichas.length > 0 ? Math.round((totalBlockCount / allFichas.length) * 10) / 10 : 0,
    },
    hookStrategies: uniqueHookStrategies,
    ctaPatterns: uniqueCtaPatterns,
    vocabularyPatterns: {
      bordoes: uniqueBordoes,
      emotionalTerms: [...new Set(emotionalTerms)],
      rhetoricalDevices: sortedDevices,
      register,
    },
    contentStats: {
      totalVideos,
      totalOutliers,
      totalFlops,
      avgViews: viewCount > 0 ? Math.round(totalViews / viewCount) : 0,
      avgDuration: totalVideos > 0 ? Math.round(totalDuration / totalVideos) : 0,
      platforms: Array.from(platformCounts.entries()).map(([platform, count]) => ({ platform, count })),
    },
    generatedAt: new Date().toISOString(),
  };
}
