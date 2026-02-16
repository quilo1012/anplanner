

# Upgrade: Dashboard Preditivo + Planner Inteligente

## Resumo

Ajustes nos pesos do score, filtros de turno/periodo no dashboard, auto-selecao de linha no Planner com alertas, e exportacao CSV.

---

## 1. Atualizar Pesos do Score

**Arquivo:** `src/utils/calcProductLineMetrics.ts`

Alterar a formula de:
```
score = 0.6 * performance + 0.2 * stability + 0.2 * downtimeScore
```
Para:
```
score = 0.5 * performance + 0.3 * downtimeScore + 0.2 * stability
```

---

## 2. Filtros de Turno e Periodo no Dashboard

**Arquivo:** `src/pages/ProductPerformance.tsx`

- Adicionar filtros: Data Inicio, Data Fim, Turno (DAY/NIGHT/All)
- Filtrar sessoes antes de passar para o hook `useProductLineRecommendations`
- O hook precisa aceitar sessoes filtradas em vez de usar todas do contexto

**Arquivo:** `src/hooks/useProductLineRecommendations.ts`

- Aceitar parametro opcional `filteredSessions` para override das sessoes do contexto
- Quando fornecido, calcular metricas apenas com essas sessoes

---

## 3. Planner Inteligente

**Arquivo:** `src/pages/Planner.tsx`

- Quando o usuario seleciona um SKU e a linha esta vazia, auto-preencher com a linha recomendada
- Se o usuario escolher uma linha com score < 50, mostrar toast de alerta (nao bloqueante)
- Adicionar tooltip ao lado do campo Production Line mostrando score/performance/downtime quando ha recomendacao

---

## 4. Export CSV no Dashboard

**Arquivo:** `src/pages/ProductPerformance.tsx`

- Botao "Export CSV" que exporta a matriz completa (SKU, Linha, Score, Performance, Stability, DowntimeScore, Sessions, Downtime)
- Usa o mesmo padrao BOM do exportador existente

---

## Arquivos a Modificar (4)

| Arquivo | Mudanca |
|---------|---------|
| `src/utils/calcProductLineMetrics.ts` | Pesos 0.5/0.3/0.2 |
| `src/hooks/useProductLineRecommendations.ts` | Aceitar sessoes filtradas |
| `src/pages/ProductPerformance.tsx` | Filtros turno/periodo + export CSV |
| `src/pages/Planner.tsx` | Auto-select linha + alerta score < 50 |

## Notas Tecnicas

- Nenhuma mudanca de schema no banco
- O DowntimeImport.tsx na pagina Downtime ja existe e funciona -- nao precisa de alteracao
- O heatmap e ranking ja existem e continuam iguais, apenas recebem dados filtrados
- Natural sort continua aplicado nas listagens de linhas

