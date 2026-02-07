
# Plano: Corrigir Salvamento de Produtos Manuais e Performance do History

## Problemas Identificados

### Problema 1: Produto Manual Não Salva no Catálogo

**Causa Raiz:** O checkbox "Save to product catalog" só aparece quando `isNewProduct` está marcado E o SKU não foi encontrado (`!isFoundInDb`). Porém, o fluxo atual tem uma falha:

1. Usuário digita um SKU que não existe no banco
2. `ProductSearch` define `isFoundInDb = false` via callback
3. O checkbox "Save to product catalog" aparece
4. **MAS**: Se o usuário NÃO marcar o checkbox manualmente, `isNewProduct` permanece `false`
5. No `handleSubmit`, o código verifica `if (row.isNewProduct && ...)` - e como `isNewProduct` é `false`, o produto NÃO é salvo

**Código atual no EditShiftDialog (linha 110-131):**
```tsx
// Save new products to catalog if flagged
for (const row of skuRows) {
  if (row.isNewProduct && row.sku.trim() && row.product.trim()) {
    // ... salva no banco
  }
}
```

O problema é que `isNewProduct` só é `true` se o usuário MARCAR o checkbox manualmente.

---

### Problema 2: Edição do History Demora Muito

**Causa Raiz:** Múltiplas chamadas de `refreshShifts()` sequenciais. A cada operação (update, add), o contexto chama `refreshShifts()`, que:

1. Faz SELECT em todas as shifts
2. Faz SELECT em todos os downtimes
3. Mapeia os dados

Quando o usuário salva 3 SKUs:
- `updateShift()` → `refreshShifts()` (busca tudo)
- `addShift()` → `refreshShifts()` (busca tudo de novo)
- `addShift()` → `refreshShifts()` (busca tudo de novo)

São 6 queries no banco apenas para um salvamento.

---

## Solução Proposta

### Correção 1: Auto-marcar checkbox quando SKU não encontrado

Quando o usuário digita um SKU que não existe E preenche o nome do produto, automaticamente marcar `isNewProduct = true` para que o produto seja salvo no catálogo.

**Mudança no SkuRowForm.tsx:**
```tsx
const handleFoundStatusChange = (rowId: string, found: boolean) => {
  onChange(
    skuRows.map(row => 
      row.id === rowId 
        ? { 
            ...row, 
            isFoundInDb: found, 
            // AUTO-MARCAR: Se não encontrou e tem produto preenchido, marcar para salvar
            isNewProduct: !found && row.product.trim().length > 0 ? true : row.isNewProduct
          } 
        : row
    )
  );
};

// Também atualizar quando o nome do produto mudar
const updateSkuRow = (...) => {
  onChange(
    skuRows.map(row => {
      if (row.id === id) {
        const updated = { ...row, [field]: value };
        // Se editou o nome do produto E não está no banco, marcar para salvar
        if (field === 'product' && !row.isFoundInDb && String(value).trim().length > 0) {
          updated.isNewProduct = true;
        }
        return updated;
      }
      return row;
    })
  );
};
```

### Correção 2: Otimizar salvamento com batch refresh

Modificar o `ShiftContext` para:
1. Remover `refreshShifts()` de dentro de `addShift()` e `updateShift()`
2. Chamar `refreshShifts()` apenas UMA VEZ após todas as operações no `EditShiftDialog`

**Mudança no ShiftContext.tsx:**
```tsx
const addShift = async (data: ShiftFormData, skipRefresh = false): Promise<ShiftOperationResult> => {
  // ... código existente ...
  
  // Só refresh se não foi pedido para pular
  if (!skipRefresh) {
    await refreshShifts();
  }
  return { success: true };
};

const updateShift = async (id: string, data: ShiftFormData, skipRefresh = false): Promise<ShiftOperationResult> => {
  // ... código existente ...
  
  if (!skipRefresh) {
    await refreshShifts();
  }
  return { success: true };
};
```

**Mudança no EditShiftDialog.tsx:**
```tsx
const handleSubmit = async (e: React.FormEvent) => {
  // ... validação ...
  
  // Primeiro registro: update SEM refresh
  const result = await updateShift(shift.id, {...}, true); // skipRefresh = true
  
  // Registros adicionais: add SEM refresh
  for (let i = 1; i < validRows.length; i++) {
    const addResult = await addShift({...}, true); // skipRefresh = true
  }
  
  // ÚNICO refresh no final
  await refreshShifts();
  
  onOpenChange(false);
  onSuccess?.();
};
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/SkuRowForm.tsx` | Auto-marcar `isNewProduct` quando SKU não encontrado e produto preenchido |
| `src/contexts/ShiftContext.tsx` | Adicionar parâmetro `skipRefresh` nas funções add/update |
| `src/components/history/EditShiftDialog.tsx` | Usar `skipRefresh=true` e fazer refresh único no final |

---

## Detalhes Técnicos

### SkuRowForm.tsx - Auto-marcar para salvar

```tsx
// Linha 30-40: Modificar updateSkuRow
const updateSkuRow = (
  id: string, 
  field: keyof SkuRow, 
  value: string | number
) => {
  onChange(
    skuRows.map(row => {
      if (row.id === id) {
        const updated = { ...row, [field]: value };
        // Auto-mark for saving when product name is filled and SKU not in DB
        if (field === 'product' && !row.isFoundInDb && String(value).trim().length > 0) {
          updated.isNewProduct = true;
        }
        return updated;
      }
      return row;
    })
  );
};

// Linha 52-60: Modificar handleFoundStatusChange
const handleFoundStatusChange = (rowId: string, found: boolean) => {
  onChange(
    skuRows.map(row => 
      row.id === rowId 
        ? { 
            ...row, 
            isFoundInDb: found, 
            // Auto-mark for catalog if not found and has product name
            isNewProduct: !found && row.product.trim().length > 0 ? true : (found ? false : row.isNewProduct)
          } 
        : row
    )
  );
};
```

### ShiftContext.tsx - Adicionar skipRefresh

```tsx
// Linha 209: Adicionar parâmetro
const addShift = async (data: ShiftFormData, skipRefresh = false): Promise<ShiftOperationResult> => {
  // ... código existente até linha 268 ...
  
  // Linha 269: Condicional
  if (!skipRefresh) {
    await refreshShifts();
  }
  return { success: true };
};

// Linha 277: Adicionar parâmetro
const updateShift = async (id: string, data: ShiftFormData, skipRefresh = false): Promise<ShiftOperationResult> => {
  // ... código existente até linha 340 ...
  
  // Linha 341: Condicional
  if (!skipRefresh) {
    await refreshShifts();
  }
  return { success: true };
};

// Linha 373: Atualizar interface
interface ShiftContextType {
  // ...
  addShift: (data: ShiftFormData, skipRefresh?: boolean) => Promise<ShiftOperationResult>;
  updateShift: (id: string, data: ShiftFormData, skipRefresh?: boolean) => Promise<ShiftOperationResult>;
  // ...
}
```

### EditShiftDialog.tsx - Usar skipRefresh e refresh único

```tsx
// Linha 137: Passar skipRefresh = true
const result = await updateShift(shift.id, {
  // ... dados ...
}, true); // skipRefresh

// Linha 170: Passar skipRefresh = true
const addResult = await addShift({
  // ... dados ...
}, true); // skipRefresh

// Após o loop (antes de onOpenChange):
// Adicionar refresh manual
await refreshShifts(); // Importar do contexto
```

---

## Resultado Esperado

1. **Produtos manuais salvam automaticamente**: Quando o usuário digita um SKU que não existe e preenche o nome do produto, o checkbox já vem marcado e o produto é salvo no catálogo

2. **Edição rápida**: Ao invés de 6+ queries (2 por operação), teremos apenas 2 queries no final (shifts + downtimes), independente de quantos SKUs foram adicionados

3. **Retrocompatibilidade**: O Planner original continua funcionando igual, pois `skipRefresh` tem valor default `false`

---

## Impacto na Performance

| Cenário | Antes | Depois |
|---------|-------|--------|
| Editar 1 SKU | 2 queries | 2 queries |
| Editar + 1 SKU | 4 queries | 2 queries |
| Editar + 3 SKUs | 8 queries | 2 queries |
| Editar + 5 SKUs | 12 queries | 2 queries |

Redução de até 83% no número de queries para cenários com múltiplos SKUs.
