-- Total de VIDA de cada vídeo (views/likes/comentários), fonte API do YouTube.
-- A view ci_youtube_video_stats somava só a coleta diária (ci_youtube_daily,
-- iniciada em 09/06/2026), subcontando vídeos antigos: o vídeo da preguiça
-- (publicado 10/2025) aparecia com 24k em vez dos 279k reais. Incidente 20/07.
alter table public.ci_youtube_videos
  add column if not exists lifetime_views bigint,
  add column if not exists lifetime_likes bigint,
  add column if not exists lifetime_comments bigint,
  add column if not exists stats_refreshed_at timestamptz;

comment on column public.ci_youtube_videos.lifetime_views is
  'total de views de vida do vídeo (statistics.viewCount da API do YouTube); NULL até a 1ª carga';

-- A carga inicial dos 67 vídeos foi feita via script
-- server/scripts/commercial-intelligence/refresh-youtube-lifetime-stats.py e
-- é mantida semanalmente pela tarefa snapshot-negocio-semanal.

-- View passa a usar o total de vida, com fallback pra soma diária quando um
-- vídeo recém-sincronizado ainda não teve carga de lifetime (não zera a lista).
create or replace view public.ci_youtube_video_stats
with (security_invoker = true) as
select
  v.video_id,
  coalesce(v.lifetime_views, daily.views, 0)::bigint as views,
  coalesce(v.lifetime_likes, daily.likes, 0)::bigint as likes,
  coalesce(v.lifetime_comments, daily.comments, 0)::bigint as comments
from public.ci_youtube_videos v
left join (
  select video_id,
    sum(views) as views, sum(likes) as likes, sum(comments) as comments
  from public.ci_youtube_daily
  group by video_id
) daily on daily.video_id = v.video_id;

revoke all on public.ci_youtube_video_stats from public, anon, authenticated;
grant select on public.ci_youtube_video_stats to service_role;
