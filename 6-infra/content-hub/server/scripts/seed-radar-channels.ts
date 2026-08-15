/**
 * seed-radar-channels.ts — Popula radar_channels com o kit inicial aprovado.
 * Uso: npx tsx --env-file=../../.env server/scripts/seed-radar-channels.ts
 *
 * Resolve cada canal por channelId (quando já conhecido dos testes), handle ou busca.
 */

import { resolveChannel } from '../services/nicheRadar/youtubeData.js';
import { upsertChannels, type RadarChannel } from '../db/nicheRadar.js';

type Ref = { name: string; track: 'br' | 'gringo'; channelId?: string; handle?: string; query?: string };

const KIT: Ref[] = [
  // --- TDAH direto BR ---
  { name: 'TDAH Descomplicado', track: 'br', query: 'TDAH Descomplicado' },
  { name: 'Tribo TDAH', track: 'br', channelId: 'UCKt9J7QWwEMd5gkun1YlAnQ' },
  { name: 'TDAH na Vida Real (Nívea Savoy)', track: 'br', channelId: 'UCpJlWWF5rVwW8YRCU_2vKlg' },
  { name: 'Família Tagarela (Autismo & TDAH)', track: 'br', channelId: 'UCz1xVDltULzUhZCJ1TkvnTQ' },
  // --- Neuro/Psi/Saúde mental BR ---
  { name: 'Minutos Psíquicos', track: 'br', channelId: 'UCFiEI1kDHlO9UQtxx0wj-XA' },
  { name: 'Eslen Delanogare', track: 'br', handle: '@CanaldoEslen' },
  { name: 'Dr. Gabriel Tortella', track: 'br', handle: '@Dr.GabrielTortella' },
  { name: 'Christian Dunker', track: 'br', query: 'Christian Dunker Falando nIsso' },
  { name: 'Ana Beatriz Barbosa (PodPeople)', track: 'br', query: 'PodPeople Ana Beatriz Barbosa' },
  { name: 'Andrei Mayer', track: 'br', handle: '@AndreiMayer' },
  { name: 'Doutor Allan Felippe', track: 'br', handle: '@drallanfelippe' },
  { name: 'Neurologia e Psiquiatria', track: 'br', handle: '@NeurologiaePsiquiatria' },
  // --- Gringo (arbitragem + modelar título) ---
  { name: 'How to ADHD', track: 'gringo', channelId: 'UC-nPM1_kSZf91ZGkcgy_95Q' },
  { name: 'Russell Barkley', track: 'gringo', channelId: 'UC0tLWu7ljYVFPiZQfHjTMsA' },
  { name: 'Dr. Tracey Marks', track: 'gringo', channelId: 'UCL2QpphEeZFYwk6-WXD6hpA' },
  { name: 'Andrew Huberman', track: 'gringo', channelId: 'UC2D2CMWXMOVWx7giW1n3LIg' },
  { name: 'ADDitude Magazine', track: 'gringo', channelId: 'UC_3d1NVczqxa-cQzFt2iVSw' },
  { name: 'Understood', track: 'gringo', channelId: 'UCbXMoF3-74hj2lhLCIp3C-A' },
  { name: 'HealthyGamerGG (Dr. K)', track: 'gringo', channelId: 'UClHVl2N3jPEbkNJVx-ItQIQ' },
];

async function main() {
  const resolved: RadarChannel[] = [];
  for (const ref of KIT) {
    try {
      const c = await resolveChannel(ref);
      resolved.push({
        channel_id: c.channel_id,
        name: c.name,
        track: ref.track,
        subscribers: c.subscribers,
        uploads_playlist: c.uploads_playlist,
        origin: 'curated',
        active: true,
      });
      console.log(`✔ ${ref.track.padEnd(6)} ${c.name} (${c.subscribers.toLocaleString()} inscritos)`);
    } catch (e: any) {
      console.warn(`✘ ${ref.name}: ${e.message}`);
    }
  }
  await upsertChannels(resolved);
  console.log(`\nSeed concluído: ${resolved.length}/${KIT.length} canais salvos em radar_channels.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
