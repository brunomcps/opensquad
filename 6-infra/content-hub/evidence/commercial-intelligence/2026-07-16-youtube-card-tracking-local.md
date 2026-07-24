# Evidência local: rastreamento de card do YouTube

Data da validação: 2026-07-16 23:29:39 -03:00

## Escopo validado

- Nova origem canônica `video`, apresentada como **Card do vídeo**.
- Código visual e técnico `V`.
- Link público canônico por vídeo no formato `https://link.brunosallesphd.com.br/m7p/{video-id}-v`.
- Um card do MAPA-7P por vídeo longo elegível.
- Separação de cliques e vendas de card nos filtros, gráficos e livro-caixa.
- Migração aditiva para aceitar `cta_position = 'video'` nas funções de histórico existentes.

## Evidências automatizadas

### Testes funcionais

Comando:

```text
npm test -- --test-reporter=spec
```

Resultado:

```text
139 testes executados
139 testes aprovados
0 falhas
```

O teste de integração PostgreSQL/PGlite criou uma campanha de card, registrou um clique e uma venda com `cta_position = 'video'` e confirmou que o filtro exclusivo de card devolve um clique e uma venda `direct_primary`.

### Tipagem e builds

```text
npm run typecheck
Resultado: aprovado, exit code 0

npm run build
Resultado: aprovado, 793 módulos transformados

npm run ci:build:web
Resultado: aprovado, 735 módulos transformados
```

### Migração

```text
node --import tsx server/scripts/commercial-intelligence/apply-migration.ts
Resultado: bundle válido em modo check
Migração incluída: 20260717021000_ci_youtube_card_tracking.sql
```

A migração nova é aditiva e idempotente. Ela não derruba tabelas nem apaga dados; apenas atualiza as funções SQL quando encontra a lista anterior de três posições.

### Smoke visual no Chrome

Resultado:

```json
{
  "ok": true,
  "desktopOverflowPx": 0,
  "mobileOverflowPx": 0,
  "visibleTabs": 4,
  "pilotPositions": 4,
  "campaignLinks": 4,
  "trackingFailureState": true
}
```

O smoke confirmou no desktop e no celular:

- ordem visual `D`, `C`, `R`, `V`;
- quarta linha **Card do vídeo**;
- link curto terminado em `-v`;
- filtros e séries de card nos gráficos;
- eventos no livro-caixa;
- estado de falha controlado;
- nenhum overflow horizontal.

Captura principal:

`docs/commercial-intelligence/evidence/campaign-tracking-association/desktop-1366-tracking-campaigns.png`

### Higiene do diff

```text
git diff --check -- <arquivos do escopo>
Resultado: nenhuma falha de whitespace; apenas avisos de conversão LF/CRLF do Git no Windows
```

## Estado de produção

Nada deste escopo foi publicado em produção durante esta validação.

- Nenhuma credencial foi alterada.
- Nenhum webhook foi alterado.
- Nenhum card real do YouTube foi editado.
- Nenhuma campanha de card foi criada no Supabase de produção.
- Nenhuma função ou interface foi implantada.

## Próxima etapa, sujeita a autorização de produção

1. Aplicar a migração aditiva no Supabase.
2. Publicar as funções e a interface atualizadas.
3. Executar o catálogo para criar um link `-v` por vídeo longo elegível.
4. Validar os redirecionamentos sem incrementar cliques humanos.
5. Trocar o URL de um único card piloto no YouTube Studio.
6. Confirmar clique e atribuição no histórico antes de alterar os demais cards.
