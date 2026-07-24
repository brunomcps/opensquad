# Projeções de vendas a partir de views — Relatório

Gerado em 18/07/2026. Dados: YouTube Analytics (views/inscritos por dia desde 01/01/2025) + API Hotmart (todas as transações desde o lançamento, 31/01/2026), receita = **líquido do produtor** (comissão Hotmart já descontada; vendas internacionais consolidadas em USD e convertidas a R$ 5,40).

Validação: fevereiro/2026 bateu **no centavo** com o painel Gestão de Vendas da Hotmart (R$ 7.508,78 = 7.381,75 aprovadas hoje + 127,03 de uma venda reembolsada depois; US$ 101,80 exato; 89 e 6 transações). Auditoria reproduzível: `python scripts/compara_painel.py [AAAA-MM]`.

## Achados (fase 2 — a relação existe?)

- **Correlação semanal views × vendas: 0,98 Pearson / 0,86 Spearman** (23 semanas completas). Views × receita líquida: 0,98 / 0,82. Inscritos ganham o mesmo resultado das views (as duas séries andam grudadas), então views serve de alavanca única.
- **Janela de conversão curta: 0 a 2 dias.** Correlação diária máxima no mesmo dia (0,85), forte até o dia 2 (0,82), decai depois. O efeito de um vídeo nas vendas aparece em ~48h.
- **A taxa de conversão é estável através de regimes.** Entre fevereiro (canal grande), abril (fundo do poço, queda de 95%) e junho (explosão), o custo de 1 venda ficou sempre entre 1.000 e 2.100 views (mediana ~1.400). Taxa que sobrevive a regime bom e ruim é taxa utilizável pra projetar.
- **Ticket líquido estável (~R$ 75–95 por venda)** apesar da mudança de preço do MAPA em junho: a escada de oferta + os produtos de carrinho compensaram a queda do preço de entrada.

## Motor de projeção (fases 3 e 4)

```
vendas/mês        = views/mês ÷ 1.000 × taxa_vendas
receita líquida   = vendas × ticket_líquido
```

Taxas por percentil das 23 semanas (ticket: só regime de preço atual, 6 semanas jun–jul):

| Taxa | Conservador (p25) | Realista (mediana) | Otimista (p75) |
|---|---|---|---|
| Vendas por 1.000 views | 0,542 | 0,624 | 0,759 |
| Líquido por venda | R$ 89,12 | R$ 92,02 | R$ 95,03 |
| **Líquido por 1.000 views** | **R$ 48** | **R$ 57** | **R$ 72** |

Teste retroativo: junho real (599 mil views) = 372 vendas / R$ 32,7 mil; modelo realista para 599 mil views = 374 vendas / R$ 34,4 mil. Erro < 5%.

## Cenários por nível de canal (mês)

| Views/mês | Conservador | Realista | Otimista |
|---|---|---|---|
| 60 mil (ritmo abr–mai) | 33 vendas · R$ 2,9 mil | 37 · R$ 3,4 mil | 46 · R$ 4,3 mil |
| 185 mil (ritmo fev–mar) | 100 · R$ 8,9 mil | 115 · R$ 10,6 mil | 140 · R$ 13,3 mil |
| 600 mil (ritmo junho/pico) | 325 · R$ 28,9 mil | 374 · R$ 34,4 mil | 455 · R$ 43,2 mil |
| 790 mil (últimas 4 semanas anualizadas) | 426 · R$ 38,0 mil | 491 · R$ 45,2 mil | 597 · R$ 56,8 mil |

## Calculadora reversa (meta líquida mensal → views necessárias)

| Meta líquida/mês | Conservador | Realista | Otimista |
|---|---|---|---|
| R$ 5 mil | 104 mil views | 87 mil | 69 mil |
| R$ 10 mil | 207 mil | 174 mil | 139 mil |
| R$ 20 mil | 414 mil | 348 mil | 277 mil |
| R$ 30 mil | 621 mil | 523 mil | 416 mil |
| R$ 42 mil (≈ faturamento da clínica) | 869 mil | 732 mil | 582 mil |

## Split por produto (jun–jul, referência)

MAPA-7P: 59% das vendas e **77,5% do líquido**. 2AS: 12,5% / 12,1%. Guia Rápido: 12,7% / 6,2%. Manual de Rotina: 15,5% / 4,2%. Projeção é feita na cesta total (produtos são acoplados por bump); o split serve pra ler onde o dinheiro mora.

## Limites honestos

1. **6 meses de histórico** (23 semanas). A faixa conservador↔otimista é larga de propósito; estreita a cada mês. Recalibrar mensalmente (rodar os 4 scripts de coleta + análise).
2. Correlação não prova causa: parte do vínculo é "vídeo bom sobe tudo junto". Pra planejamento de meta isso não atrapalha; só não vale concluir "comprar view resolve".
3. O modelo assume a esteira de oferta atual. Mudou preço/escada/portfólio, recalibrar o ticket.
4. Cancelamentos (~2–3% do líquido) já estão fora das vendas aprovadas atuais, mas estornos futuros de vendas recentes podem raspar 1–3% do projetado.
5. Views aqui = views do canal inteiro (Analytics), incluindo Shorts. Se o mix Shorts/longos mudar radicalmente, a taxa muda.

## Fase 5 — Tempo até meta acumulada (R$ 5 milhões líquidos)

Descoberta de contexto: **o canal nasceu em set/2025** (724 views; nov/2025 já fez 447 mil). Razões de crescimento usam só a fase madura (nov/2025+); o Monte Carlo sorteia as 22 razões SEMANAIS de fev-jul/2026 (4 por mês), com trava de 10 mi views/mês e horizonte de 120 meses. Ponto de partida: ritmo dos últimos 60 dias = **461 mil views/mês**; R$/1k líquido = 48/57/72 (p25/p50/p75).

Tempo até R$ 5 mi líquidos (taxa realista):

| Motor | Hipótese | Tempo |
|---|---|---|
| Constante | canal congela em 461 mil/mês | ~15,7 anos |
| Composto 2%/mês | crescimento modesto perpétuo | ~6,6 anos |
| Composto 4,3%/mês | média de toda a vida madura do canal | ~4,4 anos |
| Composto 9,5%/mês | ritmo dos últimos 6 meses sustentado | ~2,7 anos |
| Com teto 3 mi/mês (g 10%) | cresce forte e satura | ~3,4 anos |
| Monte Carlo (2.000 futuros) | futuro estatisticamente parecido com fev-jul/26 | mediana **2,0 anos**; 80% entre 1,3 e 3,6 anos; 98,7% em <10 anos |

Marcos na mediana do Monte Carlo: R$ 1 mi em ~10 meses; R$ 2 mi em ~14; R$ 5 mi em ~24; R$ 10 mi em ~42.

Avisos: o Monte Carlo herda o crescimento médio embutido de fev→jul (canal 2,6× em 5 meses) — é o motor mais agressivo; o modo "sem tendência" do simulador isola só a volatilidade. Alavanca mais poderosa que views: o R$/1k (dobrar o ticket corta qualquer tempo pela metade). Script: `scripts/fase5_tempo_ate_meta.py` → `dados/tempo_ate_meta.json`.

## Arquivos

- `dados/youtube_canal_dia.csv` — 562 dias de views/inscritos
- `dados/hotmart_vendas_raw.json` + `hotmart_comissoes_raw.json` + `hotmart_cancelamentos_raw.json` — transações
- `dados/hotmart_vendas_dia.csv` — agregado dia × produto (bruto BRL convertido + líquido produtor)
- `dados/analise_correlacao.json` — séries, correlações, taxas mensais
- `dados/projecoes.json` — taxas, cenários, reversa
- `scripts/` — coleta_youtube, coleta_hotmart, coleta_hotmart_comissoes, coleta_cancelamentos, converte_e_agrega, analise_correlacao, fase3_projecoes, compara_painel
