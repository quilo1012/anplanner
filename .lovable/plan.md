

# Plano: Permitir Entrada Manual de SKU e Product Name com Salvamento no Banco

## Situação Atual

| Elemento | Status | Problema |
|----------|--------|----------|
| Campo SKU | ✅ Editável | Permite entrada manual |
| Campo Product Name | ❌ `readOnly` | Não permite edição manual |
| Salvamento no Banco | ❌ Não implementado | Novos produtos não são registrados |

Quando um SKU não é encontrado, o sistema mostra "Manual entry allowed" mas:
- O usuário não consegue digitar o Product Name (campo bloqueado)
- Mesmo que pudesse, o produto não seria salvo na tabela `products`

---

## Solução Proposta

### 1. Tornar Product Name Editável

Quando o SKU não for encontrado no banco de dados:
- Remover o `readOnly` do campo Product Name
- Mudar o estilo visual para indicar que está editável
- Manter auto-preenchimento quando SKU existir

### 2. Adicionar Opção "Salvar Novo Produto"

Quando SKU e Product Name são inseridos manualmente:
- Mostrar checkbox ou botão "Save to product catalog"
- Ao salvar o shift, também inserir na tabela `products`

### 3. Fluxo de Inserção Automática

Opção mais simples: ao salvar o shift, verificar se o SKU já existe no banco. Se não existir e tiver Product Name preenchido, criar automaticamente.

---

## Arquivos a Modificar

### 1. SkuRowForm.tsx
**Mudanças:**
- Adicionar estado para controlar se o SKU foi encontrado no banco
- Tornar Product Name editável quando SKU não existe
- Adicionar checkbox "Save new product to catalog"

### 2. ProductSearch.tsx
**Mudanças:**
- Expor callback quando SKU não é encontrado (`onNotFound`)
- Permitir que componente pai saiba se deve habilitar edição do nome

### 3. Planner.tsx
**Mudanças:**
- Na função `handleSubmit`, verificar cada SKU row
- Se SKU não existe no banco e tem Product Name → inserir na tabela `products`

---

## Detalhes Técnicos

### types/planner.ts - Adicionar Campo de Controle

```typescript
export interface SkuRow {
  id: string;
  sku: string;
  product: string;
  productionTarget: number;
  realProduction: number;
  isNewProduct?: boolean;  // NOVO: indica se deve salvar na tabela products
}
```

### SkuRowForm.tsx - Permitir Edição Manual

```typescript
// Detectar se SKU foi encontrado ou é entrada manual
const isManualEntry = row.sku.trim() && !productFoundInDatabase;

// Campo Product Name agora editável quando manual
<input
  type="text"
  value={row.product}
  onChange={e => updateSkuRow(row.id, 'product', e.target.value)}
  placeholder={isManualEntry ? "Enter product name" : "Auto-filled from database"}
  className={`input-field text-sm ${isManualEntry ? '' : 'bg-muted'}`}
  maxLength={100}
  readOnly={!isManualEntry && !!row.product}  // Editável quando manual
/>

// Checkbox para salvar novo produto
{isManualEntry && (
  <label className="flex items-center gap-2 text-sm">
    <input
      type="checkbox"
      checked={row.isNewProduct}
      onChange={e => updateSkuRow(row.id, 'isNewProduct', e.target.checked)}
    />
    Save to product catalog
  </label>
)}
```

### Planner.tsx - Salvar Novos Produtos

```typescript
// No handleSubmit, antes de salvar shifts:
for (const row of formState.skuRows) {
  if (row.isNewProduct && row.sku.trim() && row.product.trim()) {
    // Verificar se já existe
    const { data: existing } = await supabase
      .from('products')
      .select('product_code')
      .eq('product_code', row.sku)
      .single();
    
    if (!existing) {
      // Inserir novo produto
      await supabase.from('products').insert({
        product_code: row.sku,
        product_description: row.product,
      });
    }
  }
}
```

---

## Interface Visual Atualizada

### Quando SKU Encontrado no Banco

```text
┌─────────────────────────────────────────────────────────┐
│ Product #1                                         [X]  │
├─────────────────────────────────────────────────────────┤
│  SKU *              │  Product Name (auto-filled)       │
│  [ABC123      🔍]   │  [Widget Pro Max        ] 🔒      │
│  ✅ Found in catalog                                     │
├─────────────────────────────────────────────────────────┤
│  Target             │  Real Production                  │
│  [1000    ] units   │  [950       ] units               │
└─────────────────────────────────────────────────────────┘
```

### Quando SKU NÃO Encontrado (Entrada Manual)

```text
┌─────────────────────────────────────────────────────────┐
│ Product #1                                         [X]  │
├─────────────────────────────────────────────────────────┤
│  SKU *              │  Product Name                     │
│  [NEWSKU99    🔍]   │  [New Product Name     ] ✏️       │
│  ⚠️ Not in catalog   [✓] Save to product catalog        │
├─────────────────────────────────────────────────────────┤
│  Target             │  Real Production                  │
│  [500     ] units   │  [480       ] units               │
└─────────────────────────────────────────────────────────┘
```

---

## Fluxo do Usuário

1. **Digita SKU** no campo de busca
2. **Sistema busca** na tabela `products`
3. **Se encontrado:**
   - Product Name é preenchido automaticamente (readonly)
   - Usuário define Target e Real Production
4. **Se NÃO encontrado:**
   - Aviso "Not in catalog" aparece
   - Campo Product Name fica **editável**
   - Checkbox "Save to product catalog" fica visível
5. **Ao salvar:**
   - Se checkbox marcado → insere na tabela `products`
   - Shift é salvo normalmente na tabela `shifts`

---

## Benefícios

1. **Flexibilidade** - Não bloqueia produção quando produto não está cadastrado
2. **Catálogo atualizado** - Novos produtos são adicionados automaticamente
3. **Controle** - Usuário decide se quer salvar no catálogo ou não
4. **Consistência** - Próximas vezes o SKU será encontrado automaticamente

