import { createClient } from '@supabase/supabase-js';

const PRODUCT_ID = '6966825';
const PRODUCT_NAME = 'MAPA-7P · Mapeamento de Padrões Dopaminérgico';
const HOTLINK = 'https://go.hotmart.com/K103806991N';
const POSITIONS = ['description', 'pinned_comment', 'comment_reply'] as const;
const TRACKING_POSITION_CODES = { description: 'd', pinned_comment: 'p', comment_reply: 'r' } as const;
const PUBLIC_POSITION_CODES = { description: 'd', pinned_comment: 'c', comment_reply: 'r' } as const;
const PUBLIC_BASE = 'https://link.brunosallesphd.com.br/m7p/';

type Position = typeof POSITIONS[number];
type CatalogVideo = {
  video_id: string;
  title: string;
  published_at: string;
  content_type: 'long' | 'short' | 'live' | 'unknown';
};
type Campaign = {
  campaign_id: string;
  video_id: string;
  product_id: string;
  cta_position: string;
  tracking_code: string;
  slug: string;
  status: string;
  directUrl?: string | null;
  redirectUrl?: string | null;
};

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function compactVideoId(videoId: string): string {
  return videoId
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]/g, '')
    .slice(0, 45)
    .toLowerCase();
}

function expectedSlug(videoId: string, position: Position): string {
  return `${compactVideoId(videoId)}-${PUBLIC_POSITION_CODES[position]}`;
}

function isTargetPosition(value: string): value is Position {
  return POSITIONS.includes(value as Position);
}

function campaignKey(videoId: string, position: Position): string {
  return `${videoId}|${position}`;
}

async function validateRedirect(campaign: Campaign): Promise<void> {
  if (!campaign.redirectUrl || campaign.redirectUrl !== `${PUBLIC_BASE}${campaign.slug}`) {
    throw new Error(`Campaign ${campaign.campaign_id} returned an unexpected public URL.`);
  }
  const response = await fetch(campaign.redirectUrl, { method: 'HEAD', redirect: 'manual' });
  if (response.status !== 302) {
    throw new Error(`${campaign.redirectUrl} returned ${response.status}, expected 302.`);
  }
  const location = response.headers.get('location');
  if (!location) throw new Error(`${campaign.redirectUrl} did not return Location.`);
  const destination = new URL(location);
  const position = campaign.cta_position as Position;
  if (`${destination.origin}${destination.pathname}` !== HOTLINK) {
    throw new Error(`${campaign.redirectUrl} returned an unexpected destination.`);
  }
  if (
    destination.searchParams.get('src') !== campaign.tracking_code
    || destination.searchParams.get('utm_source') !== 'youtube'
    || destination.searchParams.get('utm_medium') !== 'organic'
    || destination.searchParams.get('utm_campaign') !== 'mapa7p-youtube'
    || destination.searchParams.get('utm_content') !== `${campaign.video_id}-${position}`
  ) {
    throw new Error(`${campaign.redirectUrl} returned unexpected tracking parameters.`);
  }
}

async function validateRedirects(campaigns: Campaign[], concurrency = 10): Promise<void> {
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < campaigns.length) {
      const campaign = campaigns[nextIndex];
      nextIndex += 1;
      await validateRedirect(campaign);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, campaigns.length) }, () => worker()));
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  if (args.some(arg => arg !== '--apply')) {
    throw new Error('Only --apply is supported. Without it, the script performs a read-only dry-run.');
  }

  const supabaseUrl = requireEnv('SUPABASE_URL').replace(/\/$/, '');
  const publishableKey = requireEnv('SUPABASE_KEY');
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  const appUrl = process.env.CI_PILOT_APP_URL?.trim() || 'https://opensquad-commercial-intelligence.pages.dev';
  const functionsUrl = `${supabaseUrl}/functions/v1`;
  const authOptions = { auth: { persistSession: false, autoRefreshToken: false } };
  const admin = createClient(supabaseUrl, serviceRoleKey, authOptions);
  const anon = createClient(supabaseUrl, publishableKey, authOptions);

  const videoResult = await admin.from('ci_youtube_videos')
    .select('video_id,title,published_at,content_type')
    .order('published_at', { ascending: false });
  if (videoResult.error) throw videoResult.error;
  const videos = (videoResult.data || []) as CatalogVideo[];
  const unknownVideos = videos.filter(video => video.content_type === 'unknown');
  if (unknownVideos.length) {
    throw new Error(`Found ${unknownVideos.length} video(s) with unknown content type. Synchronize metadata before applying the batch.`);
  }
  const eligibleVideos = videos.filter(video => video.content_type !== 'short');
  const eligibleIds = new Set(eligibleVideos.map(video => video.video_id));
  const shortIds = new Set(videos.filter(video => video.content_type === 'short').map(video => video.video_id));

  const campaignResult = await admin.from('ci_campaigns')
    .select('campaign_id,video_id,product_id,cta_position,tracking_code,slug,status')
    .eq('product_id', PRODUCT_ID);
  if (campaignResult.error) throw campaignResult.error;
  const beforeCampaigns = (campaignResult.data || []) as Campaign[];
  const beforeTargets = beforeCampaigns.filter(campaign => isTargetPosition(campaign.cta_position));
  const beforeTargetKeys = new Set(beforeTargets.map(campaign => campaignKey(campaign.video_id, campaign.cta_position as Position)));
  const missingBefore = eligibleVideos.flatMap(video => POSITIONS
    .filter(position => !beforeTargetKeys.has(campaignKey(video.video_id, position)))
    .map(position => ({ videoId: video.video_id, position })));
  const shortCampaignIdsBefore = beforeTargets
    .filter(campaign => shortIds.has(campaign.video_id))
    .map(campaign => campaign.campaign_id)
    .sort();

  const audit = {
    catalogTotal: videos.length,
    longVideos: videos.filter(video => video.content_type === 'long').length,
    liveVideos: videos.filter(video => video.content_type === 'live').length,
    shortsExcluded: videos.filter(video => video.content_type === 'short').length,
    eligibleNonShortVideos: eligibleVideos.length,
    existingTargetCampaigns: beforeTargets.filter(campaign => eligibleIds.has(campaign.video_id)).length,
    missingTargetCampaigns: missingBefore.length,
    expectedFinalTargetCampaigns: eligibleVideos.length * POSITIONS.length,
    existingShortCampaigns: shortCampaignIdsBefore.length,
  };

  if (!apply) {
    console.log(JSON.stringify({
      ok: true,
      mode: 'dry-run',
      audit,
      latestEligibleVideos: eligibleVideos.slice(0, 3),
      oldestEligibleVideos: eligibleVideos.slice(-3),
    }, null, 2));
    return;
  }

  const member = await admin.from('ci_app_members')
    .select('user_id')
    .eq('role', 'admin')
    .eq('enabled', true)
    .limit(1)
    .maybeSingle();
  if (member.error || !member.data?.user_id) throw member.error || new Error('Enabled admin member was not found.');
  const adminUser = await admin.auth.admin.getUserById(member.data.user_id);
  const email = adminUser.data.user?.email;
  if (adminUser.error || !email) throw adminUser.error || new Error('Admin email was not found.');
  const generated = await admin.auth.admin.generateLink({ type: 'magiclink', email, options: { redirectTo: appUrl } });
  if (generated.error) throw generated.error;
  const verified = await anon.auth.verifyOtp({ token_hash: generated.data.properties.hashed_token, type: 'magiclink' });
  if (verified.error || !verified.data.session) throw verified.error || new Error('Temporary session was not created.');
  const session = verified.data.session;

  async function functionRequest(name: string, init?: RequestInit) {
    const response = await fetch(`${functionsUrl}/${name}`, {
      ...init,
      headers: {
        apikey: publishableKey,
        authorization: `Bearer ${session.access_token}`,
        ...(init?.headers || {}),
      },
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) throw new Error(`${name} returned ${response.status}: ${JSON.stringify(body)}`);
    return body;
  }

  try {
    const created = await functionRequest('ci-campaigns', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        mode: 'bulk',
        namePrefix: 'MAPA-7P catálogo',
        videoIds: eligibleVideos.map(video => video.video_id),
        productId: PRODUCT_ID,
        productName: PRODUCT_NAME,
        offerCode: 'vyqym0gx',
        destinationUrl: HOTLINK,
        trackingParameter: 'src',
        ctaLabel: 'Conheça o MAPA-7P',
        positions: POSITIONS,
        utmSource: 'youtube',
        utmMedium: 'organic',
        utmCampaign: 'mapa7p-youtube',
        startsAt: new Date(Date.now() - 60_000).toISOString(),
        status: 'active',
      }),
    });

    const listed = await functionRequest('ci-campaigns');
    const allTargets = (listed.campaigns as Campaign[])
      .filter(campaign => campaign.product_id === PRODUCT_ID && isTargetPosition(campaign.cta_position));
    const eligibleTargets = allTargets.filter(campaign => eligibleIds.has(campaign.video_id));
    const shortCampaignIdsAfter = allTargets
      .filter(campaign => shortIds.has(campaign.video_id))
      .map(campaign => campaign.campaign_id)
      .sort();
    if (JSON.stringify(shortCampaignIdsAfter) !== JSON.stringify(shortCampaignIdsBefore)) {
      throw new Error('The batch changed MAPA-7P campaigns associated with Shorts.');
    }

    const frequencies = new Map<string, number>();
    for (const campaign of eligibleTargets) {
      const position = campaign.cta_position as Position;
      const key = campaignKey(campaign.video_id, position);
      frequencies.set(key, (frequencies.get(key) || 0) + 1);
      if (campaign.slug !== expectedSlug(campaign.video_id, position)) {
        throw new Error(`Campaign ${campaign.campaign_id} has unexpected slug ${campaign.slug}.`);
      }
      const trackingCode = TRACKING_POSITION_CODES[position];
      if (!new RegExp(`^yt\\|[A-Za-z0-9]+\\|${trackingCode}\\|[A-Za-z0-9]+$`).test(campaign.tracking_code)) {
        throw new Error(`Campaign ${campaign.campaign_id} has unexpected tracking code.`);
      }
      if (campaign.status !== 'active') {
        throw new Error(`Campaign ${campaign.campaign_id} is not active.`);
      }
    }
    for (const video of eligibleVideos) {
      for (const position of POSITIONS) {
        const count = frequencies.get(campaignKey(video.video_id, position)) || 0;
        if (count !== 1) throw new Error(`Expected one ${position} campaign for ${video.video_id}, found ${count}.`);
      }
    }

    const campaignIds = eligibleTargets.map(campaign => campaign.campaign_id);
    const beforeClicks = await admin.from('ci_click_events')
      .select('*', { count: 'exact', head: true })
      .in('campaign_id', campaignIds);
    if (beforeClicks.error) throw beforeClicks.error;
    await validateRedirects(eligibleTargets);
    const afterClicks = await admin.from('ci_click_events')
      .select('*', { count: 'exact', head: true })
      .in('campaign_id', campaignIds);
    if (afterClicks.error) throw afterClicks.error;
    if (afterClicks.count !== beforeClicks.count) {
      throw new Error('HEAD validation coincided with an unexpected click-count change. No click was removed.');
    }

    const samples = [eligibleVideos[0], eligibleVideos[Math.floor(eligibleVideos.length / 2)], eligibleVideos.at(-1)]
      .filter((video): video is CatalogVideo => Boolean(video))
      .map(video => ({
        videoId: video.video_id,
        title: video.title,
        contentType: video.content_type,
        links: Object.fromEntries(POSITIONS.map(position => [position, `${PUBLIC_BASE}${expectedSlug(video.video_id, position)}`])),
      }));

    console.log(JSON.stringify({
      ok: true,
      mode: 'apply',
      auditBefore: audit,
      created: created.created,
      skipped: created.skipped,
      finalTargetCampaigns: eligibleTargets.length,
      shortCampaignsBefore: shortCampaignIdsBefore.length,
      shortCampaignsAfter: shortCampaignIdsAfter.length,
      redirectsValidated: eligibleTargets.length,
      clickEventsBefore: beforeClicks.count,
      clickEventsAfter: afterClicks.count,
      samples,
    }, null, 2));
  } finally {
    await anon.auth.signOut({ scope: 'local' });
  }
}

main().catch((error: unknown) => {
  console.error(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : 'Unknown catalog rollout failure' }));
  process.exitCode = 1;
});
