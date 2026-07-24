# Evidência local: campanhas agrupadas por vídeo

Data: 2026-07-14

Branch: `codex/commercial-intelligence-f0-f1`

Base anterior à implementação: `eb4dfd99`

Escopo: redesenho local da listagem de campanhas da Inteligência Comercial. Nenhuma publicação foi executada.

## Resultado

- Cada `video_id` é apresentado como um único card.
- O vídeo piloto contém três posições ordenadas como `D`, `C` e `R`.
- Miniatura, título, ID e métricas agregadas identificam o grupo.
- Métricas individuais permanecem visíveis em cada posição.
- O iframe `youtube-nocookie.com` não existe antes da interação.
- O player é criado após comando explícito e removido ao recolher.
- Informações operacionais ficam em `Detalhes técnicos`, fechado inicialmente.
- Estado misto usa aviso âmbar em vez de aparência saudável verde.
- Desktop e mobile ficaram sem overflow horizontal.
- O link público copiado no smoke foi o link da posição correta.

## Baseline

Antes da mudança:

```text
npm test                    79 aprovados, 0 falhas
npm run typecheck           aprovado
npm run ci:build:web        aprovado
npm run ci:verify-bundle    3 arquivos, 414151 bytes, 7 verificações de segredo
```

O aviso de depreciação de `punycode` já existia e não foi alterado por este trabalho.

## Validação final

```text
npm test
83 aprovados, 0 falhas, 0 ignorados

npm run typecheck
aprovado

VITE_SUPABASE_URL=https://fixture.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=fixture-publishable-key
npm run ci:build:web
aprovado; 732 módulos transformados

npm run ci:verify-bundle
{"ok":true,"files":3,"bytes":847264,"secretChecks":7}

npm run ci:check:edge
9 Edge Functions verificadas sem erro

npm run ci:check
fluxo completo aprovado; 83 testes; typecheck, build, bundle e Edge sem erro
bundle do fluxo padrão: 3 arquivos, 419118 bytes, 7 verificações de segredo
```

As variáveis usadas no build visual são valores fictícios e públicos. Nenhuma credencial real foi lida ou alterada.

## Smoke visual e interativo

Ambiente:

- preview local: `http://127.0.0.1:4175`;
- navegador: Chrome em modo headless;
- dados: fixtures interceptadas pelo Playwright;
- iframe: resposta local controlada para `youtube-nocookie.com`;
- nenhuma função de produção foi chamada.

Resultado:

```json
{
  "ok": true,
  "desktopOverflowPx": 0,
  "mobileOverflowPx": 0,
  "desktopNavHeight": 43,
  "mobileNavHeight": 80,
  "visibleTabs": 4,
  "videoBundles": 2,
  "pilotPositions": 3,
  "copiedLink": "https://link.brunosallesphd.com.br/m7p/0okxyzoxzuk-d",
  "iframeSource": "https://www.youtube-nocookie.com/embed/0OkxYzoxzUk?autoplay=1",
  "campaignLinks": 4,
  "associationRows": 2
}
```

O smoke verificou por teclado a reprodução, a cópia do link e a abertura dos detalhes técnicos. Também confirmou três ações administrativas no grupo piloto sem executá-las.

## Capturas inspecionadas

Diretório: `docs/commercial-intelligence/evidence/campaign-tracking-association/`

- `desktop-1366-tracking-campaigns.png`: conjunto recolhido em desktop;
- `desktop-1366-tracking-player.png`: player expandido em desktop;
- `desktop-1366-tracking-details.png`: detalhes técnicos em desktop;
- `mobile-390-tracking-campaigns.png`: conjunto recolhido em mobile;
- `mobile-390-tracking-player.png`: player expandido em mobile;
- `mobile-390-tracking-details.png`: detalhes técnicos em mobile;
- capturas de topo e associação preservam a verificação das demais áreas da tela.

Inspeção visual:

- o card comunica um vídeo com várias posições, não três vídeos independentes;
- a miniatura é o principal ponto de reconhecimento;
- os links são copiáveis sem abrir o destino;
- o selo misto está visualmente distinto do estado totalmente ativo;
- a hierarquia e as métricas permanecem legíveis em 390 px.

## Falha encontrada durante a validação

A primeira execução do smoke não encontrou a aba `Rastreamento`. O bundle local havia sido compilado sem as duas variáveis públicas fictícias exigidas pela tela e, por isso, renderizou o estado de configuração ausente.

Correção aplicada ao procedimento de teste:

1. recompilar o bundle com URL e publishable key fictícias;
2. manter todas as rotas Supabase interceptadas;
3. repetir o smoke;
4. confirmar código de saída zero e novas capturas.

Nenhum código de produção foi alterado para contornar essa falha de ambiente.

## Proteção de escopo

O diff não contém:

- migration;
- alteração em `supabase/functions`;
- credencial ou secret;
- webhook;
- mudança de slug, destino ou campanha existente;
- arquivo do portal de membros;
- dependência nova;
- publicação ou smoke de produção.

## Rollback

O rollback é exclusivamente de frontend e testes:

1. restaurar a renderização anterior em `CampaignTracking.tsx`;
2. remover `VideoCampaignBundle.tsx` e `campaignBundleModel.ts`;
3. restaurar os estilos anteriores da listagem;
4. restaurar o smoke visual e remover o teste do modelo.

Não há rollback de dados porque nenhum dado, campanha ou integração foi alterado.

## Gate pendente

A publicação do frontend da Inteligência Comercial permanece bloqueada até autorização específica de Bruno.
