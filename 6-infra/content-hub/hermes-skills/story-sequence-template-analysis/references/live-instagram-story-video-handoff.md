# Handoff de story ativo em vídeo

## Entrada informal aceita

Bruno pode fornecer somente:

```text
@perfil + descrição aproximada do story
```

Essa descrição serve para localizar a fonte. Não serve como transcrição nem como evidência editorial.

## Pacote de captura esperado

Para cada story relevante, receber:

- posição observada na barra de stories;
- horário aproximado exibido;
- classificação: vídeo falado, vídeo sem fala clara, imagem, repost ou outro;
- arquivo de vídeo completo;
- áudio correspondente, quando separado;
- duração, resolução e streams detectados;
- transcrição local com timestamps;
- frames distribuídos ao longo do vídeo;
- observações sobre caixa de pergunta, enquete, texto, repost ou interação;
- indicação de continuidade com os itens vizinhos.

O inventário também deve registrar os stories ativos que ficaram fora da sequência pedida. Isso evita tratar todo o perfil como uma única narrativa.

## Critérios de confiança

- Conferir visualmente que a mídia recuperada corresponde ao story visto no perfil.
- Parear vídeo e áudio por identidade e duração, não apenas por ordem de carregamento.
- Considerar o `blob:` do player insuficiente como fonte persistente.
- Manter trechos duvidosos como incertos.
- Se houver somente música ou ruído, registrar `sem fala utilizável`.
- Se o story expirou, foi removido ou não está acessível à conta logada, registrar `não acessado`.

## Uso na análise

A transcrição sustenta a mensagem explícita, o raciocínio e a progressão verbal. Os frames sustentam cena, composição, expressão, texto sobreposto, stickers, mudança de estímulo e gramática visual.

Analisar a combinação de fala e imagem. Não reduzir vídeo falado a um único print e não reduzir a camada visual à transcrição.

Quando a ordem for parcialmente livre, preservar:

1. a ordem observada na captura;
2. a posição que Bruno declarou obrigatória;
3. a flexibilidade das demais respostas.

## Limite operacional

Se o agente não tiver navegador autenticado ou capacidade de recuperar a mídia, interromper a aquisição e solicitar um pacote produzido por `instagram-story-capture`. A análise canônica pode continuar depois do handoff, sem pedir que Bruno baixe o vídeo manualmente.
