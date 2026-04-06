# Step 06 — Gerar Outputs

## Agente: Rafa Coach (coordena geração)

## Instruções

Gerar todos os arquivos finais no Obsidian (pasta `saude/`):

### 1. Mesociclo overview
Criar `saude/mesociclo-XX.md` com:

```yaml
---
title: "Mesociclo XX — [objetivo]"
type: mesociclo
pillar: saude
numero: XX
duracao_semanas: X
periodizacao: "[tipo]"
split: "[tipo]"
inicio: YYYY-MM-DD
fim: YYYY-MM-DD
status: ativo
tags: [treino, saude, mesociclo]
---
```

Conteúdo: visão geral, objetivos, fases, resumo do plano alimentar, progressão esperada.

### 2. Treino semanal (1 arquivo por semana)
Criar `saude/treino-semana-YYYY-WXX.md` para CADA semana do mesociclo:

```yaml
---
title: "Treino — Semana XX"
type: treino-semana
pillar: saude
semana: XX
ano: YYYY
mesociclo: XX
meta_sessoes: X
treino_1: null
treino_2: null
treino_3: null
treino_4: null
treino_5: null
treino_6: null
concluidos: 0
tags: [treino, saude]
---
```

Conteúdo: tabela completa de cada dia (exercício, séries, reps, carga, descanso, RPE).

### 3. Plano alimentar
Criar `saude/dieta-recomp.md`:

```yaml
---
title: "Dieta — Recomposição Corporal"
type: dieta
pillar: saude
tdee: XXXX
deficit: XXX
calorias_alvo: XXXX
proteina_g: XXX
carb_g: XXX
gordura_g: XXX
status: ativo
tags: [dieta, saude, nutricao]
---
```

Conteúdo: macros, refeições detalhadas, substituições, suplementação.

### 4. Wiki-links e integração
- Mesociclo linka pras semanas: `[[treino-semana-YYYY-WXX]]`
- Mesociclo linka pra dieta: `[[dieta-recomp]]`
- Cada semana linka pro mesociclo: `Parte do [[mesociclo-XX]]`
- Tudo linka pra `[[central]]` via tag saude

### 5. Atualizar central.md se necessário
Verificar que `treino-semana.base` e dashboard vão capturar os novos arquivos automaticamente (pelos filtros de type).
