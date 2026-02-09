

# Plano de Otimização de Performance Industrial

## Análise do Estado Atual

### O QUE JÁ ESTÁ IMPLEMENTADO

| Requisito | Status | Localização |
|-----------|--------|-------------|
| `addShiftsBatch()` | ✅ Implementado | ShiftContext.tsx linha 314-397 |
| `skipRefresh` parameter | ✅ Implementado | addShift, updateShift, deleteShift |
| `withTimeout()` wrapper | ✅ Implementado | 10-15s timeout |
| Optimistic update helpers | ✅ Implementado | addShiftLocally, updateShiftLocally, removeShiftLocally |
| Índices no shifts | ✅ Criados | date, shift_type, production_line, composite |
| Índices no downtimes | ✅ Criados | shift_id, category |
| Índice no products | ✅ Criado | product_description |
| Debounce no ProductSearch | ✅ 500ms | ProductSearch.tsx linha 98 |

### O QUE FALTA IMPLEMENTAR

| Requisito | Status | Prioridade |
|-----------|--------|------------|
| Cache de produtos (SKU Search) | ✅ Implementado | useProductCache.ts |
| Cache de lookups fixos (Lines, Leaders, Categories) | ✅ Implementado | useLookupCache.ts |
| Index no SKU da products | ✅ Criado | idx_products_sku (UNIQUE) |
| Index no SKU da shifts | ✅ Criado | idx_shifts_sku |
| Index no line_leader | ✅ Criado | idx_shifts_line_leader |
| Downtime batch operations | ✅ Implementado | saveDowntimesBatch() |
| Lazy loading por linha no Planner | ❌ Falta | MÉDIA |
| Dashboard com dados pré-agregados | ❌ Falta | BAIXA |
| Logs de observabilidade | ✅ Implementado | performanceLogger.ts |

---

## Alterações Propostas

### Fase 1: Database - Índices Faltantes (SQL Migration)

```sql
-- Índice ÚNICO no product_code (SKU) - garantir lookup rápido
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_sku ON products(product_code);

-- Índice no SKU da shifts para filtros rápidos
CREATE INDEX IF NOT EXISTS idx_shifts_sku ON shifts(sku);

-- Índice no line_leader para filtros por líder
CREATE INDEX IF NOT EXISTS idx_shifts_line_leader ON shifts(line_leader);

-- Índice no reason do downtimes para agregações
CREATE INDEX IF NOT EXISTS idx_downtimes_reason ON structured_downtimes(reason);
```

---

### Fase 2: Cache Estratégico de Produtos

**Arquivo:** `src/hooks/useProductCache.ts` (NOVO)

Criar um hook que mantém cache local de produtos por sessão:

```typescript
// Estrutura do cache
interface ProductCacheState {
  products: Map<string, { sku: string; name: string }>;
  lastFetched: Date | null;
  isLoading: boolean;
}

// Funcionalidades:
// - Buscar todos os produtos no login (uma vez)
// - Armazenar em Map para O(1) lookup
// - Cache válido por 30 minutos
// - Invalidar ao adicionar novo produto
```

**Benefícios:**
- ProductSearch não precisa mais fazer query a cada digitação
- Lookup instantâneo para SKUs já conhecidos
- Reduz queries de ~20/turno para ~1/turno

---

### Fase 3: Cache de Lookups Fixos

**Arquivo:** `src/hooks/useLookupCache.ts` (NOVO)

Cache para dados que raramente mudam:

```typescript
interface LookupCache {
  lines: string[];           // Production lines
  leaders: string[];         // Line leaders  
  downtimeCategories: DowntimeCategory[];
  downtimeReasons: Record<string, DowntimeReason[]>;
}

// Carregar uma vez no AuthContext após login
// Armazenar em Context global
// Usar em todos os selects/dropdowns
```

---

### Fase 4: Otimização do ProductSearch

**Arquivo:** `src/components/ProductSearch.tsx`

Mudanças:
1. Integrar com useProductCache
2. Buscar localmente primeiro (cache hit)
3. Query no banco apenas para novos SKUs
4. Debounce reduzido de 500ms para 300ms

```typescript
// ANTES: Sempre query no banco
const { data } = await supabase.from('products').select(...)

// DEPOIS: Cache first, fallback to DB
const cachedProduct = productCache.get(query);
if (cachedProduct) {
  setResults([cachedProduct]);
  return;
}
// Só então query no banco para SKUs desconhecidos
```

---

### Fase 5: Downtime Batch Save

**Arquivo:** `src/contexts/ShiftContext.tsx`

Adicionar função `saveDowntimesBatch()` que:
- Insere múltiplos downtimes em uma única query
- NÃO recarrega o planner
- NÃO recalcula totais globais
- Retorna em < 500ms

```typescript
const saveDowntimesBatch = async (
  shiftId: string, 
  downtimes: StructuredDowntime[]
): Promise<ShiftOperationResult> => {
  // Deletar downtimes antigos do shift
  await supabase.from('structured_downtimes').delete().eq('shift_id', shiftId);
  
  // Inserir novos em batch
  if (downtimes.length > 0) {
    await supabase.from('structured_downtimes').insert(
      downtimes.map(d => ({
        shift_id: shiftId,
        category: d.category,
        reason: d.reason,
        duration: d.duration,
        comment: d.comment || null,
      }))
    );
  }
  
  // NÃO chama refreshShifts() - atualiza localmente
  updateShiftLocally(shiftId, { 
    structuredDowntimes: downtimes,
    totalDowntime: downtimes.reduce((sum, d) => sum + d.duration, 0)
  });
  
  return { success: true };
};
```

---

### Fase 6: Observabilidade (Debug Mode)

**Arquivo:** `src/utils/performanceLogger.ts` (NOVO)

```typescript
const isDev = import.meta.env.DEV;

export const perfLog = (operation: string, startTime: number) => {
  if (!isDev) return;
  const duration = Date.now() - startTime;
  console.log(`[PERF] ${operation}: ${duration}ms`);
  if (duration > 1000) {
    console.warn(`[PERF] ⚠️ ${operation} exceeded 1 second!`);
  }
};

// Uso:
const start = Date.now();
await saveShift(data);
perfLog('saveShift', start);
```

---

## Arquivos a Criar

| Arquivo | Propósito |
|---------|-----------|
| `src/hooks/useProductCache.ts` | Cache local de produtos (Map) |
| `src/hooks/useLookupCache.ts` | Cache de lines, leaders, categories |
| `src/utils/performanceLogger.ts` | Logs de tempo de operação (dev) |

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/ProductSearch.tsx` | Usar cache antes de query |
| `src/contexts/ShiftContext.tsx` | Adicionar saveDowntimesBatch() |
| `src/contexts/AuthContext.tsx` | Carregar lookups no login |
| `supabase/migrations/` | Nova migration com índices |

---

## Impacto de Performance Esperado

| Operação | Antes | Depois |
|----------|-------|--------|
| Salvar 1 SKU | ~2s | < 500ms |
| Salvar 5 SKUs | ~10s | < 1s |
| Salvar 10 SKUs | ~20s | < 1.5s |
| Buscar produto (cache hit) | 500ms | < 10ms |
| Buscar produto (cache miss) | 500ms | 300ms |
| Salvar downtime | ~3s | < 500ms |
| Filtrar History | ~1s | < 200ms |

---

## Resumo das Regras Aplicadas

| Regra | Implementação |
|-------|---------------|
| Nunca salvar linha por linha | ✅ addShiftsBatch() já existe |
| Batch operations | ✅ Já implementado + saveDowntimesBatch() |
| Cache de SKU | ❌ → useProductCache.ts |
| Cache de lookups fixos | ❌ → useLookupCache.ts |
| Índices no banco | ⚠️ Faltam SKU, line_leader |
| Downtime sem reload | ⚠️ → saveDowntimesBatch() |
| Timeout protection | ✅ withTimeout() já existe |
| UI não travada | ✅ skipRefresh + optimistic updates |

---

## Ordem de Implementação

1. **Database Migration** - Adicionar índices faltantes (5 min)
2. **useProductCache** - Cache de produtos (15 min)
3. **ProductSearch update** - Usar cache (10 min)
4. **saveDowntimesBatch** - Downtime otimizado (10 min)
5. **useLookupCache** - Cache de lookups (15 min)
6. **performanceLogger** - Observabilidade (5 min)

**Tempo total estimado: ~1 hora**

