// Calibração do simulador de projeções. Gerada a partir do histórico real
// (YouTube Analytics + Hotmart líquido do produtor) pelos scripts em
// docs/commercial-intelligence/projecoes/scripts/. Ao recalibrar, atualizar
// APENAS este arquivo — o simulador roda 100% no navegador em cima dele.
export const PROJECOES_CALIBRACAO = {
  calibradoEm: '2026-08-01',
  semanasDeHistorico: 25,
  // média diária dos últimos 60 dias × 30,44
  ritmoAtualViewsMes: 534_000,
  // R$ líquidos (repasse Hotmart) por 1.000 views — percentis 25/50/75 das semanas
  rpk: { conservador: 51.51, realista: 57.64, otimista: 73.79 },
  // crescimento mensal composto observado no canal (fase madura, nov/2025+)
  // ATENÇÃO (01/08/2026): estes dois números NÃO foram recalibrados neste ciclo.
  // O fase5_tempo_ate_meta.py tem um filtro fixo que joga fora o mês "2026-07"
  // (linha 48), então julho inteiro ficou fora do CAGR. Com julho dentro daria
  // vidaMadura 0,1% e ultimos6Meses 13,1%. Aguardando decisão do Bruno.
  crescimentoMensal: { vidaMadura: 4.3, ultimos6Meses: 9.5 },
  // razões semana-a-semana das 25 semanas completas (fev–jul/2026): matéria-prima
  // do Monte Carlo. Incluem o crash de abril e o boom de junho de propósito.
  razoesSemanais: [
    1.1346, 0.9234, 0.8674, 0.8881, 1.469, 0.6369, 0.7258, 1.0993, 0.439, 0.6002,
    0.8702, 1.1214, 1.6204, 1.4707, 0.7614, 1.8926, 1.2994, 2.2082, 1.8229, 2.2206,
    0.5875, 0.709, 0.5593, 1.6203,
  ],
  viewsPorVendaMediana: 1300,
  ticketLiquidoMediano: 91.06,
} as const;

export const PROJECOES_LIMITES = {
  horizonteMeses: 120,
  tetoViewsMesSimulacao: 10_000_000,
  simulacoesMonteCarlo: 2000,
} as const;
