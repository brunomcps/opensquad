/**
 * Push locally-scraped data (TikTok, LinkedIn, Twitter) to the remote Railway deploy.
 *
 * Usage: npx tsx --env-file=../.env server/scripts/push-to-remote.ts
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../../data');

const REMOTE_URL = process.env.REMOTE_CONTENT_HUB_URL || 'https://web-production-47e8f.up.railway.app';
const SYNC_SECRET = process.env.SYNC_PUSH_SECRET || '';

const FILES_TO_PUSH = [
  'tiktok-videos.json',
  'linkedin-posts.json',
  'twitter-posts.json',
];

async function main() {
  if (!SYNC_SECRET) {
    console.error('❌ SYNC_PUSH_SECRET not set in .env');
    process.exit(1);
  }

  const files: Record<string, any> = {};
  let count = 0;

  for (const filename of FILES_TO_PUSH) {
    const filePath = path.join(DATA_DIR, filename);
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      files[filename] = JSON.parse(raw);
      count++;
      console.log(`📦 ${filename} (${(raw.length / 1024).toFixed(1)} KB)`);
    } else {
      console.log(`⏭️  ${filename} — not found, skipping`);
    }
  }

  if (count === 0) {
    console.log('Nothing to push. Run sync locally first.');
    return;
  }

  console.log(`\n🚀 Pushing ${count} files to ${REMOTE_URL}...`);

  const res = await fetch(`${REMOTE_URL}/api/sync-push`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-sync-secret': SYNC_SECRET,
    },
    body: JSON.stringify({ files }),
  });

  const data = await res.json();
  if (data.ok) {
    console.log(`✅ Done! Saved: ${data.saved.join(', ')}`);
  } else {
    console.error(`❌ Error: ${data.error}`);
  }
}

main();
