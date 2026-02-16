

# Mudanca: Alertas de Produto Problematico por Linha + Melhoria na Impressao

## 1. Mudar conceito do Product Performance

O dashboard atual foca em "recomendar a melhor linha para um produto". O novo conceito muda para **alertas de produtos com problemas em linhas especificas** -- ou seja, o foco passa a ser identificar combinacoes produto x linha que apresentam baixa performance, alto downtime ou instabilidade.

### Mudancas no `src/pages/ProductPerformance.tsx`:
- Renomear titulo para "Product Alerts" ou "Alertas de Produto"
- Manter o Heatmap (funciona bem para visualizacao)
- Substituir o painel "Top Lines for SKU" (ranking) por um painel **"Product Alerts"** que lista combinacoes produto x linha com score abaixo de 50, agrupadas por produto
- Cada alerta mostra: produto, linha, score, performance, downtime total, e numero de sessoes
- Ordenar por score ascendente (piores primeiro)

### Mudancas no `src/pages/Planner.tsx`:
- Remover o auto-fill de linha recomendada (linhas 68-81)
- Manter alerta quando usuario seleciona uma linha com score baixo para o produto (linhas 84-96), mas reformular a mensagem para focar no **problema** em vez de "recomendar outra linha"
- Mensagem: "Atencao: {produto} tem historico de baixa performance em {linha} (score: X). Verifique downtimes recentes."

## 2. Melhorar formato de impressao das sessoes

### Mudancas no `src/components/PrintReport.tsx`:
- Adicionar secao **"Production Items Detail"** que lista cada SKU por linha com Target, Actual e Performance individual
- Adicionar secao **"Downtime Detail"** com categoria, razao, duracao e comentario de cada downtime (nao apenas o resumo por categoria)
- Melhorar layout da tabela "Production by Line" adicionando colunas Staff Planned/Actual
- Adicionar totais gerais no footer da tabela principal
- Melhorar espacamento e legibilidade para impressao A4

### Mudancas no `src/pages/History.tsx`:
- Melhorar a funcao `handlePrint` para abrir em nova janela (como o DailySummaryTable faz) em vez de usar `window.print()` que imprime a pagina inteira
- Incluir CSS profissional de impressao com margens, fontes e zebra-striping

## Arquivos a Modificar (4)

| Arquivo | Mudanca |
|---------|--------|
| `src/pages/ProductPerformance.tsx` | Mudar conceito para alertas de produto problematico |
| `src/pages/Planner.tsx` | Remover auto-fill, manter alerta reformulado |
| `src/components/PrintReport.tsx` | Adicionar detalhes de items/downtimes, staff, totais |
| `src/pages/History.tsx` | Usar window.open para impressao profissional |

## Detalhes Tecnicos

### ProductPerformance - Painel de Alertas

O painel "Problematic Lines" existente ja faz algo similar. Ele sera movido para posicao de destaque e expandido:
- Threshold mantido em score < 50
- Cada item mostra: SKU, nome do produto, linha, score, performance%, downtime total, sessoes finalizadas/total
- Agrupamento por produto para facilitar leitura
- Icone de alerta vermelho para scores criticos (< 30) e amarelo para moderados (30-50)

### PrintReport - Secoes Adicionais

```text
+----------------------------------------------+
| APPLIED NUTRITION - PRODUCTION REPORT        |
| Date: ... | Shift: ... | Generated: ...      |
+----------------------------------------------+
| SUMMARY                                      |
| Total Production | Planned | Performance     |
| Downtime | Staff Planned/Actual               |
+----------------------------------------------+
| PRODUCTION BY LINE                           |
| Line | Leader | SKUs | Plan | Act | Perf | DT|
|      |        |      |      |     |      |   |
| TOTALS                                       |
+----------------------------------------------+
| PRODUCTION ITEMS DETAIL                      |
| Line | SKU | Product | Target | Actual | %   |
+----------------------------------------------+
| DOWNTIME DETAIL                              |
| Line | Category | Reason | Duration | Comment|
+----------------------------------------------+
| PRODUCTION BY SKU                            |
+----------------------------------------------+
```

### History Print - Nova Janela

Substituir `window.print()` por `window.open()` com HTML completo, incluindo:
- Logo Applied Nutrition
- Tabela principal com todas as sessoes filtradas
- Detalhes de items e downtimes por sessao
- CSS inline para impressao limpa

