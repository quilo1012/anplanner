## Objetivo

Manter o filtro padrão do Dashboard em "Hoje", mas quando não houver nenhuma session para o intervalo/turno selecionado, mostrar um empty state útil que aponte para a data mais recente com dados — em vez do atual "No Lines Active" silencioso que esconde os jobs recém-importados pelo Planner.

## Causa raiz (confirmada)

- `src/pages/Dashboard.tsx` linha 39: `const today = format(new Date(), 'yyyy-MM-dd')`
- Linha 49: estado inicial `startDate: today, endDate: today, shift: 'DAY'`
- Linhas 186-190: filtra `s.date >= startDate && s.date <= endDate && s.shift === selectedShift`
- Hoje no servidor é `2026-06-21`. Todas as sessions importadas têm `date = 2026-06-20`. Filtro elimina todas → "No Lines Active".

## Mudanças

### 1. Computar fallback da sessão mais recente

Em `src/pages/Dashboard.tsx`, adicionar `useMemo` que, a partir de `sessions` (já carregadas pelo `ShiftContext`), calcula:

- `mostRecentSessionDate`: maior `s.date` em qualquer turno
- `mostRecentForSelectedShift`: maior `s.date` com `s.shift === selectedShift` (respeitando filtro de operador, se aplicável)

### 2. Substituir o empty state existente

Hoje (linha ~492) o card mostra apenas: `No production data for {dateRangeLabel} - {selectedShift} shift`.

Substituir por um bloco que, quando `filteredSessions.length === 0`:

- Mantém a mensagem principal "Nenhuma sessão para {dateRangeLabel} — turno {selectedShift}".
- Se `mostRecentForSelectedShift` existir e for diferente do `startDate`: mostra linha secundária "A sessão mais recente deste turno é de {data formatada DD/MM/YYYY}" + botão **"Ver {data}"** que chama `setStartDate(maisRecente); setEndDate(maisRecente)`.
- Se não houver sessão para o turno atual mas houver para o outro turno na mesma data: mostra botão secundário "Trocar para turno {outro}" que chama `setSelectedShift`.
- Se não houver nenhuma sessão em lugar nenhum: manter mensagem atual sem botões.

### 3. Nada mais muda

- Comportamento padrão continua "Hoje / DAY".
- Filtros, queries, contexto, e dados continuam idênticos.
- Mudança é puramente de UI/UX no card de empty state.

## Detalhes técnicos

Arquivo único alterado: `src/pages/Dashboard.tsx`.

Pseudocódigo do empty state:

```text
if filteredSessions.length === 0:
  render Card:
    "Nenhuma sessão para {dateRangeLabel} — turno {selectedShift}"
    if mostRecentForSelectedShift && mostRecentForSelectedShift !== startDate:
      Button "Ver {format(mostRecentForSelectedShift, 'dd/MM/yyyy')}"
        onClick: setStartDate + setEndDate = mostRecentForSelectedShift
    if hasOtherShiftToday:
      Button outline "Trocar para turno {otherShift}"
        onClick: setSelectedShift(otherShift)
```

Usa apenas `sessions` já em memória — sem novas queries.

## Fora do escopo

- Não mudar o intervalo padrão de "Hoje".
- Não tocar em ShiftContext, Planner, ou queries de Supabase.
- Não alterar timezone nem lógica de import.
