

# Correção do Login: Redirecionamento Automático + Race Condition

## Problemas Identificados

### 1. Ausência de Redirecionamento Automático
Quando um usuário já autenticado acessa `/login`, ele vê o formulário ao invés de ser redirecionado automaticamente para o Dashboard.

### 2. Race Condition no AuthContext
O `onAuthStateChange` e `initializeAuth` podem conflitar, causando:
- Requisições duplicadas ao banco
- Estados inconsistentes durante a inicialização
- Erros "AbortError: The operation was aborted"

### 3. Falta de Fallback no fetchUserData
Se a tabela `profiles` não retornar dados (por timing ou erro), o usuário fica em estado de loading infinito.

---

## Arquivos a Modificar

### 1. Login.tsx
**Mudanças:**
- Adicionar `useEffect` para verificar se já está autenticado
- Extrair `isAuthenticated` do hook `useAuth()`
- Redirecionar automaticamente para `/` se autenticado

### 2. AuthContext.tsx
**Mudanças:**
- Adicionar `useRef` para controlar se inicialização está em andamento
- Bloquear `onAuthStateChange` durante a inicialização
- Adicionar fallback quando profile não existe (criar User com dados do auth.users)
- Garantir que `isLoading` sempre seja `false` após qualquer erro

---

## Detalhes Técnicos

### Login.tsx - Alterações

```typescript
// Linha 1: Adicionar useEffect ao import
import { useState, useEffect } from 'react';

// Linha 8: Extrair isAuthenticated
const { login, signup, isLoading: authLoading, isAuthenticated } = useAuth();

// Após linha 8: Adicionar useEffect para redirecionamento
useEffect(() => {
  if (!authLoading && isAuthenticated) {
    navigate('/', { replace: true });
  }
}, [authLoading, isAuthenticated, navigate]);
```

### AuthContext.tsx - Alterações

```typescript
// Linha 1: Adicionar useRef ao import
import { createContext, useContext, ReactNode, useState, useEffect, useRef } from 'react';

// Após linha 41: Adicionar ref de controle
const isInitializing = useRef(true);

// No useEffect, modificar lógica:
// 1. Marcar isInitializing.current = false após inicialização
// 2. No onAuthStateChange, verificar if (isInitializing.current) return;

// No fetchUserData, adicionar fallback:
if (!profile) {
  // Criar usuário com dados básicos do Supabase Auth
  return {
    id: supabaseUser.id,
    email: supabaseUser.email || '',
    name: supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || 'User',
    role: 'operator' as UserRole,
    createdAt: supabaseUser.created_at || new Date().toISOString(),
  };
}
```

---

## Fluxo Corrigido

### Cenário 1: Usuário não logado acessa /login
1. AuthContext carrega, `isLoading = true`
2. `getSession()` retorna null
3. `isLoading = false`, `user = null`
4. Login.tsx renderiza formulário

### Cenário 2: Usuário logado acessa /login
1. AuthContext carrega, `isLoading = true`
2. `getSession()` retorna sessão válida
3. `fetchUserData()` busca profile
4. `isLoading = false`, `user = {...}`
5. **NOVO:** useEffect em Login.tsx detecta `isAuthenticated = true`
6. **NOVO:** Redireciona para `/` automaticamente

### Cenário 3: Usuário faz login no formulário
1. `handleSubmit()` chama `login()`
2. Supabase autentica com sucesso
3. `fetchUserData()` busca profile
4. Se profile não existe → **NOVO:** usa fallback com dados do auth.users
5. `setUser()` atualiza estado
6. `navigate('/')` redireciona

---

## Benefícios

1. **Sem flash da página de login** - Redirecionamento antes de renderizar formulário
2. **Sem race conditions** - Controle explícito via useRef
3. **Resiliência** - Fallback garante login mesmo sem profile completo
4. **Debug facilitado** - Logs claros de erro

