import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import youtubeRouter from './routes/youtube.js';
import publicationsRouter from './routes/publications.js';
import tiktokRouter from './routes/tiktok.js';
import brollsRouter from './routes/brolls.js';
import crosspostRouter from './routes/crosspost.js';
import productionsRouter from './routes/productions.js';
import instagramRouter from './routes/instagram.js';
import facebookRouter from './routes/facebook.js';
import threadsRouter from './routes/threads.js';
import linkedinRouter from './routes/linkedin.js';
import twitterRouter from './routes/twitter.js';
import calendarRouter from './routes/calendar.js';
import hotmartRouter from './routes/hotmart.js';
import analyticsRouter from './routes/analytics.js';
import fichasRouter from './routes/fichas.js';
import commentsRouter from './routes/comments.js';
import youtubeAnalyticsRouter from './routes/youtubeAnalytics.js';
import viralRadarRouter from './routes/viralRadar.js';
import competitorsRouter from './routes/competitors.js';
import syncPushRouter from './routes/syncPush.js';
import { startBRollWatcher } from './services/brollWatcher.js';
import { refreshTokenIfNeeded } from './services/instagram.js';
import { refreshFacebookTokenIfNeeded } from './services/facebook.js';
import { refreshThreadsTokenIfNeeded } from './services/threads.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT) || 3001;

// B-Roll library path (relative to project root)
const BROLL_LIBRARY = path.resolve(__dirname, '../../_opensquad/_library/brolls');

app.use(express.json({ limit: '50mb' }));

// Basic Auth in production (skip for sync-push which uses its own secret)
if (process.env.NODE_ENV === 'production' && process.env.AUTH_USER && process.env.AUTH_PASS) {
  app.use((req, res, next) => {
    // Skip auth for sync-push (has its own secret) and health check
    if (req.path === '/api/sync-push' || req.path === '/api/health') return next();

    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Basic ')) {
      res.setHeader('WWW-Authenticate', 'Basic realm="Content Hub"');
      return res.status(401).send('Authentication required');
    }
    const [user, pass] = Buffer.from(auth.split(' ')[1], 'base64').toString().split(':');
    if (user === process.env.AUTH_USER && pass === process.env.AUTH_PASS) return next();

    res.setHeader('WWW-Authenticate', 'Basic realm="Content Hub"');
    return res.status(401).send('Invalid credentials');
  });
}

// In production, serve the built frontend
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.resolve(__dirname, '../dist')));
}

app.use('/api/youtube', youtubeRouter);
app.use('/api/publications', publicationsRouter);
app.use('/api/tiktok', tiktokRouter);
app.use('/api/brolls', brollsRouter);
app.use('/api/crosspost', crosspostRouter);
app.use('/api/instagram', instagramRouter);
app.use('/api/facebook', facebookRouter);
app.use('/api/threads', threadsRouter);
app.use('/api/linkedin', linkedinRouter);
app.use('/api/twitter', twitterRouter);
app.use('/api/productions', productionsRouter);
app.use('/api/calendar', calendarRouter);
app.use('/api/hotmart', hotmartRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/fichas', fichasRouter);
app.use('/api/comments', commentsRouter);
app.use('/api/yt-analytics', youtubeAnalyticsRouter);
app.use('/api/viral-radar', viralRadarRouter);
app.use('/api/competitors', competitorsRouter);
app.use('/api/sync-push', syncPushRouter);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

// SPA fallback: serve index.html for non-API routes in production
if (process.env.NODE_ENV === 'production') {
  app.get('/{*path}', (_req, res) => {
    res.sendFile(path.resolve(__dirname, '../dist/index.html'));
  });
}

app.listen(PORT, async () => {
  console.log(`Content Hub API running on http://localhost:${PORT}`);
  startBRollWatcher(BROLL_LIBRARY);
  await refreshTokenIfNeeded();
  await refreshFacebookTokenIfNeeded();
  await refreshThreadsTokenIfNeeded();
});
