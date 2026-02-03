

# Plano: Leader Performance Board com Filtros Avançados

## Resumo

Melhorar o **Leader Performance Board** com:
- Filtro de **Turno (Shift)**: DAY, NIGHT ou ALL
- Filtros de **Período** expandidos: Dia, Semana (7 dias), Quinzena (15 dias), Mês (30 dias)
- Layout responsivo com selects compactos

---

## Layout Visual Proposto

```
┌──────────────────────────────────────────────────────────────────────┐
│  🏆 Leader Performance Board                                         │
├──────────────────────────────────────────────────────────────────────┤
│  Shift: [All ▼]    Period: [Day] [Week] [15 Days] [Month]           │
│  📅 Monday, Feb 3, 2026                                              │
├──────────────────────────────────────────────────────────────────────┤
│  🥇 1. John Smith          105.2%  ████████████████░░  ✓  2 lines   │
│  🥈 2. Maria Santos        98.5%   █████████████████░  ✓  1 line    │
│  🥉 3. Carlos Oliveira     92.3%   ██████████████████░ ✓  2 lines   │
│     4. Ana Costa           85.0%   ███████████████░░░  ✗  1 line    │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Mudanças Técnicas

### 1. Novos Estados

```typescript
// Turno
const [shiftFilter, setShiftFilter] = useState<'ALL' | 'DAY' | 'NIGHT'>('ALL');

// Período expandido
type PeriodType = 'day' | 'week' | '15days' | 'month';
const [periodFilter, setPeriodFilter] = useState<PeriodType>('day');
```

### 2. Lógica de Filtragem

```typescript
const filteredShifts = useMemo(() => {
  let result = shifts;
  
  // Filtro de turno
  if (shiftFilter !== 'ALL') {
    result = result.filter(s => s.shift === shiftFilter);
  }
  
  // Filtro de período
  const currentDateParsed = parseISO(currentDate);
  
  switch (periodFilter) {
    case 'day':
      result = result.filter(s => s.date === currentDate);
      break;
    case 'week':
      const weekStart = subDays(currentDateParsed, 6);
      result = result.filter(s => {
        const date = parseISO(s.date);
        return date >= weekStart && date <= currentDateParsed;
      });
      break;
    case '15days':
      const twoWeeksStart = subDays(currentDateParsed, 14);
      result = result.filter(s => {
        const date = parseISO(s.date);
        return date >= twoWeeksStart && date <= currentDateParsed;
      });
      break;
    case 'month':
      const monthStart = subDays(currentDateParsed, 29);
      result = result.filter(s => {
        const date = parseISO(s.date);
        return date >= monthStart && date <= currentDateParsed;
      });
      break;
  }
  
  return result;
}, [shifts, currentDate, shiftFilter, periodFilter]);
```

### 3. Display de Período

```typescript
const dateDisplay = useMemo(() => {
  const currentDateParsed = parseISO(currentDate);
  
  const periodLabels = {
    day: format(currentDateParsed, 'EEEE, MMM d, yyyy'),
    week: `${format(subDays(currentDateParsed, 6), 'MMM d')} - ${format(currentDateParsed, 'MMM d, yyyy')} (7 Days)`,
    '15days': `${format(subDays(currentDateParsed, 14), 'MMM d')} - ${format(currentDateParsed, 'MMM d, yyyy')} (15 Days)`,
    month: `${format(subDays(currentDateParsed, 29), 'MMM d')} - ${format(currentDateParsed, 'MMM d, yyyy')} (30 Days)`,
  };
  
  return periodLabels[periodFilter];
}, [currentDate, periodFilter]);
```

---

## Componentes de UI

### Filtro de Turno (Select)

```typescript
<Select value={shiftFilter} onValueChange={(v) => setShiftFilter(v as typeof shiftFilter)}>
  <SelectTrigger className="w-24 h-8 text-xs">
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="ALL">All</SelectItem>
    <SelectItem value="DAY">Day</SelectItem>
    <SelectItem value="NIGHT">Night</SelectItem>
  </SelectContent>
</Select>
```

### Filtro de Período (Toggle Buttons)

```typescript
<div className="flex rounded-lg border border-border overflow-hidden">
  {(['day', 'week', '15days', 'month'] as const).map((period) => (
    <button
      key={period}
      onClick={() => setPeriodFilter(period)}
      className={`px-2 py-1 text-xs font-medium transition-colors ${
        periodFilter === period
          ? 'bg-primary text-primary-foreground'
          : 'bg-card hover:bg-muted text-foreground'
      }`}
    >
      {periodLabels[period]}
    </button>
  ))}
</div>
```

---

## Mapeamento de Labels

| Período | Label Botão | Display Header |
|---------|-------------|----------------|
| day | Day | Monday, Feb 3, 2026 |
| week | Week | Jan 28 - Feb 3, 2026 (7 Days) |
| 15days | 15d | Jan 20 - Feb 3, 2026 (15 Days) |
| month | Month | Jan 5 - Feb 3, 2026 (30 Days) |

| Turno | Label |
|-------|-------|
| ALL | All |
| DAY | Day |
| NIGHT | Night |

---

## Arquivo a Modificar

| Arquivo | Mudanças |
|---------|----------|
| `src/components/charts/LeaderPerformanceBoard.tsx` | Adicionar filtros de shift e período expandido |

---

## Imports Necessários

```typescript
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { subDays } from 'date-fns'; // já importado
```

---

## Layout do Header Atualizado

```typescript
<div className="space-y-2 mb-3">
  {/* Título */}
  <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
    <Trophy size={16} />
    Leader Performance Board
  </h3>
  
  {/* Filtros */}
  <div className="flex items-center gap-3 flex-wrap">
    {/* Shift Filter */}
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">Shift:</span>
      <Select ...>...</Select>
    </div>
    
    {/* Period Filter */}
    <div className="flex rounded-lg border border-border overflow-hidden">
      <button>Day</button>
      <button>Week</button>
      <button>15d</button>
      <button>Month</button>
    </div>
  </div>
  
  {/* Date Range Display */}
  <div className="flex items-center gap-2 text-xs text-muted-foreground">
    <Calendar size={14} />
    {dateDisplay}
    {shiftFilter !== 'ALL' && <span className="text-primary">({shiftFilter} shift)</span>}
  </div>
</div>
```

---

## Resumo Atualizado (para todos os períodos exceto "day")

```typescript
{periodFilter !== 'day' && summaryStats && (
  <div className="mt-3 pt-3 border-t border-border flex items-center justify-center gap-4 text-xs text-muted-foreground">
    <span>Average: <strong>{summaryStats.avgPerformance}%</strong></span>
    <span>|</span>
    <span>Total: <strong>{summaryStats.totalShifts} shifts</strong></span>
    <span>|</span>
    <span>On Target: <strong>{summaryStats.onTargetCount}/{summaryStats.totalLeaders}</strong></span>
  </div>
)}
```

---

## Benefícios

1. **Flexibilidade total** - Usuário escolhe período que quiser
2. **Filtro de turno** - Analisa DAY ou NIGHT separadamente
3. **Comparação justa** - Mesmas condições de turno para ranking
4. **Visão de longo prazo** - Quinzena e mês mostram tendências
5. **UI compacta** - Botões e select ocupam pouco espaço

