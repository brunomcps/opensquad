# Design — recuperação de senha da Inteligência Comercial

Data: 2026-07-14

## Problema

O usuário administrativo perdeu a sessão depois que um script operacional executou `signOut` global. A conta continua confirmada, habilitada e autorizada, mas o login por senha não está sendo aceito. A tela já oferece “Esqueci minha senha”, porém qualquer falha é reduzida a uma mensagem genérica e o fluxo não foi validado ponta a ponta em produção.

## Objetivo

Restabelecer o acesso sem solicitar ou armazenar a senha do usuário e deixar um fluxo permanente de recuperação que funcione na própria aplicação.

## Abordagens consideradas

### 1. Recuperação nativa por e-mail — escolhida

Usar `resetPasswordForEmail` do Supabase, com retorno para a URL estável da Inteligência Comercial. O evento `PASSWORD_RECOVERY` abre a tela de definição da nova senha.

Vantagens: fluxo conhecido, senha nunca passa pelo operador e continua disponível para incidentes futuros. Desvantagens: depende da entrega de e-mail e dos limites do provedor SMTP.

### 2. Link administrativo de recuperação — fallback

Gerar um link de recuperação de uso único pela API administrativa e abri-lo diretamente no navegador real do usuário. A senha continua sendo definida pelo próprio usuário.

Vantagem: não depende da entrega de e-mail. Desvantagem: exige uma operação administrativa controlada e não substitui o fluxo permanente da interface.

### 3. Definição administrativa de senha temporária — descartada

Alterar a senha pela API administrativa e entregar uma senha temporária. Foi descartada porque expõe uma credencial desnecessariamente e cria uma segunda troca obrigatória.

## Arquitetura e fluxo

1. A tela de login mantém e-mail e senha como método principal.
2. “Esqueci minha senha” solicita o e-mail e chama a recuperação nativa com `redirectTo` apontando para a origem estável da aplicação.
3. A configuração de Auth do Supabase deve aceitar explicitamente a URL estável e as URLs imutáveis usadas em testes autorizados.
4. A mensagem após o pedido não confirma se uma conta existe, evitando enumeração de usuários.
5. Ao abrir o link, o cliente Supabase processa a sessão de recuperação e emite `PASSWORD_RECOVERY`.
6. A aplicação mostra somente o campo de nova senha, exige no mínimo oito caracteres e chama `updateUser`.
7. Depois da atualização, a sessão permanece ativa, a associação em `ci_app_members` é validada e o painel é carregado.
8. Se o e-mail não puder ser entregue, o operador usa uma única vez o link administrativo de recuperação e o abre diretamente no Edge do usuário, sem imprimir ou persistir o token.

## Componentes

### Tela de autenticação

- manter os modos `login`, `reset` e `update`;
- separar mensagens de login, limite de envio, falha de rede, link inválido/expirado e senha rejeitada;
- preservar a mensagem neutra depois do envio de recuperação;
- impedir envios repetidos enquanto a solicitação estiver em andamento;
- permitir voltar ao login sem recarregar a página.

### Estado de autenticação

- reconhecer `PASSWORD_RECOVERY` e a sessão presente na URL;
- sair do modo de recuperação somente após `updateUser` bem-sucedido;
- encerrar sessões temporárias de scripts com `scope: 'local'`;
- não registrar tokens, senhas ou links de recuperação.

### Configuração do Supabase

- verificar `site_url` e a lista de redirects antes de alterar;
- adicionar somente as origens necessárias caso estejam ausentes;
- não mudar chaves, provedores, webhook ou política de cadastro.

## Tratamento de erros

- credenciais inválidas: “E-mail ou senha inválidos.”;
- excesso de solicitações: orientar a aguardar antes de reenviar;
- falha de rede ou serviço: informar indisponibilidade temporária;
- link inválido ou expirado: oferecer o envio de um novo link;
- senha curta ou rejeitada: preservar a sessão de recuperação e solicitar correção;
- e-mail solicitado: sempre usar resposta neutra quanto à existência da conta.

Detalhes técnicos ficam restritos ao console de desenvolvimento durante testes e não são exibidos na interface pública.

## Testes

1. Testes unitários para classificação segura dos erros e construção da URL de retorno.
2. Build e typecheck da aplicação.
3. Teste visual dos três modos de autenticação.
4. Smoke de produção com link administrativo de recuperação:
   - abrir o link no navegador real;
   - definir uma nova senha sem expô-la ao operador;
   - validar login e carregamento do painel;
   - confirmar que a conta continua `admin` e habilitada.
5. Teste de regressão garantindo `scope: 'local'` nos scripts operacionais.

## Rollout

1. Implementar e testar localmente.
2. Verificar e, se necessário, corrigir somente a allowlist de redirects do Supabase.
3. Publicar o frontend no Cloudflare Pages.
4. Gerar um link administrativo de recuperação de uso único e abri-lo diretamente no Edge do usuário.
5. O usuário define a nova senha.
6. Validar o acesso e registrar evidências sem incluir credenciais ou tokens.

## Critérios de aceite

- o botão “Esqueci minha senha” inicia um fluxo utilizável;
- o link de recuperação abre a aplicação no modo correto;
- o usuário define a própria senha sem compartilhá-la;
- o painel carrega após a troca;
- falhas relevantes recebem mensagens claras e seguras;
- scripts administrativos não encerram outras sessões;
- nenhuma alteração ocorre no portal de membros, webhook, Hotmart, YouTube ou campanhas existentes.
