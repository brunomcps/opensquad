import { supabase } from '../db/client.js';
import {
  getCompetitorRegistry,
  getCompetitorPlatformData,
} from '../db/competitors.js';

interface ComparisonInsight {
  type: 'gap' | 'overlap' | 'opportunity';
  topic: string;
  description: string;
  competitorData: {
    competitorId: string;
    competitorName: string;
    videoTitle: string;
    views: number | null;
    zScore: number | null;
    url: string;
  }[];
  brunoData?: {
    videoTitle: string;
    views: number | null;
    url: string;
  };
  gapMultiplier?: number;
}

/**
 * Compare competitor outlier topics with Bruno's YouTube content.
 * Identifies:
 * - GAPS: Topics where competitors went viral but Bruno never covered
 * - OVERLAPS: Topics both covered, with performance comparison
 * - OPPORTUNITIES: Topics where Bruno underperformed relative to competitors
 */
export async function compareToBruno(): Promise<ComparisonInsight[]> {
  // Get Bruno's videos from fichas table (has video_id + title)
  // and yt-analytics for views
  const { data: fichasData } = await supabase
    .from('fichas')
    .select('video_id, title, published_at');

  const brunoFichas = fichasData || [];
  if (brunoFichas.length === 0) return [];

  // Map to expected format
  const brunoVideos = brunoFichas.map(f => ({
    external_id: f.video_id,
    title: f.title || '',
    views: null as number | null, // will be enriched below
    url: `https://www.youtube.com/watch?v=${f.video_id}`,
    published_at: f.published_at || '',
  }));

  // Build keyword index for Bruno's content
  const brunoKeywords = new Map<string, typeof brunoVideos[0][]>();
  for (const video of brunoVideos) {
    const keywords = extractKeywords(video.title || '');
    for (const kw of keywords) {
      if (!brunoKeywords.has(kw)) brunoKeywords.set(kw, []);
      brunoKeywords.get(kw)!.push(video);
    }
  }

  // Collect competitor outliers
  const registry = await getCompetitorRegistry();
  const outliers: {
    id: string;
    title: string;
    url: string;
    views: number | null;
    zScore: number | null;
    competitorId: string;
    competitorName: string;
    platform: string;
    keywords: string[];
  }[] = [];

  for (const comp of registry.competitors) {
    for (const platform of Object.keys(comp.platforms)) {
      const data = await getCompetitorPlatformData(comp.id, platform);
      if (!data?.items) continue;
      for (const item of data.items) {
        if (item.isOutlier) {
          const keywords = extractKeywords(item.title || '');
          outliers.push({
            id: item.id,
            title: item.title,
            url: item.url,
            views: item.views,
            zScore: item.zScore,
            competitorId: comp.id,
            competitorName: comp.name,
            platform,
            keywords,
          });
        }
      }
    }
  }

  const insights: ComparisonInsight[] = [];
  const processedTopics = new Set<string>();

  // Check each outlier topic against Bruno's content
  for (const outlier of outliers) {
    for (const kw of outlier.keywords) {
      if (processedTopics.has(`${kw}-${outlier.competitorId}`)) continue;
      processedTopics.add(`${kw}-${outlier.competitorId}`);

      const brunoMatches = brunoKeywords.get(kw) || [];

      // Group competitors with same keyword
      const competitorsWithKeyword = outliers.filter(o =>
        o.keywords.includes(kw) && o.competitorId !== outlier.competitorId
      );
      const allCompetitorItems = [outlier, ...competitorsWithKeyword.filter(c =>
        !insights.some(i => i.topic === kw && i.competitorData.some(d => d.competitorId === c.competitorId))
      )];

      if (brunoMatches.length === 0) {
        // GAP: Competitor has outlier, Bruno never covered
        // Only flag as gap if 2+ competitors or keyword is a bigram (more specific)
        const uniqueComps = new Set(allCompetitorItems.map(o => o.competitorId));
        if (uniqueComps.size >= 2 || kw.includes(' ')) {
          if (!insights.some(i => i.topic === kw && i.type === 'gap')) {
            insights.push({
              type: 'gap',
              topic: kw,
              description: `Concorrentes viralizaram com "${kw}" mas Bruno nunca cobriu este tema`,
              competitorData: allCompetitorItems.map(o => ({
                competitorId: o.competitorId,
                competitorName: o.competitorName,
                videoTitle: o.title,
                views: o.views,
                zScore: o.zScore,
                url: o.url,
              })),
            });
          }
        }
      } else {
        // OVERLAP: Both covered — compare performance
        const bestBruno = brunoMatches.reduce((best, v) =>
          (v.views || 0) > (best.views || 0) ? v : best, brunoMatches[0]);
        const bestCompetitor = allCompetitorItems.reduce((best, o) =>
          (o.views || 0) > (best.views || 0) ? o : best, allCompetitorItems[0]);

        const brunoViews = bestBruno.views || 0;
        const compViews = bestCompetitor.views || 0;

        if (compViews > brunoViews * 3 && !insights.some(i => i.topic === kw && i.type === 'opportunity')) {
          // OPPORTUNITY: Competitor did 3x+ better
          insights.push({
            type: 'opportunity',
            topic: kw,
            description: `Bruno fez ${formatViews(brunoViews)} views em "${kw}", concorrente fez ${formatViews(compViews)} — gap ${(compViews / Math.max(brunoViews, 1)).toFixed(0)}x`,
            competitorData: allCompetitorItems.map(o => ({
              competitorId: o.competitorId,
              competitorName: o.competitorName,
              videoTitle: o.title,
              views: o.views,
              zScore: o.zScore,
              url: o.url,
            })),
            brunoData: {
              videoTitle: bestBruno.title || '',
              views: brunoViews,
              url: bestBruno.url || '',
            },
            gapMultiplier: compViews / Math.max(brunoViews, 1),
          });
        }
      }
    }
  }

  // Sort: gaps and opportunities first, then by signal count
  insights.sort((a, b) => {
    if (a.type === 'gap' && b.type !== 'gap') return -1;
    if (b.type === 'gap' && a.type !== 'gap') return 1;
    if (a.type === 'opportunity' && b.type !== 'opportunity') return -1;
    if (b.type === 'opportunity' && a.type !== 'opportunity') return 1;
    return b.competitorData.length - a.competitorData.length;
  });

  return insights.slice(0, 50);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const stopwords = new Set([
  'o', 'a', 'os', 'as', 'um', 'uma', 'de', 'do', 'da', 'dos', 'das',
  'em', 'no', 'na', 'nos', 'nas', 'por', 'para', 'com', 'que', 'se',
  'não', 'e', 'ou', 'como', 'é', 'são', 'the', 'a', 'an', 'of', 'in',
  'to', 'and', 'or', 'is', 'are', 'you', 'your', 'how', 'why', 'what',
  'eu', 'ele', 'ela', 'meu', 'seu', 'sua', 'isso', 'esse', 'essa',
  'mais', 'muito', 'quando', 'sobre', 'vai', 'ter', 'ser', 'estar',
  'foi', 'tem', 'pode', 'fazer', 'faz', 'todo', 'toda', 'todos',
  'me', 'te', 'nos', 'vos', 'lhe', 'lhes', 'pra', 'pro', 'até',
  'tdah', 'adhd', // too common in this niche to be meaningful
  'nao', 'voce', 'vida', 'depois', 'antes', 'agora', 'aqui', 'ali',
  'coisa', 'coisas', 'gente', 'pessoa', 'pessoas', 'dia', 'dias',
  'vez', 'vezes', 'tipo', 'forma', 'parte', 'mundo', 'tempo',
  'melhor', 'pior', 'grande', 'maior', 'menor', 'novo', 'nova',
  'ainda', 'sempre', 'nunca', 'tudo', 'nada', 'algo', 'cada',
  'outro', 'outra', 'outros', 'outras', 'mesmo', 'mesma',
  'bem', 'mal', 'sim', 'mas', 'sem', 'minha', 'sua', 'seus',
  'mostrar', 'saber', 'querer', 'ver', 'dar', 'dizer', 'falar',
  'quer', 'quero', 'posso', 'precisa', 'primeira', 'primeiro',
  'vou', 'esta', 'esses', 'esse', 'essa', 'isso', 'existe',
  'sistema', 'nervoso', 'cerebro', // too generic for niche
]);

function extractKeywords(title: string): string[] {
  return title
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 4 && !stopwords.has(w));
}

function formatViews(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toString();
}
