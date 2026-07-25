---
name: story-sequence-template-analysis
description: Use when Bruno sends a completed story sequence or identifies an active Instagram story by @profile and approximate subject, and wants source capture, deep analysis, visual X-ray, quick and detailed dossier, reusable template extraction, or a canonical payload for the OpenSquad story library.
---

# Análise de Sequências e Templates de Stories

## Contrato canônico obrigatório

Antes de analisar uma sequência destinada à plataforma:

1. Ler `../_shared/canonical-story-dossier-contract.md`.
2. Usar `../_shared/canonical-story-dossier.schema.json` como autoridade de forma, campos obrigatórios e enums.
3. Produzir `dossierContractVersion: "1.0"`.
4. Usar `references/example-raul-sena-cena-lente-principio.md` como fixture de calibração de profundidade e arquitetura, nunca como texto a copiar.
5. Preencher `templates/analysis-output.md` por inteiro.
6. Fazer a autoavaliação de cobertura antes do handoff.

A análise rápida, o raio-X visual, o molde 9:16 e a análise aprofundada são um conjunto indivisível. Se uma camada faltar, o dossiê está incompleto.

## Regra de integração na biblioteca do Bruno

Quando a análise alimentar um template reutilizável, trate referência e template como uma só unidade editorial. A página central é o template, mas cada decisão do molde deve permanecer junto da tela original, da análise rica, da crítica e da adaptação que a justificam. Evite separar esse material em páginas ou abas distantes e nunca compacte uma análise abrangente em resumo genérico. O critério de aceite é simples: a pessoa entende por que o molde existe e como cada evidência o modificou sem sair da página.

## Objetivo

Transformar uma sequência real de stories em três entregáveis:

1. análise editorial profunda e auditável;
2. template reutilizável, separado do assunto original;
3. metadados consistentes para futura catalogação e ligação com stories publicados pelo Bruno.

A análise deve capturar o raciocínio do criador, não apenas descrever o que aparece na tela.

## Princípios

- Tratar a sequência inteira como unidade narrativa. Não analisar telas isoladas sem entender a ordem.
- Distinguir observação visual, interpretação e inferência de funil.
- Não atribuir intenção psicológica como certeza. Usar “provavelmente”, “funciona como” ou “tende a”.
- Preservar o texto original importante e sinalizar trechos ilegíveis.
- Avaliar o que funciona, o que limita a peça e o que é transferível para Bruno.
- Extrair a estrutura abstrata sem copiar tema, frase, estética proprietária ou posicionamento do creator.
- Escrever em português brasileiro direto, com leitura editorial, sem tom de relatório corporativo.
- Não usar travessão U+2014.
- Fazer uma pergunta por mensagem quando faltar contexto.

## Fluxo obrigatório

### 1. Receber a sequência

Quando Bruno indicar um story ativo por `@perfil + assunto aproximado`:

1. Ler `references/live-instagram-story-video-handoff.md`.
2. Usar `instagram-story-capture` quando essa skill e o Chrome real autenticado estiverem disponíveis.
3. Tratar a descrição de Bruno apenas como pista de localização. A fonte da análise é a mídia recuperada, sua transcrição e seus frames.
4. Inventariar todos os stories ativos observados e delimitar quais pertencem à sequência pedida.
5. Se o agente atual não puder controlar o navegador ou recuperar os assets, declarar a limitação e pedir o handoff de captura. Nunca fingir que assistiu ao story.

Quando Bruno começar a enviar prints:

- registrar mentalmente a ordem de chegada;
- se houver mais de uma imagem disponível, analisar visualmente em paralelo;
- não entregar a análise até Bruno declarar que a sequência terminou;
- após cada lote cuja conclusão não esteja explícita, perguntar exatamente sobre o objeto: **“Essa sequência de stories do [creator] está completa?”**
- se Bruno já disser “a sequência termina aí”, considerar a sequência confirmada e começar a análise sem perguntar novamente.

Para story em vídeo, considerar a fonte pronta somente quando houver:

- arquivo completo com vídeo e áudio, quando o story tiver áudio;
- duração e streams verificados;
- transcrição local com timestamps, ou motivo explícito para ausência de fala utilizável;
- frames suficientes para representar mudanças visuais importantes;
- manifesto que preserve a ordem e relacione mídia, transcrição e frames ao mesmo story.

Não usar o texto sobreposto como substituto da fala. Não atribuir ao creator uma transcrição dominada por música, ruído ou baixa confiança.

### 2. Resolver o contexto do creator

Antes da interpretação de funil:

1. Ler `references/creators.md`.
2. Se o creator estiver cadastrado, usar o perfil como contexto, sem transformar as notas em fatos eternos.
3. Se não estiver cadastrado, confirmar apenas o nome quando houver ambiguidade real.
4. Buscar fontes atuais quando profissão, produtos, posicionamento ou funil forem necessários para a análise.
5. Depois de identificar um creator recorrente, atualizar `references/creators.md` com contexto compacto e durável.

Nunca confundir um homônimo com o creator analisado.

### 3. Ler cada tela

Para cada story, observar:

- **Cena:** local, ação, pessoas, objetos, contexto e continuidade espacial.
- **Captura:** selfie, POV, vídeo, foto, print, arte, gráfico, repost ou tela falada.
- **Composição:** hierarquia visual, direção do olhar, enquadramento, ocupação da tela e prova visual da narrativa.
- **Texto:** transcrição, tamanho, posição, contraste, fonte, densidade, legibilidade e relação com a imagem.
- **Mensagem explícita:** o que foi dito literalmente.
- **Subtexto:** status, valores, personalidade, conflito, vulnerabilidade, autoridade ou aspiração comunicados sem declaração direta.
- **Gancho:** curiosidade, tensão, número específico, opinião discutível, promessa, reconhecimento ou pergunta implícita.
- **Emoção:** humor, identificação, surpresa, indignação, desejo, segurança, intimidade ou pertencimento.
- **Interação:** enquete, caixinha, link, comentário, resposta, DM, reação, compartilhamento ou convite implícito para responder.
- **Continuidade:** como a tela paga a anterior e abre a próxima.
- **Intenção provável:** entreter, aproximar, ensinar, posicionar, provar, captar resposta, aquecer, vender ou reter.
- **Funil:** descoberta, relacionamento, autoridade, consideração, conversão ou pós-venda.

### 4. Ler a sequência como sistema

Depois das telas individuais, identificar:

- arquitetura narrativa em uma linha;
- papel exato de cada tela;
- mudança de estímulo visual entre telas;
- abertura de loop e momento de pagamento;
- progressão emocional;
- mecanismo de interação;
- produto aparente e “produto real” da sequência;
- como vida pessoal, nicho e oferta se conectam;
- presença de prova social, status ou declaração de valores;
- se há CTA direto, CTA indireto ou nenhuma ação solicitada;
- principal motivo pelo qual a pessoa continuaria avançando.

### 5. Extrair o template

O template precisa funcionar sem depender do assunto original.

Produzir:

- **Nome humano:** curto e memorável.
- **Fórmula:** de 3 a 6 passos, usando setas.
- **Quando usar:** situação real em que o formato faz sentido.
- **O que precisa capturar:** fotos, vídeos, prints, dados ou respostas.
- **Função principal:** relacionamento, autoridade, interação, venda ou combinação.
- **Risco de execução:** o que faria a adaptação ficar forçada, confusa ou copiada.
- **Adaptação potencial para Bruno:** explicar a lógica aplicável ao TDAH adulto, sem escrever uma copy pronta a menos que ele peça.

### 5.1 Extrair a gramática visual e o molde de execução

A análise visual não pode ficar diluída em observações narrativas. Criar uma camada explícita de **raio-X visual por tela**, sempre ligada ao print correspondente:

- o que aparece na cena e qual é o ambiente;
- pessoa, expressão, gesto, roupa e aparência, quando visíveis;
- tipo de captura e enquadramento;
- texto visível, posição, alinhamento, fonte aproximada, cor, caixa e contraste;
- gráfico, print, sticker, reação, objeto ou outro elemento visual;
- paleta dominante;
- distribuição espacial e hierarquia entre fundo, pessoa, texto e prova;
- posição da legenda e das interações;
- sensação ou significado transmitido visualmente;
- mudança de estímulo em relação às telas anterior e seguinte.

Depois, sintetizar a **gramática visual da sequência**: continuidade de ambiente, elemento dominante de cada tela, assinatura tipográfica, ritmo, densidade e aparência de produção.

Gerar também um **molde 9:16 com placeholders funcionais**, uma tela por etapa. Cada placeholder deve dizer o papel do espaço, por exemplo `[cena real reconhecível]`, `[gancho que para antes da decisão]`, `[dado ou prova visual]`, `[print de resposta]`. O wireframe precisa conservar posição aproximada e hierarquia, mas não copiar cenário, assunto, paleta ou estilo superficial do creator.

Fechar o molde com três blocos:

- **Preservar:** funções narrativas, continuidade, hierarquia e troca de estímulo.
- **Adaptar:** cenário, roupa, paleta, fonte, prova e interação para Bruno.
- **Evitar:** elementos superficiais que pertencem apenas à referência original.

### 6. Montar o dossiê canônico 1.0

Produzir sempre o conteúdo rápido e o detalhado. O JSON canônico precisa conter:

- `sequenceConfirmed: true` e `sequenceConfirmationSource`;
- `sourceExcerpt` ou `noSourceTextReason`, nunca ambos;
- `quick`, `visual` e `deep` com títulos distintos para cada story;
- `deep.sections[].covers`, incluindo explicitamente `narrative` e `continuity`;
- avaliações contextuais `interaction` e `critique`, cada uma com status e justificativa;
- mapa ordenado com uma entrada `story` por tela e exatamente uma entrada `product`;
- produto aparente, produto estratégico e persona construída quando aplicável;
- exatamente quatro sínteses: `screen-roles`, `stimulus-change`, `aesthetics-production` e `strengths-limitations`;
- movimentos conceituais operacionais com ID, mecanismo, condição, resultado e stories de evidência;
- telas do molde com IDs, `templateStepIds` e placeholders funcionais;
- regras específicas de preservar, adaptar e evitar.

A camada rápida organiza a navegação. Ela não substitui nem resume de forma destrutiva a análise aprofundada.

### 7. Autoavaliar a cobertura

Antes do handoff, conferir o checklist de `templates/analysis-output.md`. Não marcar uma dimensão como coberta apenas porque o rótulo aparece; precisa existir observação, interpretação ou regra substancial ligada à fonte.

## Integração com biblioteca e publicações

Quando o trabalho envolver catalogação na plataforma, carregar `references/platform-data-model.md`.

Quando o pedido envolver implementar ou validar a persistência, carregar também `references/platform-persistence-contract.md`. Esse arquivo separa preparação editorial, persistência real e publicação dos assets.

### Fidelidade da análise no handoff

A plataforma deve preservar a análise produzida por esta skill sem perda editorial. Nunca comprimir as oito partes do formato de resposta em um parágrafo geral e uma frase curta por tela apenas para caber no DTO atual.

**Interface compacta não autoriza conteúdo raso.** A análise completa é o conteúdo canônico; resumos, miniaturas e destaques são apenas uma camada de navegação sobre ela. Nunca reescrever a análise rica como um conjunto menor de cards e descartar os detalhes que não couberam.

Preservar especialmente as evidências concretas que sustentam a interpretação, como frases exatas, números, palavras específicas, direção do olhar, gestos, objetos, mudanças de enquadramento, respostas do público e elementos visuais de prova. Uma conclusão sem a evidência que a fundamenta perde valor editorial e auditabilidade.

Quando houver modo rápido e aprofundamento:

1. o modo rápido oferece fórmula, papel das telas e síntese;
2. o aprofundamento abre na mesma página, próximo dos prints;
3. cada tela mantém texto original, observação visual, mecanismo de atenção, função narrativa, interação, funil, subtexto e contribuição para o template;
4. a leitura transversal preserva ritmo, estética, produção, continuidade, produto aparente, produto real e persona construída;
5. a extração final preserva etapas, elementos obrigatórios e opcionais, riscos e transferência detalhada para Bruno.

Se o modelo de dados ou a interface não comportar leitura geral, tela por tela, arquitetura narrativa, funil, forças, limitações, template extraído e aplicação potencial, registrar isso como lacuna de contrato e ampliar o modelo antes da ingestão.

Antes de aprovar um handoff, comparar a interface com a análise-fonte seção por seção. Organização visual pode ocultar ou revelar conteúdo, mas não pode eliminá-lo.

### Regra do checkpoint aprovado

Quando Bruno disser que o trabalho estava bom “até aqui”, tratar aquele artefato e suas camadas como baseline canônico. Recuperar o texto, mockup ou estado exato antes de propor qualquer correção. A próxima versão deve partir desse checkpoint e preservar integralmente tudo que já estava aprovado.

Não reconstruir a partir da implementação degradada, de uma seed resumida ou da lembrança geral da conversa. Fazer um diff explícito entre o checkpoint e o estado atual, identificando o primeiro ponto de regressão. Se o checkpoint inclui raio-X visual, gramática da sequência, molde 9:16 com placeholders e preservar/adaptar/evitar, essas quatro camadas formam um conjunto indivisível.

Na experiência de leitura, referência e template devem aparecer como um único dossiê editorial centrado no template. A separação entre entidades serve ao banco; ela não deve obrigar Bruno a navegar entre páginas distantes para comparar evidência e abstração. A referência pode ter uma área própria de busca/cadastro, mas sua análise completa também aparece dentro do template que ela sustenta.

Regras duras:

- O template é a entidade principal e deve mostrar junto sua explicação, suas referências, as publicações do Bruno e os aprendizados.
- Preservar sempre o vínculo `Referência(s) ↔ Template(s) ↔ Publicação(ões)`.
- Uma sequência é uma unidade narrativa composta por stories individuais. Nunca agrupá-la apenas por dia ou proximidade de horário.
- Separar horário cronológico de posição narrativa, porque sequências podem se intercalar e continuar depois de respostas tardias.
- Por padrão, cada story pertence a uma sequência principal. Vínculos com sequências adicionais são excepcionais e dependem de aviso ou aprovação do Bruno.
- Mostrar tanto a visão centrada no template quanto a linha do tempo geral, sempre com links entre template, referência, sequência e publicação.
- Se o pedido original de Bruno já incluir catalogar, colocar ou publicar, seguir para validação e catalogação sem criar uma segunda fila de rascunho ou aprovação editorial. Se o pedido for apenas analisar ou pré-visualizar, não publicar. Migration, deploy, secrets e reparos remotos continuam exigindo autorização específica.
- Antes de catalogar uma nova referência ou template, inventariar os pilotos já existentes por identidade e vínculo. Após a mudança, confirmar que continuam encontráveis, ligados ao molde correto e visíveis na interface; contagens agregadas não bastam.
- Distinguir sempre três estados: piloto preparado no formulário, piloto persistido no banco e piloto disponível no ambiente publicado.
- Nunca dizer que uma referência foi cadastrada sem exercer a criação real e ler de volta o registro com itens ordenados e vínculo ao template.
- URLs de mídia devem apontar para assets públicos e duráveis. Se dependerem de um deploy ainda não executado, marcar a referência como preparada, não como operacional.

## Separação dos objetos editoriais

A análise precisa permitir comparação futura entre inspiração, template e execução do Bruno. Manter quatro objetos separados:

1. **Sequência-fonte:** os prints e a análise do creator observado.
2. **Template derivado:** a estrutura abstrata reutilizável.
3. **Aplicação planejada:** a adaptação escrita para uma situação real do Bruno.
4. **Story publicado:** a peça efetivamente postada, ligada ao template usado e aos resultados disponíveis.

Nunca sobrescrever o template com uma publicação específica. Um template pode gerar muitas aplicações e publicações; uma publicação pode combinar mais de um template. Quando houver dados posteriores, registrar métricas e leitura qualitativa sem reescrever retroativamente a análise da sequência-fonte.

Usar o contrato conceitual de `references/catalog-handoff.md` ao preparar dados para qualquer plataforma, banco ou arquivo local.

## Formato da resposta

Usar `templates/analysis-output.md` como esqueleto. Ajustar o tamanho à riqueza da sequência, sem eliminar:

1. modo rápido por story;
2. raio-X visual por story;
3. análise aprofundada por story;
4. mapa e leitura transversal;
5. quatro sínteses canônicas;
6. template operacional;
7. molde 9:16 ligado aos movimentos;
8. preservar, adaptar e evitar;
9. relatório de cobertura.

No Telegram, evitar tabelas. Usar títulos e listas curtas.

## Verificação antes de entregar

- A ordem das telas está correta?
- A sequência foi confirmada como completa?
- O texto importante foi transcrito sem invenção?
- Stories em vídeo têm mídia, áudio, transcrição, frames e manifesto ligados ao mesmo item?
- A transcrição veio do áudio real e os trechos incertos foram preservados como incertos?
- Observação e inferência estão diferenciadas?
- Cada tela tem uma função narrativa clara?
- O raio-X visual registra cena, pessoa/roupa, texto, tipografia, cores, elementos gráficos, composição, posição da legenda e mensagem visual sem inventar detalhes ilegíveis?
- A gramática visual da sequência foi sintetizada além da descrição tela por tela?
- O molde 9:16 usa placeholders funcionais e diferencia o que preservar, adaptar e evitar?
- A leitura de funil considera o creator real?
- O template abstrai a lógica em vez de copiar a superfície?
- A adaptação respeita a estratégia e a voz do Bruno?
- Os metadados permitem catalogação posterior?
- O template canônico foi resolvido por identidade exata, sem correspondência frouxa por substring?
- O preview da referência preserva o print inteiro com `contain`/`fit`, sem chrome sintético duplicado?
- A persistência valida cardinalidade, objetos JSON, intervalo cronológico, rollback e privilégios efetivos no banco?
- Uma falha de hidratação após a RPC não pode induzir duplicação silenciosa, ou esse limite está explicitamente registrado?
- O estado informado distingue formulário/fixture, seed ainda não aplicada, persistência lida de volta e deploy remoto?

## Arquivos vinculados

- `../_shared/canonical-story-dossier-contract.md`: autoridade editorial compartilhada.
- `../_shared/canonical-story-dossier.schema.json`: autoridade estrutural e enums do contrato 1.0.
- `references/creators.md`: biblioteca compacta de contexto dos creators analisados.
- `references/platform-data-model.md`: modelo de integração entre referências, templates, sequências, stories publicados, cronologia, métricas e aprovação.
- `references/platform-persistence-contract.md`: contrato de DTO, persistência atômica, assets e verificação real do cadastro.
- `templates/analysis-output.md`: formato canônico de autoria e checklist de cobertura.
- `references/example-raul-sena-cena-lente-principio.md`: fixture dourada de calibração editorial e visual.
