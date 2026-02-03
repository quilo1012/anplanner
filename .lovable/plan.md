
# Correção: Planner Travando no "Saving..."

## Problema Identificado

O botão "Saving..." fica rodando infinitamente porque:

1. **A função `addShift` não lança exceções** - quando há erro de RLS (ex: usuário sem permissão), ela apenas loga no console e retorna silenciosamente
2. **Planner não recebe feedback** - continua executando como se tudo estivesse ok, mas o shift não foi salvo
3. **O loop de SKUs pode travar** - se o primeiro shift falhar, o código continua tentando os próximos sem saber que falhou

## Solução

### 1. Modificar ShiftContext.tsx - Retornar resultado da operação

A função `addShift` deve retornar um objeto indicando sucesso/falha:

```typescript
// Antes:
const addShift = async (data: ShiftFormData) => {
  if (!user) return;
  // ...
  if (shiftError) {
    console.error('Error adding shift:', shiftError);
    return;  // Silencioso!
  }
}

// Depois:
const addShift = async (data: ShiftFormData): Promise<{ success: boolean; error?: string }> => {
  if (!user) return { success: false, error: 'User not authenticated' };
  // ...
  if (shiftError) {
    console.error('Error adding shift:', shiftError);
    return { success: false, error: shiftError.message };
  }
  // ...
  return { success: true };
}
```

### 2. Modificar Planner.tsx - Tratar erros e mostrar feedback

```typescript
// No handleSubmit:
for (const row of formState.skuRows) {
  if (!row.sku.trim()) continue;
  
  const formData = { /* ... */ };
  const result = await addShift(formData);
  
  if (!result.success) {
    toast.error(`Failed to save: ${result.error}`);
    return; // Para o loop e mantém isSubmitting = false
  }
  isFirstShift = false;
}

toast.success('Shift saved successfully!');
navigate('/history');
```

### 3. Corrigir DurationInput - Adicionar forwardRef

O componente `DurationInput` precisa usar `React.forwardRef` para evitar warnings:

```typescript
const DurationInput = React.forwardRef<HTMLInputElement, DurationInputProps>(
  ({ value, onChange }, ref) => {
    // ...
    return (
      <input ref={ref} /* ... */ />
    );
  }
);
```

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/contexts/ShiftContext.tsx` | `addShift` retorna `{ success, error }` |
| `src/pages/Planner.tsx` | Trata resultado e mostra toast de erro/sucesso |
| `src/components/StructuredDowntimeForm.tsx` | `DurationInput` com `forwardRef` |
| `src/types/shift.ts` | Adicionar tipo de retorno (se necessário) |

## Fluxo Corrigido

```text
1. Usuário clica "Save"
2. handleSubmit valida formulário
3. Loop de SKUs:
   - Chama addShift(formData)
   - Se falhar: toast.error("RLS policy violation...") e para
   - Se sucesso: continua para próximo SKU
4. Todos salvos: toast.success e navega para /history
5. Se erro: botão volta ao estado normal, usuário vê mensagem
```

## Benefícios

1. **Feedback visual claro** - Usuário sabe se salvou ou não
2. **Tratamento de erros RLS** - Mensagens explicativas quando falta permissão
3. **Botão não trava** - Sempre volta ao estado normal após tentativa
4. **Logs mais úteis** - Console mostra exatamente onde falhou
