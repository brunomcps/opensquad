import { Router } from 'express';
import { getTodayEvents, getUpcomingEvents, listCalendars, createEvent, quickAddEvent, deleteEvent } from '../services/calendar.js';

const router = Router();

router.get('/list', async (_req, res) => {
  try {
    const calendars = await listCalendars();
    res.json({ ok: true, calendars });
  } catch (err: any) {
    console.error('Calendar list error:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/today', async (_req, res) => {
  try {
    const events = await getTodayEvents();
    res.json({ ok: true, events });
  } catch (err: any) {
    console.error('Calendar API error:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/upcoming', async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const events = await getUpcomingEvents(days);
    res.json({ ok: true, events });
  } catch (err: any) {
    console.error('Calendar API error:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Create event with specific times
router.post('/events', async (req, res) => {
  try {
    const { summary, description, startDateTime, endDateTime, colorId } = req.body;
    if (!summary || !startDateTime || !endDateTime) {
      return res.status(400).json({ ok: false, error: 'summary, startDateTime, endDateTime are required' });
    }
    const event = await createEvent({ summary, description, startDateTime, endDateTime, colorId });
    res.json({ ok: true, event });
  } catch (err: any) {
    console.error('Calendar create error:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Quick add: natural language like "Gravar vídeo amanhã 14h"
router.post('/quick-add', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ ok: false, error: 'text is required' });
    }
    const event = await quickAddEvent(text);
    res.json({ ok: true, event });
  } catch (err: any) {
    console.error('Calendar quick-add error:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.delete('/events/:id', async (req, res) => {
  try {
    await deleteEvent(req.params.id);
    res.json({ ok: true });
  } catch (err: any) {
    console.error('Calendar delete error:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
