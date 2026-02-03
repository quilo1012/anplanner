
# Correção: Downtime Visível na Dashboard e Página Downtime + Formato HH:MM

## Problemas Identificados

| Problema | Causa Raiz |
|----------|-----------|
| Downtime não aparece na página Downtime | Tabela `structured_downtimes` está **vazia** - downtimes não estão sendo salvos |
| Downtime não aparece na Dashboard | Mesmo problema - não há dados para exibir |
| Não aceita formato 1:30 | Campo é `type="number"` - só aceita inteiros |

## Análise Técnica

### Por que os Downtimes não estão salvando?

Ao salvar múltiplas SKU rows, o sistema chama `addShift()` para **cada SKU**, passando os **mesmos downtimes**. Isso causa:

1. **Primeira SKU**: Salva shift → salva downtimes ✅
2. **Segunda SKU**: Salva shift → tenta salvar mesmos downtimes → **IDs duplicados** ou conflito

O problema está na lógica de que downtimes pertencem à **linha/turno**, não ao SKU individual.

---

## Solução Proposta

### 1. Corrigir Lógica de Salvamento de Downtimes

**Mudança no Planner.tsx:**
- Downtimes devem ser salvos apenas UMA VEZ, no primeiro shift
- SKU rows subsequentes não devem tentar inserir downtimes novamente

```text
Antes:
  SKU 1 → addShift({structuredDowntimes: [...]})
  SKU 2 → addShift({structuredDowntimes: [...]})  ❌ Duplicado
  
Depois:
  SKU 1 → addShift({structuredDowntimes: [...]})
  SKU 2 → addShift({structuredDowntimes: []})     ✅ Sem downtimes
```

### 2. Campo Duration com Suporte a HH:MM

**Mudança no StructuredDowntimeForm.tsx:**
- Trocar `type="number"` por `type="text"` com parsing inteligente
- Aceitar formatos: "90", "1:30", "1h30", "1.5"
- Converter automaticamente para minutos
- Exibir total formatado: "1h 30m (90 min)"

---

## Arquivos a Modificar

### 1. Planner.tsx
**Mudanças:**
- Ao salvar múltiplas SKU rows, passar downtimes apenas no primeiro shift
- Downtimes ficam vinculados ao primeiro shift do grupo

### 2. StructuredDowntimeForm.tsx
**Mudanças:**
- Criar função `parseDuration(input)` para converter múltiplos formatos
- Mudar campo de `type="number"` para `type="text"`
- Adicionar placeholder explicativo: "Ex: 90 ou 1:30"
- Manter estado interno como string, converter para número ao atualizar

### 3. Dashboard.tsx
**Verificação:**
- Dashboard já busca `totalDowntime` do shift, que é calculado a partir de `structuredDowntimes`
- Uma vez que os downtimes estejam salvos, aparecerão automaticamente

### 4. Downtime.tsx
**Verificação:**
- Página já extrai downtimes de `shift.structuredDowntimes`
- Uma vez que os downtimes estejam salvos, aparecerão automaticamente

---

## Detalhes Técnicos

### parseDuration - Conversão Flexível

```typescript
function parseDuration(input: string): number {
  const trimmed = input.trim();
  
  // Formato HH:MM (1:30 → 90)
  if (trimmed.includes(':')) {
    const [hours, minutes] = trimmed.split(':').map(s => parseInt(s) || 0);
    return (hours * 60) + minutes;
  }
  
  // Formato decimal (1.5 → 90)
  if (trimmed.includes('.')) {
    return Math.round(parseFloat(trimmed) * 60);
  }
  
  // Formato com 'h' e 'm' (1h30m → 90)
  const hMatch = trimmed.match(/(\d+)h/i);
  const mMatch = trimmed.match(/(\d+)m/i);
  if (hMatch || mMatch) {
    const hours = hMatch ? parseInt(hMatch[1]) : 0;
    const minutes = mMatch ? parseInt(mMatch[1]) : 0;
    return (hours * 60) + minutes;
  }
  
  // Número direto (90 → 90)
  return parseInt(trimmed) || 0;
}
```

### Planner.tsx - Correção do Loop

```typescript
// No handleSubmit, modificar o loop:
let firstShiftId: string | null = null;

for (let i = 0; i < formState.skuRows.length; i++) {
  const row = formState.skuRows[i];
  if (!row.sku.trim()) continue;
  
  const formData: ShiftFormData = {
    // ... outros campos
    // Downtimes só no PRIMEIRO shift
    structuredDowntimes: i === 0 ? formState.structuredDowntimes : [],
  };
  
  await addShift(formData);
}
```

---

## Fluxo Corrigido

### Cenário: Usuário adiciona 3 SKUs com 2 downtimes

```text
1. Usuário preenche:
   - Linha: 5
   - Turno: DAY
   - SKU 1: ABC123, Target: 1000
   - SKU 2: DEF456, Target: 500
   - SKU 3: GHI789, Target: 200
   - Downtime 1: Maintenance, 30min
   - Downtime 2: Quality, 15min

2. Ao salvar:
   - Shift 1 (ABC123) → salva com downtimes [30min, 15min]
   - Shift 2 (DEF456) → salva SEM downtimes
   - Shift 3 (GHI789) → salva SEM downtimes

3. Na página Downtime:
   - Exibe 2 entradas para Linha 5, DAY, vinculadas ao Shift 1

4. Na Dashboard:
   - Linha 5 mostra totalDowntime: 45 min
```

---

## Interface Atualizada - Duration

```text
Antes:
┌─────────────────┐
│ Duration (min)  │
│ [___________90] │ ← type="number", só aceita inteiros
└─────────────────┘

Depois:
┌─────────────────────────┐
│ Duration               │
│ [1:30____________]     │ ← type="text", aceita múltiplos formatos
│ = 90 min               │ ← Preview do valor convertido
└─────────────────────────┘
```

---

## Benefícios

1. **Downtimes salvos corretamente** - Cada registro fica vinculado a um shift específico
2. **Visibilidade na Dashboard** - totalDowntime calculado automaticamente
3. **Visibilidade na página Downtime** - Entradas aparecem com todos os detalhes
4. **Entrada flexível** - Operadores podem usar "1:30" ou "90" conforme preferência
5. **Sem duplicação** - Downtimes não são inseridos múltiplas vezes
