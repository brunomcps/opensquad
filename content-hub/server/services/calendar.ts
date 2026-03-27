import { google } from 'googleapis';

// Calendar uses a SEPARATE OAuth token if GOOGLE_CALENDAR_REFRESH_TOKEN is set
// This allows using a different Google account (e.g., contact@brunosalles.com)
// Falls back to YouTube token if not set
const calendarRefreshToken = process.env.GOOGLE_CALENDAR_REFRESH_TOKEN || process.env.YOUTUBE_REFRESH_TOKEN;

const oauth2Client = new google.auth.OAuth2(
  process.env.YOUTUBE_CLIENT_ID,
  process.env.YOUTUBE_CLIENT_SECRET,
  'http://localhost:3000/callback'
);
oauth2Client.setCredentials({ refresh_token: calendarRefreshToken });

const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'primary';

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: string;
  end: string;
  allDay: boolean;
  location?: string;
  htmlLink?: string;
  colorId?: string;
}

export interface CalendarInfo {
  id: string;
  summary: string;
  primary: boolean;
  accessRole: string;
}

export async function listCalendars(): Promise<CalendarInfo[]> {
  const res = await calendar.calendarList.list();
  return (res.data.items || []).map((c) => ({
    id: c.id || '',
    summary: c.summary || '',
    primary: c.primary || false,
    accessRole: c.accessRole || '',
  }));
}

function mapEvent(e: any): CalendarEvent {
  return {
    id: e.id || '',
    summary: e.summary || '(sem título)',
    description: e.description || undefined,
    start: e.start?.dateTime || e.start?.date || '',
    end: e.end?.dateTime || e.end?.date || '',
    allDay: !e.start?.dateTime,
    location: e.location || undefined,
    htmlLink: e.htmlLink || undefined,
    colorId: e.colorId || undefined,
  };
}

export async function getTodayEvents(): Promise<CalendarEvent[]> {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  const res = await calendar.events.list({
    calendarId: CALENDAR_ID,
    timeMin: startOfDay.toISOString(),
    timeMax: endOfDay.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 20,
  });

  return (res.data.items || []).map(mapEvent);
}

export async function getUpcomingEvents(days: number = 7): Promise<CalendarEvent[]> {
  const now = new Date();
  const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  const res = await calendar.events.list({
    calendarId: CALENDAR_ID,
    timeMin: now.toISOString(),
    timeMax: future.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 50,
  });

  return (res.data.items || []).map(mapEvent);
}

export interface CreateEventParams {
  summary: string;
  description?: string;
  startDateTime: string;
  endDateTime: string;
  colorId?: string;
}

export async function createEvent(params: CreateEventParams): Promise<CalendarEvent> {
  const res = await calendar.events.insert({
    calendarId: CALENDAR_ID,
    requestBody: {
      summary: params.summary,
      description: params.description,
      start: { dateTime: params.startDateTime, timeZone: 'America/Sao_Paulo' },
      end: { dateTime: params.endDateTime, timeZone: 'America/Sao_Paulo' },
      colorId: params.colorId,
    },
  });

  return mapEvent(res.data);
}

export async function deleteEvent(eventId: string): Promise<void> {
  await calendar.events.delete({ calendarId: CALENDAR_ID, eventId });
}

// Quick add: natural language like "Gravar vídeo amanhã 14h"
export async function quickAddEvent(text: string): Promise<CalendarEvent> {
  const res = await calendar.events.quickAdd({
    calendarId: CALENDAR_ID,
    text,
  });

  return mapEvent(res.data);
}
