# Step 01 — Análise de Métricas

## Agente: Dan Data (Analista)

## Instruções

1. Ler o perfil do Bruno em `pipeline/data/perfil-bruno.md`
2. Ler métricas disponíveis em `saude/metricas/` (se existirem)
3. Ler o último mesociclo em `saude/mesociclo-*.md` (se existir)
4. Ler arquivos de treino-semana recentes em `saude/treino-semana-*.md`

## Output esperado

Relatório estruturado contendo:

### Se é o primeiro run (sem métricas anteriores)
- Resumo do perfil
- Estimativa de TDEE baseada em Harris-Benedict + fator de atividade
- Baseline definido (peso atual, composição estimada)
- Recomendações iniciais pro Coach e Nutricionista

### Se é re-run (com métricas acumuladas)
- Média móvel de peso (7 dias)
- Delta semanal de peso
- Taxa de perda (%/semana)
- Aderência ao treino (sessões completadas / programadas)
- Alertas (verde/amarelo/vermelho)
- Recomendações de ajuste pro Coach e Nutricionista

## Formato
Salvar como seção no output do pipeline (não arquivo separado neste step).
O Coach e Nutricionista usam este relatório como input.
