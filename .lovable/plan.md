

# Plano: Adicionar Units per Minute (UPM) no Planner e Dashboard

## Resumo

Adicionar cálculo e visualização de **Units per Minute (UPM)** usando a fórmula:
- **Target UPM** = Production Target ÷ 570
- **Real UPM** = Real Production ÷ 570

O valor 570 representa os minutos de um turno de trabalho (9.5 horas × 60 = 570).

---

## Mudanças Propostas

### 1. Planner - SkuRowForm

Adicionar display de UPM ao lado dos campos de Target e Real Production:

```
┌─────────────────────────────────────────────────────────────┐
│  Product #1                                      (105%)    │
├─────────────────────────────────────────────────────────────┤
│  SKU                        │  Product Name                │
│  [SKU12345                 ]│  [Product Description      ] │
├─────────────────────────────────────────────────────────────┤
│  🎯 Production Target        │  📈 Real Production          │
│  [1000        ] units        │  [1050        ] units        │
│  ⏱️ 1.75 units/min            │  ⏱️ 1.84 units/min            │  ← NOVO
└─────────────────────────────────────────────────────────────┘
```

### 2. Dashboard - LineStatusCard

Adicionar UPM metrics abaixo do target indicator:

```
┌──────────────────────────────────────────────────────────┐
│  [Line 1]  │  ● Running  👤 Leader                       │
│   DAY      │  📦 SKU12345                     ┌────────┐ │
│            │     Product Description          │ 105%   │ │
│            │  🎯 1050 / 1000  ✓ +5%          │  Perf  │ │
│            │  ⏱️ 1.84 / 1.75 UPM              └────────┘ │  ← NOVO
│            │  Staff: 5/5                                 │
└──────────────────────────────────────────────────────────┘
```

---

## Detalhes Técnicos

### Constante de Cálculo

```typescript
const SHIFT_MINUTES = 570; // 9.5 hours × 60 minutes
```

### Cálculo UPM

```typescript
const calculateUPM = (units: number): number => {
  if (units <= 0) return 0;
  return parseFloat((units / 570).toFixed(2));
};
```

---

## Arquivos a Modificar

| Arquivo | Mudanças |
|---------|----------|
| `src/components/SkuRowForm.tsx` | Adicionar display de Target UPM e Real UPM |
| `src/components/dashboard/LineStatusCard.tsx` | Adicionar linha com UPM metrics |

---

## Implementação SkuRowForm.tsx

Adicionar abaixo de cada input de quantidade:

```typescript
// Após o input de Production Target
<div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
  <Clock size={10} />
  {(row.productionTarget / 570).toFixed(2)} units/min
</div>

// Após o input de Real Production  
<div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
  <Clock size={10} />
  {(row.realProduction / 570).toFixed(2)} units/min
</div>
```

---

## Implementação LineStatusCard.tsx

Adicionar nova linha de UPM após o target indicator:

```typescript
{/* UPM (Units per Minute) */}
{hasTargetData && (
  <div className="flex items-center gap-2 pl-5 mt-1 text-xs text-muted-foreground">
    <Clock size={12} />
    <span>
      {(realProduction / 570).toFixed(2)} / {(productionTarget / 570).toFixed(2)} UPM
    </span>
  </div>
)}
```

---

## Layout Visual Final

### Planner - SKU Row:

```
┌─────────────────────────────────────────────────────────────┐
│  Production Target                Real Production           │
│  ┌────────────────────────┐      ┌────────────────────────┐ │
│  │ 1000               units│      │ 1050               units│ │
│  └────────────────────────┘      └────────────────────────┘ │
│  ⏱️ 1.75 units/min                ⏱️ 1.84 units/min          │
└─────────────────────────────────────────────────────────────┘
```

### Dashboard - LineStatusCard:

```
┌──────────────────────────────────────────────────────────────┐
│  [Line 1]  │  Running  Leader: John              ┌────────┐ │
│   DAY      │  SKU: ABC123                        │  105%  │ │
│            │  Product XYZ                        │  Perf  │ │
│            │  🎯 1050 / 1000  ✓ +5%              └────────┘ │
│            │  ⏱️ 1.84 / 1.75 UPM                             │
│            │  Staff: 5/5                                    │
└──────────────────────────────────────────────────────────────┘
```

---

## Benefícios

1. **Métrica de velocidade** - Mostra a eficiência de produção por minuto
2. **Comparação clara** - Target UPM vs Real UPM lado a lado
3. **Padrão industrial** - UPM é uma métrica comum em manufatura
4. **Cálculo automático** - Baseado nos valores já existentes
5. **Sem impacto no banco** - Cálculo feito no frontend

