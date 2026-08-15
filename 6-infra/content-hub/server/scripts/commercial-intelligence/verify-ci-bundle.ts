import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd(), 'dist-ci');
if (!fs.existsSync(root)) throw new Error('dist-ci não existe; execute npm run ci:build:web primeiro.');

function files(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? files(target) : [target];
  });
}

const artifacts = files(root).filter(file => /\.(?:html|js|css|json|txt)$/i.test(file));
const contents = artifacts.map(file => fs.readFileSync(file, 'utf8')).join('\n');
const secretNames = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'HOTMART_HOTTOK',
  'CI_BUYER_HMAC_SECRET',
  'CI_CRON_SECRET',
  'HOTMART_CLIENT_SECRET',
  'YOUTUBE_CLIENT_SECRET',
  'YOUTUBE_REFRESH_TOKEN',
];

for (const name of secretNames) {
  if (contents.includes(name)) throw new Error(`Bundle contém nome de segredo proibido: ${name}`);
  const value = process.env[name]?.trim();
  if (value && value.length >= 8 && contents.includes(value)) {
    throw new Error(`Bundle contém o valor de ${name}`);
  }
}

if (!contents.includes('Inteligência Comercial')) {
  throw new Error('Bundle dedicado não contém a aplicação esperada.');
}

console.log(JSON.stringify({
  ok: true,
  files: artifacts.length,
  bytes: artifacts.reduce((total, file) => total + fs.statSync(file).size, 0),
  secretChecks: secretNames.length,
}));
