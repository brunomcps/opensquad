# Efeito Espelho Dossier Rebuild Implementation Plan

**Goal:** Reanalisar as três capturas originais do Efeito Espelho, publicar um
dossiê canônico completo na referência existente e verificar conteúdo, imagens
e layout sem alterar Raul Sena ou componentes compartilhados.

**Architecture:** Produzir um novo payload orientado por dados, validá-lo com o
contrato canônico e usar o publicador existente para criar uma nova revisão da
mesma referência. A interface continuará usando os componentes compartilhados
já validados pelo dossiê de Raul Sena.

## Task 1: Reconstruir o payload

- Criar `effect-mirror-rebuilt.json` a partir das três imagens originais.
- Preencher modo rápido, raio-X, análise aprofundada, síntese, template
  registrado e molde 9:16.
- Usar caminhos locais reais para os três assets.

## Task 2: Validar localmente

- Executar `publish_story_reference.py validate`.
- Executar os testes do publicador.
- Confirmar que Raul Sena continua passando e que o snapshot antigo do Efeito
  Espelho continua falhando como fixture de regressão.

## Task 3: Preservar rollback e publicar

- Capturar o estado remoto atual antes da mutação.
- Publicar o payload validado na mesma `referenceKey`.
- Guardar o recibo com revisão, hash e link.

## Task 4: Verificar a persistência

- Ler de volta a referência publicada.
- Confirmar identidade, revisão, três stories, três assets e quatro camadas.
- Confirmar que nenhum registro protegido foi alterado.

## Task 5: Verificar a interface

- Inspecionar desktop em 1440 × 1000 e 1920 × 1080.
- Inspecionar mobile em 390 × 844.
- Confirmar imagens reais, análise aprofundada em largura total e ausência de
  regressão visual no dossiê de Raul Sena.
