-- Privacidade de cada vídeo (status.privacyStatus da Data API do YouTube).
-- Auditoria de 18/09/2026: 17 dos 74 vídeos do painel (15 shorts + 3 longos)
-- não estão públicos no canal, e nada na aba Rastreamento avisava; o card
-- parecia um link morto. A sincronização diária passa a preencher esta coluna
-- e o card mostra a etiqueta "não público".
alter table public.ci_youtube_videos
  add column if not exists privacy_status text
    check (privacy_status is null or privacy_status in ('public', 'unlisted', 'private'));

comment on column public.ci_youtube_videos.privacy_status is
  'status.privacyStatus da API do YouTube (public/unlisted/private); NULL até a sincronização preencher';
