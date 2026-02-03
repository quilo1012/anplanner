

# Plano: Quadro de Performance dos Line Leaders (Dia/Semana)

## Resumo

Criar um novo componente de **Leader Performance Board** com:
- Toggle para alternar entre visualização **Diária** e **Semanal**
- Ranking de líderes por performance média
- Indicadores visuais de meta atingida
- Integração no Dashboard

---

## Layout Visual

### Visualização Diária

```
┌──────────────────────────────────────────────────────────────────┐
│  Leader Performance Board                    [Day] [Week]        │
├──────────────────────────────────────────────────────────────────┤
│  📅 Monday, Feb 3, 2026                                          │
├──────────────────────────────────────────────────────────────────┤
│  🥇 1. John Smith          105.2%  ████████████████░░  ✓  2 lines│
│  🥈 2. Maria Santos        98.5%   █████████████████░  ✓  1 line │
│  🥉 3. Carlos Oliveira     92.3%   ██████████████████░  ✓  2 lines│
│     4. Ana Costa           85.0%   ███████████████░░░  ✗  1 line │
│     5. Pedro Silva         78.4%   █████████████░░░░░  ✗  1 line │
└──────────────────────────────────────────────────────────────────┘
```

### Visualização Semanal

```
┌──────────────────────────────────────────────────────────────────┐
│  Leader Performance Board                    [Day] [Week]        │
├──────────────────────────────────────────────────────────────────┤
│  📅 Jan 28 - Feb 3, 2026  (Last 7 Days)                          │
├──────────────────────────────────────────────────────────────────┤
│  🥇 1. John Smith          102.1%  ████████████████░░  14 shifts │
│  🥈 2. Maria Santos        97.8%   █████████████████░   7 shifts │
│  🥉 3. Carlos Oliveira     94.5%   ██████████████████░  10 shifts│
│     4. Ana Costa           88.2%   ███████████████░░░   6 shifts │
│     5. Pedro Silva         81.0%   █████████████░░░░░   4 shifts │
├──────────────────────────────────────────────────────────────────┤
│  Average: 92.7%  |  Total: 41 shifts  |  On Target: 3/5 leaders  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Componente Novo

### Criar: `src/components/charts/LeaderPerformanceBoard.tsx`

```typescript
interface LeaderPerformanceBoardProps {
  shifts: ShiftReport[];
  currentDate: string;  // Para cálculo de semana
}

// Funcionalidades:
// - Toggle interno: 'day' | 'week'
// - Dia: filtra só pela data atual (ou selectedDate)
// - Semana: últimos 7 dias a partir da data atual
// - Ranking com posição (1º, 2º, 3º com medalhas)
// - Barra de progresso visual
// - Indicador de meta (95%)
// - Contagem de turnos/linhas
```

---

## Dados Exibidos por Líder

| Campo | Descrição |
|-------|-----------|
| Posição | Ranking baseado em performance média |
| Nome | Nome do líder |
| Performance | % média (produção real / target) |
| Barra | Visualização gráfica do percentual |
| Status | ✓ se >= 95%, ✗ se < 95% |
| Info Extra | Dia: linhas gerenciadas / Semana: total de turnos |

---

## Cálculos

### Modo Dia

```typescript
const dayData = shifts.filter(s => s.date === currentDate);

const byLeader = groupBy(dayData, 'lineLeader');

const leaderStats = Object.entries(byLeader).map(([leader, leaderShifts]) => ({
  leader,
  performance: average(leaderShifts.map(s => s.performance)),
  totalProduction: sum(leaderShifts.map(s => s.realProduction)),
  totalTarget: sum(leaderShifts.map(s => s.productionTarget)),
  lineCount: uniqueCount(leaderShifts.map(s => s.productionLine)),
  shiftCount: leaderShifts.length,
  isOnTarget: performance >= 95,
}));
```

### Modo Semana

```typescript
const weekStart = subDays(parseISO(currentDate), 6);
const weekData = shifts.filter(s => {
  const date = parseISO(s.date);
  return date >= weekStart && date <= parseISO(currentDate);
});

// Mesmo agrupamento do modo dia
```

---

## Estilo Visual

### Cores das Medalhas

| Posição | Cor | Ícone |
|---------|-----|-------|
| 1º | Dourado (#FFD700) | 🥇 ou Trophy |
| 2º | Prata (#C0C0C0) | 🥈 ou Medal |
| 3º | Bronze (#CD7F32) | 🥉 ou Award |
| 4º+ | Sem cor | Número |

### Cores da Performance

| Range | Cor |
|-------|-----|
| >= 95% | Verde (success) |
| >= 85% | Amarelo (warning) |
| < 85% | Vermelho (destructive) |

---

## Integração no Dashboard

### Local: Seção de Charts

Adicionar após "Performance by Leader" existente:

```typescript
<div className="card p-3">
  <LeaderPerformanceBoard 
    shifts={shifts} 
    currentDate={selectedDate}
  />
</div>
```

---

## Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `src/components/charts/LeaderPerformanceBoard.tsx` | Novo componente completo |

## Arquivos a Modificar

| Arquivo | Mudanças |
|---------|----------|
| `src/pages/Dashboard.tsx` | Adicionar LeaderPerformanceBoard na grade de charts |

---

## Estrutura do Componente

```typescript
export function LeaderPerformanceBoard({ shifts, currentDate }: Props) {
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  
  const filteredShifts = useMemo(() => {
    if (viewMode === 'day') {
      return shifts.filter(s => s.date === currentDate);
    }
    // Week: últimos 7 dias
    const weekStart = subDays(parseISO(currentDate), 6);
    return shifts.filter(s => {
      const date = parseISO(s.date);
      return date >= weekStart && date <= parseISO(currentDate);
    });
  }, [shifts, currentDate, viewMode]);
  
  const leaderStats = useMemo(() => {
    // Agregar por líder e calcular estatísticas
  }, [filteredShifts]);
  
  return (
    <div>
      {/* Header com título e toggle */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">Leader Performance Board</h3>
        <div className="flex rounded-lg border">
          <button onClick={() => setViewMode('day')}>Day</button>
          <button onClick={() => setViewMode('week')}>Week</button>
        </div>
      </div>
      
      {/* Período */}
      <div className="text-sm text-muted-foreground mb-3">
        {viewMode === 'day' ? format(date, 'EEEE, MMM d') : `${weekRange}`}
      </div>
      
      {/* Lista de líderes */}
      <div className="space-y-2">
        {leaderStats.map((leader, index) => (
          <LeaderRow key={leader.name} position={index + 1} {...leader} />
        ))}
      </div>
      
      {/* Resumo (só na semana) */}
      {viewMode === 'week' && <WeekSummary stats={summaryStats} />}
    </div>
  );
}
```

---

## Benefícios

1. **Visão de performance individual** - Cada líder com seu ranking
2. **Flexibilidade temporal** - Dia atual ou semana completa
3. **Gamificação** - Medalhas incentivam competição saudável
4. **Identificação rápida** - Cores indicam quem precisa de atenção
5. **Contexto** - Mostra quantidade de turnos/linhas gerenciados

