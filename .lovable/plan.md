
# Plano: Correcao da Sidebar e Login

## Problemas Identificados

### 1. Sidebar - Layout com Margem Incorreta

**Problema**: No `Layout.tsx` linha 17, o conteudo principal usa `lg:ml-0`, mas a sidebar e `fixed` com largura de 256px (`w-64`). Isso faz com que o conteudo principal fique EMBAIXO da sidebar fixa, nao ao lado.

**Codigo atual**:
```
<main className="flex-1 flex flex-col overflow-hidden lg:ml-0 pt-14 lg:pt-0">
```

**Correcao necessaria**:
```
<main className="flex-1 flex flex-col overflow-hidden lg:ml-64 pt-14 lg:pt-0">
```

### 2. Login - Falha na Persistencia da Sessao

**Problema**: Quando `fetchUserData` retorna `null` (caso o profile nao seja encontrado imediatamente), o `user` fica como `null`, tornando `isAuthenticated = false`, e o usuario e redirecionado de volta ao login.

A funcao `fetchUserData` no `AuthContext.tsx` retorna `null` em caso de erro ao buscar o profile (linha 54-57), mesmo quando o usuario autenticou com sucesso no Supabase Auth.

**Codigo problemico** (linha 54-57):
```typescript
if (profileError) {
  console.error('Error fetching profile:', profileError);
  return null;  // <-- Isso faz isAuthenticated = false
}
```

**Correcao**: A funcao ja tem um fallback (linhas 80-87), mas ele so e executado se `profileError` for null. Precisamos garantir que o fallback seja usado mesmo quando ha erro de profile.

---

## Implementacao

### Arquivo 1: `src/components/Layout.tsx`

Alterar linha 17 para adicionar margem esquerda no desktop:

```tsx
<main className="flex-1 flex flex-col overflow-hidden lg:ml-64 pt-14 lg:pt-0">
```

### Arquivo 2: `src/contexts/AuthContext.tsx`

Melhorar a funcao `fetchUserData` para:
1. Nao retornar `null` quando houver erro no profile - usar o fallback
2. Adicionar logs melhores para debug
3. Garantir que o usuario autenticado sempre receba um objeto User valido

**Codigo atual** (linhas 45-92):
```typescript
const fetchUserData = async (supabaseUser: SupabaseUser): Promise<User | null> => {
  try {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', supabaseUser.id)
      .maybeSingle();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return null;  // PROBLEMA: retorna null mesmo com usuario autenticado
    }
    // ...resto do codigo
  }
}
```

**Codigo corrigido**:
```typescript
const fetchUserData = async (supabaseUser: SupabaseUser): Promise<User | null> => {
  try {
    // Fetch profile (may fail on first login before trigger runs)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', supabaseUser.id)
      .maybeSingle();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      // Continue to fallback instead of returning null
    }

    // Fetch role (may not exist yet for new users)
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', supabaseUser.id)
      .maybeSingle();

    if (roleError) {
      console.error('Error fetching role:', roleError);
    }

    // If profile exists, use it
    if (profile) {
      return {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        role: (roleData?.role as UserRole) || 'operator',
        createdAt: profile.created_at,
      };
    }

    // Fallback: create user from Supabase Auth data
    // This ensures login works even if profile trigger hasn't run yet
    return {
      id: supabaseUser.id,
      email: supabaseUser.email || '',
      name: supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || 'User',
      role: (roleData?.role as UserRole) || 'operator',
      createdAt: supabaseUser.created_at || new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error fetching user data:', error);
    
    // Even on error, return a basic user object to prevent auth loop
    return {
      id: supabaseUser.id,
      email: supabaseUser.email || '',
      name: supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || 'User',
      role: 'operator',
      createdAt: supabaseUser.created_at || new Date().toISOString(),
    };
  }
};
```

---

## Resumo das Mudancas

| Arquivo | Alteracao | Motivo |
|---------|-----------|--------|
| `Layout.tsx` | Alterar `lg:ml-0` para `lg:ml-64` | Compensar a largura da sidebar fixa |
| `AuthContext.tsx` | Remover `return null` apos erro de profile | Garantir que usuario autenticado sempre tenha sessao valida |
| `AuthContext.tsx` | Adicionar fallback no catch | Prevenir loop de login mesmo em erros inesperados |

---

## Apos a Implementacao

1. **Testar sidebar**: A sidebar deve ficar sempre visivel com textos e icones no desktop
2. **Testar login no site publicado**: 
   - Fazer login com email/senha
   - Verificar que redireciona para o Dashboard
   - Nao deve pedir login novamente
3. **Republicar o site** para que as mudancas aparecam em `shiftreportapp.lovable.app`
