
# Plano: Corrigir Upload de Foto e Otimizar Layout

## Problema 1: Imagem do Monitoramento Nao Esta Sendo Salva

### Causa Raiz
O erro encontrado nos network logs mostra:
```
Status: 400 (Bad Request)
Error: InvalidKey: Invalid key: 1770298537266-Captura de Tela 2026-02-02 às 21.28.56.png
```

O Supabase Storage NAO aceita caracteres especiais no nome do arquivo:
- Espacos
- Acentos (a, e, i, o, u)
- Caracteres especiais

### Solucao
Sanitizar o nome do arquivo antes do upload no `ShiftContext.tsx`:

```tsx
// Funcao para sanitizar nome de arquivo
function sanitizeFilename(filename: string): string {
  return filename
    .normalize('NFD')                    // Decompose acentos
    .replace(/[\u0300-\u036f]/g, '')     // Remove diacriticos
    .replace(/[^a-zA-Z0-9._-]/g, '_')    // Substitui caracteres especiais por _
    .replace(/_+/g, '_')                 // Remove underscores duplicados
    .toLowerCase();
}

// Uso na funcao uploadPhoto:
const safeName = sanitizeFilename(filename);
const filePath = `${Date.now()}-${safeName}`;
```

### Arquivo a Modificar
| Arquivo | Alteracao |
|---------|-----------|
| `src/contexts/ShiftContext.tsx` | Adicionar sanitizacao do filename nas linhas 152-194 |

---

## Problema 2: Sidebar Grande, Conteudo Usando Metade do Espaco

### Causa Raiz
Apos analise do layout:

1. **Sidebar** (`w-64` = 256px) - tamanho adequado
2. **Main content** - tem `flex-1` mas padding excessivo (`p-4 sm:p-8`)
3. **History page** - tabela com colunas fixas que nao expandem

O problema real e que o conteudo tem muito padding e a tabela nao aproveita a largura total.

### Solucao

#### Opcao A: Reduzir Sidebar (de 256px para 200-220px)
```tsx
// Sidebar.tsx
<aside className="w-52 ..." >  // 208px ao inves de 256px

// Layout.tsx  
<main className="... lg:ml-52 ...">
```

#### Opcao B: Otimizar Area de Conteudo (Recomendada)
1. Reduzir padding das paginas
2. Fazer tabela usar 100% da largura
3. Permitir scroll horizontal apenas quando necessario

```tsx
// History.tsx
<div className="flex-1 overflow-auto p-3 sm:p-4">  // era p-4 sm:p-8

// Tabela: usar layout fixo para melhor controle
<table className="table w-full table-fixed">
```

### Arquivos a Modificar
| Arquivo | Alteracao |
|---------|-----------|
| `src/components/Sidebar.tsx` | Reduzir largura para `w-52` (208px) |
| `src/components/Layout.tsx` | Atualizar margem para `lg:ml-52` |
| `src/pages/History.tsx` | Reduzir padding para `p-3 sm:p-4` |

---

## Resumo das Alteracoes

### 1. ShiftContext.tsx - Sanitizar Filename

**Antes (linha 164):**
```tsx
const filePath = `${Date.now()}-${filename}`;
```

**Depois:**
```tsx
// Adicionar funcao sanitizadora
function sanitizeFilename(filename: string): string {
  return filename
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .toLowerCase();
}

// Na funcao uploadPhoto:
const safeName = sanitizeFilename(filename);
const filePath = `${Date.now()}-${safeName}`;
```

### 2. Sidebar.tsx - Reduzir Largura

**Antes (linha 19):**
```tsx
<aside className="w-64 min-h-screen ...">
```

**Depois:**
```tsx
<aside className="w-52 min-h-screen ...">
```

### 3. Layout.tsx - Atualizar Margem

**Antes (linha 17):**
```tsx
<main className="flex-1 flex flex-col overflow-hidden lg:ml-64 pt-14 lg:pt-0">
```

**Depois:**
```tsx
<main className="flex-1 flex flex-col overflow-hidden lg:ml-52 pt-14 lg:pt-0">
```

### 4. History.tsx - Reduzir Padding

**Antes (linha 136):**
```tsx
<div className="flex-1 overflow-auto p-4 sm:p-8">
```

**Depois:**
```tsx
<div className="flex-1 overflow-auto p-3 sm:p-4">
```

---

## Resultado Esperado

1. **Upload de foto funcionando**: Nomes de arquivo serao sanitizados automaticamente, removendo espacos e acentos antes do upload

2. **Melhor uso do espaco**:
   - Sidebar: 208px (era 256px) = economia de 48px
   - Padding reduzido: economia de 16-32px por lado
   - Total: aproximadamente 100px extras de largura utilizavel

3. **Tabela mais visivel**: Mais colunas visiveis sem scroll horizontal

---

## Detalhes Tecnicos

### Funcao sanitizeFilename Completa

```tsx
/**
 * Sanitiza o nome do arquivo para ser compativel com Supabase Storage.
 * Remove acentos, espacos e caracteres especiais.
 */
function sanitizeFilename(filename: string): string {
  // Separa extensao do nome
  const lastDot = filename.lastIndexOf('.');
  const name = lastDot > 0 ? filename.slice(0, lastDot) : filename;
  const ext = lastDot > 0 ? filename.slice(lastDot) : '';
  
  // Sanitiza o nome
  const safeName = name
    .normalize('NFD')                    // Decomponhe acentos (e.g., 'é' -> 'e' + marca)
    .replace(/[\u0300-\u036f]/g, '')     // Remove marcas diacriticas
    .replace(/[^a-zA-Z0-9._-]/g, '_')    // Substitui caracteres invalidos
    .replace(/_+/g, '_')                 // Remove underscores consecutivos
    .replace(/^_|_$/g, '')               // Remove underscores no inicio/fim
    .toLowerCase()
    .slice(0, 100);                      // Limita tamanho
  
  return safeName + ext.toLowerCase();
}
```

### Teste de Sanitizacao

| Input | Output |
|-------|--------|
| `Captura de Tela 2026.png` | `captura_de_tela_2026.png` |
| `Foto área produção.jpg` | `foto_area_producao.jpg` |
| `test file (1).PNG` | `test_file_1.png` |
