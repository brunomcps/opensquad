import { supabase } from '../db/client.js';

/**
 * Meta Ad Library API (free, public).
 * Searches ads by page name / advertiser.
 * Docs: https://www.facebook.com/ads/library/api/
 *
 * NOTE: Requires a Meta access token with ads_read permission.
 * Set META_AD_TOKEN in .env. If not set, returns empty.
 */

const META_AD_TOKEN = process.env.META_AD_TOKEN || '';
const AD_LIBRARY_URL = 'https://graph.facebook.com/v19.0/ads_archive';

interface AdEntry {
  id: string;
  adCreativeBody?: string;
  adCreativeLinkTitle?: string;
  adCreativeLinkDescription?: string;
  pageName: string;
  startDate: string;
  endDate?: string;
  status: string;
  impressionsLower?: number;
  impressionsUpper?: number;
  spendLower?: number;
  spendUpper?: number;
  adSnapshotUrl?: string;
}

/**
 * Search Meta Ad Library for ads from a specific advertiser/page.
 */
export async function searchAds(pageName: string, country = 'BR', limit = 25): Promise<AdEntry[]> {
  if (!META_AD_TOKEN) {
    console.warn('[ads] META_AD_TOKEN not set — skipping ad library search');
    return [];
  }

  const params = new URLSearchParams({
    access_token: META_AD_TOKEN,
    search_terms: pageName,
    ad_reached_countries: `["${country}"]`,
    ad_type: 'ALL',
    ad_active_status: 'ALL',
    fields: 'id,ad_creative_bodies,ad_creative_link_titles,ad_creative_link_descriptions,page_name,ad_delivery_start_time,ad_delivery_stop_time,ad_snapshot_url,impressions,spend',
    limit: String(limit),
  });

  try {
    const res = await fetch(`${AD_LIBRARY_URL}?${params}`, {
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error(`[ads] Meta API error ${res.status}: ${text.slice(0, 200)}`);
      return [];
    }

    const json = await res.json();
    const data = json.data || [];

    return data.map((ad: any) => ({
      id: ad.id,
      adCreativeBody: ad.ad_creative_bodies?.[0] || '',
      adCreativeLinkTitle: ad.ad_creative_link_titles?.[0] || '',
      adCreativeLinkDescription: ad.ad_creative_link_descriptions?.[0] || '',
      pageName: ad.page_name || pageName,
      startDate: ad.ad_delivery_start_time || '',
      endDate: ad.ad_delivery_stop_time || null,
      status: ad.ad_delivery_stop_time ? 'inactive' : 'active',
      impressionsLower: ad.impressions?.lower_bound ? parseInt(ad.impressions.lower_bound) : null,
      impressionsUpper: ad.impressions?.upper_bound ? parseInt(ad.impressions.upper_bound) : null,
      spendLower: ad.spend?.lower_bound ? parseFloat(ad.spend.lower_bound) : null,
      spendUpper: ad.spend?.upper_bound ? parseFloat(ad.spend.upper_bound) : null,
      adSnapshotUrl: ad.ad_snapshot_url || null,
    }));
  } catch (err: any) {
    console.error(`[ads] Error searching ads for ${pageName}:`, err.message);
    return [];
  }
}

/**
 * Fetch and cache ads for a competitor.
 * Saves to Supabase competitor_platform_data with platform='meta_ads'.
 */
export async function syncCompetitorAds(competitorId: string, pageName: string): Promise<AdEntry[]> {
  const ads = await searchAds(pageName);

  if (ads.length > 0) {
    // Store as platform data with platform='meta_ads'
    await supabase.from('competitor_platform_data').upsert({
      competitor_id: competitorId,
      platform: 'meta_ads',
      profile: { pageName, adCount: ads.length },
      items: ads,
      synced_at: new Date().toISOString(),
      source: 'meta_ad_library',
      item_count: ads.length,
    }, { onConflict: 'competitor_id,platform' });
  }

  return ads;
}

/**
 * Get cached ads for a competitor.
 */
export async function getCompetitorAds(competitorId: string): Promise<AdEntry[]> {
  const { data } = await supabase
    .from('competitor_platform_data')
    .select('items')
    .eq('competitor_id', competitorId)
    .eq('platform', 'meta_ads')
    .single();

  return data?.items || [];
}
