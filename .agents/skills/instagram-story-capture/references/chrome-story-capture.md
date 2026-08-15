# Captura de stories ativos pelo Chrome

## Pre-condicoes

- Controlar o Chrome real com a conta do Instagram ja autenticada.
- Confirmar o perfil pelo username exibido na pagina.
- Criar uma pasta local por captura, por exemplo:

```text
C:\tmp\instagram-story-capture\<perfil>-<aaaa-mm-dd>\
```

## Inventario da sequencia

1. Abrir o perfil e entrar pelo anel de story.
2. Contar os segmentos reais da barra superior.
3. Percorrer uma vez sem baixar, registrando:
   - posicao na barra;
   - horario exibido;
   - imagem ou video;
   - fala direta, musica, repost ou cena de apoio;
   - texto, caixa, enquete ou pergunta visivel;
   - sinais de continuidade com os itens vizinhos.
4. Comparar esse inventario com a descricao de Bruno.

Nao assumir que todos os stories ativos formam uma unica sequencia editorial.

## Recuperacao dos assets

O player do Instagram normalmente expoe um `blob:`. Esse endereco nao e o arquivo.

1. Deixar o story desejado carregado e pausado quando possivel.
2. Usar a capacidade de assets da pagina para listar os recursos carregados.
3. Identificar os candidatos de video e audio por:
   - identidade do asset;
   - duracao compativel;
   - dimensoes e codec;
   - bitrate, preferindo a melhor representacao util;
   - contexto do story atualmente visivel.
4. Nao parear streams apenas pela ordem em que apareceram.
5. URLs podem conter `bytestart` e `byteend` por causa do streaming em faixas. Para recuperar o arquivo completo, remover somente esses parametros e preservar os demais parametros assinados.
6. Baixar video e audio separadamente. Nunca imprimir a URL assinada completa, cookies ou cabecalhos de autenticacao.

Se a captura pela pagina falhar por CORS, usar a URL assinada descoberta no navegador para download local direto enquanto ela ainda for valida.

## Processamento

Executar `scripts/process_story_media.py` para:

- combinar video e audio sem recompressao quando possivel;
- inspecionar duracao, resolucao e streams;
- extrair frames distribuidos ao longo do video;
- transcrever localmente com `faster-whisper`;
- gerar um manifesto JSON.

Se o audio for somente musica, ruido ou fala ininteligivel, registrar isso. Nao transformar uma transcricao ruim em fala atribuida ao creator.

## Criterios de aceite

- O frame inspecionado corresponde ao story observado no navegador.
- Video e audio possuem duracoes compativeis.
- O arquivo completo contem ao menos um stream de video e, quando esperado, um de audio.
- A transcricao foi gerada a partir do audio recuperado, nao do texto visivel.
- Trechos incertos permanecem marcados como incertos.
- A ordem do inventario corresponde a barra de stories.
- A pasta local nao contem cookies nem relatorio com URLs assinadas.

## Falhas esperadas

- Story expirou durante a captura.
- Perfil privado ou story restrito sem acesso da conta logada.
- Asset assinado expirou antes do download.
- Instagram carregou somente faixas parciais.
- Video sem audio separado.
- Audio dominado por musica.
- Varios stories com duracao semelhante exigem conferencia visual.

Em qualquer desses casos, relatar o ponto exato da falha. Nao substituir a fonte por inferencia.

