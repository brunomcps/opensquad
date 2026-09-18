-- Atualiza SÓ o total de vida (views/likes/comentários) dos vídeos já
-- catalogados. Um upsert parcial pelo PostgREST não serve: o INSERT do
-- ON CONFLICT exige title NOT NULL antes de detectar o conflito (falha real
-- em 18/09/2026, database_error na primeira rodada da sync nova).
-- Aplicada em produção em 18/09/2026 via MCP (migration ci_update_youtube_video_stats).
create or replace function public.ci_update_youtube_video_stats(p_rows jsonb)
returns integer
language sql
security definer
set search_path = public
as $$
  with incoming as (
    select *
    from jsonb_to_recordset(coalesce(p_rows, '[]'::jsonb)) as r(
      video_id text,
      lifetime_views bigint,
      lifetime_likes bigint,
      lifetime_comments bigint,
      stats_refreshed_at timestamptz
    )
  ),
  updated as (
    update public.ci_youtube_videos v
    set lifetime_views = i.lifetime_views,
        lifetime_likes = i.lifetime_likes,
        lifetime_comments = i.lifetime_comments,
        stats_refreshed_at = coalesce(i.stats_refreshed_at, now()),
        updated_at = now()
    from incoming i
    where v.video_id = i.video_id
      and i.lifetime_views is not null
    returning v.video_id
  )
  select count(*)::integer from updated;
$$;

revoke all on function public.ci_update_youtube_video_stats(jsonb) from public, anon, authenticated;
grant execute on function public.ci_update_youtube_video_stats(jsonb) to service_role;
