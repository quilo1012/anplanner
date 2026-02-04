
# Plano: Corrigir Menu Mobile Coberto pelo Header

## Problema Identificado

No mobile, quando o usuario abre o menu (tres linhas), o Header da pagina (com relogio, titulo "New Shift Report", etc.) fica NA FRENTE do menu, cobrindo os itens de navegacao como o Dashboard.

### Causa Raiz - Conflito de Z-Index

| Componente | z-index | Arquivo |
|------------|---------|---------|
| Mobile Header (barra superior) | z-40 | MobileMenu.tsx linha 32 |
| Menu Overlay (fundo + nav) | z-30 | MobileMenu.tsx linha 49 |
| Header da pagina (relogio) | z-40 | Header.tsx linha 12 |

O problema: O Menu Overlay tem `z-30`, mas o Header das paginas tem `z-40`. Como o Header e `sticky top-0`, ele fica posicionado acima do overlay do menu, cobrindo os itens de navegacao.

---

## Solucao

Aumentar o z-index do Menu Overlay para ficar ACIMA do Header das paginas.

### Arquivo a Modificar: `src/components/MobileMenu.tsx`

**Alteracao na linha 49:**

```tsx
// Antes:
<div className="lg:hidden fixed inset-0 z-30 pt-14">

// Depois:
<div className="lg:hidden fixed inset-0 z-50 pt-14">
```

### Explicacao

- Mudando de `z-30` para `z-50`, o overlay do menu ficara ACIMA de:
  - Mobile Header (`z-40`) - que e correto, pois o botao X precisa funcionar
  - Page Header (`z-40`) - que e o que estava causando o problema

### Hierarquia de Z-Index Corrigida

| Componente | z-index | Comportamento |
|------------|---------|---------------|
| Menu Overlay + Backdrop | z-50 | Camada mais alta quando menu esta aberto |
| Mobile Header | z-40 | Sempre visivel no topo |
| Page Header | z-40 | Sticky dentro do conteudo, coberto pelo menu |

---

## Arquivo

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `src/components/MobileMenu.tsx` | Modificar | Alterar z-30 para z-50 na linha 49 |

---

## Resultado Esperado

Apos a correcao:
1. Ao abrir o menu mobile (tres linhas), o menu aparecera corretamente
2. Todos os itens de navegacao (Dashboard, Planner, Downtime, History, Admin) serao visiveis
3. O Header da pagina (com relogio) ficara ATRAS do menu overlay
4. O botao X para fechar o menu continuara funcionando normalmente
