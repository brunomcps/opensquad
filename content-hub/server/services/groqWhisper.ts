/**
 * Groq Whisper — transcribes Telegram voice messages.
 *
 * Flow:
 *   1. Get file path from Telegram (getFile API)
 *   2. Download the audio file
 *   3. Send to Groq Whisper API for transcription
 *   4. Return text
 *
 * Free tier: generous limits, model whisper-large-v3-turbo
 */

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

const GROQ_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';
const WHISPER_MODEL = 'whisper-large-v3-turbo';

export async function transcribeVoice(fileId: string): Promise<string> {
  if (!GROQ_API_KEY) {
    console.warn('[Whisper] GROQ_API_KEY not set, skipping transcription');
    return '[audio nao transcrito — GROQ_API_KEY ausente]';
  }
  if (!TELEGRAM_BOT_TOKEN) {
    return '[audio nao transcrito — TELEGRAM_BOT_TOKEN ausente]';
  }

  try {
    // Step 1: Get file path from Telegram
    const fileRes = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}`,
      { signal: AbortSignal.timeout(10_000) }
    );
    const fileData = await fileRes.json() as any;
    if (!fileData.ok || !fileData.result?.file_path) {
      throw new Error(`Telegram getFile failed: ${fileData.description || 'unknown'}`);
    }
    const filePath = fileData.result.file_path;

    // Step 2: Download audio from Telegram
    const audioUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`;
    const audioRes = await fetch(audioUrl, { signal: AbortSignal.timeout(30_000) });
    if (!audioRes.ok) throw new Error(`Download failed: ${audioRes.status}`);
    const audioBlob = await audioRes.blob();

    // Step 3: Send to Groq Whisper
    const formData = new FormData();
    formData.append('file', audioBlob, filePath.split('/').pop() || 'audio.ogg');
    formData.append('model', WHISPER_MODEL);
    formData.append('language', 'pt');
    formData.append('response_format', 'text');

    const whisperRes = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${GROQ_API_KEY}` },
      body: formData,
      signal: AbortSignal.timeout(30_000),
    });

    if (!whisperRes.ok) {
      const err = await whisperRes.text();
      throw new Error(`Groq API error ${whisperRes.status}: ${err.slice(0, 200)}`);
    }

    const text = await whisperRes.text();
    console.log(`[Whisper] Transcribed: "${text.slice(0, 80)}..."`);
    return text.trim();
  } catch (err: any) {
    console.error('[Whisper] Transcription failed:', err.message);
    return `[erro na transcricao: ${err.message.slice(0, 50)}]`;
  }
}
