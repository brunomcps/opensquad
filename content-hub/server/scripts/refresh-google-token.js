/**
 * Regenera o refresh token do Google com TODOS os scopes necessários:
 * - YouTube Data API v3 (upload, manage)
 * - Google Calendar (readonly)
 * - YouTube Analytics (monetary reports)
 *
 * Uso: node --env-file=.env content-hub/server/scripts/refresh-google-token.js
 */
import { google } from 'googleapis';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';

const SCOPES = [
  'https://www.googleapis.com/auth/youtube',
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/yt-analytics.readonly',
  'https://www.googleapis.com/auth/yt-analytics-monetary.readonly',
];

const PORT = 3000;
const REDIRECT_URI = `http://localhost:${PORT}/callback`;

async function getRefreshToken() {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('ERROR: Set YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET in .env first.');
    process.exit(1);
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });

  console.log('');
  console.log('=== Google OAuth — All Scopes ===');
  console.log('');
  console.log('Scopes incluídos:');
  SCOPES.forEach(s => console.log(`  ✓ ${s.split('/').pop()}`));
  console.log('');
  console.log('1. Abrindo navegador...');
  console.log('2. Faça login e autorize TODOS os acessos.');
  console.log('3. O token será salvo automaticamente no .env');
  console.log('');

  exec(`start "" "${authUrl}"`);

  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      if (!req.url?.startsWith('/callback')) return;

      const url = new URL(req.url, `http://localhost:${PORT}`);
      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');

      if (error) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end(`<h1>Erro: ${error}</h1>`);
        server.close();
        reject(new Error(error));
        return;
      }

      if (!code) return;

      try {
        const { tokens } = await oauth2Client.getToken(code);
        const refreshToken = tokens.refresh_token;

        if (!refreshToken) {
          throw new Error('No refresh token. Revoke access at https://myaccount.google.com/permissions and try again.');
        }

        const envPath = path.resolve(process.cwd(), '.env');
        let env = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';

        if (env.includes('YOUTUBE_REFRESH_TOKEN=')) {
          env = env.replace(/YOUTUBE_REFRESH_TOKEN=.*/, `YOUTUBE_REFRESH_TOKEN=${refreshToken}`);
        } else {
          env += `\nYOUTUBE_REFRESH_TOKEN=${refreshToken}\n`;
        }
        fs.writeFileSync(envPath, env);

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<h1>✅ Google OAuth OK!</h1><p>Token com YouTube + Calendar + Analytics salvo no .env</p><p>Pode fechar esta janela e reiniciar o server.</p>');

        console.log('');
        console.log('✅ Refresh token salvo no .env');
        console.log('   Reinicie o Content Hub server para usar os novos scopes.');

        server.close();
        resolve(refreshToken);
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end(`<h1>Erro</h1><p>${err.message}</p>`);
        server.close();
        reject(err);
      }
    });

    server.listen(PORT);
  });
}

getRefreshToken().catch(err => {
  console.error(`\nERRO: ${err.message}`);
  process.exit(1);
});
