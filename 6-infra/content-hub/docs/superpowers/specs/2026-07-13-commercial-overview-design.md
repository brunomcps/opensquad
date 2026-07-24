# Visão comercial agregada — design aprovado

Data: 2026-07-13  
Status: aprovado por Bruno para implementação local  
Publicação: depende de autorização separada após os testes

## 1. Resultado esperado

Substituir a tela de qualidade como página inicial da aplicação privada por uma visão comercial que responda, com dados já existentes da Hotmart:

- quanto foi vendido no período;
- quanto restou após as taxas informadas pela Hotmart;
- quantas vendas e compradores únicos existem;
- quais produtos sustentam a receita;
- como a receita evolui por dia;
- quanto falta e qual ritmo diário é necessário para alcançar a meta escolhida.

A tela de qualidade permanece disponível como aba secundária. O portal de membros não será alterado.

## 2. Evidência disponível na fonte

Retrato verificado antes do desenho:

- 556 transações reconciliadas;
- 483 com estado atual `approved`;
- 59 `canceled`;
- 14 `refunded`;
- 4 produtos;
- 507 transações em BRL, 29 em EUR, 15 em USD, 4 em CAD e 1 em GBP;
- `gross_value`, `gross_currency`, `fee_value` e `fee_currency` preenchidos nas 556 linhas;
- moeda bruta e moeda da taxa coincidentes nas 556 linhas;
- `producer_net_value` e `producer_net_currency` ausentes nas 556 linhas;
- `buyer_key` preenchido nas 556 linhas;
- período aprovado observado entre 2026-06-10 e 2026-07-13.

Consequência: a primeira versão não chamará nenhum valor de repasse oficial do produtor. Ela mostrará **Bruto** e **Líquido após taxas**, sendo o segundo calculado como `gross_value - fee_value` e rotulado explicitamente. Moedas nunca serão somadas nem convertidas silenciosamente.

## 3. Abordagem escolhida

Criar um endpoint agregado e autenticado em Supabase Edge Functions. A função consulta somente as colunas necessárias de `ci_hotmart_transactions`, pagina os resultados, agrega no servidor e devolve um contrato sem transação individual, identificador de comprador ou outro dado pessoal.

Alternativas rejeitadas:

1. Reutilizar diretamente o Financeiro antigo: seus contratos e cálculos antecedem a base reconciliada e não oferecem a separação de evidência exigida pelo PRD.
2. Consultar a tabela diretamente no navegador: aumentaria a superfície de exposição e permitiria acesso desnecessário a linhas individuais.

## 4. Arquitetura e fluxo

1. O usuário autenticado abre a aplicação privada.
2. A aba `Visão comercial` solicita `ci-overview` com período, moeda e meta.
3. A Edge Function valida a sessão e a associação ativa em `ci_app_members`.
4. A função valida filtros, pagina as transações e executa uma agregação pura no servidor.
5. A resposta contém apenas totais, séries, produtos, contagens por status e achados determinísticos.
6. O frontend renderiza KPIs, gráficos, ranking e progresso da meta.

`updatedAt` representa a maior data entre `last_reconciled_at` e `last_event_at` das linhas consideradas. Se o período estiver vazio, usa o término da última reconciliação Hotmart concluída; nunca usa apenas o horário da requisição para aparentar atualização da fonte.

Unidades propostas:

- `supabase/functions/ci-overview/index.ts`: autenticação, filtros e resposta HTTP;
- `supabase/functions/_shared/overview.ts`: regras puras de agregação e geração de achados;
- `ci-app/src/api.ts`: contrato do novo endpoint;
- `ci-app/src/CommercialIntelligenceApp.tsx`: navegação entre Visão comercial e Qualidade;
- `src/components/commercial-intelligence/CommercialOverview.tsx`: interface da visão;
- testes do agregador e contratos de segurança.

## 5. Regras de negócio

### 5.1 Período e timezone

- Padrão: mês atual em `America/Sao_Paulo`.
- Atalhos: mês atual, mês anterior, últimos 90 dias e todo o histórico disponível.
- Data da venda: `approved_date`; linhas aprovadas sem essa data usam `order_date` e recebem aviso de qualidade.
- Os limites enviados à API são inclusivos por dia no fuso de São Paulo e convertidos para instantes UTC no servidor.

### 5.2 Moeda

- Padrão: BRL.
- O seletor permite BRL, EUR, USD, CAD e GBP quando houver registros no período.
- Nenhuma moeda é convertida.
- Todos os totais, gráficos, tickets e metas usam uma única moeda por consulta.
- As metas de R$ 30 mil, R$ 40 mil e R$ 50 mil aparecem somente em BRL. Para outra moeda, o bloco de meta fica oculto.

### 5.3 Receita e status

- Venda realizada: estado atual `approved`.
- Receita bruta: soma de `gross_value` das vendas realizadas.
- Taxas: soma de `fee_value` das vendas realizadas.
- Líquido após taxas: receita bruta menos taxas, na mesma moeda.
- Reembolsos: contagem e valor bruto das linhas cujo estado atual é `refunded`.
- Chargebacks: contagem e valor bruto das linhas cujo estado atual é `chargeback`.
- Cancelamentos: contagem de `canceled`; não entram na receita.
- Outros estados permanecem visíveis no detalhamento de status, mas não entram na receita realizada.

### 5.4 Pessoas, ticket e produtos

- Compradores: contagem distinta de `buyer_key` entre vendas realizadas.
- Ticket médio: líquido após taxas dividido pelo número de vendas realizadas.
- Produtos: agrupamento por `product_id`; quando ausente, usar `product_name` como chave de fallback.
- Cada produto mostra vendas, compradores, bruto, líquido após taxas e participação no líquido do período.

### 5.5 Meta e achados

- Metas disponíveis: R$ 30 mil, R$ 40 mil e R$ 50 mil.
- Progresso: líquido após taxas dividido pela meta.
- Valor restante: máximo entre zero e meta menos líquido após taxas.
- Ritmo diário necessário: valor restante dividido pelos dias restantes do mês, incluindo o dia atual.
- O ritmo aparece apenas no mês atual em BRL.
- Não haverá previsão estatística nesta entrega.
- Achados são regras determinísticas, sem IA paga: produto líder, melhor dia, taxa de reembolso e ritmo necessário para a meta.

## 6. Interface

Ordem da página:

1. Cabeçalho com período, moeda, meta, usuário e ação de sair.
2. KPIs: líquido após taxas, bruto, vendas, compradores e ticket médio.
3. Progresso da meta e ritmo diário necessário, quando aplicável.
4. Série diária de líquido após taxas e vendas.
5. Ranking de produtos com participação no período.
6. Bloco `Leituras do período` com até quatro achados determinísticos.
7. Avisos de dados, quando existirem.

A navegação principal terá duas abas:

- `Visão comercial` — padrão;
- `Qualidade dos dados` — tela já existente.

O layout deve permanecer legível em 1366 × 768 e 390 px. Valores monetários sempre mostram código ou símbolo de moeda e o período aparece por extenso.

## 7. Contrato da API

Endpoint:

```text
GET /functions/v1/ci-overview?start=YYYY-MM-DD&end=YYYY-MM-DD&currency=BRL&goal=50000
```

Resposta conceitual:

```json
{
  "period": { "start": "2026-07-01", "end": "2026-07-13", "timezone": "America/Sao_Paulo" },
  "currency": "BRL",
  "availableCurrencies": ["BRL", "EUR", "USD", "CAD", "GBP"],
  "totals": {
    "gross": 0,
    "fees": 0,
    "netAfterFees": 0,
    "sales": 0,
    "buyers": 0,
    "averageTicket": 0,
    "refunds": 0,
    "refundGross": 0,
    "chargebacks": 0,
    "chargebackGross": 0,
    "cancellations": 0
  },
  "goal": { "value": 50000, "progress": 0, "remaining": 0, "requiredDailyPace": 0 },
  "daily": [],
  "products": [],
  "statusBreakdown": [],
  "insights": [],
  "warnings": [],
  "updatedAt": "2026-07-13T00:00:00.000Z"
}
```

O contrato não pode conter `transaction_id`, `buyer_key`, e-mail, documento, telefone, payload bruto ou identificador de assinatura.

## 8. Erros e estados vazios

- `400`: período, moeda ou meta inválidos.
- `401`: sessão ausente ou expirada.
- `403`: usuário sem associação ativa.
- `500`: falha sanitizada de consulta ou agregação.
- Período sem vendas: retornar zeros e arrays vazios, não erro.
- Campo monetário ausente: excluir a linha do cálculo afetado e adicionar aviso com contagem, sem revelar a transação.
- Moeda bruta diferente da moeda da taxa: excluir a linha do cálculo de líquido após taxas e adicionar aviso; não converter nem subtrair valores incompatíveis.
- Moeda sem dados no período: retornar estado vazio e moedas disponíveis.
- Falha na tela: preservar filtros e oferecer nova tentativa.

## 9. Testes e evidências

Testes obrigatórios antes da publicação:

- agregação de vendas aprovadas;
- exclusão de canceladas e reembolsadas da receita realizada;
- contagem e valor de reembolso e chargeback;
- comprador único e ticket médio;
- agrupamento por produto;
- separação absoluta entre moedas;
- fallback de data e produto;
- ritmo necessário para a meta;
- período vazio;
- contrato sem PII ou identificadores individuais;
- autenticação `401` e autorização `403`;
- `npm test`;
- `npm run typecheck`;
- `npm run ci:build:web`;
- `npm run ci:check:edge`;
- smoke visual em desktop e viewport móvel.

As evidências serão registradas no diretório já existente `docs/commercial-intelligence/evidence/`.

## 10. Fora do escopo desta entrega

- campanhas, links rastreáveis e cliques;
- atribuição de venda a vídeo ou CTA;
- associação temporal YouTube × vendas;
- previsão estatística;
- conversão cambial;
- repasse oficial do produtor quando o campo não estiver disponível;
- lista de transações ou compradores;
- qualquer alteração no portal de membros;
- publicação em produção antes da autorização de Bruno.

## 11. Critérios de aceite

1. A página inicial responde quanto vendeu, quanto restou após taxas, quantas vendas e compradores existem e quais produtos lideram.
2. Bruno consegue trocar período e moeda sem misturar unidades.
3. Metas e ritmo aparecem somente para BRL no mês atual.
4. Reembolsos, cancelamentos e outros estados não inflam a receita realizada.
5. Nenhum identificador individual chega ao frontend.
6. A tela de qualidade continua acessível em aba separada.
7. Os testes obrigatórios passam e suas evidências ficam registradas.
8. O portal de membros permanece intocado.
