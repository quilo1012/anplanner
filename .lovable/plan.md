

# Plano: Filtro por Operador + Ordenacao por Linha

## O que muda

### 1. Operadores so veem as suas linhas no History

Quando o utilizador logado tem o role "operator", o History filtra automaticamente as sessoes onde o campo **Line Leader** corresponde ao **nome do utilizador**. Supervisores e Admins continuam a ver tudo.

**Implementacao** (`src/pages/History.tsx`):
- Importar `useAuth` para obter `user.name` e `user.role`
- No `filteredSessions`, adicionar uma condicao: se `user.role === 'operator'`, so incluir sessoes onde `session.lineLeader` corresponde ao `user.name` (comparacao case-insensitive com `.toLowerCase()`)
- Esconder o filtro de "Leader" no dropdown para operadores (ja esta filtrado automaticamente)

### 2. Ordenacao por sequencia de linha de producao

Alterar a ordenacao das sessoes no History de "data mais recente" para **sequencia natural de linha** (Line 1, Line 2, Line 3... Filler Line 1, etc.).

**Implementacao** (`src/pages/History.tsx`):
- Substituir o `.sort()` actual (linha 69) por uma funcao que ordena por nome de linha usando ordenacao natural (extrai numeros do nome da linha para comparar numericamente em vez de alfabeticamente)
- Exemplo: "Line 1" < "Line 2" < "Line 10" < "Filler Line 1"

### 3. Dashboard tambem respeita o filtro do operador

O Dashboard aplica a mesma logica: operadores so veem os cards das linhas onde sao Leader.

**Implementacao** (`src/pages/Dashboard.tsx`):
- Adicionar filtro no `filteredSessions` para operadores, identico ao History

## Detalhes Tecnicos

### Ficheiros a alterar

| Ficheiro | Alteracao |
|----------|-----------|
| `src/pages/History.tsx` | Filtro automatico por `lineLeader` para operadores; ordenacao por sequencia de linha |
| `src/pages/Dashboard.tsx` | Filtro automatico por `lineLeader` para operadores |

### Funcao de ordenacao natural por linha

```text
naturalLineSort("Line 1", "Line 2")   -> Line 1 primeiro
naturalLineSort("Line 2", "Line 10")  -> Line 2 primeiro
naturalLineSort("Line 5", "Filler Line 1") -> Line 5 primeiro
```

Extrai o prefixo (Line, Filler Line) e o numero, ordena primeiro por prefixo e depois numericamente.

### Logica de filtro do operador

```text
if (user.role === 'operator') {
  // so mostrar sessoes onde lineLeader == user.name (case-insensitive)
  sessions = sessions.filter(s => 
    s.lineLeader.toLowerCase() === user.name.toLowerCase()
  );
}
```

Supervisores e Admins nao sao afetados - continuam a ver todas as sessoes.

