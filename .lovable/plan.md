
# Plano: Corrigir Exibicao de Fotos do Monitoramento

## Problema Identificado

Atraves da analise dos network logs e codigo, identifiquei a causa raiz:

### Upload funciona corretamente
Os logs mostram que as imagens estao sendo salvas com sucesso:
```
monitoring_photo_url: "https://...supabase.co/storage/v1/object/sign/monitoring-photos/...?token=..."
```

### Problema: URLs Assinadas Expiram

1. **No upload**: O sistema salva uma URL assinada com validade de 1 hora no banco de dados
2. **Ao exibir**: O hook `useSignedUrl` verifica se a URL ja tem `token=` e a usa diretamente
3. **Resultado**: Apos 1 hora, a URL expira e a imagem nao carrega mais

**Codigo problematico em `useSignedUrl.ts` (linha 25):**
```tsx
if (path.startsWith('data:') || path.includes('token=')) {
  setSignedUrl(path);  // USA URL EXPIRADA!
  return;
}
```

---

## Solucao

### 1. Armazenar APENAS o Path, nao a URL Assinada

Mudar o `ShiftContext.tsx` para salvar apenas o path do arquivo (ex: `1770299217210-foto.png`) ao inves da URL assinada completa.

**De:**
```tsx
return signedUrlData.signedUrl;  // Salva URL assinada (expira)
```

**Para:**
```tsx
return data.path;  // Salva apenas o path (permanente)
```

### 2. Corrigir o Hook `useSignedUrl`

Atualizar a logica para:
- Extrair o path de URLs assinadas antigas
- Sempre regenerar uma nova signed URL

**Logica corrigida:**
```tsx
// Extrair path de URLs assinadas ou publicas
let storagePath = path;

// Se a URL contem '/monitoring-photos/', extrair o path
if (path.includes('/monitoring-photos/')) {
  const match = path.match(/\/monitoring-photos\/([^?]+)/);
  if (match) {
    storagePath = match[1];
  }
}

// Sempre regenerar signed URL (mesmo se tinha token=)
const { data, error } = await supabase.storage
  .from('monitoring-photos')
  .createSignedUrl(storagePath, 3600);
```

---

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/contexts/ShiftContext.tsx` | Salvar apenas `data.path` ao inves de `signedUrl` |
| `src/hooks/useSignedUrl.ts` | Corrigir extracao de path e sempre regenerar URL |

---

## Detalhes Tecnicos

### ShiftContext.tsx - Salvar Path ao inves de URL

**Linha 200-211, mudar de:**
```tsx
// Create signed URL (valid for 1 hour)
const { data: signedUrlData, error: urlError } = await supabase.storage
  .from('monitoring-photos')
  .createSignedUrl(data.path, 3600);

if (urlError || !signedUrlData) {
  return data.path;
}

return signedUrlData.signedUrl;
```

**Para:**
```tsx
// Return just the path - signed URL will be generated when displaying
return data.path;
```

### useSignedUrl.ts - Corrigir Logica de Extracao

**Substituir linhas 18-67 com:**
```tsx
useEffect(() => {
  if (!path) {
    setSignedUrl(null);
    return;
  }

  // For base64 data URLs, use directly (not uploaded yet)
  if (path.startsWith('data:')) {
    setSignedUrl(path);
    return;
  }

  // Extract the file path from any URL format
  let storagePath = path;
  
  // Handle signed URLs: extract path before ?token=
  if (path.includes('/monitoring-photos/')) {
    const match = path.match(/\/monitoring-photos\/([^?]+)/);
    if (match) {
      storagePath = match[1];
    }
  }
  
  // If it's already just a filename/path (no http), use it
  if (!storagePath.startsWith('http')) {
    // storagePath is ready
  }

  const fetchSignedUrl = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: urlError } = await supabase.storage
        .from('monitoring-photos')
        .createSignedUrl(storagePath, expiresIn);

      if (urlError) {
        console.error('Error creating signed URL:', urlError);
        setError(urlError.message);
        setSignedUrl(null);
      } else if (data) {
        setSignedUrl(data.signedUrl);
      }
    } catch (err) {
      console.error('Error fetching signed URL:', err);
      setError(err instanceof Error ? err.message : 'Failed to get signed URL');
      setSignedUrl(null);
    } finally {
      setIsLoading(false);
    }
  };

  fetchSignedUrl();
}, [path, expiresIn]);
```

---

## Dados Existentes

As URLs assinadas antigas ja salvas no banco continuarao funcionando porque a nova logica extrai o path de qualquer formato:

| Formato no Banco | Path Extraido |
|------------------|---------------|
| `1770299217210-foto.png` | `1770299217210-foto.png` |
| `https://.../monitoring-photos/1770299217210-foto.png?token=...` | `1770299217210-foto.png` |

---

## Resultado Esperado

1. **Novos uploads**: Salvam apenas o path (ex: `1770299217210-foto.png`)
2. **Exibicao**: Sempre regenera uma nova signed URL valida por 1 hora
3. **Dados antigos**: Continuam funcionando com a extracao automatica do path
4. **Performance**: Signed URLs sao cacheadas no estado do componente durante a sessao
