import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { findMatches, ensureYTThumbnail, getYTThumbPath, getTTThumbPath } from '../services/matching.js';
import { getChannelVideos } from '../services/youtube.js';
import { getCachedTikTokVideos } from '../services/tiktok.js';
import { getContentGroups, saveContentGroups } from '../db/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GROUPS_PATH = path.resolve(__dirname, '../../data/content-groups.json');

const router = Router();

export interface ContentGroup {
  id: string;
  name: string;
  createdAt: string;
  platforms: {
    youtube?: { videoId: string; url: string };
    tiktok?: { videoId: string; url: string };
    instagram?: { postId: string; url: string };
  };
}

function readGroupsFromFile(): ContentGroup[] {
  try { return JSON.parse(fs.readFileSync(GROUPS_PATH, 'utf-8')); } catch { return []; }
}

function writeGroupsToFile(groups: ContentGroup[]) {
  try { fs.writeFileSync(GROUPS_PATH, JSON.stringify(groups, null, 2), 'utf-8'); } catch {}
}

async function readGroups(): Promise<ContentGroup[]> {
  try { const db = await getContentGroups(); if (db.length > 0) return db as ContentGroup[]; } catch {}
  return readGroupsFromFile();
}

async function writeGroups(groups: ContentGroup[]) {
  try { await saveContentGroups(groups); } catch {}
  writeGroupsToFile(groups);
}

// GET all content groups
router.get('/groups', async (_req, res) => {
  res.json({ ok: true, groups: await readGroups() });
});

// POST create/update a content group (manual link)
router.post('/groups', async (req, res) => {
  const groups = await readGroups();
  const { name, youtube, tiktok, instagram } = req.body;

  const group: ContentGroup = {
    id: crypto.randomUUID(),
    name: name || 'Sem nome',
    createdAt: new Date().toISOString(),
    platforms: {},
  };

  if (youtube) group.platforms.youtube = youtube;
  if (tiktok) group.platforms.tiktok = tiktok;
  if (instagram) group.platforms.instagram = instagram;

  groups.push(group);
  await writeGroups(groups);
  res.status(201).json({ ok: true, group });
});

// PUT update a group
router.put('/groups/:id', async (req, res) => {
  const groups = await readGroups();
  const idx = groups.findIndex((g) => g.id === req.params.id);
  if (idx === -1) return res.status(404).json({ ok: false, error: 'Not found' });

  const { name, youtube, tiktok, instagram } = req.body;
  if (name !== undefined) groups[idx].name = name;
  if (youtube !== undefined) groups[idx].platforms.youtube = youtube;
  if (tiktok !== undefined) groups[idx].platforms.tiktok = tiktok;
  if (instagram !== undefined) groups[idx].platforms.instagram = instagram;

  await writeGroups(groups);
  res.json({ ok: true, group: groups[idx] });
});

// DELETE a group
router.delete('/groups/:id', async (req, res) => {
  const groups = (await readGroups()).filter((g) => g.id !== req.params.id);
  await writeGroups(groups);
  res.json({ ok: true });
});

// POST auto-match: find matches between YouTube and TikTok
router.post('/auto-match', async (_req, res) => {
  try {
    const ytVideos = await getChannelVideos();
    const ttData = await getCachedTikTokVideos();
    const groups = await readGroups();

    // Only match YouTube Shorts (< 300s) against TikTok
    const ytShorts = ytVideos.filter((v) => v.isShort);

    // Exclude already linked videos
    const linkedYT = new Set(groups.map((g) => g.platforms.youtube?.videoId).filter(Boolean));
    const linkedTT = new Set(groups.map((g) => g.platforms.tiktok?.videoId).filter(Boolean));

    const unlinkedYT = ytShorts.filter((v) => !linkedYT.has(v.id));
    const unlinkedTT = ttData.videos.filter((v) => !linkedTT.has(v.id));

    // Download YT thumbnails for matching
    for (const yt of unlinkedYT) {
      if (yt.thumbnail) {
        await ensureYTThumbnail(yt.id, yt.thumbnail);
      }
    }

    const ytData = unlinkedYT.map((v) => ({
      id: v.id,
      title: v.title,
      description: v.description,
      thumbnailPath: getYTThumbPath(v.id),
    }));

    const ttMatchData = unlinkedTT.map((v) => ({
      id: v.id,
      title: v.title,
      description: v.title, // TikTok "description" is the title field
      thumbnailPath: getTTThumbPath(v.id),
    }));

    const matches = await findMatches(ytData, ttMatchData);

    res.json({
      ok: true,
      matches,
      stats: {
        totalYTShorts: ytShorts.length,
        totalTikTok: ttData.videos.length,
        unlinkedYT: unlinkedYT.length,
        unlinkedTT: unlinkedTT.length,
        matchesFound: matches.length,
      },
    });
  } catch (err: any) {
    console.error('Auto-match error:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST confirm a match (create group from match)
router.post('/confirm-match', async (req, res) => {
  const { ytVideoId, ytTitle, ytUrl, ttVideoId, ttUrl, name } = req.body;
  const groups = await readGroups();

  const group: ContentGroup = {
    id: crypto.randomUUID(),
    name: name || ytTitle || 'Sem nome',
    createdAt: new Date().toISOString(),
    platforms: {
      youtube: { videoId: ytVideoId, url: ytUrl || `https://youtube.com/shorts/${ytVideoId}` },
      tiktok: { videoId: ttVideoId, url: ttUrl || '' },
    },
  };

  groups.push(group);
  await writeGroups(groups);
  res.status(201).json({ ok: true, group });
});

// POST reject a match (just for tracking, doesn't create group)
// We store rejected pairs so auto-match doesn't suggest them again
router.post('/reject-match', (req, res) => {
  // For now, just acknowledge — could persist rejections later
  res.json({ ok: true });
});

export default router;
