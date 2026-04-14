/**
 * Supabase queries for Chefe Bruno bot (tarefas, treino, metricas, productions).
 */
import { supabase } from './client.js';

// ===========================================
// TAREFAS
// ===========================================

export interface Tarefa {
  id: string;
  slug: string;
  title: string;
  pillar: string;
  status: string;
  prioridade: string;
  due: string | null;
  tags: string[];
}

export async function getActiveTarefas(): Promise<Tarefa[]> {
  const { data } = await supabase
    .from('tarefas')
    .select('*')
    .in('status', ['pendente', 'em_andamento'])
    .order('due', { ascending: true });
  return data || [];
}

export async function updateTarefaStatus(slug: string, status: string): Promise<void> {
  await supabase
    .from('tarefas')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('slug', slug);
}

export async function updateTarefaDue(slug: string, due: string): Promise<void> {
  await supabase
    .from('tarefas')
    .update({ due, updated_at: new Date().toISOString() })
    .eq('slug', slug);
}

// ===========================================
// TREINO
// ===========================================

export interface TreinoSemana {
  id: string;
  semana: number;
  ano: number;
  mesociclo: number;
  meta_sessoes: number;
  concluidos: number;
  treino_1: string | null;
  treino_2: string | null;
  treino_3: string | null;
  treino_4: string | null;
  treino_5: string | null;
  treino_6: string | null;
  exercicios: Record<string, any> | null;
}

export async function getCurrentTreino(): Promise<TreinoSemana | null> {
  const { data } = await supabase
    .from('treino_semanas')
    .select('*')
    .order('ano', { ascending: false })
    .order('semana', { ascending: false })
    .limit(1);
  return data?.[0] || null;
}

// ===========================================
// METRICAS
// ===========================================

export interface MetricaDiaria {
  date: string;
  peso: number | null;
  sono: number | null;
  sono_profundo: number | null;
  sono_leve: number | null;
  sono_rem: number | null;
  dormiu: string | null;
  acordou: string | null;
  passos: number | null;
  hr_media: number | null;
  hr_repouso: number | null;
  calorias: number | null;
  treino_duracao: number | null;
  treinos: any[] | null;
}

export async function getMetricasDia(dateStr: string): Promise<MetricaDiaria | null> {
  const { data } = await supabase
    .from('metricas_diarias')
    .select('*')
    .eq('date', dateStr)
    .limit(1);
  return data?.[0] || null;
}

export async function upsertMetrica(metrica: Partial<MetricaDiaria> & { date: string }): Promise<void> {
  await supabase
    .from('metricas_diarias')
    .upsert(
      { ...metrica, updated_at: new Date().toISOString() },
      { onConflict: 'date' },
    );
}

// ===========================================
// PRODUCTIONS (video pipeline)
// ===========================================

export interface Production {
  id: string;
  slug: string;
  title: string;
  status: string;
  roteiro: string | null;
  hook: string | null;
  gravacao: string | null;
  edicao: string | null;
  thumbnail_img: string | null;
  publicacao: string | null;
  proxima_acao: string | null;
}

export async function getActiveProductions(): Promise<Production[]> {
  const { data } = await supabase
    .from('productions')
    .select('id, slug, title, status, roteiro, hook, gravacao, edicao, thumbnail_img, publicacao, proxima_acao')
    .not('status', 'eq', 'publicado')
    .not('slug', 'is', null)
    .order('created_at', { ascending: false });
  return data || [];
}

export async function updateProductionField(slug: string, field: string, value: string): Promise<void> {
  await supabase
    .from('productions')
    .update({ [field]: value, updated_at: new Date().toISOString() })
    .eq('slug', slug);
}

// ===========================================
// TELEGRAM HISTORY
// ===========================================

export async function saveTelegramHistory(entry: {
  source: 'railway' | 'daily' | 'listener';
  user_message?: string | null;
  assistant_response?: string | null;
  callback_data?: string | null;
  metadata?: Record<string, any> | null;
}): Promise<void> {
  await supabase
    .from('telegram_history')
    .insert({ ...entry, timestamp: new Date().toISOString() });
}
