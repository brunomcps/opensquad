import { supabase } from '../db/client.js';

interface Evidence {
  videoId: string;
  title: string;
  excerpt: string;  // trecho literal que comprova
}

interface InsightWithEvidence {
  label: string;
  value: string;
  evidence: Evidence[];
}

interface AggregatedProfile {
  competitorId: string;
  fichaCount: number;
  // Structure
  structures: InsightWithEvidence[];
  proportions: { hook: number; content: number; closing: number; count: number };
  avgHookElements: number;
  avgBlockCount: number;
  // Hooks
  hooks: InsightWithEvidence[];
  // CTAs
  ctas: InsightWithEvidence[];
  // Closings
  closings: InsightWithEvidence[];
  // Language
  register: InsightWithEvidence[];
  bordoes: InsightWithEvidence[];
  rhetoricalDevices: InsightWithEvidence[];
  // Content stats
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

function extractFirst(text: string, pattern: RegExp, maxLen = 200): string {
  const m = text.match(pattern);
  return m ? m[1].trim().slice(0, maxLen) : '';
}

function extractLines(text: string, startPattern: RegExp, maxLines = 5): string[] {
  const lines = text.split('\n');
  const results: string[] = [];
  let capturing = false;
  for (const line of lines) {
    if (startPattern.test(line)) { capturing = true; continue; }
    if (capturing) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) break;
      if (trimmed.startsWith('|') && !trimmed.match(/^\|[\s-:|]+\|$/)) {
        results.push(trimmed);
      } else if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
        results.push(trimmed.replace(/^[-*]\s*/, ''));
      }
      if (results.length >= maxLines) break;
    }
  }
  return results;
}

/**
 * Generate an aggregated profile with full traceability to source fichas.
 */
export async function generateAggregatedProfile(competitorId: string): Promise<AggregatedProfile> {
  const { data: fichas } = await supabase
    .from('competitor_fichas')
    .select('*')
    .eq('competitor_id', competitorId);

  const { data: platforms } = await supabase
    .from('competitor_platform_data')
    .select('platform, items')
    .eq('competitor_id', competitorId);

  const allFichas = fichas || [];
  const allPlatforms = platforms || [];

  // --- Structure patterns (§1) ---
  const structures: InsightWithEvidence[] = [];
  let totalHook = 0, totalContent = 0, totalClosing = 0, propCount = 0;
  let totalHookElements = 0, totalBlockCount = 0;

  for (const f of allFichas) {
    const s1 = f.sections?.['1'] || '';
    const structType = f.structure_type || extractFirst(s1, /\*\*Tipo[^:]*:\*\*\s*(.+)/i) || 'Não identificado';

    // Extract first few lines of the block table as evidence
    const tableLines = extractLines(s1, /\|\s*#?\s*\|\s*Bloco/i, 3);
    const excerpt = tableLines.length > 0 ? tableLines.join('\n') : s1.slice(0, 200);

    const existing = structures.find(s => s.value === structType);
    if (existing) {
      existing.evidence.push({ videoId: f.video_id, title: f.title || f.video_id, excerpt });
    } else {
      structures.push({
        label: 'Tipo de estrutura',
        value: structType,
        evidence: [{ videoId: f.video_id, title: f.title || f.video_id, excerpt }],
      });
    }

    if (f.proportions && typeof f.proportions === 'object') {
      const p = f.proportions as any;
      if (p.hook != null) { totalHook += p.hook; totalContent += (p.content || 0); totalClosing += (p.closing || 0); propCount++; }
    }
    totalHookElements += f.hook_element_count || 0;
    totalBlockCount += f.block_count || 0;
  }

  // --- Hook strategies (§2) ---
  const hooks: InsightWithEvidence[] = [];
  for (const f of allFichas) {
    const s2 = f.sections?.['2'] || '';
    const hookType = extractFirst(s2, /\*\*Tipo[^:]*:\*\*\s*(.+)/i);
    // Get first 3 elements from hook table
    const hookElements = extractLines(s2, /\|\s*#?\s*\|\s*(Elemento|Timestamp)/i, 4);
    const excerpt = hookType
      ? hookType + (hookElements.length > 0 ? '\n' + hookElements.join('\n') : '')
      : hookElements.join('\n') || s2.slice(0, 300);

    hooks.push({
      label: f.title || f.video_id,
      value: hookType || 'Ver ficha',
      evidence: [{ videoId: f.video_id, title: f.title || f.video_id, excerpt }],
    });
  }

  // --- CTA patterns (§5b + §7) ---
  const ctas: InsightWithEvidence[] = [];
  for (const f of allFichas) {
    const s5b = f.sections?.['5b'] || '';
    const s7 = f.sections?.['7'] || '';

    if (s5b && s5b.length > 50) {
      const ctaLines = extractLines(s5b, /CTA|chamad/i, 3);
      ctas.push({
        label: 'CTAs intermediários',
        value: f.title || f.video_id,
        evidence: [{ videoId: f.video_id, title: f.title || f.video_id, excerpt: ctaLines.join('\n') || s5b.slice(0, 200) }],
      });
    }

    // Extract closing CTA info from §7
    const closingCTA = s7.match(/CTA[^|]*\|[^|]*\|[^|]*\|[^|]*/gi);
    if (closingCTA) {
      ctas.push({
        label: 'CTA no fechamento',
        value: f.title || f.video_id,
        evidence: [{ videoId: f.video_id, title: f.title || f.video_id, excerpt: closingCTA.slice(0, 2).join('\n') }],
      });
    } else if (!s5b || s5b.length < 50) {
      const ausencia = s7.toLowerCase().includes('ausencia') || s7.toLowerCase().includes('zero cta') || s7.toLowerCase().includes('nenhum');
      if (ausencia) {
        ctas.push({
          label: 'Sem CTAs tradicionais',
          value: f.title || f.video_id,
          evidence: [{ videoId: f.video_id, title: f.title || f.video_id, excerpt: 'Ausência de CTAs de like/inscrição/compartilhamento' }],
        });
      }
    }
  }

  // --- Closings (§7) ---
  const closings: InsightWithEvidence[] = [];
  for (const f of allFichas) {
    const s7 = f.sections?.['7'] || '';
    const closingElements = extractLines(s7, /\|\s*#?\s*\|\s*(Elemento|Timestamp)/i, 4);
    const excerpt = closingElements.join('\n') || s7.slice(0, 300);
    closings.push({
      label: f.title || f.video_id,
      value: `${(f.proportions as any)?.closing || '?'}% do vídeo`,
      evidence: [{ videoId: f.video_id, title: f.title || f.video_id, excerpt }],
    });
  }

  // --- Register & Language (§10) ---
  const register: InsightWithEvidence[] = [];
  const bordoes: InsightWithEvidence[] = [];
  const rhetoricalDevices: InsightWithEvidence[] = [];

  for (const f of allFichas) {
    const s10 = f.sections?.['10'] || '';

    // Register
    const reg = extractFirst(s10, /\*\*Registro[^:]*:\*\*\s*(.+)/i);
    if (reg) {
      register.push({
        label: f.title || f.video_id,
        value: reg,
        evidence: [{ videoId: f.video_id, title: f.title || f.video_id, excerpt: reg }],
      });
    }

    // Bordões
    const bordaoSection = s10.match(/[Bb]ord[oõ][eê]s[:\s]*([^\n]+)/);
    if (bordaoSection) {
      const terms = bordaoSection[1].split(/[,;]/).map(t => t.trim().replace(/[*"()]/g, '')).filter(t => t.length > 1 && t.length < 40);
      for (const term of terms.slice(0, 5)) {
        const existing = bordoes.find(b => b.value.toLowerCase() === term.toLowerCase());
        if (existing) {
          existing.evidence.push({ videoId: f.video_id, title: f.title || f.video_id, excerpt: bordaoSection[0].slice(0, 150) });
        } else {
          bordoes.push({
            label: 'Bordão',
            value: term,
            evidence: [{ videoId: f.video_id, title: f.title || f.video_id, excerpt: bordaoSection[0].slice(0, 150) }],
          });
        }
      }
    }

    // Rhetorical devices from §10 tables
    const deviceMatches = [...s10.matchAll(/\|\s*\d+\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]*)\s*\|/g)];
    for (const dm of deviceMatches) {
      const device = dm[1].trim();
      const excerpt = dm[2].trim();
      const timestamp = dm[3]?.trim() || '';
      if (device && device.length > 2 && device.length < 60 && !device.match(/^[\d\s-]+$/)) {
        const existing = rhetoricalDevices.find(r => r.value.toLowerCase() === device.toLowerCase());
        const evidenceItem = { videoId: f.video_id, title: f.title || f.video_id, excerpt: `${timestamp ? '[' + timestamp + '] ' : ''}"${excerpt.slice(0, 120)}"` };
        if (existing) {
          if (existing.evidence.length < 3) existing.evidence.push(evidenceItem);
        } else {
          rhetoricalDevices.push({ label: 'Recurso retórico', value: device, evidence: [evidenceItem] });
        }
      }
    }
  }

  // Sort by evidence count (most used first)
  rhetoricalDevices.sort((a, b) => b.evidence.length - a.evidence.length);
  bordoes.sort((a, b) => b.evidence.length - a.evidence.length);

  // --- Content Stats ---
  let totalVideos = 0, totalOutliers = 0, totalFlops = 0, totalViews = 0, viewCount = 0, totalDuration = 0;
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

  return {
    competitorId,
    fichaCount: allFichas.length,
    structures,
    proportions: {
      hook: propCount > 0 ? Math.round((totalHook / propCount) * 10) / 10 : 0,
      content: propCount > 0 ? Math.round((totalContent / propCount) * 10) / 10 : 0,
      closing: propCount > 0 ? Math.round((totalClosing / propCount) * 10) / 10 : 0,
      count: propCount,
    },
    avgHookElements: allFichas.length > 0 ? Math.round((totalHookElements / allFichas.length) * 10) / 10 : 0,
    avgBlockCount: allFichas.length > 0 ? Math.round((totalBlockCount / allFichas.length) * 10) / 10 : 0,
    hooks,
    ctas,
    closings,
    register,
    bordoes,
    rhetoricalDevices,
    contentStats: {
      totalVideos, totalOutliers, totalFlops,
      avgViews: viewCount > 0 ? Math.round(totalViews / viewCount) : 0,
      avgDuration: totalVideos > 0 ? Math.round(totalDuration / totalVideos) : 0,
      platforms: Array.from(platformCounts.entries()).map(([platform, count]) => ({ platform, count })),
    },
    generatedAt: new Date().toISOString(),
  };
}
