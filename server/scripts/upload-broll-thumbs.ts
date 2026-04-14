import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const THUMB_DIR = path.resolve(__dirname, '../../data/thumbnails');

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);
const SUPABASE_URL = process.env.SUPABASE_URL!;

async function main() {
  const files = fs.readdirSync(THUMB_DIR).filter(f => f.endsWith('.jpg'));
  console.log(`Found ${files.length} thumbnails`);

  for (const file of files) {
    const buf = fs.readFileSync(path.join(THUMB_DIR, file));
    const { error } = await supabase.storage.from('thumbnails').upload('brolls/' + file, buf, {
      contentType: 'image/jpeg',
      upsert: true,
    });
    if (error) { console.error(`  ${file}: ${error.message}`); continue; }

    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/thumbnails/brolls/${file}`;
    const id = file.replace('.jpg', '');
    const { error: e2 } = await supabase.from('brolls').update({ thumbnail_url: publicUrl }).eq('id', id);
    if (e2) console.error(`  DB update ${id}: ${e2.message}`);
    else console.log(`  ${file} -> ${id} OK`);
  }
  console.log('Done!');
}

main();
