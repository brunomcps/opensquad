# Step 03 — Plano Alimentar

## Agente: Nina Nutri

## Instruções

1. Ler o relatório do Analista (step 01)
2. Ler o perfil em `pipeline/data/perfil-bruno.md` (incluindo dieta atual)
3. Ler a programação do Coach (step 02) pra alinhar nutrição com treino
4. Se re-run, ler dieta anterior e métricas de aderência

## Decisões que você DEVE tomar

- TDEE calculado (fórmula + fator de atividade ajustado)
- Déficit calórico diário (400-500 kcal)
- Macros diários: proteína (g), carb (g), gordura (g), calorias totais
- Distribuição por refeição (respeitando jejum matinal)
- Plano alimentar com alimentos reais que Bruno come
- Suplementação recomendada
- Ajustes por fase (treino pesado vs deload)

## Output esperado

```markdown
## Plano Nutricional — Recomposição

### Cálculos
- TDEE estimado: XXXXkcal
- Déficit: XXXkcal/dia
- Meta calórica: XXXXkcal/dia

### Macros Diários
| Macro | Gramas | kcal | % |
|-------|--------|------|---|
| Proteína | XXXg | XXX | XX% |
| Carboidrato | XXXg | XXX | XX% |
| Gordura | XXXg | XXX | XX% |
| **Total** | | **XXXX** | 100% |

### Refeições

**Pós-treino (café da manhã) ~Xkcal:**
- [alimentos reais com quantidades]

**Almoço ~Xkcal:**
- [alimentos reais com quantidades]

**Lanche (opcional) ~Xkcal:**
- [opções]

**Jantar ~Xkcal:**
- [alimentos reais com quantidades]

### Suplementação
- [se necessário]

### Dia de deload
- Calorias: manutenção (TDEE)
- Macros ajustados: [diferenças]
```

## Formato
Conteúdo será usado no step-06 pra gerar `saude/dieta-recomp.md`
