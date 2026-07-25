# Publicação de referências de stories pelo Hermes

**Data:** 2026-07-24
**Status:** Aprovado

## Resumo

Criar uma skill operacional para o Hermes transformar uma sequência de stories já analisada em uma referência oficial da plataforma de inteligência comercial.

Não haverá fila de rascunhos nem aprovação editorial intermediária. Quando Bruno pedir para analisar e colocar a sequência na plataforma, o Hermes:

1. confirma a sequência-fonte;
2. produz um único dossiê canônico;
3. valida as camadas rápida e detalhada;
4. publica ou atualiza diretamente a referência oficial;
5. lê o registro de volta;
6. envia o link direto no Telegram.

A versão rápida, o raio-X visual, a análise detalhada e o molde 9:16 são visões do mesmo dossiê. Não são cadastros, arquivos ou referências separados.

A análise isolada continua sem efeito externo. A publicação direta só ocorre quando Bruno pedir explicitamente para cadastrar, catalogar, colocar ou atualizar a referência na plataforma.

Esse pedido explícito autoriza a operação editorial correspondente e não exige uma segunda confirmação. Migration, configuração de secrets e deploy continuam sujeitos a autorização separada.

## Decisões

| Decisão | Escolha |
| --- | --- |
| Estado editorial | Publicação direta, sem rascunho visível |
| Unidade canônica | Um dossiê por sequência-fonte |
| Modos de leitura | Rápido e detalhado sempre disponíveis |
| Análise visual | Parte obrigatória da versão detalhada |
| Skill analítica | Reutilizar `story-sequence-template-analysis` |
| Skill operacional | Criar `catalog-story-reference` |
| Persistência | Operação atômica e idempotente |
| Autenticação | Credencial restrita ao agente, sem sessão de navegador |
| Assets | Originais em storage durável, com caminhos determinísticos |
| Templates | Resolver por identidade canônica exata; criar quando inexistente |
| Correções | Atualizar a mesma referência e incrementar revisão |
| Confirmação | Leitura de retorno e link direto para a referência |

## 1. Escopo

### Incluído

- nova skill operacional no Hermes;
- validação determinística do payload;
- upload durável dos prints originais;
- endpoint restrito de ingestão;
- criação ou atualização atômica de template, referência, itens e vínculos;
- idempotência e histórico técnico de revisões;
- link direto para abrir a referência na plataforma;
- testes do contrato, segurança, persistência e renderização;
- integração da skill analítica existente com a nova skill operacional.

### Não incluído

- fila de rascunhos;
- nova área de aprovação;
- aprovação por Telegram;
- edição completa do dossiê pela interface;
- associação automática por similaridade ou IA;
- deploy, configuração de secrets ou chamada de produção sem autorização específica;
- mudança no fluxo de aprovação de publicações do Bruno.

Referências editoriais e publicações continuam sendo objetos diferentes. A publicação direta desta especificação vale apenas para referências e templates derivados de sequências-fonte.

## 2. Arquitetura

### 2.1 Skill analítica existente

`story-sequence-template-analysis` continua responsável por:

- confirmar a ordem e a completude da sequência;
- analisar cada tela;
- ler a sequência como sistema;
- extrair template reutilizável;
- produzir raio-X visual;
- produzir gramática visual;
- produzir molde 9:16;
- separar preservar, adaptar e evitar;
- distinguir observação, interpretação e inferência.

Ela não grava banco, não gerencia credenciais e não publica assets.

### 2.2 Nova skill operacional

`catalog-story-reference` será responsável por:

- receber o resultado canônico da skill analítica;
- validar campos e arquivos;
- calcular identidades e hashes;
- preparar uploads;
- publicar ou atualizar a referência;
- ler de volta o registro canônico;
- conferir template, itens, ordem e assets;
- salvar um recibo técnico local da publicação;
- devolver ao Hermes um resumo e o link da plataforma.

A skill operacional não refaz a análise. Ela falha quando o dossiê recebido está incompleto.

### 2.3 Endpoint de ingestão

Criar uma Supabase Edge Function dedicada, `ci-story-ingest`.

Ela terá apenas duas ações:

1. `prepare_assets`: valida identidade, hashes e metadados e devolve caminhos determinísticos e URLs assinadas de upload.
2. `publish_reference`: valida o manifesto final, confirma os assets e executa a persistência atômica.

O endpoint administrativo `ci-content` continuará atendendo a interface autenticada. O Hermes não reutilizará o JWT do navegador, uma sessão do ChatGPT nem uma chave `service_role`.

### 2.4 Banco

Uma RPC transacional fará:

1. resolução exata do template canônico;
2. criação do template quando ele não existir;
3. criação ou atualização da sequência-fonte;
4. persistência da análise da sequência;
5. persistência dos itens e metadados;
6. persistência da ordem narrativa;
7. vínculo entre referência e template;
8. gravação da revisão técnica;
9. retorno do identificador da referência.

Se qualquer validação ou inserção falhar, nenhuma mudança editorial será confirmada.

## 3. Contrato canônico

### 3.1 Identidade

O payload terá:

- `referenceKey`: identidade estável da sequência-fonte;
- `contentHash`: hash do conteúdo editorial e dos hashes dos assets;
- `sourceAccount`;
- `sourceUrl`;
- `platform`;
- `sourceStartedAt` e `sourceEndedAt`, quando conhecidos;
- `templateSlug`;
- `templateName`;
- `title`;
- `description`;
- `analysis`;
- `items`.

`referenceKey` será derivada, nesta ordem:

1. do permalink canônico da sequência, quando existir;
2. da plataforma, conta, intervalo temporal e identificadores originais da captura;
3. como último recurso, da plataforma, conta, intervalo temporal e hashes ordenados dos assets originais.

Ela não dependerá do título escrito pelo modelo. Depois da primeira publicação, o Hermes guardará `referenceKey`, `referenceId`, revisão e link em um recibo técnico local. Correções posteriores reutilizarão essa identidade, mesmo quando o conteúdo editorial ou a codificação dos assets mudar.

### 3.2 Template

O template incluirá:

- nome humano;
- slug estrutural;
- objetivo;
- fórmula;
- resumo editorial;
- riscos;
- regras de preservar;
- regras de adaptar;
- regras de evitar;
- etapas narrativas;
- molde 9:16 com placeholders funcionais.

A resolução usará slug normalizado e exato. Correspondência frouxa por substring é proibida.

Se o template já existir:

- a referência será ligada a ele;
- a definição compartilhada não será sobrescrita silenciosamente;
- diferenças editoriais serão registradas na revisão da referência.

Se o template não existir, será criado na mesma transação lógica.

### 3.3 Versão rápida obrigatória

Cada story terá `metadata.quick` com:

- papel da tela;
- título;
- síntese;
- evidência concreta;
- efeito no público;
- subtexto;
- função no funil;
- regra extraída.

A sequência terá:

- resumo;
- arco narrativo;
- mapa da sequência;
- produto aparente;
- produto real;
- fórmula do template.

### 3.4 Versão detalhada obrigatória

Cada story terá:

- trecho original;
- `metadata.deep` com título, papel, lead, seções e regra extraída;
- `metadata.visual` com cena, pessoa, roupa quando visível, tipografia, composição, elemento gráfico, paleta, impressão e marcadores;
- observação visual;
- função narrativa;
- mecanismo de atenção;
- continuidade;
- interação;
- funil;
- subtexto;
- crítica editorial;
- consequência no molde;
- adaptação potencial para Bruno.

A sequência terá:

- leitura geral;
- arquitetura narrativa;
- progressão emocional;
- ritmo e mudança de estímulo;
- gramática visual;
- forças e limitações;
- regras de transferência;
- sínteses transversais;
- template registrado;
- molde 9:16;
- preservar, adaptar e evitar.

O raio-X visual pertence à versão detalhada. A interface pode oferecer atalhos separados, mas o contrato editorial é único.

### 3.5 Regra de completude

Uma referência só pode ser publicada quando:

- existe pelo menos um item;
- a ordem narrativa é contínua e começa em 1;
- todos os itens têm papel narrativo;
- todos os itens visuais têm asset original;
- todos os itens têm `quick`, `visual` e `deep`;
- a sequência tem análise transversal;
- o template tem identidade e etapas;
- os assets são públicos, duráveis e correspondem aos hashes declarados.

O formulário manual atual pode continuar aceitando referências simples. O endpoint do Hermes exige o contrato completo.

## 4. Assets

Os prints originais serão preservados sem recorte destrutivo.

O caminho no storage será determinístico:

```text
story-references/<reference-key>/<narrative-order>-<asset-hash>.<ext>
```

Fluxo:

1. o Hermes calcula hash, MIME e tamanho;
2. `prepare_assets` devolve uma URL assinada para o caminho esperado;
3. o Hermes envia o arquivo diretamente ao storage;
4. `publish_reference` confirma existência, tipo e caminho;
5. a RPC grava somente URLs duráveis confirmadas.

Uma repetição reutiliza os mesmos caminhos. Falhas depois do upload não criam duplicatas editoriais nem uma coleção crescente de assets órfãos.

## 5. Segurança

O Hermes usará uma credencial exclusiva com escopo de ingestão de stories.

Cada requisição será assinada com:

- timestamp;
- nonce;
- hash do corpo;
- assinatura HMAC.

O servidor:

- rejeita timestamps fora da janela;
- rejeita nonce repetido;
- rejeita assinatura inválida;
- limita métodos e ações;
- valida tamanho e tipo do payload;
- não expõe `service_role`;
- não aceita mutações genéricas;
- registra identificador, resultado e erro sem registrar secrets.

O secret local ficará na configuração privada do Hermes. O secret remoto ficará nos secrets da função. Nenhum deles será versionado.

## 6. Idempotência e correções

### Primeira publicação

Se `referenceKey` não existir, criar template quando necessário e criar a referência.

### Repetição idêntica

Se `referenceKey` e `contentHash` coincidirem, retornar a referência existente sem duplicar nada.

### Correção

Se `referenceKey` existir e `contentHash` mudar:

- atualizar a mesma referência;
- substituir de forma atômica análise e itens canônicos;
- incrementar `revision`;
- preservar snapshot técnico da revisão anterior;
- devolver a nova revisão.

### Conflito

Se a mesma `referenceKey` apontar para outra identidade de fonte ou sequência incompatível, retornar `409 reference_identity_conflict`. O Hermes não tentará resolver o conflito por similaridade.

## 7. Experiência na plataforma

Não haverá UI de rascunho.

A referência aparece diretamente na biblioteca e dentro do template ligado.

A página mantém:

1. modo rápido no topo;
2. raio-X visual;
3. análise completa em largura total abaixo da área compacta;
4. gramática visual;
5. molde 9:16;
6. preservar, adaptar e evitar.

O link devolvido ao Hermes deve abrir a referência selecionada. A rota ou estado navegável precisa sobreviver a reload e autenticação.

O Telegram receberá:

- título;
- template ligado;
- quantidade de stories;
- revisão;
- estado `publicado` ou `atualizado`;
- link direto.

## 8. Fluxo operacional

```text
Bruno envia a sequência
  -> Hermes confirma que terminou
  -> skill analítica produz o dossiê canônico
  -> skill operacional valida o contrato completo
  -> prepara e envia assets
  -> publica template + referência em transação idempotente
  -> lê a referência de volta
  -> verifica ordem, vínculo, análise e assets
  -> envia link no Telegram
```

O Hermes só pode dizer “publicado” depois da leitura de retorno.

## 9. Erros

| Falha | Comportamento |
| --- | --- |
| Sequência não confirmada | Não analisar nem publicar |
| Quick, visual ou deep ausente | Falhar localmente antes do upload |
| Asset ilegível ou incompatível | Informar o item e não publicar |
| Upload interrompido | Repetir apenas o asset no mesmo caminho |
| Assinatura inválida | Parar e informar falha de autenticação |
| Template ambíguo | Parar; não escolher por aproximação |
| RPC falha | Rollback integral |
| Leitura de retorno falha | Não repetir criação às cegas; consultar por `referenceKey` |
| Asset remoto não responde | Estado de erro; não declarar publicação concluída |
| Conflito de identidade | Parar e pedir decisão ao Bruno |

## 10. Arquivos previstos

### Hermes

- `/home/bruno/.hermes/skills/social-media/catalog-story-reference/SKILL.md`
- `/home/bruno/.hermes/skills/social-media/catalog-story-reference/scripts/publish_story_reference.py`
- `/home/bruno/.hermes/skills/social-media/catalog-story-reference/references/payload-contract.md`
- `/home/bruno/.hermes/skills/social-media/catalog-story-reference/templates/reference-payload.json`
- atualização de `/home/bruno/.hermes/skills/social-media/story-sequence-template-analysis/SKILL.md`
- recibos em `/home/bruno/.hermes/state/story-reference-publications/<reference-key>.json`

### Plataforma

- nova função `supabase/functions/ci-story-ingest/`
- contrato compartilhado em `supabase/functions/_shared/storyContent.ts`
- migration para identidade, revisão, replay protection e RPC idempotente;
- testes de contrato e banco em `server/services/commercial-intelligence/` e `server/scripts/commercial-intelligence/`;
- deep link e hidratação da referência em `src/components/commercial-intelligence/StoryContentView.tsx`;
- ajustes mínimos no cliente de API;
- nenhuma nova tela de rascunho.

Os caminhos finais podem ser ajustados ao padrão exato encontrado durante a implementação, sem alterar as fronteiras descritas nesta especificação.

## 11. Testes

### Skill

- payload completo de Raul Sena passa;
- ausência de `quick`, `visual` ou `deep` falha;
- ordem duplicada ou descontínua falha;
- hash e `referenceKey` são determinísticos;
- resposta de sucesso só é emitida após read-back;
- falha de read-back não dispara criação cega.

### Edge Function

- assinatura válida passa;
- corpo adulterado falha;
- timestamp expirado falha;
- nonce repetido falha;
- ação não permitida falha;
- asset inexistente falha;
- cliente não recebe `service_role`.

### Banco

- criação nova é atômica;
- template existente é ligado por identidade exata;
- template inexistente é criado uma vez;
- repetição idêntica não duplica;
- correção incrementa revisão na mesma referência;
- conflito retorna 409;
- falha intermediária faz rollback;
- privilégios continuam restritos.

### Interface

- link direto abre a referência correta;
- modo rápido renderiza todos os stories;
- raio-X visual renderiza todos os stories;
- análise detalhada ocupa a largura total do conteúdo;
- molde e regras de transferência aparecem;
- originais usam `contain` e não recebem chrome sintético;
- desktop e mobile não têm overflow horizontal.

### Verificação final

- testes focados;
- suíte de regressão do conteúdo;
- typecheck;
- build;
- check das Edge Functions;
- smoke local com o dossiê completo;
- quando autorizado, migration e deploy;
- criação real de uma referência de teste;
- leitura de retorno no mesmo ambiente;
- smoke do link e dos assets publicados.

## 12. Critérios de aceite

A entrega estará pronta quando:

- o Hermes executar análise e catalogação sem terminal manual;
- toda referência criada por essa skill tiver versões rápida e detalhada;
- referência e template aparecerem ligados no mesmo dossiê;
- repetir o comando não criar duplicata;
- uma correção atualizar a mesma referência;
- nenhuma credencial administrativa ampla ficar no Hermes;
- a confirmação do Telegram incluir um link funcional;
- a prova de sucesso incluir persistência lida de volta e assets carregando.
