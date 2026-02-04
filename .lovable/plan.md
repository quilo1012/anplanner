
# Plano: Dashboard Industrial Profissional com Relogio e Correcao da Sidebar

## Problemas Identificados

### 1. Sidebar no Modo Light (Daylight)
O conteudo principal do app usa `lg:ml-0` no `Layout.tsx`, mas a Sidebar e `fixed` com `w-64`. Isso significa que no desktop, o conteudo principal fica **embaixo** da sidebar fixa, nao ao lado dela. Por isso voce so ve a sidebar quando passa o mouse - o conteudo esta cobrindo ela!

**Correcao**: Alterar `lg:ml-0` para `lg:ml-64` no Layout.tsx

### 2. Dashboard - Design Industrial
O Header atual e muito simples. Vou criar um design mais profissional estilo "SCADA/HMI industrial" com:
- Barra de status superior mais elaborada
- Relogio digital ao vivo com segundos
- Indicadores de status do sistema
- Gradientes e cores industriais

---

## Implementacao

### Arquivo 1: `src/components/Layout.tsx`

**Alterar linha 17**: Adicionar margem esquerda para compensar a sidebar fixa

```tsx
// Antes:
<main className="flex-1 flex flex-col overflow-hidden lg:ml-0 pt-14 lg:pt-0">

// Depois:
<main className="flex-1 flex flex-col overflow-hidden lg:ml-64 pt-14 lg:pt-0">
```

### Arquivo 2: `src/components/Header.tsx`

Reescrever completamente o Header com design industrial profissional:

```text
Estrutura do novo Header:

+------------------------------------------------------------------+
|  [Logo]  |  PRODUCTION DASHBOARD    |  [Data] [Relogio Vivo]    |
|          |  DAY Shift               |   04 Feb 2026  14:35:22   |
+------------------------------------------------------------------+
|  [Indicador Status: SYSTEM ONLINE]  |  [Dark/Light Toggle]      |
+------------------------------------------------------------------+
```

**Novos recursos**:
- Relogio digital ao vivo com atualizacao a cada segundo
- Data formatada em ingles (04 Feb 2026)
- Borda esquerda colorida (industrial cyan)
- Indicador de status do sistema
- Layout em duas linhas para melhor hierarquia visual
- Fonte monospacada para numeros (estilo industrial)

### Arquivo 3: Componente `LiveClock.tsx` (Novo)

Criar componente de relogio ao vivo reutilizavel:

```tsx
// Funcionalidades:
- useState para armazenar a hora atual
- useEffect com setInterval para atualizar a cada 1000ms
- Cleanup do interval no unmount
- Formato 24h: HH:MM:SS
- Estilo tabular-nums para alinhamento perfeito
```

---

## Detalhes do Design Industrial

### Paleta de Cores
- Fundo do header: `bg-card` com gradiente sutil
- Borda esquerda: `border-l-4 border-primary` (azul industrial)
- Texto principal: `text-foreground`
- Texto secundario: `text-muted-foreground`
- Relogio: `text-primary` com fonte monospacada

### Tipografia
- Titulo: `text-xl font-bold uppercase tracking-wide`
- Subtitulo: `text-sm text-muted-foreground`
- Relogio: `font-mono text-2xl font-bold tabular-nums`
- Data: `text-sm font-medium`

### Elementos Visuais
- Shadow mais pronunciado: `shadow-lg`
- Borda inferior: `border-b-2 border-primary/20`
- Icone de status pulsante
- Separadores verticais entre secoes

---

## Arquivos a Criar/Modificar

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `src/components/Layout.tsx` | Modificar | Ajustar margem lg:ml-64 |
| `src/components/LiveClock.tsx` | Criar | Componente de relogio ao vivo |
| `src/components/Header.tsx` | Modificar | Redesign industrial completo |

---

## Resultado Esperado

Apos a implementacao:

1. **Sidebar**: Sempre visivel no desktop (light e dark mode), com texto e icones aparecendo permanentemente

2. **Header Industrial**:
   - Logo Applied Nutrition a esquerda
   - Titulo "PRODUCTION DASHBOARD" centralizado
   - Relogio digital ao vivo (ex: 14:35:22) a direita
   - Data atual (ex: 04 Feb 2026) ao lado do relogio
   - Toggle de tema (dark/light)
   - Visual industrial com cores e fontes apropriadas

3. **Responsividade**:
   - Mobile: Header compacto com relogio menor
   - Desktop: Header completo com todos os elementos
