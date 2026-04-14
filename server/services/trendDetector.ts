import {
  getCompetitorRegistry,
  getCompetitorPlatformData,
  getTrends,
  upsertTrend,
} from '../db/competitors.js';

interface OutlierItem {
  id: string;
  title: string;
  url: string;
  platform: string;
  competitorId: string;
  competitorName: string;
  views: number | null;
  zScore: number | null;
  publishedAt: string;
}

/**
 * Detect cross-competitor trends.
 * A trend is flagged when 2+ competitors have outlier content (z>2) on similar topics
 * within the same time window (default: 14 days).
 */
export async function detectTrends(windowDays = 0): Promise<any[]> {
  const registry = await getCompetitorRegistry();
  const cutoff = windowDays > 0
    ? new Date(Date.now() - windowDays * 86400000).toISOString()
    : '1970-01-02'; // include all (skip epoch fallback dates)

  // Collect all outliers across all competitors
  const allOutliers: OutlierItem[] = [];

  for (const comp of registry.competitors) {
    for (const platform of Object.keys(comp.platforms)) {
      const data = await getCompetitorPlatformData(comp.id, platform);
      if (!data?.items) continue;

      for (const item of data.items) {
        if (item.isOutlier && (!windowDays || item.publishedAt >= cutoff)) {
          allOutliers.push({
            id: item.id,
            title: item.title || '',
            url: item.url || '',
            platform,
            competitorId: comp.id,
            competitorName: comp.name,
            views: item.views,
            zScore: item.zScore,
            publishedAt: item.publishedAt,
          });
        }
      }
    }
  }

  console.log(`[trends] Collected ${allOutliers.length} outliers from ${registry.competitors.length} competitors`);
  if (allOutliers.length < 2) return [];

  // Extract keywords from titles for clustering
  const stopwords = new Set([
    'o', 'a', 'os', 'as', 'um', 'uma', 'de', 'do', 'da', 'dos', 'das',
    'em', 'no', 'na', 'nos', 'nas', 'por', 'para', 'com', 'que', 'se',
    'não', 'e', 'ou', 'como', 'é', 'são', 'the', 'a', 'an', 'of', 'in',
    'to', 'and', 'or', 'is', 'are', 'you', 'your', 'how', 'why', 'what',
    'this', 'that', 'it', 'its', 'do', 'does', 'can', 'will',
    'eu', 'ele', 'ela', 'meu', 'seu', 'sua', 'isso', 'esse', 'essa',
    'mais', 'muito', 'quando', 'sobre', 'vai', 'ter', 'ser', 'estar',
    'foi', 'tem', 'pode', 'fazer', 'faz', 'todo', 'toda', 'todos',
    'me', 'te', 'nos', 'vos', 'lhe', 'lhes', 'pra', 'pro', 'até',
    'nao', 'voce', 'vida', 'depois', 'antes', 'agora', 'aqui', 'ali',
    'coisa', 'coisas', 'gente', 'pessoa', 'pessoas', 'dia', 'dias',
    'vez', 'vezes', 'tipo', 'forma', 'parte', 'mundo', 'tempo',
    'melhor', 'pior', 'grande', 'maior', 'menor', 'novo', 'nova',
    'ainda', 'sempre', 'nunca', 'tudo', 'nada', 'algo', 'cada',
    'outro', 'outra', 'outros', 'outras', 'mesmo', 'mesma',
    'bem', 'mal', 'sim', 'mas', 'sem', 'minha', 'sua', 'seus',
    'mostrar', 'saber', 'querer', 'ver', 'dar', 'dizer', 'falar',
    'quer', 'quero', 'posso', 'precisa', 'primeira', 'primeiro',
    'vou', 'esta', 'esses', 'esse', 'essa', 'isso',
  ]);

  function extractKeywords(title: string): string[] {
    // Extract individual words
    const words = title
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove accents
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length >= 3 && !stopwords.has(w));

    // Also extract bigrams for better topic matching
    const bigrams: string[] = [];
    for (let i = 0; i < words.length - 1; i++) {
      bigrams.push(`${words[i]} ${words[i + 1]}`);
    }

    return [...words, ...bigrams];
  }

  // Build keyword index: keyword -> list of outliers
  const keywordIndex = new Map<string, OutlierItem[]>();
  for (const item of allOutliers) {
    const keywords = extractKeywords(item.title);
    for (const kw of keywords) {
      if (!keywordIndex.has(kw)) keywordIndex.set(kw, []);
      keywordIndex.get(kw)!.push(item);
    }
  }

  // Find keywords shared by 2+ competitors
  const trendCandidates: {
    keyword: string;
    items: OutlierItem[];
    competitors: Set<string>;
  }[] = [];

  for (const [keyword, items] of keywordIndex) {
    const uniqueCompetitors = new Set(items.map(i => i.competitorId));
    if (uniqueCompetitors.size >= 2) {
      trendCandidates.push({ keyword, items, competitors: uniqueCompetitors });
    }
  }

  // Merge related keywords into topics
  // Group keywords that share the same outlier items
  const merged = new Map<string, {
    keywords: Set<string>;
    items: Map<string, OutlierItem>;
    competitors: Set<string>;
  }>();

  for (const candidate of trendCandidates.sort((a, b) => b.competitors.size - a.competitors.size)) {
    let mergedInto: string | null = null;

    for (const [topic, group] of merged) {
      // Check overlap: if 50%+ of items are shared, merge
      const overlap = candidate.items.filter(i => group.items.has(i.id)).length;
      if (overlap >= candidate.items.length * 0.5 || overlap >= group.items.size * 0.5) {
        mergedInto = topic;
        break;
      }
    }

    if (mergedInto) {
      const group = merged.get(mergedInto)!;
      group.keywords.add(candidate.keyword);
      for (const item of candidate.items) {
        group.items.set(item.id, item);
        group.competitors.add(item.competitorId);
      }
    } else {
      const topic = candidate.keyword;
      merged.set(topic, {
        keywords: new Set([candidate.keyword]),
        items: new Map(candidate.items.map(i => [i.id, i])),
        competitors: new Set(candidate.items.map(i => i.competitorId)),
      });
    }
  }

  // Save trends to Supabase
  const results: any[] = [];

  for (const [topic, group] of merged) {
    if (group.competitors.size < 2) continue;

    const items = Array.from(group.items.values());
    const trend = {
      topic,
      keywords: Array.from(group.keywords).slice(0, 10),
      competitorsInvolved: Array.from(group.competitors).map(cId => {
        const compItems = items.filter(i => i.competitorId === cId);
        return {
          competitorId: cId,
          competitorName: compItems[0]?.competitorName || cId,
          itemCount: compItems.length,
        };
      }),
      signalCount: items.length,
      lifecycle: items.length >= 5 ? 'established' : items.length >= 3 ? 'growing' : 'emerging',
      sampleItems: items.slice(0, 6).map(i => ({
        id: i.id,
        title: i.title,
        url: i.url,
        platform: i.platform,
        competitorId: i.competitorId,
        competitorName: i.competitorName,
        views: i.views,
        zScore: i.zScore,
      })),
    };

    await upsertTrend(trend);
    results.push(trend);
  }

  return results;
}

/**
 * Get all detected trends (from DB).
 */
export async function getDetectedTrends() {
  return await getTrends();
}
