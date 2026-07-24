# Design: publicação gratuita da Inteligência Comercial

Data: 2026-07-13

Status: aprovado em conversa; aguardando revisão do documento
Branch: `codex/commercial-intelligence-f0-f1`

## 1. Objetivo

Publicar somente a superfície de Inteligência Comercial do Content Hub em uma arquitetura gratuita, privada e independente do computador local. A solução deve preservar a implementação das Fases 0 e 1, os dados já carregados no Supabase e os controles de segurança do webhook Hotmart.

O restante do Content Hub e o portal de membros não serão publicados, migrados ou alterados por este trabalho.

## 2. Decisões aprovadas

- Frontend estático no Cloudflare Pages.
- Autenticação por e-mail e senha usando Supabase Auth.
- Cadastro da aplicação fechado; usuários são criados administrativamente e precisam de associação ativa.
- Autorização adicional por associação ativa em `ci_app_members`.
- Backend exclusivo da Inteligência Comercial em Supabase Edge Functions.
- Agendamentos usando Supabase Cron, `pg_cron` e `pg_net`.
- Banco existente preservado, sem cópia de dados.
- Webhook Hotmart público apenas por necessidade técnica e protegido por HOTTOK.
- Nenhuma dependência da Railway depois do aceite de produção.

## 3. Escopo

### Incluído

- Aplicação React dedicada à Inteligência Comercial, dentro do repositório do Content Hub.
- Tela de login, recuperação de senha, encerramento e restauração de sessão.
- Controle dos papéis `viewer` e `admin`.
- Visão existente de qualidade dos dados.
- API privada para consultar qualidade e estado das sincronizações.
- Sincronização manual e agendada do YouTube.
- Reconciliação manual e agendada da Hotmart.
- Webhook Hotmart validado e idempotente.
- Deploy de preview e produção no Cloudflare Pages.
- Evidências de testes, ativação, webhook e rollback.

### Fora do escopo

- Publicação ou migração das demais telas e APIs do Content Hub.
- Alteração do portal de membros ou reutilização de sua base de usuários.
- Desenvolvimento das Fases 2 em diante do PRD.
- Migração de banco ou arquivos para fora do Supabase atual.
- Inclusão de cadastro público, login social ou cobrança.
- Compra de plano Railway ou outro serviço pago.

## 4. Arquitetura

```text
Usuário
  |
  v
Cloudflare Pages (frontend estático dedicado)
  |
  +--> Supabase Auth (e-mail e senha)
  |
  +--> Edge Functions privadas --> tabelas ci_*

Hotmart --> ci-hotmart-webhook --> ci_apply_hotmart_event --> tabelas ci_*

Supabase Cron
  +--> ci-sync-youtube --> YouTube APIs --> tabelas ci_*
  +--> ci-sync-hotmart --> Hotmart API --> tabelas ci_*
```

O frontend usa apenas a URL do projeto e a chave pública do Supabase. Credenciais de serviço e integrações externas ficam em Supabase Secrets ou Vault.

## 5. Componentes

### 5.1 Frontend dedicado

Será criado um entrypoint Vite separado que reutiliza os componentes, tipos e estilos da Inteligência Comercial. Ele não importa o shell completo nem as demais telas do Content Hub.

Estados obrigatórios:

- sessão em carregamento;
- usuário não autenticado;
- usuário autenticado sem associação autorizada;
- aplicação disponível;
- sessão expirada;
- API indisponível ou resposta parcial.

O frontend não acessa diretamente as tabelas comerciais. Ele chama Edge Functions com o JWT da sessão.

### 5.2 Supabase Auth e associação

A aplicação não oferece fluxo de cadastro. Usuários iniciais serão criados pelo painel ou API administrativa, nunca pelo frontend, e só acessam dados após receber uma associação ativa em `ci_app_members`.

Antes de alterar a configuração global de cadastro do Supabase Auth, a implementação deve verificar se o projeto é compartilhado com outra aplicação. Se for compartilhado, a configuração global permanece inalterada e o fechamento é garantido pela ausência de signup no frontend e pela associação obrigatória. Isso evita impacto no portal de membros ou em outro consumidor do projeto.

Nova tabela aditiva:

```sql
create table public.ci_app_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('viewer', 'admin')),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

RLS permanece ativa. O usuário autenticado pode, no máximo, consultar a própria associação. As tabelas `ci_*` continuam sem leitura direta pelo navegador; o acesso ocorre por Edge Functions após autorização.

### 5.3 Edge Functions

Funções previstas:

| Função | Autorização | Responsabilidade |
| --- | --- | --- |
| `ci-quality` | JWT + membro ativo | Retornar qualidade, cobertura e últimos runs |
| `ci-sync-youtube` | JWT admin ou segredo Cron | Executar janela móvel de 35 dias |
| `ci-sync-hotmart` | JWT admin ou segredo Cron | Reconciliar janela móvel de 35 dias |
| `ci-hotmart-webhook` | HOTTOK | Validar e aplicar evento idempotente |

Código compartilhado ficará em módulos pequenos para contratos, datas, normalização, autorização, repositório e respostas HTTP. A lógica de domínio existente será portada com o menor número possível de alterações e sem acoplamento ao Express.

Os adaptadores externos devem usar `fetch` e Web Crypto, disponíveis no runtime Deno. O adaptador YouTube fará refresh OAuth e chamará diretamente as APIs Data e Analytics, sem carregar o pacote Node `googleapis`. A anonimização HMAC usará Web Crypto em vez de `node:crypto`. Isso reduz bundle, inicialização e incompatibilidades no Edge Runtime.

### 5.4 Agendamentos

Dois jobs diários serão criados em `America/Sao_Paulo`, convertidos para a expressão UTC correspondente:

- YouTube às 06:10;
- Hotmart às 06:40.

Os horários serão configuráveis no SQL de ativação. As execuções usam a janela móvel existente de 35 dias para absorver revisões tardias da fonte.

O plano gratuito permite no máximo 150 segundos de wall clock por execução. Os backfills observados antes deste design concluíram em aproximadamente 10 segundos para YouTube e 40 segundos para Hotmart. A ativação exige que cada função termine em até 100 segundos no teste real. Se esse limite interno for ultrapassado, a fonte não será agendada até que o trabalho seja dividido em lotes determinísticos e idempotentes.

O segredo Cron será gerado especificamente para esta aplicação, guardado no Vault e enviado em cabeçalho próprio. Ele não será igual ao service role, HOTTOK ou senha de usuário.

## 6. Autorização

### Viewer

- consultar qualidade, cobertura e estado das fontes;
- visualizar dados autorizados pela interface;
- encerrar a própria sessão.

### Admin

- todas as permissões de viewer;
- disparar sincronização YouTube;
- disparar reconciliação Hotmart.

Uma função privada aceita a requisição quando uma destas condições for satisfeita:

1. JWT válido de usuário com associação ativa e papel exigido; ou
2. segredo Cron válido, somente nas funções de sincronização.

Comparações de HOTTOK e segredo Cron devem evitar vazamento por diferença de tempo.

## 7. Fluxos

### 7.1 Login

1. Usuário informa e-mail e senha.
2. Supabase Auth valida a credencial.
3. O frontend chama `ci-quality` com o JWT.
4. A função valida a associação ativa.
5. Usuário autorizado recebe a aplicação; usuário sem associação recebe `403`.

Mensagens de falha de login não confirmam se um e-mail está cadastrado.

### 7.2 Webhook Hotmart

1. Hotmart envia o evento para `ci-hotmart-webhook`.
2. A função valida `X-HOTMART-HOTTOK` antes de interpretar o payload.
3. O normalizador elimina PII e calcula `buyer_key` por HMAC.
4. A RPC `ci_apply_hotmart_event` grava o evento e atualiza o snapshot de forma atômica.
5. Eventos repetidos retornam sucesso idempotente sem duplicação.

Payload bruto e dados pessoais não são registrados em logs.

### 7.3 Sincronização YouTube

1. A função adquire uma trava lógica da fonte.
2. Registra o início em `ci_sync_runs`.
3. Descobre os vídeos pelo playlist de uploads.
4. Consulta relatórios diários em lotes filtrados por vídeo.
5. Preserva lacunas e métricas líquidas negativas.
6. Faz upsert de metadados e métricas.
7. Finaliza o run como `success`, `partial` ou `failed`.

### 7.4 Reconciliação Hotmart

1. A função adquire uma trava lógica da fonte.
2. Consulta os status suportados na janela móvel.
3. Normaliza e anonimiza cada transação.
4. Atualiza snapshots sem apagar o histórico de eventos.
5. Registra reparos, descartes e avisos no run.

## 8. Concorrência e idempotência

- O webhook continua usando a chave do evento e a RPC atômica existente.
- Sincronizações usam uma trava por fonte com expiração defensiva.
- Uma segunda execução da mesma fonte recebe `409 sync_in_progress`.
- Upserts usam as chaves naturais já definidas nas tabelas.
- Repetir um job após falha não exige limpeza manual.

## 9. Erros e observabilidade

As respostas usam códigos estáveis e não expõem mensagens de SDK, tokens ou detalhes internos.

| Situação | HTTP | Código |
| --- | ---: | --- |
| Sem sessão | 401 | `unauthorized` |
| Sem associação | 403 | `membership_required` |
| Papel insuficiente | 403 | `admin_required` |
| HOTTOK inválido | 401 | `invalid_hottok` |
| Sync concorrente | 409 | `sync_in_progress` |
| Configuração ausente | 503 | `source_not_configured` |
| Falha inesperada | 500 | `internal_error` |

`ci_sync_runs` permanece como fonte operacional de rows lidas, gravadas, descartadas, reparos, avisos, watermark e erro sanitizado. A interface mostra última execução, lacunas e divergências sem transformar ausência em zero.

## 10. Segurança

- Chaves secretas nunca entram em variáveis `VITE_*`.
- CORS aceita somente preview autorizado, domínio de produção e localhost de desenvolvimento.
- Funções privadas validam JWT e associação em toda requisição.
- O webhook não exige JWT, mas não processa nada antes de validar HOTTOK.
- Segredos são separados por finalidade e podem ser rotacionados individualmente.
- Segredos previstos: credenciais Hotmart, HOTTOK, HMAC de comprador, credenciais OAuth YouTube, segredo Cron e origens CORS autorizadas.
- Logs não contêm e-mail de comprador, nome, documento, telefone, token ou payload bruto.
- Nenhuma política concede leitura anônima às tabelas comerciais.
- A criação do primeiro usuário e qualquer alteração de credencial serão registradas sem incluir o valor secreto.

## 11. Testes

### Unitários

- manter os 46 testes atuais verdes;
- portar testes de normalização, datas, métricas negativas, idempotência e reconciliação;
- adicionar testes de autorização para viewer, admin, membro desativado e usuário ausente;
- testar CORS, mensagens sanitizadas e validação do segredo Cron.

### Integração

- login válido e inválido;
- JWT ausente, expirado e válido;
- acesso negado para usuário sem associação;
- viewer impedido de sincronizar;
- admin autorizado a sincronizar;
- webhook repetido persistido uma vez;
- HOTTOK inválido sem escrita;
- execução concorrente recusada;
- sync real preservando contagens e cobertura existentes.

### Build e segurança

- typecheck do frontend e das funções;
- build de produção do entrypoint dedicado;
- varredura do bundle por nomes e valores de segredos;
- confirmação de que o bundle não carrega rotas ou componentes fora do escopo.

### Aceite visual e operacional

- smoke test desktop e mobile;
- login, logout e recuperação de senha;
- relatório de qualidade carregando dados reais;
- preview protegido antes da produção;
- endpoint do webhook respondendo corretamente antes do cadastro na Hotmart.

## 12. Publicação e ativação

Ordem obrigatória:

1. aplicar a migração aditiva de `ci_app_members` e das travas;
2. publicar Edge Functions com nomes exclusivos;
3. configurar Secrets e Vault;
4. criar o primeiro usuário e sua associação admin;
5. publicar preview no Cloudflare Pages;
6. executar testes de autenticação, autorização e dados;
7. publicar o domínio de produção;
8. executar smoke test externo;
9. cadastrar e testar o webhook Hotmart;
10. ativar os jobs Cron;
11. observar pelo menos uma execução de cada fonte;
12. declarar a Railway fora do caminho crítico.

A ativação não altera o portal de membros. O webhook só é cadastrado após o endpoint público ser comprovado. Evidências não incluem credenciais ou PII.

## 13. Rollback

Se a aplicação falhar após a ativação:

1. desativar os jobs Cron;
2. remover ou desativar o webhook Hotmart novo;
3. retirar o projeto Pages de produção ou voltar ao último deployment estável;
4. manter Edge Functions e tabelas para diagnóstico;
5. preservar todos os dados `ci_*` já existentes.

O rollback não apaga transações, eventos, métricas ou runs. As mudanças de schema são aditivas e podem permanecer sem afetar o Content Hub local.

## 14. Critérios de conclusão

- Aplicação privada acessível no domínio de produção.
- A aplicação não oferece cadastro público.
- Nenhuma configuração global compartilhada de autenticação foi alterada sem auditoria.
- Usuário autorizado entra com e-mail e senha.
- Usuário não autorizado não acessa dados.
- Viewer e admin respeitam suas permissões.
- Qualidade exibe os dados existentes sem regressão.
- YouTube e Hotmart executam manualmente e via Cron.
- Webhook Hotmart está validado, idempotente e ativo.
- Nenhum segredo aparece no frontend ou nas evidências.
- Testes, typecheck, build e smoke tests estão aprovados.
- Portal de membros e demais áreas do Content Hub permanecem inalterados.
- Evidência final documenta deploy, URLs, testes, contagens e rollback.
