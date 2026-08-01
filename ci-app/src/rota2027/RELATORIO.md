# Projeções de vendas a partir de views — Relatório

Gerado em 18/07/2026. **Recalibrado em 01/08/2026** (julho fechado incorporado: 25 semanas de histórico). Dados: YouTube Analytics (views/inscritos por dia desde 01/01/2025) + API Hotmart (todas as transações desde o lançamento, 31/01/2026), receita = **líquido do produtor** (comissão Hotmart já descontada; vendas internacionais consolidadas em USD e convertidas a R$ 5,40).

Validação: fevereiro/2026 bateu **no centavo** com o painel Gestão de Vendas da Hotmart (R$ 7.508,78 = 7.381,75 aprovadas hoje + 127,03 de uma venda reembolsada depois; US$ 101,80 exato; 89 e 6 transações). Auditoria reproduzível: `python scripts/compara_painel.py [AAAA-MM]`.

## Achados (fase 2 — a relação existe?)

- **Correlação semanal views × vendas: 0,92 Pearson / 0,88 Spearman** (25 semanas completas, calibração de 01/08). Views × receita líquida: 0,91 / 0,85. Inscritos ganham o mesmo resultado das views (as duas séries andam grudadas), então views serve de alavanca única. Julho puxou o Pearson de 0,98 pra 0,92: o mês converteu bem acima da curva (0,97 venda por 1.000 views contra 0,62 em junho), então vendeu mais do que a reta previa.
- **Janela de conversão curta: 0 a 2 dias.** Correlação diária máxima no mesmo dia (0,78), forte até o dia 2 (0,75), decai depois. O efeito de um vídeo nas vendas aparece em ~48h.
- **A taxa de conversão é estável através de regimes.** Entre fevereiro (canal grande), abril (fundo do poço, queda de 95%), junho (explosão) e julho (conversão recorde), o custo de 1 venda ficou sempre entre 1.000 e 2.100 views (mediana mensal ~1.300). Taxa que sobrevive a regime bom e ruim é taxa utilizável pra projetar.
- **Ticket líquido estável (~R$ 75–95 por venda)** apesar da mudança de preço do MAPA em junho: a escada de oferta + os produtos de carrinho compensaram a queda do preço de entrada.

## Motor de projeção (fases 3 e 4)

```
vendas/mês        = views/mês ÷ 1.000 × taxa_vendas
receita líquida   = vendas × ticket_líquido
```

Taxas por percentil das 25 semanas (ticket: só regime de preço atual, 6 semanas jun–jul). Calibração de 01/08/2026, com a de 18/07 entre parênteses:

| Taxa | Conservador (p25) | Realista (mediana) | Otimista (p75) |
|---|---|---|---|
| Vendas por 1.000 views | 0,578 (0,542) | 0,633 (0,624) | 0,787 (0,759) |
| Líquido por venda | R$ 89,12 (89,12) | R$ 91,06 (92,02) | R$ 93,76 (95,03) |
| **Líquido por 1.000 views** | **R$ 51,51** (48,31) | **R$ 57,64** (57,42) | **R$ 73,79** (72,13) |

Todas as taxas se moveram menos de 7% contra a calibração anterior — o gate de sanidade de 50% passou folgado. O que mudou de verdade foi o **ponto de partida**: o ritmo dos últimos 60 dias subiu de 461 mil pra **534 mil views/mês** (+15,8%).

Teste retroativo: junho real (599 mil views) = 372 vendas / R$ 32,7 mil; modelo realista para 599 mil views = 379 vendas / R$ 34,5 mil. Erro < 6%.

## Cenários por nível de canal (mês)

| Views/mês | Conservador | Realista | Otimista |
|---|---|---|---|
| 60 mil (ritmo abr–mai) | 35 vendas · R$ 3,1 mil | 38 · R$ 3,5 mil | 47 · R$ 4,4 mil |
| 185 mil (ritmo fev–mar) | 107 · R$ 9,5 mil | 117 · R$ 10,7 mil | 146 · R$ 13,7 mil |
| 518 mil (últimas 4 semanas anualizadas) | 299 · R$ 26,7 mil | 328 · R$ 29,8 mil | 407 · R$ 38,2 mil |
| 600 mil (ritmo junho/pico) | 346 · R$ 30,9 mil | 379 · R$ 34,5 mil | 471 · R$ 44,2 mil |

## Calculadora reversa (meta líquida mensal → views necessárias)

| Meta líquida/mês | Conservador | Realista | Otimista |
|---|---|---|---|
| R$ 5 mil | 97 mil views | 87 mil | 68 mil |
| R$ 10 mil | 194 mil | 173 mil | 136 mil |
| R$ 20 mil | 388 mil | 347 mil | 271 mil |
| R$ 30 mil | 582 mil | 520 mil | 407 mil |
| R$ 42 mil (≈ faturamento da clínica) | 815 mil | 729 mil | 569 mil |

## Split por produto (jun–jul, referência)

MAPA-7P: 57,2% das vendas e **75,1% do líquido**. 2AS: 15,1% / 14,6%. Guia Rápido: 12,7% / 6,2%. Manual de Rotina: 14,9% / 4,1%. Projeção é feita na cesta total (produtos são acoplados por bump); o split serve pra ler onde o dinheiro mora. Movimento do mês: o 2AS ganhou espaço (de 12,1% pra 14,6% do líquido) e o MAPA cedeu 2,4 pontos, sem que o líquido por venda caísse.

## Limites honestos

1. **6 meses de histórico** (25 semanas na calibração de 01/08). A faixa conservador↔otimista é larga de propósito; estreita a cada mês. Recalibrar mensalmente (rodar os 4 scripts de coleta + análise).
2. Correlação não prova causa: parte do vínculo é "vídeo bom sobe tudo junto". Pra planejamento de meta isso não atrapalha; só não vale concluir "comprar view resolve".
3. O modelo assume a esteira de oferta atual. Mudou preço/escada/portfólio, recalibrar o ticket.
4. Cancelamentos (~2–3% do líquido) já estão fora das vendas aprovadas atuais, mas estornos futuros de vendas recentes podem raspar 1–3% do projetado.
5. Views aqui = views do canal inteiro (Analytics), incluindo Shorts. Se o mix Shorts/longos mudar radicalmente, a taxa muda.

## Fase 5 — Tempo até meta acumulada (R$ 5 milhões líquidos)

Descoberta de contexto: **o canal nasceu em set/2025** (724 views; nov/2025 já fez 447 mil). Razões de crescimento usam só a fase madura (nov/2025+); o Monte Carlo sorteia as 24 razões SEMANAIS de fev-jul/2026 (4 por mês), com trava de 10 mi views/mês e horizonte de 120 meses. Ponto de partida da calibração de 01/08: ritmo dos últimos 60 dias = **534 mil views/mês** (era 461 mil); R$/1k líquido = 51/58/74 (p25/p50/p75).

Tempo até R$ 5 mi líquidos (taxa realista), com a calibração de 18/07 entre parênteses:

| Motor | Hipótese | Tempo |
|---|---|---|
| Constante | canal congela em 534 mil/mês | ~13,6 anos (15,7) |
| Composto 2%/mês | crescimento modesto perpétuo | ~6,1 anos (6,6) |
| Composto 4,3%/mês | média de toda a vida madura do canal | ~4,1 anos (4,4) |
| Composto 9,5%/mês | ritmo dos últimos 6 meses sustentado | ~2,6 anos (2,7) |
| Com teto 3 mi/mês (g 10%) | cresce forte e satura | ~3,2 anos (3,4) |
| Monte Carlo (2.000 futuros) | futuro estatisticamente parecido com fev-jul/26 | mediana **2,1 anos** (2,0); 80% entre 1,3 e 4,1 anos; 96,7% em <10 anos |

Marcos na mediana do Monte Carlo: R$ 1 mi em ~10 meses; R$ 2 mi em ~14; R$ 5 mi em ~25; R$ 10 mi em ~45.

O ponto de partida mais alto adiantou todos os motores determinísticos em ~3 meses. O Monte Carlo andou pro outro lado (mediana de 24 pra 25 meses, cauda de 43 pra 49): as duas semanas novas que entraram na urna incluem uma de queda forte (0,56), então a simulação passou a sortear futuros ruins com mais frequência. Determinístico melhorou, probabilístico ficou um tico mais cauteloso na cauda.

Avisos: o Monte Carlo herda o crescimento médio embutido de fev→jul (canal 2,6× em 5 meses) — é o motor mais agressivo; o modo "sem tendência" do simulador isola só a volatilidade. Alavanca mais poderosa que views: o R$/1k (dobrar o ticket corta qualquer tempo pela metade). Script: `scripts/fase5_tempo_ate_meta.py` → `dados/tempo_ate_meta.json`.

### Duas pendências técnicas abertas na calibração de 01/08

Achadas durante a recalibração, **não corrigidas** porque mexer em script de análise fora da lista do runbook precisa de decisão do Bruno:

1. **Julho inteiro ficou fora do CAGR.** O `fase5_tempo_ate_meta.py` tem um filtro fixo na linha 48 (`if meses[-1] == "2026-07"`) que existia pra descartar o mês corrente incompleto. Como agosto tinha 0 views no dia da coleta, o filtro pegou julho, que já estava fechado, e jogou fora 450 mil views. Efeito: o `crescimentoMensal` publicado no simulador continua 4,3% (vida madura) e 9,5% (últimos 6 meses), idêntico ao mês passado. Com julho dentro daria **0,1% e 13,1%**. Correção: trocar a comparação fixa pelo mês corrente calculado na hora.
2. **O R$/1k do Monte Carlo está fixo no código** (`RPK` na linha 30 do mesmo script: 48,31/57,42/72,13, valores de 18/07). O certo é ler de `projecoes.json`. Defasagem atual: +6,6% no conservador, +0,4% no realista, +2,3% no otimista — pequena, mas cresce a cada mês que passa.

Nenhuma das duas contamina as taxas principais: `rpk`, ritmo de views, razões semanais e ticket saem todos de dados frescos.

## Arquivos

- `dados/youtube_canal_dia.csv` — 575 dias de views/inscritos
- `dados/hotmart_vendas_raw.json` + `hotmart_comissoes_raw.json` + `hotmart_cancelamentos_raw.json` — transações
- `dados/hotmart_vendas_dia.csv` — agregado dia × produto (bruto BRL convertido + líquido produtor)
- `dados/analise_correlacao.json` — séries, correlações, taxas mensais
- `dados/projecoes.json` — taxas, cenários, reversa
- `scripts/` — coleta_youtube, coleta_hotmart, coleta_hotmart_comissoes, coleta_cancelamentos, converte_e_agrega, analise_correlacao, fase3_projecoes, compara_painel
