# Design: links rastreáveis com domínio próprio para o MAPA-7P

Data: 2026-07-14

Status: aprovado por Bruno para implementação do piloto

## Contexto

O módulo privado de Inteligência Comercial já cria campanhas por vídeo e posição de CTA, registra cliques e relaciona códigos de origem devolvidos pela Hotmart. Sem uma camada pública própria, o endereço oferecido para colar no YouTube expõe a URL longa da Edge Function do Supabase.

O piloto deve produzir links curtos e confiáveis no domínio usado pelos infoprodutos, sem alterar a landing page do MAPA-7P, o portal de membros ou o proxy do Content Hub.

## Objetivo

Disponibilizar três links rastreáveis e curtos para o vídeo `0OkxYzoxzUk`, um por posição:

- descrição;
- comentário fixado;
- resposta a comentário.

Formato público:

```text
https://link.brunosallesphd.com.br/m7p/<codigo-curto>
```

## Fora do escopo

- alterar automaticamente descrição ou comentários no YouTube;
- gerar links para todos os vídeos;
- alterar a landing page hospedada no projeto `mapa-7p`;
- alterar o portal de membros;
- alterar o Worker `content-hub-proxy` ou a rota `hub.brunosallesphd.com.br`;
- alterar webhook Hotmart, credenciais ou chaves existentes;
- executar uma compra de teste.

## Abordagens consideradas

### Worker Cloudflare dedicado — escolhida

Um Worker isolado recebe o caminho curto e encaminha a resolução ao rastreador existente no Supabase. Preserva o domínio próprio, mantém o registro de clique e não acopla a solução a outros sites.

### Regra de redirecionamento da Cloudflare

Seria menor, mas deixaria a transformação dinâmica do slug mais limitada e distribuiria a lógica entre regras e aplicação.

### Alteração do Pages do MAPA-7P

Reutilizaria o projeto existente, mas aumentaria o risco operacional sobre a landing page. Foi descartada.

## Arquitetura

### Worker `mapa7p-link-router`

Responsabilidades:

- responder exclusivamente por `link.brunosallesphd.com.br`;
- aceitar `GET` e `HEAD` em `/m7p/<slug>`;
- validar o slug antes de chamar o backend;
- encaminhar o slug para `ci-campaign-redirect` sem expor a URL do Supabase ao usuário;
- devolver somente status, `Location`, `Cache-Control` e cabeçalhos estritamente necessários;
- responder 404 para raiz, caminho ou slug inválido;
- responder 405 para métodos não suportados.

O Worker não recebe segredo e não acessa o banco diretamente.

### Supabase Edge Functions

`ci-campaign-redirect` continua responsável por:

- localizar campanha ativa;
- montar o HotLink com `src` e UTMs;
- registrar o clique sem IP ou URL completa de referência;
- classificar bots;
- devolver HTTP 302.

Para permitir validações de link sem poluir métricas, `HEAD` devolve os mesmos cabeçalhos de redirect de `GET`, mas não grava clique. O Worker preserva o método ao encaminhar a requisição.

`ci-campaigns` passa a aceitar um modelo configurável de URL pública contendo `{slug}`. Quando o modelo não estiver configurado, o comportamento atual com query string do Supabase permanece como fallback.

Configuração pública esperada:

```text
CI_CAMPAIGN_REDIRECT_BASE_URL=https://link.brunosallesphd.com.br/m7p/{slug}
```

Embora armazenada como variável da Edge Function, essa URL não é credencial nem segredo.

### Banco de dados

Não haverá nova tabela. Cada posição do CTA continua sendo uma campanha independente em `ci_campaigns`.

O slug público terá oito caracteres alfanuméricos minúsculos em base 36, respeitando a constraint atual e mantendo baixa probabilidade de colisão. A constraint única e as tentativas já existentes continuam sendo a proteção definitiva contra colisões.

## Fluxo de dados

1. O usuário acessa `https://link.brunosallesphd.com.br/m7p/<slug>`.
2. O Worker valida o caminho e chama `ci-campaign-redirect?slug=<slug>`.
3. A Edge Function busca uma campanha ativa e já iniciada.
4. A Edge Function registra o clique, classifica o agente e não persiste IP.
5. A Edge Function monta o HotLink oficial `https://go.hotmart.com/K103806991N` com `src` e UTMs.
6. O Worker devolve o HTTP 302 ao navegador.
7. Quando uma transação Hotmart devolver o mesmo código, a atribuição direta relaciona a venda à campanha.

## Campanhas do piloto

Vídeo:

```text
0OkxYzoxzUk — O QUE REALMENTE É TDAH (Não é uma doença)
```

Configuração comum:

- produto: MAPA-7P;
- product ID: `6966825`;
- destino: `https://go.hotmart.com/K103806991N`;
- parâmetro de rastreamento: `src`;
- UTM source: `youtube`;
- UTM medium: `organic`;
- UTM campaign: `mapa7p-youtube`;
- status: ativo.

Cada campanha recebe um tracking code distinto com o código da posição `d`, `p` ou `r`.

## Segurança e privacidade

- O Worker não armazena dados.
- A Edge Function não persiste IP, URL completa de referência ou dados pessoais.
- Slugs inválidos não são encaminhados.
- Respostas de redirect usam `Cache-Control: no-store`.
- O Worker não segue redirects vindos do backend; apenas os devolve ao cliente.
- Não serão alterados credenciais, webhook Hotmart ou secrets existentes.

## Tratamento de erros

- raiz, caminho inválido, slug inválido ou campanha ausente: HTTP 404;
- método não permitido: HTTP 405;
- indisponibilidade do backend: resposta controlada 502, sem revelar detalhes internos;
- resposta do backend sem `Location` em um redirect: 502;
- campanha inativa: HTTP 404, preservando o comportamento atual.

## Publicação

Ordem:

1. implementar e testar localmente o Worker e o modelo `{slug}`;
2. publicar a Edge Function atualizada;
3. configurar `CI_CAMPAIGN_REDIRECT_BASE_URL`;
4. publicar o Worker com custom domain;
5. confirmar DNS e TLS;
6. executar testes negativos;
7. criar as três campanhas do piloto;
8. executar o smoke sem seguir o redirect até a Hotmart;
9. remover eventos técnicos de teste;
10. registrar evidências.

Nenhuma campanha será criada antes de domínio, TLS e testes negativos estarem saudáveis.

## Testes e evidências

### Automatizados

- geração de slug curto dentro da constraint;
- substituição segura de `{slug}` no modelo público;
- preservação do fallback atual com query string;
- `HEAD` devolvendo o redirect sem criar clique;
- validação de métodos, caminhos e slugs no Worker;
- propagação de 302, 404 e falha controlada do backend;
- suíte completa `npm run ci:check`.

### Produção

- DNS e certificado ativos;
- raiz e slug inválido retornam 404;
- os três links retornam 302;
- cada `Location` contém o HotLink, o `src` correto e UTMs;
- chamadas técnicas usam agente classificado como bot;
- eventos técnicos são removidos após a verificação;
- `ci_campaigns` contém exatamente as três campanhas do piloto;
- portal, landing page e `hub.brunosallesphd.com.br` continuam respondendo normalmente.

## Rollback

Se a publicação falhar antes da criação das campanhas, o custom domain e o Worker são removidos e a configuração pública volta ao fallback do Supabase.

Se falhar depois da criação, as três campanhas são desativadas antes da remoção do Worker. Nenhum registro Hotmart ou YouTube é alterado.

## Critérios de aceitação

- existem três links no formato aprovado;
- os links são distintos por posição;
- todos resolvem por HTTPS e retornam o destino oficial correto;
- cliques humanos futuros são registrados por campanha;
- o teste não deixa clique humano ou evento técnico residual;
- nenhum sistema fora do escopo sofre alteração;
- evidências de testes e publicação ficam registradas no repositório.
