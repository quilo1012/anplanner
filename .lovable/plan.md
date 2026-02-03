
# Plano: Trend de Downtime, Cores de Target e Edição no History

## Resumo das Mudanças

| Funcionalidade | Status Atual | Mudança |
|----------------|--------------|---------|
| Trend de Downtime | Não existe | Criar gráfico de linha mostrando tendência de downtime nos últimos 7 dias |
| Cor de Target | CircularProgress usa performance% | Atualizar para usar comparação Real vs Target |
| Edição no History | Já funciona para Supervisor/Admin | Verificar e garantir feedback visual |

---

## 1. Gráfico de Trend de Downtime (NOVO)

### Criar: `src/components/charts/DowntimeTrendChart.tsx`

Componente de gráfico de linha similar ao `PerformanceTrendChart`, mas para downtime:

```
+--------------------------------------------------+
|  Downtime Trend (Last 7 Days)                    |
|  ┌────────────────────────────────────────────┐  |
|  │     *                                       │  |
|  │    / \                  *                   │  |
|  │   /   \      *         / \                  │  |
|  │  /     \    / \       /   \                 │  |
|  │ *       \  /   *-----*     *                │  |
|  │          \/                                 │  |
|  │ Jan 28  29   30   31   Feb 1   2    3      │  |
|  └────────────────────────────────────────────┘  |
|        DAY Shift    NIGHT Shift                  |
+--------------------------------------------------+
```

Lógica:
- Agrupa downtimes por data e turno (DAY/NIGHT)
- Mostra últimos 7 dias
- Duas linhas: uma para cada turno
- Eixo Y: minutos de downtime

### Integrar no Dashboard.tsx

Adicionar o novo gráfico na seção de charts, ao lado do Performance Trend.

---

## 2. Correção de Cores no LineStatusCard

### Problema Atual
O componente `CircularProgress` usa a performance percentual (90%/70%/abaixo) para determinar cores, mas o requisito é comparar **Produção Real vs Target**.

### Solução
Modificar `LineStatusCard.tsx` para:

1. Adicionar prop opcional `useTargetColors?: boolean`
2. Quando `useTargetColors=true` e `hasTargetData`:
   - Passar uma cor customizada para o CircularProgress baseada em `isOnTarget`
   - Verde se `realProduction >= productionTarget`
   - Vermelho se `realProduction < productionTarget`

### Mudança no CircularProgress
Adicionar prop opcional `colorOverride` para permitir cor forçada:

```typescript
interface CircularProgressProps {
  // ... existing props
  colorOverride?: 'success' | 'destructive' | 'warning';
}
```

### Resultado Visual

| Situação | Cor do Círculo |
|----------|----------------|
| Produção >= Target | Verde (success) |
| Produção < Target | Vermelho (destructive) |
| Sem dados de target | Usa lógica atual (performance %) |

---

## 3. Edição no History (Verificação)

### Status Atual
O código já permite edição para Supervisor e Admin:

```typescript
// src/pages/History.tsx linha 31-32
const canEdit = hasRole(['supervisor', 'admin']);
const canDelete = hasRole(['supervisor', 'admin']);
```

E o botão de edição existe:
```typescript
{canEdit && (
  <button onClick={() => handleEdit(shift)} ...>
    <Edit size={14} /> Edit
  </button>
)}
```

### Problema Identificado
O `EditShiftDialog.tsx` existe e funciona, mas pode não estar dando feedback visual adequado quando o resultado do `updateShift` retorna erro.

### Melhoria
Atualizar o `handleSubmit` do `EditShiftDialog` para usar o novo retorno de `updateShift`:

```typescript
const result = await updateShift(shift.id, {...});
if (!result.success) {
  toast.error(`Failed to update: ${result.error}`);
  return;
}
toast.success('Shift updated successfully');
```

---

## Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `src/components/charts/DowntimeTrendChart.tsx` | Gráfico de tendência de downtime |

## Arquivos a Modificar

| Arquivo | Mudanças |
|---------|----------|
| `src/components/ui/circular-progress.tsx` | Adicionar prop `colorOverride` |
| `src/components/dashboard/LineStatusCard.tsx` | Passar cores baseadas em target para CircularProgress |
| `src/pages/Dashboard.tsx` | Adicionar DowntimeTrendChart na seção de gráficos |
| `src/components/history/EditShiftDialog.tsx` | Usar retorno de resultado para feedback de erro |

---

## Detalhes Técnicos

### DowntimeTrendChart.tsx

```typescript
interface DowntimeTrendChartProps {
  shifts: ShiftReport[];
}

// Agrupa por data e turno
// Últimos 7 dias
// Usa LineChart do Recharts
// Duas linhas: DAY (azul) e NIGHT (roxo)
// Eixo Y: minutos totais de downtime
```

### CircularProgress.tsx - Mudança

```typescript
// Adicionar prop
colorOverride?: 'success' | 'destructive' | 'warning';

// Modificar getColor():
const getColor = () => {
  if (colorOverride) {
    const colorMap = {
      success: 'hsl(var(--success))',
      destructive: 'hsl(var(--destructive))',
      warning: 'hsl(var(--warning))',
    };
    return colorMap[colorOverride];
  }
  // lógica atual...
};
```

### LineStatusCard.tsx - Mudança

Na seção dos KPI circles:
```typescript
<CircularProgress
  value={performance}
  size={52}
  strokeWidth={5}
  label="Perf"
  colorOverride={hasTargetData ? (isOnTarget ? 'success' : 'destructive') : undefined}
/>
```

---

## Fluxo Visual Final

### Dashboard com Downtime Trend:
```
┌─────────────────────────────────────────────────────┐
│  Performance Trend (Last 7 Days)                    │
└─────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────┐
│  Downtime Trend (Last 7 Days)  ← NOVO               │
└─────────────────────────────────────────────────────┘
```

### LineStatusCard com Cores Corrigidas:
```
┌──────────────────────────────────────────┐
│  [Line 1]  Running                       │
│  SKU: ABC123                             │
│  1050 / 1000  ✓ ON TARGET               │
│                                          │
│  [Perf 105%]  [Avail 98%]               │
│      Verde       Amarelo                 │  ← Cores baseadas em target
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│  [Line 2]  Warning                       │
│  SKU: DEF456                             │
│  850 / 1000   ✗ BELOW TARGET            │
│                                          │
│  [Perf 85%]   [Avail 92%]               │
│    Vermelho     Amarelo                  │  ← Vermelho quando abaixo
└──────────────────────────────────────────┘
```

---

## Benefícios

1. **Trend de Downtime** - Visualização clara da evolução do downtime ao longo da semana
2. **Cores de Target** - Indicação visual imediata se linha está no target ou não
3. **Edição no History** - Feedback claro quando edição falha por permissões ou erro
4. **Consistência** - Todas as cores seguem a mesma lógica: Verde = Bom, Vermelho = Atenção
