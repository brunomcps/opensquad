// Teste manual da esteira de DMs: roda UMA varredura e imprime o resumo.
// Uso: npx tsx --env-file=../../.env server/scripts/test-ig-responder.ts
import { pollDmsOnce } from '../services/igResponder.js';

const resumo = await pollDmsOnce();
console.log('RESULTADO:', JSON.stringify(resumo, null, 1));
