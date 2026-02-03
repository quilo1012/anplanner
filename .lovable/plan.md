
# Plano: Remover Availability do Dashboard e Verificar Edição no History

## Resumo

O usuário quer:
1. Remover "Avail" (Availability) do Dashboard
2. Confirmar que Supervisor e Admin podem editar/deletar no History

## Análise Atual

### Dashboard - Availability
O metric "Availability" aparece em:

| Local | Arquivo | Mudança Necessária |
|-------|---------|-------------------|
| OEE Panel - KPI Row | `OEEPanel.tsx` linha 72-77 | Remover a linha de Availability |
| LineStatusCard - Círculo "Avail" | `LineStatusCard.tsx` linha 199-204 | Remover o CircularProgress de Avail |
| OEE Calculation | `OEEPanel.tsx` linha 21 | Ajustar OEE para usar só Performance |

### History - Edit/Delete
A funcionalidade JÁ ESTÁ IMPLEMENTADA:

```typescript
// src/pages/History.tsx - linhas 31-32
const canEdit = hasRole(['supervisor', 'admin']);
const canDelete = hasRole(['supervisor', 'admin']);
```

Botões de Edit/Delete já existem para:
- View Mobile (cards) - linhas 308-329
- View Desktop (tabela) - linhas 410-433
- Dialogs de confirmação integrados - linhas 522-534

---

## Mudanças Propostas

### 1. Remover Availability do OEEPanel

**Arquivo:** `src/components/dashboard/OEEPanel.tsx`

Antes:
```typescript
<KPIRow
  icon={<TrendingUp size={14} />}
  label="Performance"
  value={performance}
  description="Speed efficiency"
/>
<KPIRow
  icon={<Gauge size={14} />}
  label="Availability"   ❌ REMOVER
  value={availability}
  description="Uptime ratio"
/>
```

Depois:
```typescript
<KPIRow
  icon={<TrendingUp size={14} />}
  label="Performance"
  value={performance}
  description="Speed efficiency"
/>
// Availability removido
```

Também ajustar o cálculo do OEE simplificado:
```typescript
// Antes: const simplifiedOEE = (performance * availability) / 100;
// Depois: const simplifiedOEE = performance; // Só Performance
```

Atualizar o texto descritivo:
```typescript
// Antes: <p>Performance × Availability</p>
// Depois: <p>Overall Performance</p>
```

### 2. Remover Availability do LineStatusCard

**Arquivo:** `src/components/dashboard/LineStatusCard.tsx`

Remover o segundo CircularProgress (Avail):
```typescript
{/* Right: KPI circles */}
<div className="flex items-center gap-2 shrink-0">
  <CircularProgress
    value={performance}
    size={52}
    strokeWidth={5}
    label="Perf"
    colorOverride={hasTargetData ? (isOnTarget ? 'success' : 'destructive') : undefined}
  />
  {/* REMOVER o CircularProgress de Avail abaixo */}
  <CircularProgress
    value={availability}
    size={52}
    strokeWidth={5}
    label="Avail"
  />
</div>
```

### 3. Limpar Props Não Usadas

Após remover Availability:
- Remover prop `availability` de `LineStatusCardProps` (opcional, pode manter por compatibilidade)
- Remover prop `availability` de `OEEPanelProps` (opcional)

---

## Layout Final do Dashboard

### OEE Panel (Simplificado)
```
┌──────────────────────────┐
│  Shift OEE               │
│  DAY Shift               │
├──────────────────────────┤
│                          │
│      [   85%   ]         │  ← Círculo com Performance
│        Good              │
│    Overall Performance   │
│                          │
├──────────────────────────┤
│  📈 Performance   85.0%  │  ← Só esta linha
│  █████████░░░░           │
│                          │
│  📦 Total Production     │
│     1,234 Units          │
└──────────────────────────┘
```

### LineStatusCard (Simplificado)
```
┌──────────────────────────────────────────────────────────┐
│  [Line 1]  │  ● Running  👤 Leader                       │
│   DAY      │  📦 SKU12345                     ┌────────┐ │
│            │     Product Description          │ 105%   │ │
│            │  🎯 1050 / 1000  ✓ +5%          │  Perf  │ │
│            │  Staff: 5/5                      └────────┘ │
└──────────────────────────────────────────────────────────┘
```

---

## Arquivos a Modificar

| Arquivo | Mudanças |
|---------|----------|
| `src/components/dashboard/OEEPanel.tsx` | Remover Availability KPI, ajustar OEE calc |
| `src/components/dashboard/LineStatusCard.tsx` | Remover CircularProgress de Avail |

---

## Sobre Edição no History

A edição e exclusão para Supervisor e Admin JÁ FUNCIONAM:

1. **Verificação de Role**: `hasRole(['supervisor', 'admin'])` 
2. **Botões Visíveis**: Edit (lápis) e Delete (lixeira) aparecem para roles autorizados
3. **EditShiftDialog**: Dialog completo para editar campos do shift
4. **DeleteConfirmDialog**: Modal de confirmação com aviso sobre dados deletados

Se não estiver funcionando, o problema pode ser:
- Usuário não está com role correta no banco de dados
- Sessão precisa ser atualizada após mudança de role

---

## Benefícios

1. **Dashboard mais limpo** - Foco em Performance e Produção
2. **Menos métricas confusas** - Availability removido por simplicidade
3. **History funcional** - Edit/Delete já implementados corretamente
4. **Cards compactos** - Mais espaço para informação relevante
