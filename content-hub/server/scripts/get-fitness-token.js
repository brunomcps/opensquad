/**
 * OAuth para Google Fit — gera refresh token com scopes de fitness.
 * Samsung Health sincroniza pro Google Fit, e esse token permite ler os dados via REST API.
 *
 * Uso: node --env-file=.env content-hub/server/scripts/get-fitness-token.js
 *
 * IMPORTANTE: Quando o navegador abrir, faça login com a conta Google
 * que está sincronizada com o Samsung Health no Galaxy Watch.
 * (provavelmente brunosallesphd@gmail.com)
 *
 * Pré-requisito: Ativar "Fitness API" no Google Cloud Console:
 *   https://console.cloud.google.com/apis/library/fitness.googleapis.com
 */
import { google } from 'googleapis';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';

const SCOPES = [
  'https://www.googleapis.com/auth/fitness.activity.read',
  'https://www.googleapis.com/auth/fitness.body.read',
  'https://www.googleapis.com/auth/fitness.heart_rate.read',
  'https://www.googleapis.com/auth/fitness.sleep.read',
];

const PORT = 3000;
const REDIRECT_URI = `http://localhost:${PORT}/callback`;
const ENV_VAR_NAME = 'GOOGLE_FITNESS_REFRESH_TOKEN';

async function getFitnessToken() {
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
  console.log('=== Google Fit OAuth ===');
  console.log('');
  console.log('Scopes: activity, body, heart_rate, sleep');
  console.log('');
  console.log('Abrindo navegador...');
  console.log('Faca login com a conta do Samsung Health / Galaxy Watch.');
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

        if (env.includes(`${ENV_VAR_NAME}=`)) {
          env = env.replace(new RegExp(`${ENV_VAR_NAME}=.*`), `${ENV_VAR_NAME}=${refreshToken}`);
        } else {
          env += `\n${ENV_VAR_NAME}=${refreshToken}\n`;
        }
        fs.writeFileSync(envPath, env);

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<h1>Google Fit OAuth OK!</h1><p>${ENV_VAR_NAME} salvo no .env</p><p>Pode fechar esta janela.</p>`);

        console.log('');
        console.log(`${ENV_VAR_NAME} salvo no .env`);
        console.log('Pronto pra usar o google_fit_sync.py');

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

getFitnessToken().catch(err => {
  console.error(`\nERRO: ${err.message}`);
  process.exit(1);
});
