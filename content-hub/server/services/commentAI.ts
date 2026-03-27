const GEMINI_API_KEY = process.env.GOOGLE_AI_STUDIO_API_KEY || '';
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export type CommentCategory = 'pergunta' | 'elogio' | 'critica' | 'spam' | 'neutro';

export interface CommentSuggestion {
  commentId: string;
  category: CommentCategory;
  suggestedReply: string;
  confidence: number; // 0-1
}

interface CommentInput {
  id: string;
  username: string;
  text: string;
  like_count: number;
}

const SYSTEM_PROMPT = `Voce e o assistente do Dr. Bruno Salles, psicologo e neurocientista especialista em TDAH adulto. Ele cria conteudo educativo no Instagram sobre TDAH.

O tom do Bruno e:
- Acessivel e acolhedor, mas com base cientifica
- Usa linguagem direta, sem ser formal demais
- Empatico com quem tem TDAH
- Nao usa emojis em excesso (maximo 1-2 por resposta)
- Respostas curtas e objetivas (1-3 frases)
- Quando alguem pergunta sobre diagnostico/tratamento, orienta a buscar profissional
- Agradece elogios de forma genuina, sem ser generico

CATEGORIAS de comentarios:
- pergunta: Duvida sobre TDAH, tratamento, diagnostico, dicas
- elogio: Elogio ao conteudo, agradecimento, relato positivo
- critica: Critica construtiva ou negativa ao conteudo
- spam: Propaganda, links, conteudo irrelevante
- neutro: Marcacao de amigos, comentarios genericos sem substancia

REGRAS:
- Para spam: resposta vazia (nao responder)
- Para neutro: resposta vazia (nao responder)
- Para perguntas sobre diagnostico/medicacao: sempre orientar buscar profissional
- Para elogios: agradecer de forma personalizada (nao generica)
- Para criticas: responder com respeito e abertura
- Nunca usar "Obrigado pelo comentario!" de forma generica
- Personalizar cada resposta ao contexto do comentario`;

export async function generateCommentSuggestions(
  comments: CommentInput[],
  postCaption: string,
): Promise<CommentSuggestion[]> {
  if (!GEMINI_API_KEY) throw new Error('GOOGLE_AI_STUDIO_API_KEY not set');
  if (comments.length === 0) return [];

  const commentList = comments.map((c, i) =>
    `[${i}] @${c.username} (${c.like_count} likes): "${c.text}"`
  ).join('\n');

  const userPrompt = `Contexto do post: "${postCaption.slice(0, 500)}"

Comentarios para classificar e sugerir respostas:
${commentList}

Para cada comentario, retorne um JSON array com objetos:
{
  "index": number,
  "category": "pergunta" | "elogio" | "critica" | "spam" | "neutro",
  "suggestedReply": string (vazio para spam/neutro),
  "confidence": number (0-1)
}

Retorne APENAS o JSON array, sem markdown, sem explicacao.`;

  const body = {
    contents: [{
      parts: [
        { text: SYSTEM_PROMPT },
        { text: userPrompt },
      ],
    }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048,
    },
  };

  const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (data.error) throw new Error(data.error.message);

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

  // Parse JSON from response (strip markdown fences if present)
  const jsonStr = text.replace(/```json?\s*/g, '').replace(/```/g, '').trim();
  let parsed: any[];
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    console.error('[CommentAI] Failed to parse Gemini response:', text.slice(0, 200));
    throw new Error('Failed to parse AI response');
  }

  return parsed.map((item: any) => ({
    commentId: comments[item.index]?.id || '',
    category: item.category || 'neutro',
    suggestedReply: item.suggestedReply || '',
    confidence: item.confidence || 0.5,
  })).filter((s: CommentSuggestion) => s.commentId);
}
