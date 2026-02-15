

# Upgrade: Dashboard Produto x Linha + Importacao de Downtime

## Resumo

Tres modulos novos que transformam dados historicos em recomendacoes automaticas de linha para cada produto.

---

## Fase 1: Utilidades e Calculo de Score

### Novo arquivo: `src/utils/calcProductLineMetrics.ts`

Funcao pura que recebe sessoes e calcula, para cada par (produto, linha):

```text
score = 0.6 * performance + 0.2 * stability + 0.2 * downtimeScore

performance = SUM(quantity_actual) / SUM(quantity_target) * 100
stability   = sessions_sem_downtime / total_sessions * 100  
downtimeScore = 100 - (total_downtime / max_downtime_global * 100)
```

Retorna um Map com chave `sku|line` contendo: score, performance, stability, downtimeScore, totalSessions, totalProduction, totalTarget, totalDowntimeMinutes.

### Novo arquivo: `src/utils/normalizeLineName.ts`

Funcao para padronizar nomes: "filler line 6" -> "Filler Line 6". Reutiliza o padrao ja existente no projeto.

---

## Fase 2: Hook de Recomendacoes

### Novo arquivo: `src/hooks/useProductLineRecommendations.ts`

Hook React que:
- Consome `sessions` do ShiftContext
- Chama `calcProductLineMetrics` com memo
- Expoe funcoes:
  - `getTopLinesForProduct(sku, limit=3)` -- retorna linhas ordenadas por score
  - `getScoreMatrix()` -- retorna matriz completa para o heatmap
  - `getProblematicLines(threshold=50)` -- linhas com score abaixo do limiar

---

## Fase 3: Pagina Product Performance Dashboard

### Novo arquivo: `src/pages/ProductPerformance.tsx`

Pagina com:
- Filtros de periodo (igual ao Dashboard existente)
- Heatmap visual (tabela com celulas coloridas verde/amarelo/vermelho)
- Ranking Top 3 linhas por produto selecionado
- Lista de alertas para linhas problematicas

### Novo arquivo: `src/components/charts/ProductHeatmap.tsx`

Componente de tabela onde:
- Eixo X = Linhas de producao
- Eixo Y = Produtos (SKUs)
- Celulas coloridas por score (verde >= 75, amarelo >= 50, vermelho < 50)
- Tooltip com detalhes (performance, downtime, sessoes)

### Novo arquivo: `src/components/charts/ProductRanking.tsx`

Componente que mostra Top 3 linhas para um produto selecionado, com barras visuais de score e indicadores de performance/stability/downtime.

---

## Fase 4: Importador iTouching com Downtimes

### Modificar: `src/components/IntouchImport.tsx`

Expandir o parser para detectar colunas adicionais de downtime na planilha:
- Categoria, Motivo, Duracao, Comentario
- Se presentes, agrupar por sessao e importar automaticamente via `saveDowntimesBatch`
- Preview mostra tanto produtos quanto downtimes detectados
- Verificacao de duplicidade antes de importar (mesma linha + data + turno)

A interface `LineGroup` ganha um campo opcional `downtimes`:

```typescript
export interface LineGroup {
  line: string;
  lineLeader: string;
  rows: { sku: string; product: string; quantityTarget: number }[];
  downtimes?: { category: string; reason: string; duration: number; comment?: string }[];
}
```

### Modificar: `src/pages/Planner.tsx`

Apos importar grupos, se houver downtimes, chamar `saveDowntimesBatch` para cada sessao criada.

---

## Fase 5: Integracao com Planner

### Modificar: `src/pages/Planner.tsx`

Quando o usuario seleciona um SKU no formulario:
- Mostrar badge com "Recommended: Filler Line X (score: 85)"
- Usar o hook `useProductLineRecommendations`
- Nao forcar -- apenas sugestao visual

---

## Fase 6: Navegacao

### Modificar: `src/components/Sidebar.tsx`

Adicionar link "Product Performance" no grupo "Reports" com icone `Activity`, visivel para supervisor e admin.

### Modificar: `src/App.tsx`

Adicionar rota `/product-performance` com `ProtectedRoute` para supervisor/admin.

---

## Arquivos a Criar (6)

| Arquivo | Descricao |
|---------|-----------|
| `src/utils/calcProductLineMetrics.ts` | Calculo de score ponderado |
| `src/utils/normalizeLineName.ts` | Padronizacao de nomes de linha |
| `src/hooks/useProductLineRecommendations.ts` | Hook com recomendacoes |
| `src/pages/ProductPerformance.tsx` | Pagina dashboard produto x linha |
| `src/components/charts/ProductHeatmap.tsx` | Heatmap visual |
| `src/components/charts/ProductRanking.tsx` | Ranking top 3 linhas |

## Arquivos a Modificar (4)

| Arquivo | Mudanca |
|---------|---------|
| `src/components/IntouchImport.tsx` | Parser de downtimes + preview |
| `src/pages/Planner.tsx` | Import downtimes + badge de recomendacao |
| `src/components/Sidebar.tsx` | Link Product Performance |
| `src/App.tsx` | Rota /product-performance |

## Notas Tecnicas

- Nenhuma mudanca de schema no banco -- todos os dados necessarios ja existem nas tabelas `production_sessions`, `production_items`, e `structured_downtimes`
- Os calculos sao feitos client-side usando os dados ja carregados no ShiftContext
- O heatmap usa cores CSS com classes Tailwind condicionais (sem dependencia extra)
- O parser de downtime no iTouching e opcional -- se a planilha nao tiver colunas de downtime, funciona como antes

