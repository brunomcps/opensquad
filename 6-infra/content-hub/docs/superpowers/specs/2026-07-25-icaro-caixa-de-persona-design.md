# Caixa de Persona: design do dossiê

## Objetivo

Catalogar a referência de cinco stories de Ícaro de Carvalho como um dossiê
canônico 1.0, preservando a abertura obrigatória e tratando as quatro respostas
seguintes como módulos independentes.

## Identidade editorial

- **Template:** Caixa de Persona
- **Fórmula:** convite aberto -> pergunta selecionada -> resposta ancorada em
  prova -> traço de identidade -> eco social
- **Referência:** Ícaro de Carvalho, Caixa de Persona
- **Função principal:** relacionamento, posicionamento e autoridade com oferta
  contextual opcional

O template não representa uma entrevista linear. A primeira tela abre a coleta.
Cada resposta posterior depende da abertura, mas não depende das outras
respostas e pode aparecer em qualquer ordem.

## Leitura das telas

1. **Abertura e permissão:** imagem culturalmente carregada, convite amplo e
   caixa de perguntas.
2. **Origem e autoridade:** memória específica do primeiro ebook, valor recebido
   e descoberta de vocação.
3. **Intimidade e afeto:** print real do casal, humor interno e declaração de
   vínculo.
4. **Construção e oferta:** pergunta sobre Charlie, print do produto e bastidor
   de desenvolvimento do aplicativo.
5. **Valores e família:** cena com a filha e princípio sobre amor, presença e
   educação.

As telas 2 a 5 formam um mosaico de persona, não uma progressão obrigatória.

## Produto e persona

- **Produto aparente:** sessão aberta de perguntas e respostas.
- **Produto estratégico:** uma persona multidimensional construída por origem,
  relacionamento, trabalho em andamento e valores familiares.
- **Oferta contextual:** o aplicativo aparece como prova de construção e
  extensão do universo editorial, sem transformar todas as respostas em venda.

## Movimentos conceituais

1. **Abrir permissão ampla:** reduzir a barreira para o público perguntar.
2. **Selecionar perguntas reveladoras:** escolher perguntas que permitam mostrar
   uma dimensão relevante da identidade.
3. **Responder com prova:** usar memória específica, print, bastidor, fotografia
   ou detalhe verificável.
4. **Cristalizar um traço:** fechar com princípio, humor, declaração de valor ou
   posicionamento reconhecível.
5. **Acolher o eco social:** preservar reações autênticas quando reforçarem a
   leitura, sem depender delas para a resposta funcionar.

## Molde visual

O molde possui dois tipos reutilizáveis, independentemente da quantidade de
respostas:

### 1. Abertura

- cena ou imagem magnética;
- convite amplo;
- caixa de perguntas;
- contexto visual suficiente para comunicar personalidade antes da interação.

### 2. Resposta modular

- pergunta selecionada no topo;
- prova visual ou narrativa;
- resposta autoral;
- frase que cristaliza identidade ou princípio;
- reação social opcional.

Os placeholders usam slots verticais explícitos para impedir colisões. A
interface deve renderizar qualquer quantidade de stories a partir da lista
canônica, sem assumir três ou cinco telas.

## Regras de transferência

### Preservar

- abertura única seguida de respostas modulares;
- perguntas como gatilho para revelar identidade;
- provas concretas dentro da resposta;
- alternância entre autoridade, intimidade, construção e valores;
- voz autoral e detalhes específicos.

### Adaptar

- temas, provas e princípios para a realidade editorial de Bruno;
- cenas e prints sem dados clínicos ou pessoais de terceiros;
- equilíbrio entre psicologia, rotina, bastidores e posicionamento;
- oferta somente quando a pergunta sustentar a ponte.

### Evitar

- transformar toda pergunta em venda;
- responder genericamente sem prova ou detalhe;
- forçar continuidade entre respostas independentes;
- copiar estética, frases, família ou produtos do creator;
- expor pacientes, seguidores ou conversas privadas identificáveis.

## Persistência e validação

- usar `dossierContractVersion: "1.0"`;
- manter `quick`, `visual` e `deep` em cada uma das cinco telas;
- registrar a ordem fornecida como ordem de apresentação, deixando explícita a
  modularidade das respostas;
- gerar mapa com cinco entradas `story` e uma entrada `product`;
- produzir as quatro sínteses canônicas;
- ligar todos os movimentos conceituais a uma das duas telas do molde;
- validar localmente antes da rede;
- publicar pelo `ci-story-ingest` e exigir leitura canônica de retorno;
- executar smoke visual para imagens, largura integral, slots e ausência de
  colisões.

## Critérios de aceite

- as cinco imagens aparecem completas e na ordem fornecida;
- a primeira tela é reconhecida como abertura obrigatória;
- nenhuma análise afirma dependência narrativa entre as respostas;
- versão rápida e detalhada têm profundidade equivalente ao padrão Raul;
- raio-X, gramática visual, molde e preservar/adaptar/evitar estão presentes;
- o template aceita quantidade variável de respostas;
- a nova referência não altera Raul, Efeito Espelho ou outros templates;
- publicação retorna IDs, revisão, operação e deep link.
