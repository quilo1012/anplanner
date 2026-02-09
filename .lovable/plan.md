

# Dashboard Professional Upgrade

## Resumo das Melhorias

### 1. Filtro por Intervalo de Datas (Data Inicio / Data Fim)

Substituir o campo de data unica por dois campos: **Data Inicio** e **Data Fim**. Isto permite analisar periodos completos (ex: semana passada, mes inteiro).

- Adicionar estado `startDate` e `endDate` em vez do actual `selectedDate`
- Botoes de preset rapido: "Hoje", "7 Dias", "30 Dias", "Mes Atual"
- Todos os graficos e tabelas passam a filtrar pelo intervalo completo
- Os trend charts (Performance 7d, Downtime 7d) passam a usar o intervalo seleccionado em vez de hardcoded 7 dias

### 2. Filtros Detalhados de Downtime

Adicionar filtros especificos para downtime dentro da seccao de graficos:

- Dropdown de **Categoria de Downtime** (Maintenance, Quality, Staff, etc.)
- Dropdown de **Razao de Downtime** (dinamico baseado na categoria seleccionada)
- Os graficos DowntimeByCategory e DowntimeByReason actualizam com os filtros
- Novo card de **Downtime History** mostrando uma tabela com todas as entradas de downtime do periodo filtrado (linha, data, categoria, razao, duracao)

### 3. Daily Summary Imprimivel

Melhorar o DailySummaryTable para ser imprimivel:

- Adicionar botao "Print" dedicado junto ao titulo do Daily Summary
- Gerar uma versao print-friendly com cabecalho (logo, periodo, filtros activos)
- Incluir totais e medias no rodape da tabela
- Remover o limite de 20 linhas - mostrar todos os dados do periodo

### 4. Layout Mais Profissional

Melhorias visuais para dar um aspecto mais limpo e corporativo:

- **Barra de filtros**: Reorganizar em duas linhas - datas/presets na primeira, filtros de linha/leader na segunda
- **Section headers**: Adicionar divisores visuais entre seccoes (Line Cards, Charts, Summary) com titulos claros
- **Print styles**: Melhorar CSS de impressao para que TODOS os graficos e tabelas aparecam correctamente quando se imprime
- **Spacing consistente**: Uniformizar gaps e paddings entre cards e seccoes
- **Summary bar**: Barra fixa no topo com KPIs principais (Total Production, Avg Performance, Total Downtime, OEE) com design mais limpo

## Ficheiros a Alterar

| Ficheiro | Alteracao |
|----------|-----------|
| `src/pages/Dashboard.tsx` | Filtro de intervalo de datas; presets de data; filtros de downtime; reorganizacao do layout; section headers |
| `src/components/charts/DailySummaryTable.tsx` | Remover limite de 20 linhas; adicionar totais; botao print dedicado; print styles |
| `src/components/charts/DowntimeByCategory.tsx` | Aceitar filtro de categoria opcional |
| `src/components/charts/DowntimeByReason.tsx` | Aceitar filtro de categoria/razao opcional |
| `src/components/charts/DowntimeTrendChart.tsx` | Usar intervalo de datas em vez de hardcoded 7 dias |
| `src/components/charts/PerformanceTrendChart.tsx` (titulo apenas) | Usar intervalo de datas em vez de hardcoded 7 dias |
| `src/components/charts/DailyProductionSummary.tsx` | Usar intervalo de datas completo |
| `src/components/PrintReport.tsx` | Adicionar seccao de downtime detalhado; suportar intervalo de datas |

## Detalhes Tecnicos

### Filtro de intervalo de datas

```typescript
// Substituir selectedDate por:
const [startDate, setStartDate] = useState<string>(today);
const [endDate, setEndDate] = useState<string>(today);

// Presets
const setPreset = (preset: string) => {
  const now = new Date();
  switch (preset) {
    case 'today': setStartDate(today); setEndDate(today); break;
    case '7d': setStartDate(sub7days); setEndDate(today); break;
    case '30d': setStartDate(sub30days); setEndDate(today); break;
  }
};

// Filtro passa a ser:
const matchesDate = s.date >= startDate && s.date <= endDate;
```

### Downtime History Table (novo componente inline)

Tabela dentro do Dashboard que lista TODAS as entradas de downtime do periodo:

| Data | Turno | Linha | Categoria | Razao | Duracao |
|------|-------|-------|-----------|-------|---------|
| Extraido de `session.structuredDowntimes` para todas as sessoes filtradas |

### DailySummaryTable melhorado

- Linha de totais no rodape (Total Planned, Total Actual, Total Downtime, Avg Performance)
- Sem limite de 20 linhas quando em modo de impressao
- Botao print que abre `window.print()` com CSS especifico para a tabela

### Print Styles globais

```css
@media print {
  .dashboard-section { page-break-inside: avoid; }
  .no-print { display: none !important; }
  .print-only { display: block !important; }
  .recharts-responsive-container { height: 200px !important; }
}
```

