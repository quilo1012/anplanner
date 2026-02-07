
# Plano: Corrigir Formulario de Edicao - Target Unico e Salvamento de SKUs

## Problema 1: Target Repetido por SKU

### Situacao Atual
O campo "Production Target" aparece em cada SKU Row, obrigando o usuario a inserir o target para cada produto:

```text
┌─ Product #1 ─────────────────┐
│ SKU: ABC-123                 │
│ Production Target: [7000   ] │  <- Target por SKU
│ Real Production:   [6500   ] │
└──────────────────────────────┘
┌─ Product #2 ─────────────────┐
│ SKU: DEF-456                 │
│ Production Target: [3000   ] │  <- Target repetido
│ Real Production:   [2800   ] │
└──────────────────────────────┘
```

### Proposta
O **Target** deve ser da **LINHA** (informado UMA vez), e cada SKU tem apenas sua producao real:

```text
┌─ Line Production Target ─────┐
│ Target:            [10000  ] │  <- Target unico da linha
└──────────────────────────────┘

┌─ Product #1 ─────────────────┐
│ SKU: ABC-123                 │
│ Real Production:   [6500   ] │  <- Apenas producao
└──────────────────────────────┘
┌─ Product #2 ─────────────────┐
│ SKU: DEF-456                 │
│ Real Production:   [2800   ] │  <- Apenas producao
└──────────────────────────────┘

Total Production: 9,300 units (93% of target)
```

---

## Problema 2: Novos SKUs Nao Salvam

### Causa
O codigo atual no `EditShiftDialog` utiliza `addShift()` para criar novos registros, mas esta passando os dados incorretamente ou falhando silenciosamente.

### Verificacao Necessaria
- Garantir que todos os campos obrigatorios estao sendo passados
- Adicionar logs para debug
- Verificar se o `refreshShifts()` esta sendo chamado apos todos os inserts

---

## Alteracoes Detalhadas

### 1. Criar Componente SimplificadoSkuRowForm

Novo componente `SkuRowFormSimple.tsx` especifico para edicao no History, que mostra:
- Target unico no topo (da linha)
- SKUs apenas com producao real
- Total de producao calculado automaticamente

### 2. Modificar EditShiftDialog.tsx

```text
ANTES:
- Target em cada SKU Row

DEPOIS:
┌────────────────────────────────────────┐
│ Line Production Target: [______] units │  <- Campo unico
└────────────────────────────────────────┘
┌─ Products / SKUs ──────────────────────┐
│ [+ Add SKU]                            │
│                                        │
│ Product #1: SKU-A                      │
│ Real Production: [6500] units          │
│                                        │
│ Product #2: SKU-B                      │
│ Real Production: [2800] units          │
│                                        │
│ ═══════════════════════════════════════│
│ Total: 9,300 units | Performance: 93%  │
└────────────────────────────────────────┘
```

### 3. Corrigir Logica de Salvamento

Problema identificado: o primeiro SKU recebe o target completo, os demais recebem target 0 (distribuido proporcionalmente ou total).

**Nova logica**:
- Primeiro registro (update): recebe target = lineTarget, realProduction = soma de todos os SKUs
- Registros adicionais (add): recebem target proporcional ou 0, cada um com seu realProduction

**OU alternativa mais simples**:
- Cada registro de shift guarda seu proprio SKU + producao real
- O target da linha e armazenado no primeiro registro
- Performance e calculada na agregacao (Dashboard/History)

---

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/history/EditShiftDialog.tsx` | Adicionar campo de Target da linha separado, remover target do SkuRowForm, corrigir logica de salvamento |
| `src/components/SkuRowForm.tsx` | Adicionar prop opcional `showTarget` para ocultar campo de target |

---

## Codigo Proposto

### EditShiftDialog.tsx - Adicionar Target da Linha

```tsx
// Estado para target da linha (separado dos SKUs)
const [lineTarget, setLineTarget] = useState(0);

// No useEffect ao carregar shift:
setLineTarget(shift.productionTarget);

// No form, antes dos SKU Rows:
<div className="space-y-1">
  <Label className="text-xs flex items-center gap-1">
    <Target size={12} className="text-primary" />
    Line Production Target
  </Label>
  <div className="relative">
    <Input
      type="number"
      value={lineTarget || ''}
      onChange={(e) => setLineTarget(parseInt(e.target.value) || 0)}
      placeholder="Target for the line"
      className="h-9 pr-12"
    />
    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
      units
    </span>
  </div>
</div>

// Mostrar totais calculados:
const totalProduction = skuRows.reduce((sum, row) => sum + (row.realProduction || 0), 0);
const performance = lineTarget > 0 ? (totalProduction / lineTarget) * 100 : 0;

<div className="p-3 bg-muted rounded-lg">
  <div className="flex justify-between text-sm">
    <span>Total Production:</span>
    <span className="font-bold">{totalProduction.toLocaleString()} units</span>
  </div>
  <div className="flex justify-between text-sm">
    <span>Performance:</span>
    <span className={performance >= 100 ? 'text-green-600' : 'text-yellow-600'}>
      {performance.toFixed(1)}%
    </span>
  </div>
</div>
```

### SkuRowForm.tsx - Adicionar prop para ocultar Target

```tsx
interface SkuRowFormProps {
  skuRows: SkuRow[];
  onChange: (rows: SkuRow[]) => void;
  canReview?: boolean;
  errors?: Record<string, string>;
  showTarget?: boolean;  // NOVA PROP - default true para manter compatibilidade
}

// Dentro do componente:
{showTarget !== false && (
  <div>
    <label className="label text-xs flex items-center gap-1">
      <Target size={12} className="text-primary" />
      Production Target
    </label>
    {/* ... campo de target ... */}
  </div>
)}
```

### EditShiftDialog - Corrigir Salvamento

```tsx
// Ao salvar, garantir await em todos os addShift e verificar resultado:
const handleSubmit = async (e: React.FormEvent) => {
  // ...validacao...
  
  // Primeiro registro: update com lineTarget e totalProduction
  const totalProduction = validRows.reduce((sum, row) => sum + (row.realProduction || 0), 0);
  
  const result = await updateShift(shift.id, {
    ...formData,
    sku: firstRow.sku,
    product: firstRow.product,
    productionTarget: lineTarget,                    // Target da linha
    realProduction: firstRow.realProduction,         // Producao deste SKU
    // outros campos...
  });
  
  if (!result.success) {
    toast.error(`Failed to update: ${result.error}`);
    return; // Para se falhar
  }
  
  // Registros adicionais
  let addedCount = 0;
  for (let i = 1; i < validRows.length; i++) {
    const row = validRows[i];
    const addResult = await addShift({
      ...formData,
      sku: row.sku,
      product: row.product,
      productionTarget: 0,              // Target 0 para SKUs adicionais (agregado no primeiro)
      realProduction: row.realProduction,
    });
    
    if (addResult.success) {
      addedCount++;
    } else {
      console.error('Failed to add SKU:', row.sku, addResult.error);
      toast.error(`Failed to add ${row.sku}: ${addResult.error}`);
    }
  }
  
  if (addedCount > 0) {
    toast.success(`Saved ${addedCount + 1} record(s)`);
  }
  
  onOpenChange(false);
  onSuccess?.();
};
```

---

## Resultado Esperado

1. **Target unico**: Usuario insere o target da linha uma vez so
2. **SKUs com producao**: Cada SKU tem apenas seu campo de producao real
3. **Totais calculados**: Performance e calculada automaticamente
4. **Salvamento funciona**: Novos SKUs sao salvos corretamente como registros separados
5. **Retrocompatibilidade**: O Planner original continua funcionando igual
