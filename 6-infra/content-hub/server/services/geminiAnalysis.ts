import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PRODUCTIONS_PATH = path.resolve(__dirname, '../../data/productions.json');

const API_KEY = process.env.GOOGLE_AI_STUDIO_API_KEY;
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

interface Block {
  id: string;
  text: string;
  startTime: string;
  endTime: string;
}

interface LowerThirdSuggestion {
  blockId: string;
  type: 'name-id' | 'concept' | 'topic';
  text: string;
  subtitle?: string;
  reason: string;
}

export async function suggestLowerThirds(
  productionTitle: string,
  blocks: Block[]
): Promise<LowerThirdSuggestion[]> {
  if (!API_KEY) throw new Error('GOOGLE_AI_STUDIO_API_KEY not configured in .env');

  // Compact format: 1 line per block to reduce token count
  const transcript = blocks.map((b) =>
    `${b.id}|${b.startTime}|${b.endTime}|${b.text}`
  ).join('\n');

  const prompt = `Você é especialista em pós-produção de vídeos educacionais sobre TDAH e neurociência do canal Dr. Bruno Salles, PhD.

Analise a transcrição abaixo e sugira lower thirds (textos sobrepostos no vídeo) para os momentos mais relevantes.

## Tipos de Lower Third disponíveis:

1. **name-id**: Identificação do speaker. Usar na PRIMEIRA vez que Bruno se apresenta ou menciona seu nome/credencial. Texto: nome, Subtítulo: credencial.
2. **concept**: Termo científico ou conceito-chave. Usar quando um conceito importante é mencionado pela PRIMEIRA vez (ex: dopamina, córtex pré-frontal, amígdala, função executiva). Texto: o termo em MAIÚSCULAS.
3. **topic**: Cabeçalho de seção. Usar em transições claras de tema no vídeo. Texto: título da seção, Subtítulo: label do capítulo (ex: "Parte 1", "O Problema").

## Regras:
- NÃO sugira lower third para TODOS os blocos — só onde genuinamente agrega valor
- Concept: máximo 8-10 ao longo do vídeo, apenas conceitos realmente importantes
- Topic: máximo 3-5 transições de seção
- Name ID: geralmente 1 (na apresentação)
- O texto do concept deve ser CURTO (1-3 palavras, ex: "DOPAMINA", "CÓRTEX PRÉ-FRONTAL")

## Vídeo: "${productionTitle}"

## Transcrição (${blocks.length} blocos)
Formato: blockId|startTime|endTime|texto
${transcript}

## Responda APENAS com um JSON array válido, sem markdown, sem code block:
[
  {
    "blockId": "id-do-bloco",
    "type": "concept",
    "text": "DOPAMINA",
    "subtitle": null,
    "reason": "Primeiro uso do conceito-chave"
  }
]`;

  const response = await fetch(`${GEMINI_URL}?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 8192,
      },
      // Disable thinking for faster/simpler response
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${err}`);
  }

  const data = await response.json();

  // Gemini 2.5 may return multiple parts (thinking + response) — concatenate all text parts
  const parts = data.candidates?.[0]?.content?.parts || [];
  const rawText = parts.map((p: any) => p.text || '').join('\n');

  console.log('[gemini] Parts count:', parts.length);
  console.log('[gemini] Raw response length:', rawText.length);
  console.log('[gemini] Raw response preview:', rawText.slice(0, 500));

  const suggestions = parseSuggestions(rawText);
  console.log('[gemini] Parsed suggestions:', suggestions.length);

  return suggestions;
}

function parseSuggestions(raw: string): LowerThirdSuggestion[] {
  let jsonStr = raw.trim();
  const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) jsonStr = codeBlockMatch[1].trim();
  const arrayMatch = jsonStr.match(/\[[\s\S]*\]/);
  if (arrayMatch) jsonStr = arrayMatch[0];

  try {
    const parsed = JSON.parse(jsonStr);
    if (Array.isArray(parsed)) return parsed;
  } catch { /* ignore */ }

  return [];
}

/**
 * Apply lower-third suggestions to production blocks as aiSuggestion.lowerThird
 */
export function applyLowerThirdSuggestions(productionId: string, suggestions: LowerThirdSuggestion[]): number {
  const productions = JSON.parse(fs.readFileSync(PRODUCTIONS_PATH, 'utf-8'));
  const idx = productions.findIndex((p: any) => p.id === productionId);
  if (idx === -1) return 0;

  let applied = 0;
  for (const s of suggestions) {
    const blockIdx = productions[idx].blocks.findIndex((b: any) => b.id === s.blockId);
    if (blockIdx === -1) continue;

    const block = productions[idx].blocks[blockIdx];
    // Don't overwrite existing lower thirds
    if (block.lowerThird) continue;

    if (!block.aiSuggestion) block.aiSuggestion = {};
    block.aiSuggestion.lowerThird = {
      type: s.type,
      text: s.text,
      subtitle: s.subtitle || undefined,
      reason: s.reason,
    };
    applied++;
  }

  productions[idx].updatedAt = new Date().toISOString();
  fs.writeFileSync(PRODUCTIONS_PATH, JSON.stringify(productions, null, 2), 'utf-8');
  return applied;
}
