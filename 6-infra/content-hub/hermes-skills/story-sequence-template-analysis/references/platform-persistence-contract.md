# Contrato de persistência e validação de referências

Use este guia quando a biblioteca editorial sair da análise e entrar em uma aplicação com banco, API e interface.

## Estados que não podem ser confundidos

1. **Preparado:** análise, metadados e mídia estão no formulário ou fixture, mas nada foi gravado.
2. **Persistido:** a criação transacional foi executada e o registro foi lido de volta do banco.
3. **Publicado:** migration, função/API, frontend e assets estão disponíveis no ambiente remoto validado.

Uma referência piloto só está “cadastrada” no estado 2. Um formulário pré-preenchido conta como preparado. Um bloco de seed dentro de uma migration ainda não aplicada também conta como preparado. Depois de aplicar a migration, consultar a sequência, os itens ordenados e o vínculo ao template para confirmar o estado persistido. Mesmo persistida, a referência só fica operacional no ambiente publicado quando todas as URLs de mídia responderem nesse ambiente.

## Contrato mínimo da referência

Preservar em uma única operação lógica:

- título e análise da sequência;
- plataforma, conta e URL da fonte;
- início e fim cronológicos, quando conhecidos;
- template vinculado;
- itens individuais com mídia, análise, horário real, posição narrativa e função narrativa;
- autor do cadastro e timestamps de auditoria.

A ordem narrativa pertence ao vínculo sequência-item. O horário real pertence ao item. Não derive um do outro.

## Resolução canônica do template

Quando um piloto depende de um template específico:

- resolver pelo nome canônico normalizado e exato, nunca pelo primeiro nome que apenas contém uma palavra como `cena`;
- garantir um índice único para nomes ativos normalizados;
- preparar o template de forma idempotente, com `where not exists` ou conflito equivalente, para não duplicá-lo em ambientes já iniciados;
- fazer o formulário pré-selecionar o identificador do template canônico;
- validar na leitura de retorno que a referência foi ligada ao identificador esperado e que o relacionamento registrado é o correto.

O template é um dado editorial compartilhado, não uma conveniência temporária do formulário.

## Smoke visual com fixtures

O smoke local com rotas interceptadas prova o contrato da interface, mas não prova persistência remota. Para referências, ele deve verificar pelo menos:

- listagem e detalhe da referência piloto;
- preview 9:16 e carregamento dos prints;
- template canônico selecionado no formulário;
- mesma quantidade e ordem de URLs de mídia da sequência-fonte;
- ausência de overflow horizontal no desktop e no móvel;
- fidelidade do print original: sem avatar, cabeçalho, sombra, CTA ou safe area sintéticos sobre a mídia de referência;
- enquadramento com `contain`/`fit` quando a proporção do print-fonte não coincide com 9:16, evitando que `cover` apague topo, rodapé ou texto original.

O preview de uma publicação pode simular a interface do story. O preview de uma referência deve assumir que o print já contém a interface original e mostrá-lo como documento-fonte, sem uma segunda camada de chrome.

Assets incluídos em `public/` e copiados para o build continuam no estado **preparado** até o deploy. O relatório deve separar explicitamente: parser/RPC testados, UI exercida com fixture, cadastro real lido de volta e ambiente publicado.

## Persistência atômica

Preferir uma RPC ou transação única que:

1. valide a existência do template;
2. crie a sequência-fonte;
3. crie cada item;
4. crie os vínculos ordenados da sequência;
5. crie o vínculo referência-template;
6. retorne o identificador da sequência.

Se qualquer item ou vínculo falhar, nada deve ficar parcialmente salvo.

A atomicidade da RPC não cobre a hidratação feita depois que ela termina. Se a criação confirmar no banco e a leitura canônica falhar, uma repetição manual pode duplicar a referência. Para fechar esse intervalo, escolha pelo menos uma estratégia e teste a repetição:

- chave de idempotência estável enviada pelo cliente e protegida por índice único;
- RPC que devolve a forma canônica completa necessária à interface;
- deduplicação explícita por identidade editorial estável, quando essa identidade realmente existir.

Também validar no banco, e não apenas no parser:

- quantidade mínima e máxima de itens;
- cada elemento JSON como objeto;
- `sourceOccurredAt` dentro de `sourceStartedAt` e `sourceEndedAt`, quando os limites existirem;
- rollback real quando um item intermediário falha;
- privilégios efetivos de função com `has_function_privilege` para `anon`, `authenticated` e `service_role`.

## Fronteira de segurança

- Validar o payload no DTO compartilhado antes de chamar o banco.
- Restringir criação a papel editorial autorizado.
- Expor mutações pelo contrato transacional, sem ampliar escrita direta nas tabelas.
- Separar leitura de viewer das mutações administrativas.
- Não registrar credenciais nem valores de ambiente em evidências.

## Assets

- Guardar prints em caminho público, durável e auditável.
- Validar que cada URL retorna a mídia correta no ambiente em que o registro será usado.
- Assets copiados apenas para a pasta de build local continuam no estado preparado até o deploy.
- Preservar o print completo como fonte. Recortes são derivados e nunca substituem o original.

## Fluxo orientado a testes

1. Escrever teste do parser com fonte, análise, template e itens ordenados.
2. Escrever teste estático da rota de leitura e da ação de criação.
3. Escrever teste de banco da RPC, incluindo vínculos e ordem narrativa.
4. Implementar DTO, RPC, API e interface.
5. Fazer os testes focados passarem.
6. Rodar suíte completa, typecheck, build e verificações de segurança.
7. Fazer smoke visual desktop e mobile.
8. Quando autorizado, aplicar migration e deploy.
9. Executar criação real do piloto e ler de volta o resultado.

## Verificação de ponta a ponta

Antes de chamar a entrega de pronta, comprovar:

- a aba lista referências;
- o formulário cria uma referência;
- os itens voltam na ordem narrativa esperada;
- a cronologia original foi preservada separadamente;
- o template mostra a nova contagem ou vínculo;
- a referência mostra template, fonte, análise e prints;
- os assets carregam sem erro;
- a aplicação continua compilando e os testes anteriores permanecem verdes;
- o registro piloto foi lido de volta do mesmo ambiente onde foi criado.

## Pitfall recorrente

Não usar a existência de código, fixture, formulário preenchido ou arquivos copiados como prova de persistência. Essas peças demonstram preparação. A prova de cadastro é a criação exercida com leitura de retorno; a prova de publicação é o smoke no ambiente remoto.