# Step 02 — Programação do Mesociclo

## Agente: Rafa Coach

## Instruções

1. Ler o relatório do Analista (step anterior)
2. Ler o perfil em `pipeline/data/perfil-bruno.md`
3. Ler equipamentos em `pipeline/data/equipamentos-smartfit.md`
4. Ler evidência base em `pipeline/data/evidencia-base.md`
5. Se for re-run, ler o mesociclo anterior pra entender o que mudar

## Decisões que você DEVE tomar

- Duração do mesociclo (3-6 semanas)
- Tipo de periodização (DUP recomendado pra avançado em déficit)
- Split semanal (PPL, Upper/Lower, ou híbrido)
- Volume por músculo por semana (14-18 sets em déficit)
- Exercícios específicos (considerando Smart Fit)
- Progressão semana a semana (carga, reps ou volume)
- Programação de deload
- Cardio: quais dias, duração, intensidade
- Abdominal: integrado ou separado

## Output esperado

### Visão geral do mesociclo
```markdown
## Mesociclo XX — [Objetivo]
- Duração: X semanas
- Periodização: [tipo]
- Split: [tipo]
- Foco: emagrecimento com preservação muscular
- Déficit alvo: [do Nutricionista]
- Deload: semana X
```

### Treino detalhado por semana
Para CADA semana do mesociclo, uma tabela por dia:

```markdown
## Semana 1

### Segunda — Push (Peito + Ombro + Tríceps)
| Exercício | Séries | Reps | Descanso | RPE | Notas |
|-----------|--------|------|----------|-----|-------|
| Supino reto barra | 4 | 6-8 | 120s | 8-9 | Progressão: +2.5kg/semana |
| Desenvolvimento máquina | 3 | 10-12 | 90s | 7-8 | |
| ...
```

## Formato
Conteúdo será usado no step-06 pra gerar os arquivos finais em saude/
