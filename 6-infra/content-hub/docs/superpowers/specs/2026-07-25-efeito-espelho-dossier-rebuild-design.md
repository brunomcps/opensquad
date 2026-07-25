# Reconstrução canônica do dossiê Efeito Espelho

**Status:** aprovado para implementação
**Data:** 25 de julho de 2026
**Referência:** `instagram-reservatoriodedopamina-efeito-espelho`
**Template:** `efeito-espelho-identificacao-microexplicacao-entrega-dm`

## Objetivo

Reconstruir do zero a análise da sequência de três stories do perfil
`@reservatoriodedopamina` e republicá-la na mesma referência da plataforma.
O dossiê deve alcançar a profundidade editorial e a arquitetura visual do
dossiê de Raul Sena sem copiar sua interpretação, seu conteúdo ou sua
superfície estética.

## Fontes primárias

A análise usa exclusivamente as três capturas originais enviadas por Bruno,
na ordem abaixo:

1. notícia sobre adiamento do sono, pergunta direta e enquete;
2. acolhimento, microexplicação e humor;
3. aula gratuita, material de higiene do sono e chamada para resposta por DM.

Nenhum texto ilegível será completado por plausibilidade. Toda afirmação deve
ser classificada como visível, informada ou inferida.

## Leitura editorial

O nome editorial permanece **Efeito Espelho**.

A fórmula canônica passa a ser:

> autoridade externa → autorreconhecimento de baixa fricção → acolhimento e
> explicação simplificada → alívio por humor → materialização da entrega →
> conversa privada

O produto aparente é uma aula gratuita acompanhada de material para higiene do
sono. O produto estratégico é a plataforma como fonte acessível de educação e
recursos práticos. A conversão transforma identificação pública em conversa
privada por DM.

## Arquitetura do dossiê

O dossiê preserva as quatro camadas canônicas:

1. **Modo rápido:** trilho com as três telas, imagem principal e leitura
   objetiva sustentada por evidência, efeito no público, subtexto, função no
   funil e regra extraída.
2. **Raio-X visual:** as três imagens com cena, enquadramento, tipografia,
   hierarquia, elementos gráficos, paleta, direção do olhar, impressão e
   relação com as telas vizinhas.
3. **Molde 9:16:** três telas funcionais com placeholders ligados aos
   movimentos conceituais do template, seguidas por preservar, adaptar e
   evitar.
4. **Análise aprofundada:** leitura canônica por tela e leitura transversal da
   sequência, sem repetir mecanicamente as camadas anteriores.

No desktop, a análise aprofundada começa abaixo do bloco rápido e ocupa toda a
largura editorial disponível, incluindo o espaço antes usado pela lista de
templates. Ela não pode ficar confinada a uma coluna direita. As imagens devem
ser intercaladas com o conteúdo das telas, seguindo a arquitetura aprovada do
dossiê de Raul Sena.

No mobile, nenhuma imagem, texto, botão ou bloco de análise pode ultrapassar a
largura da tela ou ficar ilegível.

## Conteúdo obrigatório por story

Cada tela terá:

- proveniência e trecho-fonte;
- modo rápido completo;
- raio-X visual completo;
- análise aprofundada com seções que declaram as dimensões cobertas;
- avaliação contextual de interação e crítica, com justificativa;
- regra extraída e consequência para o template;
- vínculo explícito com os movimentos conceituais e com a tela do molde.

As dimensões centrais são evidência, atenção, narrativa, continuidade, funil,
subtexto e consequência para o template. Narrativa e continuidade devem
aparecer explicitamente na análise aprofundada.

## Leitura transversal

A sequência terá:

- resumo e leitura geral;
- arco narrativo;
- motivos pelos quais funciona;
- aderência ao template;
- mapa com uma entrada por story e uma entrada para o produto estratégico;
- gramática visual;
- produto aparente;
- produto estratégico;
- persona construída;
- regras de transferência;
- limitações e riscos.

A síntese terá exatamente as chaves `screen-roles`, `stimulus-change`,
`aesthetics-production` e `strengths-limitations`.

## Template registrado e molde

Os movimentos conceituais serão registrados com identificador, mecanismo,
condição, resultado esperado e stories que fornecem evidência. As três telas do
molde terão identificador próprio e ligação explícita aos movimentos.

O template deve preservar:

- reconhecimento antes da explicação;
- resposta de baixa fricção;
- recompensa cognitiva antes da oferta;
- alternância de estímulo;
- prova visual da entrega;
- uma única ação final.

Deve adaptar tema, rigor, linguagem, prova, humor, identidade visual e recurso
oferecido. Deve evitar diagnóstico por enquete, simplificação científica
indevida, promessa clínica, meme sem função e CTA sem mostrar a entrega.

## Imagens e integridade

As três capturas originais devem renderizar:

- no trilho e na tela selecionada do modo rápido;
- no raio-X visual;
- na análise aprofundada.

Não serão aceitos placeholders, imagens quebradas, crop destrutivo ou assets
que apontem para arquivos de outra referência. O manifesto usará nomes, hashes,
tipos MIME e tamanhos reais.

## Isolamento e reversibilidade

A reconstrução altera somente o dossiê do Efeito Espelho e reutiliza a
identidade da referência existente. Antes da publicação, o estado remoto atual
será salvo como evidência de rollback.

Ficam congelados:

- dossiê de Raul Sena;
- template `História → pequena entrega → CTA`;
- componentes compartilhados do dossiê;
- referências legadas.

A implementação será orientada por dados. Mudanças em componentes
compartilhados estão fora do escopo.

## Validação

Antes da publicação:

- validar o payload contra o schema e o contrato canônico;
- executar o validador em modo seco, sem rede;
- executar os testes do publicador;
- provar que as fixtures protegidas continuam inalteradas;
- verificar correspondência entre os três assets e os três stories.

Depois da publicação:

- ler de volta a mesma referência;
- confirmar que uma nova revisão foi criada;
- validar as quatro camadas;
- confirmar o carregamento real das três imagens;
- inspecionar desktop em 1440 × 1000 e 1920 × 1080;
- inspecionar mobile em 390 × 844;
- comparar a arquitetura com Raul Sena sem exigir conteúdo idêntico.

## Critérios de aceite

A correção estará concluída quando:

- a análise tiver sido refeita a partir das três imagens originais;
- o dossiê cumprir integralmente o contrato canônico;
- as quatro camadas estiverem presentes e semanticamente distintas;
- a análise completa ocupar toda a largura editorial;
- as três imagens renderizarem nos pontos definidos;
- o template e o molde forem reutilizáveis sem copiar o tema da referência;
- Raul Sena e `História → pequena entrega → CTA` permanecerem intactos;
- os testes locais e a leitura pós-publicação passarem;
- houver evidência visual desktop e mobile.
