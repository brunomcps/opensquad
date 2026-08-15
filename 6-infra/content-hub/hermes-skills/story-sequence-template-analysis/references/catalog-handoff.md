# Contrato conceitual para catálogo de stories

Este contrato é independente de tecnologia. Serve para Notion, Supabase, arquivos locais ou uma aplicação web.

## Entidades

### source_sequence

A sequência observada em outro creator.

Campos mínimos:

- `source_sequence_id`
- `creator_id`
- `captured_at`
- `screens_in_order`
- `source_context`
- `analysis`
- `status`

### story_template

A estrutura abstrata extraída da sequência-fonte.

Campos mínimos:

- `template_id`
- `template_slug`
- `name`
- `formula_steps`
- `primary_function`
- `funnel_stages`
- `capture_requirements`
- `attention_devices`
- `interaction_devices`
- `risks`
- `source_sequence_ids`
- `version`
- `status`

### planned_application

A adaptação do template para uma situação concreta do Bruno.

Campos mínimos:

- `application_id`
- `template_ids`
- `day_context`
- `copy_by_screen`
- `capture_instruction_by_screen`
- `approval_status`
- `approved_at`

### published_story

O que foi realmente publicado.

Campos mínimos:

- `published_story_id`
- `application_id`
- `template_ids`
- `published_at`
- `media_assets`
- `screens_in_order`
- `platform_permalink` quando existir
- `metrics_snapshot`
- `qualitative_feedback`

## Relações

- Um creator possui muitas sequências-fonte.
- Uma sequência-fonte pode originar um ou mais templates.
- Um template pode combinar aprendizados de várias sequências-fonte.
- Uma aplicação planejada pode usar um ou mais templates.
- Uma aplicação pode gerar zero ou uma publicação.
- Um story publicado mantém ligação com a aplicação e os templates usados.

## Regras de integridade

- Ordem das telas é dado essencial, não detalhe de apresentação.
- Prints originais não devem ser substituídos por transcrições.
- Análise original e avaliação posterior são campos diferentes.
- Métricas devem carregar data e janela de coleta.
- Alteração estrutural de template incrementa versão.
- Tags descrevem função e mecanismo; temas descrevem o assunto daquela ocorrência.
- O mesmo slug não deve representar fórmulas narrativas diferentes.

## Perguntas que o catálogo precisa responder

- Quais templates geram mais respostas?
- Quais funcionam melhor para relacionamento, autoridade ou venda?
- Quais creators mais inspiram estruturas aproveitáveis?
- Quais templates Bruno já usou e quais nunca testou?
- Qual versão de um template estava ativa em cada publicação?
- Que adaptações preservaram o mecanismo original sem copiar a superfície?
