# -*- coding: utf-8 -*-
"""Gera o UPDATE do TOTAL DE VIDA (views/likes/comentarios) dos videos.

Por que existe: a view ci_youtube_video_stats mostrava so a soma da coleta
diaria (ci_youtube_daily, iniciada em 09/06/2026), subcontando videos antigos
(o da preguica aparecia com 24k em vez de 279k). A fonte correta do total de
vida e a API do YouTube (statistics.viewCount).

Este script NAO fala com o banco (a tabela tem RLS; a chave do .env nem le).
Recebe os video_ids, busca o total de vida na API do YouTube (lotes de 50) e
grava um UPDATE pronto em _cache/youtube-lifetime-update.sql.

A tarefa snapshot-negocio-semanal: (1) pega os video_ids via Supabase MCP,
(2) grava em _cache/video-ids.txt, (3) roda este script, (4) aplica o SQL
gerado via Supabase MCP (execute_sql), que tem credencial de escrita.

Uso: python refresh-youtube-lifetime-stats.py [ID1,ID2,...]
     (sem argumento, le de _cache/video-ids.txt)
"""
import io
import json
import os
import sys
import urllib.request
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

RAIZ = Path(r"C:\Users\bruno\OneDrive\Bruno Salles\Projetos\OpenSquad")
from dotenv import load_dotenv  # noqa: E402
load_dotenv(RAIZ / ".env")

YT_KEY = os.environ["YT_DATA_API_KEY"]
CACHE = RAIZ / "6-infra" / "content-hub" / "_cache"
SAIDA = CACHE / "youtube-lifetime-update.sql"


def carrega_ids():
    if len(sys.argv) > 1:
        bruto = sys.argv[1]
    else:
        arq = CACHE / "video-ids.txt"
        if not arq.exists():
            sys.exit("Passe os IDs como argumento ou crie _cache/video-ids.txt")
        bruto = arq.read_text(encoding="utf-8")
    return [i.strip() for i in bruto.replace("\n", ",").split(",") if i.strip()]


def main():
    ids = carrega_ids()
    print(f"videos recebidos: {len(ids)}")

    linhas = []
    for i in range(0, len(ids), 50):
        lote = ids[i:i + 50]
        u = ("https://www.googleapis.com/youtube/v3/videos"
             f"?part=statistics&id={','.join(lote)}&key={YT_KEY}")
        with urllib.request.urlopen(u, timeout=40) as r:
            dados = json.load(r)
        for item in dados.get("items", []):
            st = item.get("statistics", {})
            linhas.append("('{}',{},{},{})".format(
                item["id"], int(st.get("viewCount", 0)),
                int(st.get("likeCount", 0)), int(st.get("commentCount", 0))))

    valores = ",\n".join(linhas)
    sql = (
        "update ci_youtube_videos v set\n"
        "  lifetime_views = d.views, lifetime_likes = d.likes,\n"
        "  lifetime_comments = d.comments, stats_refreshed_at = now()\n"
        "from (values\n" + valores + "\n"
        ") as d(video_id, views, likes, comments)\n"
        "where v.video_id = d.video_id;\n"
    )
    SAIDA.parent.mkdir(parents=True, exist_ok=True)
    SAIDA.write_text(sql, encoding="utf-8")
    print(f"UPDATE de {len(linhas)} videos gravado em: {SAIDA}")
    print("Aplicar via Supabase MCP (execute_sql) no projeto vdaualgktroizsttbrfh.")


if __name__ == "__main__":
    main()
