/**
 * Google Fit Sync — Fetches health data and writes to Supabase metricas_diarias.
 *
 * Ported from _opensquad/_telegram/google_fit_sync.py
 *
 * Data sources:
 *   - Weight (com.google.weight)
 *   - Sleep (com.google.sleep.segment via sessions)
 *   - Heart rate (com.google.heart_rate.bpm)
 *   - Steps (com.google.step_count.delta)
 *   - Calories (com.google.calories.expended)
 *   - Workouts (sessions with activityType 80 = weight training)
 */

import { upsertMetrica } from '../db/bot.js';

const FITNESS_API = 'https://www.googleapis.com/fitness/v1/users/me';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

// BRT offset in ms
const BRT_OFFSET_MS = -3 * 60 * 60 * 1000;

// ============================
// AUTH
// ============================

async function getAccessToken(): Promise<string> {
  const refreshToken = process.env.GOOGLE_FITNESS_REFRESH_TOKEN;
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;

  if (!refreshToken || !clientId || !clientSecret) {
    throw new Error('Missing GOOGLE_FITNESS_REFRESH_TOKEN or YOUTUBE_CLIENT_ID/SECRET');
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`);
  const data = await res.json() as { access_token: string };
  return data.access_token;
}

// ============================
// API CALLS
// ============================

async function apiGet(path: string, token: string): Promise<any> {
  const res = await fetch(`${FITNESS_API}/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return res.json();
}

async function apiAggregate(
  token: string,
  dataTypes: string[],
  startMs: number,
  endMs: number,
  opts?: { bucketByTimeMs?: number; bucketBySession?: boolean },
): Promise<any> {
  const body: any = {
    aggregateBy: dataTypes.map((dt) => ({ dataTypeName: dt })),
    startTimeMillis: startMs,
    endTimeMillis: endMs,
  };
  if (opts?.bucketBySession) {
    body.bucketBySession = { minDurationMillis: 0 };
  } else if (opts?.bucketByTimeMs) {
    body.bucketByTime = { durationMillis: opts.bucketByTimeMs };
  }

  const res = await fetch(`${FITNESS_API}/dataset:aggregate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) return null;
  return res.json();
}

// ============================
// DATA FETCHERS
// ============================

function dayToMillis(dateStr: string): { startMs: number; endMs: number } {
  // Parse as BRT (UTC-3)
  const d = new Date(`${dateStr}T00:00:00-03:00`);
  const startMs = d.getTime();
  const endMs = startMs + 86400000;
  return { startMs, endMs };
}

async function fetchWeight(token: string, startMs: number, endMs: number): Promise<number | null> {
  const result = await apiAggregate(token, ['com.google.weight'], startMs, endMs, {
    bucketByTimeMs: 86400000,
  });
  if (!result?.bucket) return null;
  for (const bucket of result.bucket) {
    for (const dataset of bucket.dataset || []) {
      for (const point of dataset.point || []) {
        for (const val of point.value || []) {
          if (val.fpVal != null) return Math.round(val.fpVal * 10) / 10;
        }
      }
    }
  }
  return null;
}

async function fetchSteps(token: string, startMs: number, endMs: number): Promise<number | null> {
  const result = await apiAggregate(token, ['com.google.step_count.delta'], startMs, endMs, {
    bucketByTimeMs: 86400000,
  });
  if (!result?.bucket) return null;
  let total = 0;
  for (const bucket of result.bucket) {
    for (const dataset of bucket.dataset || []) {
      for (const point of dataset.point || []) {
        for (const val of point.value || []) {
          if (val.intVal != null) total += val.intVal;
        }
      }
    }
  }
  return total > 0 ? total : null;
}

async function fetchCalories(token: string, startMs: number, endMs: number): Promise<number | null> {
  const result = await apiAggregate(token, ['com.google.calories.expended'], startMs, endMs, {
    bucketByTimeMs: 86400000,
  });
  if (!result?.bucket) return null;
  let total = 0;
  for (const bucket of result.bucket) {
    for (const dataset of bucket.dataset || []) {
      for (const point of dataset.point || []) {
        for (const val of point.value || []) {
          if (val.fpVal != null) total += val.fpVal;
        }
      }
    }
  }
  return total > 0 ? Math.round(total) : null;
}

async function fetchHeartRate(
  token: string,
  startMs: number,
  endMs: number,
): Promise<{ avg: number | null; resting: number | null }> {
  const result = await apiAggregate(token, ['com.google.heart_rate.bpm'], startMs, endMs, {
    bucketByTimeMs: 86400000,
  });
  if (!result?.bucket) return { avg: null, resting: null };

  const avgs: number[] = [];
  const mins: number[] = [];
  for (const bucket of result.bucket) {
    for (const dataset of bucket.dataset || []) {
      for (const point of dataset.point || []) {
        const vals = point.value || [];
        if (vals.length >= 3) {
          avgs.push(vals[0].fpVal);
          mins.push(vals[2].fpVal);
        } else if (vals.length >= 1) {
          avgs.push(vals[0].fpVal);
        }
      }
    }
  }

  const avg = avgs.length ? Math.round(avgs.reduce((a, b) => a + b, 0) / avgs.length) : null;
  const resting = mins.length ? Math.round(Math.min(...mins)) : null;
  return { avg, resting };
}

async function fetchSleep(
  token: string,
  targetDate: string,
): Promise<{
  total: number;
  dormiu: string;
  acordou: string;
  leve: number;
  profundo: number;
  rem: number;
} | null> {
  // Search for sleep sessions: 18:00 prev day to 18:00 target day (BRT)
  const prevEvening = new Date(`${targetDate}T18:00:00-03:00`);
  prevEvening.setDate(prevEvening.getDate() - 1);
  const dayEvening = new Date(`${targetDate}T18:00:00-03:00`);

  const startIso = prevEvening.toISOString();
  const endIso = dayEvening.toISOString();

  const sessionsData = await apiGet(
    `sessions?activityType=72&startTime=${encodeURIComponent(startIso)}&endTime=${encodeURIComponent(endIso)}`,
    token,
  );
  if (!sessionsData?.session?.length) return null;

  // Pick longest session
  const best = sessionsData.session.reduce((a: any, b: any) => {
    const durA = Number(a.endTimeMillis) - Number(a.startTimeMillis);
    const durB = Number(b.endTimeMillis) - Number(b.startTimeMillis);
    return durA > durB ? a : b;
  });

  const startMs = Number(best.startTimeMillis);
  const endMs = Number(best.endTimeMillis);
  const totalHours = Math.round(((endMs - startMs) / 3600000) * 10) / 10;

  // Fetch detailed stages
  const stagesResult = await apiAggregate(token, ['com.google.sleep.segment'], startMs, endMs);
  const stages = { leve: 0, profundo: 0, rem: 0 };

  if (stagesResult?.bucket) {
    for (const bucket of stagesResult.bucket) {
      for (const dataset of bucket.dataset || []) {
        for (const point of dataset.point || []) {
          const pStart = Number(point.startTimeNanos || 0) / 1000000;
          const pEnd = Number(point.endTimeNanos || 0) / 1000000;
          const durationMin = (pEnd - pStart) / 60000;
          const stageType = point.value?.[0]?.intVal || 0;

          if (stageType === 4) stages.leve += durationMin;
          else if (stageType === 5) stages.profundo += durationMin;
          else if (stageType === 6) stages.rem += durationMin;
        }
      }
    }
  }

  const dormiu = new Date(startMs + BRT_OFFSET_MS + new Date().getTimezoneOffset() * 60000);
  const acordou = new Date(endMs + BRT_OFFSET_MS + new Date().getTimezoneOffset() * 60000);

  // Format as BRT time strings
  const formatBRT = (ms: number) => {
    const d = new Date(ms);
    // Convert to BRT
    const brt = new Date(d.getTime() + (d.getTimezoneOffset() * 60000) + BRT_OFFSET_MS);
    return `${String(brt.getHours()).padStart(2, '0')}:${String(brt.getMinutes()).padStart(2, '0')}`;
  };

  return {
    total: totalHours,
    dormiu: formatBRT(startMs),
    acordou: formatBRT(endMs),
    leve: Math.round((stages.leve / 60) * 10) / 10,
    profundo: Math.round((stages.profundo / 60) * 10) / 10,
    rem: Math.round((stages.rem / 60) * 10) / 10,
  };
}

async function fetchWorkouts(
  token: string,
  startMs: number,
  endMs: number,
): Promise<Array<{ tipo: string; duracao_min: number; inicio: string }>> {
  const startIso = new Date(startMs).toISOString();
  const endIso = new Date(endMs).toISOString();

  const sessionsData = await apiGet(
    `sessions?startTime=${encodeURIComponent(startIso)}&endTime=${encodeURIComponent(endIso)}`,
    token,
  );
  if (!sessionsData?.session) return [];

  const activityNames: Record<number, string> = {
    80: 'musculacao', 8: 'corrida', 7: 'caminhada',
    17: 'escada', 1: 'bike', 9: 'aerobico',
  };
  const validTypes = new Set([80, 8, 7, 17, 1, 9, 10, 11, 12, 13, 14, 15, 16, 25, 97, 98]);

  const formatBRT = (ms: number) => {
    const d = new Date(ms);
    const brt = new Date(d.getTime() + (d.getTimezoneOffset() * 60000) + BRT_OFFSET_MS);
    return `${String(brt.getHours()).padStart(2, '0')}:${String(brt.getMinutes()).padStart(2, '0')}`;
  };

  return sessionsData.session
    .filter((s: any) => validTypes.has(s.activityType || 0))
    .map((s: any) => ({
      tipo: activityNames[s.activityType] || `atividade_${s.activityType}`,
      duracao_min: Math.round((Number(s.endTimeMillis) - Number(s.startTimeMillis)) / 60000),
      inicio: formatBRT(Number(s.startTimeMillis)),
    }));
}

// ============================
// SYNC
// ============================

export async function syncDay(dateStr: string): Promise<{
  date: string;
  peso: number | null;
  sono: number | null;
  passos: number | null;
  hr_media: number | null;
  hr_repouso: number | null;
  calorias: number | null;
}> {
  const token = await getAccessToken();
  const { startMs, endMs } = dayToMillis(dateStr);

  // Fetch all in parallel
  const [weight, steps, calories, hr, sleep, workouts] = await Promise.all([
    fetchWeight(token, startMs, endMs),
    fetchSteps(token, startMs, endMs),
    fetchCalories(token, startMs, endMs),
    fetchHeartRate(token, startMs, endMs),
    fetchSleep(token, dateStr),
    fetchWorkouts(token, startMs, endMs),
  ]);

  const totalTreinoDuracao = workouts.reduce((sum, w) => sum + w.duracao_min, 0) || null;

  const metrica = {
    date: dateStr,
    peso: weight,
    sono: sleep?.total ?? null,
    sono_profundo: sleep?.profundo ?? null,
    sono_leve: sleep?.leve ?? null,
    sono_rem: sleep?.rem ?? null,
    dormiu: sleep?.dormiu ?? null,
    acordou: sleep?.acordou ?? null,
    passos: steps,
    hr_media: hr.avg,
    hr_repouso: hr.resting,
    calorias: calories,
    treino_duracao: totalTreinoDuracao,
    treinos: workouts.length > 0 ? workouts : null,
    source: 'google_fit',
  };

  await upsertMetrica(metrica);

  console.log(`[GoogleFit] Synced ${dateStr}: passos=${steps}, sono=${sleep?.total}h, FC=${hr.resting}bpm`);

  return metrica;
}

export async function syncToday(): Promise<any> {
  // Get today in BRT
  const now = new Date();
  const brt = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + BRT_OFFSET_MS);
  const dateStr = brt.toISOString().slice(0, 10);
  return syncDay(dateStr);
}
