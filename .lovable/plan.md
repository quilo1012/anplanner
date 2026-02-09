
# Refinamento Final de Performance Industrial

## Estado Atual - O que JA esta implementado

| Requisito | Status |
|-----------|--------|
| `addShiftsBatch()` - batch insert | OK |
| `saveDowntimesBatch()` - sem refresh | OK |
| `skipRefresh` em add/update/delete | OK |
| `withTimeout()` 10-15s | OK |
| Optimistic updates locais | OK |
| useProductCache (Map, O(1) lookup) | OK |
| useLookupCache (Lines, Leaders) | OK |
| performanceLogger (dev only) | OK |
| Indices: shifts, downtimes, products | OK |
| ProductSearch cache-first + 300ms debounce | OK |
| Auto-mark isNewProduct | OK |

## Gaps Remanescentes (3 itens)

### 1. `refreshShifts()` usa `select('*')` - deve usar select explicito

**Arquivo:** `src/contexts/ShiftContext.tsx` linhas 126-141

```typescript
// ATUAL (linha 127):
.select('*')

// DEPOIS:
.select('id, date, shift_type, production_line, line_leader, product_name, sku, planned_quantity, real_production, performance, comments, is_archived, monitoring_photo_url, staff_planned, staff_actual, created_by, created_at, updated_at')

// Downtimes (linha 140):
.select('*')
// DEPOIS:
.select('id, shift_id, category, reason, duration, comment, created_at')
```

### 2. Downtime.tsx chama `refreshShifts()` redundantemente apos delete

**Arquivo:** `src/pages/Downtime.tsx` linhas 154-158

O `updateShift()` ja chama `refreshShifts()` por padrao (skipRefresh=false). A chamada extra na linha 158 causa refresh duplo.

```typescript
// ATUAL:
await updateShift(shift.id, { ...shift, structuredDowntimes: updatedDowntimes });
await refreshShifts(); // REDUNDANTE - updateShift ja faz refresh

// CORRIGIDO - usar saveDowntimesBatch ao inves de updateShift:
await saveDowntimesBatch(shift.id, updatedDowntimes);
// Sem refreshShifts() - saveDowntimesBatch usa optimistic update local
```

### 3. Adicionar `perfLog` nas operacoes criticas do ShiftContext

**Arquivo:** `src/contexts/ShiftContext.tsx`

Instrumentar `addShift`, `addShiftsBatch`, `updateShift`, `saveDowntimesBatch` com `createPerfTimer` para monitorar tempos em desenvolvimento.

```typescript
// Exemplo em addShift:
const timer = createPerfTimer('addShift');
// ... operacao ...
timer.end(); // Loga tempo automaticamente
```

---

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/contexts/ShiftContext.tsx` | Trocar `select('*')` por select explicito; adicionar perfLog |
| `src/pages/Downtime.tsx` | Usar `saveDowntimesBatch` ao inves de `updateShift` + `refreshShifts` para delete de downtime |

## Impacto

- Elimina refresh duplo na pagina Downtime
- Reduz payload das queries (select explicito)
- Adiciona observabilidade nas operacoes criticas
- Tempo de delete de downtime: de ~3s para <500ms
