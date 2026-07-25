---
name: instagram-story-capture
description: Localizar stories ativos de um perfil do Instagram pelo Chrome logado, identificar a sequencia pedida por Bruno, recuperar video e audio reais, remontar a midia, transcrever a fala localmente e extrair frames para analise. Usar quando Bruno fornecer um @perfil, descrever aproximadamente um story em video, pedir os stories recentes de alguem ou quiser transformar uma referencia falada em material para a Biblioteca de stories.
---

# Capturar Stories do Instagram

Transformar uma indicacao informal, como `@perfil + assunto aproximado`, em uma fonte local verificavel para analise editorial.

## Regras soberanas

- Usar o Chrome real ja autenticado. Nao concluir a partir de busca publica, thumbnail, texto alternativo ou memoria.
- Preservar a ordem observada. Se Bruno disser que parte da ordem e livre, registrar isso sem inventar uma ordem causal.
- Tratar `blob:` apenas como endereco do player. Recuperar os assets de video e audio subjacentes.
- Nunca afirmar que houve fala sem ouvir ou transcrever o audio real.
- Nao publicar, repostar ou enviar a midia a terceiros. Manter a captura local, salvo autorizacao explicita.
- Stories precisam estar ativos e acessiveis pela conta logada. Expirado, removido ou restrito sem acesso significa `NAO ACESSADO`.

## Fluxo

1. Ler [captura pelo Chrome](references/chrome-story-capture.md).
2. Abrir o perfil exato e confirmar o username antes de entrar nos stories.
3. Inventariar toda a barra ativa: posicao, horario aproximado, tipo de midia, texto visivel e contexto.
4. Localizar a sequencia descrita por Bruno. Se houver mais de uma candidata real, apresentar a diferenca antes de escolher.
5. Para cada video relevante, recuperar o melhor asset de video e o asset de audio correspondente.
6. Baixar os streams sem registrar cookies, tokens ou URLs assinadas no relato final.
7. Processar cada story:

```powershell
python .agents\skills\instagram-story-capture\scripts\process_story_media.py `
  --video "C:\caminho\story-01-video.mp4" `
  --audio "C:\caminho\story-01-audio.m4a" `
  --output-dir "C:\caminho\captura" `
  --stem "story-01" `
  --transcribe
```

8. Inspecionar ao menos um frame de cada video e conferir a transcricao contra o audio nos trechos duvidosos.
9. Entregar um inventario factual e o caminho dos artefatos. Somente iniciar a analise ou publicacao se o pedido tambem incluir essa etapa.

## Saida minima

Para cada story em video:

- midia completa com video e audio;
- duracao e resolucao verificadas;
- transcricao com timestamps, ou motivo explicito para ausencia;
- frames representativos;
- manifesto local com arquivos, duracao e streams detectados.

Para a sequencia:

- quantidade total de stories ativos observados;
- quais itens pertencem a sequencia pedida;
- quais sao video falado, video sem fala clara, imagem, repost ou outro formato;
- ordem narrativa observada e qualquer flexibilidade informada por Bruno;
- limitacoes de acesso ou qualidade.

## Handoff

Quando Bruno pedir analise, fornecer os artefatos para `story-sequence-template-analysis`. A transcricao e os frames passam a ser a fonte primaria; a descricao inicial de Bruno serve apenas para localizar o material.

Quando Bruno pedir catalogacao ou publicacao, a analise completa deve ser concluida antes de usar `catalog-story-reference`.

