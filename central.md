---
title: "Central de Tarefas"
type: dashboard
created: 2026-04-06
tags: [dashboard, tarefas, central]
---

# Central de Tarefas

## Metricas da Semana

```dataview
TABLE WITHOUT ID
  "Tarefas" AS Area,
  length(filter(rows, (r) => r.status = "concluido")) + " concluidas" AS Status
FROM "tarefas"
WHERE type = "tarefa"
WHERE date(created) >= date(today) - dur(7 days)
GROUP BY type
```

```dataview
TABLE WITHOUT ID
  "Treino" AS Area,
  concluidos + "/" + meta_sessoes + " sessoes" AS Status
FROM "saude"
WHERE type = "treino-semana"
SORT semana DESC
LIMIT 1
```

```dataview
TABLE WITHOUT ID
  "Consultas" AS Area,
  length(rows) + " esta semana" AS Status
FROM "clinica"
WHERE type = "consulta"
WHERE date(data) >= date(today) - dur(7 days)
GROUP BY type
```

---

## Atrasadas

![[tarefas-atrasadas.base]]

## Hoje

![[tarefas-hoje.base]]

## Esta Semana

![[tarefas-semana.base]]

---

## Por Area

![[tarefas-por-pillar.base]]

---

## Producao de Videos

![[producao-videos.base]]

---

## Treino

![[treino-semana.base]]

---

## Clinica

![[clinica.base]]

---

## Links

- [[crm|CRM — Contatos]]
- [[comt-audiencia|Audiencia — Comentarios]]
- [[producao-videos|Producao de Videos]]
- [[catalogo-squads|Catalogo de Squads]]
