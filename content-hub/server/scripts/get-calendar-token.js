/**
 * OAuth para Google Calendar com conta separada (ex: contact@brunosalles.com)
 * Usa o mesmo Google Cloud project (mesmas credenciais), mas gera um refresh token
 * para outra conta Google.
 *
 * Uso: node --env-file=.env content-hub/server/scripts/get-calendar-token.js
 *
 * IMPORTANTE: Quando o navegador abrir, faça login com contact@brunosalles.com
 * (não com a conta do YouTube!)
 */
import { google } from 'googleapis';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';

const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly', 'https://www.googleapis.com/auth/calendar.events'];
const PORT = 3000;
const REDIRECT_URI = `http://localhost:${PORT}/callback`;

async function getCalendarToken() {
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
    login_hint: 'contact@brunosalles.com',
  });

  console.log('');
  console.log('=== Google Calendar OAuth ===');
  console.log('');
  console.log('⚠️  IMPORTANTE: Faça login com contact@brunosalles.com');
  console.log('   (NÃO com brunosallesphd@gmail.com!)');
  console.log('');
  console.log('Abrindo navegador...');
  console.log('');

  exec(`start "" "${authUrl}"`);

  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      if (!req.url?.startsWith('/callback')) return;

      const url = new URL(req.url, `http://localhost:${PORT}`);
      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');

      if (error) {
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
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
          throw new Error('No refresh token. Revoke at https://myaccount.google.com/permissions and retry.');
        }

        const envPath = path.resolve(process.cwd(), '.env');
        let env = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';

        if (env.includes('GOOGLE_CALENDAR_REFRESH_TOKEN=')) {
          env = env.replace(/GOOGLE_CALENDAR_REFRESH_TOKEN=.*/, `GOOGLE_CALENDAR_REFRESH_TOKEN=${refreshToken}`);
        } else {
          env += `\nGOOGLE_CALENDAR_REFRESH_TOKEN=${refreshToken}\n`;
        }
        fs.writeFileSync(envPath, env);

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<h1>✅ Calendar OAuth OK!</h1><p>Token do contact@brunosalles.com salvo no .env</p><p>Reinicie o server do Content Hub.</p>');

        console.log('');
        console.log('✅ GOOGLE_CALENDAR_REFRESH_TOKEN salvo no .env');
        console.log('   Reinicie o Content Hub server.');

        server.close();
        resolve(refreshToken);
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<h1>Erro</h1><p>${err.message}</p>`);
        server.close();
        reject(err);
      }
    });

    server.listen(PORT);
  });
}

getCalendarToken().catch(err => {
  console.error(`\nERRO: ${err.message}`);
  process.exit(1);
});
