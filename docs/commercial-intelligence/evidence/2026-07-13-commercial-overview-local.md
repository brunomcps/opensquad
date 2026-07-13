# Evidência local — visão comercial agregada

Data: 2026-07-13

Branch: `codex/commercial-intelligence-f0-f1`

Escopo: implementação local; nenhuma publicação realizada

## Resultado implementado

- Edge Function autenticada `ci-overview`;
- agregação server-side sem linhas individuais na resposta;
- filtros de período, moeda e meta;
- líquido após taxas calculado como `gross_value - fee_value` somente quando as moedas coincidem;
- KPIs de bruto, taxas, líquido após taxas, vendas, compradores e ticket médio;
- reembolsos, chargebacks, cancelamentos e detalhamento de estados;
- série diária;
- ranking de produtos;
- progresso e ritmo necessário para metas de R$ 30 mil, R$ 40 mil e R$ 50 mil;
- leituras determinísticas do período;
- navegação entre `Visão comercial` e `Qualidade dos dados`;
- layout responsivo;
- portal de membros intocado.

## Testes automatizados

Teste específico do agregador após o último ajuste de precisão:

```text
node --import tsx --test server/services/commercial-intelligence/overview.test.ts
5 testes, 5 aprovados, 0 falhas
```

Suíte completa:

```text
npm test
58 testes, 58 aprovados, 0 falhas
```

Validações estáticas:

```text
npm run typecheck
resultado: aprovado

npm run ci:check:edge
resultado: cinco Edge Functions aprovadas pelo deno check
```

Build e auditoria do bundle:

```text
npm run ci:build:web
resultado: build aprovado; 728 módulos transformados

npm run ci:verify-bundle
resultado: ok=true; 3 arquivos; 800721 bytes; 7 verificações de segredo
```

O Vite emitiu aviso não bloqueante de chunk JavaScript acima de 500 kB. O artefato principal ficou com 789,39 kB e 231,46 kB gzip, principalmente pelo Recharts. Não houve erro de build.

## Contratos de segurança verificados

- autenticação de membro obrigatória;
- associação `viewer` ou `admin` obrigatória;
- resposta sem `transaction_id`;
- resposta sem `buyer_key`;
- resposta sem identificador de assinatura;
- resposta sem e-mail, documento, telefone ou payload bruto;
- bundle sem nomes ou valores dos sete secrets auditados;
- uma moeda por consulta;
- nenhuma conversão cambial implícita.

## Smoke visual

Comando:

```text
npm run ci:smoke:overview
```

Resultado:

```json
{"ok":true,"browser":"chrome.exe","desktop":"overview-desktop-1366.png","desktopLower":"overview-desktop-lower.png","mobile":"overview-mobile-390.png","mobileSections":["overview-mobile-chart.png","overview-mobile-products.png","overview-mobile-insights.png","overview-mobile-statuses.png"],"mobileOverflowPx":0,"tabNavigation":true}
```

Capturas controladas:

- `commercial-overview/overview-desktop-1366.png`;
- `commercial-overview/overview-desktop-lower.png`;
- `commercial-overview/overview-mobile-390.png`;
- `commercial-overview/overview-mobile-chart.png`;
- `commercial-overview/overview-mobile-products.png`;
- `commercial-overview/overview-mobile-insights.png`;
- `commercial-overview/overview-mobile-statuses.png`.

As capturas usam resposta controlada para validar layout, navegação e estados. Não devem ser interpretadas como retrato financeiro real.

## Validação com a base real

O agregador final foi executado localmente contra leitura remota das 556 linhas reconciliadas, sem publicar função ou frontend e sem imprimir identificadores individuais.

Período: 2026-07-01 a 2026-07-13

Moeda: BRL

```json
{
  "sourceRows": 556,
  "availableCurrencies": ["BRL", "EUR", "USD"],
  "totals": {
    "gross": 15333.03,
    "fees": 1589.97,
    "netAfterFees": 13743.06,
    "sales": 135,
    "buyers": 90,
    "averageTicket": 101.8,
    "refunds": 6,
    "refundGross": 613.02,
    "chargebacks": 0,
    "chargebackGross": 0,
    "cancellations": 14
  },
  "goal": {
    "value": 50000,
    "progress": 0.2749,
    "remaining": 36256.94,
    "requiredDailyPace": 1908.26,
    "daysRemaining": 19
  },
  "dailyDays": 13,
  "products": 4,
  "warnings": []
}
```

## Limites e gate

- `producer_net_value` continua ausente na fonte; a interface usa o rótulo explícito `Líquido após taxas`.
- Campanhas, links rastreáveis, cliques e atribuição por vídeo continuam fora deste recorte.
- A nova Edge Function ainda não foi publicada.
- O frontend de produção ainda não foi substituído.
- A publicação depende de autorização específica de Bruno.
