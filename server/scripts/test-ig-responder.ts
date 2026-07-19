// Teste manual da esteira: roda UMA varredura de DMs + UMA de comentários.
// Uso: npx tsx --env-file=../../.env server/scripts/test-ig-responder.ts
import { pollDmsOnce, pollComentariosOnce } from '../services/igResponder.js';

const resumo = await pollDmsOnce();
console.log('RESULTADO:', JSON.stringify(resumo, null, 1));
const comentarios = await pollComentariosOnce();
console.log('RESULTADO_COMENTARIOS:', JSON.stringify(comentarios, null, 1));
