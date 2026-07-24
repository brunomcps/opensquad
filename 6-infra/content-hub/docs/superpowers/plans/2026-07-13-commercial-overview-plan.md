# Plano de implementação: visão comercial agregada

Referência: `docs/superpowers/specs/2026-07-13-commercial-overview-design.md`

## Princípios

- Manter o portal de membros fora do diff.
- Não expor linhas de transação, `buyer_key` ou PII no frontend.
- Agregar uma moeda por vez e nunca converter valores silenciosamente.
- Tratar `gross_value - fee_value` como `Líquido após taxas`, não como repasse oficial.
- Fazer toda publicação somente depois dos testes e de autorização específica.

## Etapa 1 — agregador puro

1. Definir contratos de entrada e saída da visão comercial.
2. Implementar filtros por período e moeda.
3. Agregar KPIs, série diária, produtos, status e achados.
4. Implementar regras de meta e avisos de qualidade.
5. Cobrir moedas, status, compradores, produtos, datas e períodos vazios com testes unitários.

## Etapa 2 — endpoint protegido

1. Criar `ci-overview` em Supabase Edge Functions.
2. Reutilizar a autenticação e associação existentes.
3. Validar query string e limitar o intervalo.
4. Paginar somente as colunas necessárias da tabela de transações.
5. Retornar exclusivamente o contrato agregado.
6. Adicionar verificação estática de que identificadores individuais não aparecem no contrato.

## Etapa 3 — visão comercial

1. Adicionar cliente e tipos do endpoint ao app privado.
2. Criar navegação `Visão comercial` e `Qualidade dos dados`.
3. Tornar a visão comercial a página inicial.
4. Implementar filtros de período, moeda e meta.
5. Exibir KPIs, progresso, ritmo, série diária, produtos, achados e avisos.
6. Preservar login, autorização e sincronizações administrativas.

## Etapa 4 — validação

Executar:

```text
npm test
npm run typecheck
npm run ci:build:web
npm run ci:verify-bundle
npm run ci:check:edge
```

Também validar respostas `401` e `403`, ausência de PII no bundle/contrato e estados vazios.

## Etapa 5 — smoke visual e evidência

1. Rodar a aplicação local com resposta controlada do novo endpoint.
2. Capturar desktop 1366 × 768 e mobile 390 px.
3. Verificar clipping, leitura dos valores e troca de abas.
4. Registrar comandos, resultados e limitações em `docs/commercial-intelligence/evidence/`.

## Etapa 6 — gate de produção

Depois de toda validação local:

1. apresentar diff, testes e capturas a Bruno;
2. pedir autorização específica para migration/configuração, deploy da nova função e publicação do frontend;
3. se autorizado, publicar e executar smoke autenticado real;
4. registrar evidência e rollback.
