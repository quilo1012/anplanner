

# Fix: History Carregando Lento e Não Salvando

## Problema Real

O console mostra `"Operation timed out"` na carga inicial dos dados. Com apenas 45 sessões no banco, isso indica que o timeout de 30 segundos está sendo atingido desnecessariamente -- provavelmente por conexão lenta no chão de fábrica. Quando o carregamento falha, a lista de sessões fica vazia e não há nada para editar.

## Correções

### 1. Remover timeout da carga inicial de sessões
A query de sessões do operador retorna apenas 2 registros. Não faz sentido ter timeout -- deixar completar naturalmente. Manter timeout apenas nas operações de escrita.

### 2. Estabilizar dependências do useCallback
O `refreshSessions` depende do objeto `user`, que muda de referência a cada render. Trocar para depender apenas de `user?.id` e `user?.role` e `user?.name` (valores primitivos) para evitar re-execuções desnecessárias.

### 3. Adicionar retry automático na carga
Se a primeira tentativa falhar, tentar novamente automaticamente 1 vez antes de desistir.

### 4. Remover timeout do caminho do operador no updateSession
O operador atualiza 1-3 itens. Não precisa de timeout de 10 segundos -- remover para evitar falsos positivos.

## Arquivo a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/contexts/ShiftContext.tsx` | Remover timeouts desnecessários, estabilizar dependências, adicionar retry |

## Detalhes Técnicos

### Remover timeout da query de sessões (linha 88)
```text
// ANTES
const sessionsRes = await withTimeout(query, 30000);

// DEPOIS  
const sessionsRes = await query;
```

### Remover timeout do caminho operador (linha 352)
```text
// ANTES
const results = await withTimeout(Promise.all(updatePromises), 10000);

// DEPOIS
const results = await Promise.all(updatePromises);
```

### Estabilizar useCallback (linha 186)
```text
// ANTES
}, [isAuthenticated, authLoading, user]);

// DEPOIS
}, [isAuthenticated, authLoading, user?.id, user?.role, user?.name]);
```

### Adicionar retry no refreshSessions
Envolver a lógica principal em um loop de retry (max 2 tentativas) com 1 segundo entre tentativas.

## Impacto
- Carregamento não vai mais falhar por timeout em conexões lentas
- Operador vai ver seus dados e poder editar normalmente
- Saves vão ser instantâneos sem timeout artificial
- Sem re-renders desnecessários do contexto

