import { createClient } from '@supabase/supabase-js';

const VIDEO_ID = '0OkxYzoxzUk';
const VIDEO_TITLE = 'O QUE REALMENTE É TDAH (Não é uma doença)';
const PRODUCT_ID = '6966825';
const PRODUCT_NAME = 'MAPA-7P · Mapeamento de Padrões Dopaminérgico';
const HOTLINK = 'https://go.hotmart.com/K103806991N';
const POSITIONS = ['description', 'pinned_comment', 'comment_reply'] as const;
const POSITION_CODES = { description: 'd', pinned_comment: 'p', comment_reply: 'r' } as const;
const PUBLIC_LINK = /^https:\/\/link\.brunosallesphd\.com\.br\/m7p\/[a-z0-9]{8}$/;

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

const supabaseUrl = requireEnv('SUPABASE_URL').replace(/\/$/, '');
const publishableKey = requireEnv('SUPABASE_KEY');
const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
const appUrl = process.env.CI_PILOT_APP_URL?.trim() || 'https://opensquad-commercial-intelligence.pages.dev';
const functionsUrl = `${supabaseUrl}/functions/v1`;
const authOptions = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(supabaseUrl, serviceRoleKey, authOptions);
const anon = createClient(supabaseUrl, publishableKey, authOptions);

async function main() {
  const member = await admin.from('ci_app_members').select('user_id').eq('role', 'admin').eq('enabled', true).limit(1).maybeSingle();
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
    const initial = await functionRequest('ci-campaigns');
    const video = initial.catalog?.videos?.find((item: { video_id: string }) => item.video_id === VIDEO_ID);
    if (!video) throw new Error(`Video ${VIDEO_ID} was not found in the synchronized catalog.`);

    const created = await functionRequest('ci-campaigns', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        mode: 'bulk',
        namePrefix: 'MAPA-7P piloto',
        videoIds: [VIDEO_ID],
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
    const campaigns = listed.campaigns
      .filter((campaign: any) => campaign.video_id === VIDEO_ID && campaign.product_id === PRODUCT_ID && POSITIONS.includes(campaign.cta_position))
      .sort((left: any, right: any) => POSITIONS.indexOf(left.cta_position) - POSITIONS.indexOf(right.cta_position));
    if (campaigns.length !== 3) throw new Error(`Expected 3 pilot campaigns, found ${campaigns.length}.`);

    const campaignIds = campaigns.map((campaign: any) => campaign.campaign_id);
    const beforeClicks = await admin.from('ci_click_events').select('*', { count: 'exact', head: true }).in('campaign_id', campaignIds);
    if (beforeClicks.error) throw beforeClicks.error;

    const links = [];
    for (const campaign of campaigns) {
      if (!campaign.redirectUrl || !PUBLIC_LINK.test(campaign.redirectUrl)) {
        throw new Error(`Campaign ${campaign.campaign_id} did not return the branded public URL.`);
      }
      const expectedCode = POSITION_CODES[campaign.cta_position as keyof typeof POSITION_CODES];
      if (!campaign.tracking_code.includes(`|${expectedCode}|`)) {
        throw new Error(`Campaign ${campaign.campaign_id} has an unexpected tracking code.`);
      }
      const response = await fetch(campaign.redirectUrl, { method: 'HEAD', redirect: 'manual' });
      if (response.status !== 302) throw new Error(`${campaign.redirectUrl} returned ${response.status}, expected 302.`);
      const location = response.headers.get('location');
      if (!location) throw new Error(`${campaign.redirectUrl} did not return Location.`);
      const destination = new URL(location);
      if (`${destination.origin}${destination.pathname}` !== HOTLINK || destination.searchParams.get('src') !== campaign.tracking_code) {
        throw new Error(`${campaign.redirectUrl} returned an unexpected destination.`);
      }
      links.push({
        position: campaign.cta_position,
        trackingCode: campaign.tracking_code,
        publicUrl: campaign.redirectUrl,
        redirectStatus: response.status,
      });
    }

    const afterClicks = await admin.from('ci_click_events').select('*', { count: 'exact', head: true }).in('campaign_id', campaignIds);
    if (afterClicks.error) throw afterClicks.error;
    if (afterClicks.count !== beforeClicks.count) throw new Error('HEAD validation created an unexpected click event.');

    const descriptionCampaign = campaigns.find((campaign: any) => campaign.cta_position === 'description');
    const descriptionLink = links.find(link => link.position === 'description');
    if (!descriptionCampaign || !descriptionLink) throw new Error('Description campaign was not found for click smoke.');
    const smokeStartedAt = new Date().toISOString();
    const technicalRedirect = await fetch(descriptionLink.publicUrl, {
      redirect: 'manual',
      headers: { 'user-agent': 'Codex-MAPA7P-Pilot-Bot/1.0', referer: appUrl },
    });
    if (technicalRedirect.status !== 302) throw new Error(`Technical click returned ${technicalRedirect.status}, expected 302.`);
    const technicalClicks = await admin.from('ci_click_events')
      .select('click_id,is_bot,referrer_host')
      .eq('campaign_id', descriptionCampaign.campaign_id)
      .gte('clicked_at', smokeStartedAt)
      .order('click_id', { ascending: false });
    if (technicalClicks.error || technicalClicks.data?.length !== 1 || technicalClicks.data[0].is_bot !== true) {
      throw technicalClicks.error || new Error('Technical click was not recorded exactly once as a bot.');
    }
    const removed = await admin.from('ci_click_events').delete().eq('click_id', technicalClicks.data[0].click_id);
    if (removed.error) throw removed.error;
    const finalClicks = await admin.from('ci_click_events').select('*', { count: 'exact', head: true }).in('campaign_id', campaignIds);
    if (finalClicks.error || finalClicks.count !== beforeClicks.count) {
      throw finalClicks.error || new Error('Technical click remained after cleanup.');
    }

    console.log(JSON.stringify({
      ok: true,
      video: { id: VIDEO_ID, title: VIDEO_TITLE },
      created: created.created,
      skipped: created.skipped,
      campaignCount: campaigns.length,
      clickEventsBefore: beforeClicks.count,
      clickEventsAfter: afterClicks.count,
      technicalClickRecordedAsBot: true,
      technicalClickRemoved: true,
      clickEventsFinal: finalClicks.count,
      links,
    }));
  } finally {
    await anon.auth.signOut();
  }
}

main().catch((error: unknown) => {
  console.error(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : 'Unknown pilot failure' }));
  process.exitCode = 1;
});
