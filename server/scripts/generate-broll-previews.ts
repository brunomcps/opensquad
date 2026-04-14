/**
 * Generate animated WebP previews for all b-rolls and upload to Supabase Storage.
 * Usage: npx tsx --env-file=../.env server/scripts/generate-broll-previews.ts
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.resolve(__dirname, '../../data/brolls.json');
const PREVIEW_DIR = path.resolve(__dirname, '../../data/broll-previews');

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);
const SUPABASE_URL = process.env.SUPABASE_URL!;

if (!fs.existsSync(PREVIEW_DIR)) fs.mkdirSync(PREVIEW_DIR, { recursive: true });

function generatePreview(filepath: string, id: string): string | null {
  const outPath = path.join(PREVIEW_DIR, `${id}.webp`);
  try {
    execSync(
      `ffmpeg -y -i "${filepath}" -ss 1 -t 3 -vf "fps=8,scale=280:-1" -c:v libwebp -quality 50 -loop 0 "${outPath}"`,
      { timeout: 30000, stdio: 'ignore' }
    );
    return outPath;
  } catch {
    return null;
  }
}

async function main() {
  const brolls: any[] = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
  console.log(`Processing ${brolls.length} b-rolls...\n`);

  for (const broll of brolls) {
    if (!broll.filepath || !fs.existsSync(broll.filepath)) {
      console.log(`  ${broll.id}: file not found, skipping`);
      continue;
    }

    // Generate preview
    console.log(`  ${broll.id}: generating preview...`);
    const previewPath = generatePreview(broll.filepath, broll.id);
    if (!previewPath) { console.log(`    FAILED`); continue; }

    const size = fs.statSync(previewPath).size;
    console.log(`    ${(size / 1024).toFixed(0)}KB`);

    // Upload to Supabase Storage
    const buf = fs.readFileSync(previewPath);
    const { error } = await supabase.storage.from('thumbnails').upload(
      `broll-previews/${broll.id}.webp`, buf,
      { contentType: 'image/webp', upsert: true }
    );
    if (error) { console.log(`    Upload error: ${error.message}`); continue; }

    // Update DB with preview URL
    const previewUrl = `${SUPABASE_URL}/storage/v1/object/public/thumbnails/broll-previews/${broll.id}.webp`;
    await supabase.from('brolls').update({ preview_url: previewUrl }).eq('id', broll.id);
    console.log(`    Uploaded OK`);
  }

  console.log('\nDone!');
}

main();
