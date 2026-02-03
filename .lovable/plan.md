

# Plano: Dashboard Simplificado + Planner com Target/Produção Unificado

## Resumo das Mudanças

### 1. Dashboard - Remoção de Elementos Não Utilizados
Remover os seguintes componentes do layout "Intouch" que não estão funcionais:

| Componente | Status Atual | Ação |
|------------|--------------|------|
| ActionButtons (Start/End/Suspend/Scrap/Stop) | Apenas mostra "Coming soon" | **REMOVER** |
| WelcomeScreen | Apenas exibe mensagem de boas-vindas | **REMOVER** |
| Trend Alerts (alertas de performance) | Funcional mas opcional | **MANTER** (pode remover se preferir) |
| Charts/Gráficos | Funcionais | **MANTER** (toggle existente) |
| OEE Panel | Funcional | **MANTER** |
| Line Status Cards | Funcional | **MANTER** |

### 2. Planner - Adicionar Campos de Target e Produção Real
Permitir capturar **na mesma tela** os valores de:
- **Production Target** (quantidade esperada)
- **Real Production** (quantidade alcançada)

Atualmente o Planner salva `productionTarget: 0` e `realProduction: 0` fixos.

### 3. Unificar Produção do Shift
Quando salvar múltiplos SKUs para uma linha:
- Atualmente: Cada SKU cria um registro separado na tabela `shifts`
- **Novo comportamento**: Continua salvando separado (cada SKU = 1 registro), mas cada um terá seu próprio Target e Real Production

---

## Estrutura Atual da Tabela `shifts`

A tabela já possui os campos necessários:

```text
shifts
├── id (uuid, PK)
├── date (date)
├── shift_type (text) - 'day' ou 'night'
├── production_line (text)
├── line_leader (text)
├── product_name (text)
├── sku (text)
├── planned_quantity (integer) - TARGET ✓
├── real_production (integer) - PRODUÇÃO REAL ✓
├── performance (numeric) - calculado automaticamente
├── comments (text)
├── staff_planned / staff_actual
└── created_at / updated_at
```

**Não é necessária alteração no banco de dados** - apenas expor os campos no formulário.

---

## Arquivos a Modificar

### 1. Dashboard.tsx
**Remoções:**
- Remover import e uso do `WelcomeScreen`
- Remover import e uso do `ActionButtons`
- Remover os handlers `handleStartJob`, `handleEndJob`, etc.

### 2. SkuRowForm.tsx
**Adições:**
- Adicionar campos `Target` e `Real Production` em cada linha de SKU
- Atualizar interface `SkuRow` para incluir esses campos

### 3. types/planner.ts
**Adições:**
- Atualizar `SkuRow` para incluir:
  - `productionTarget: number`
  - `realProduction: number`

### 4. Planner.tsx
**Alterações:**
- Passar `productionTarget` e `realProduction` de cada SKU ao salvar
- Calcular performance automaticamente: `(real / target) * 100`

---

## Detalhes de Implementação

### Dashboard.tsx - Elementos Removidos

```text
ANTES:
- <WelcomeScreen />
- <ActionButtons ... />
- Handlers: handleStartJob, handleEndJob, handleSuspendJob, etc.

DEPOIS:
- Dashboard inicia direto nos filtros e cards
- Layout mais limpo e focado nos dados
```

### SkuRowForm.tsx - Novo Layout

Cada card de produto terá:

```text
┌─────────────────────────────────────────────────────────┐
│ Product #1                                         [X]  │
├─────────────────────────────────────────────────────────┤
│  SKU *              │  Product Name (auto-filled)       │
│  [_______________]  │  [___________________________]    │
├─────────────────────────────────────────────────────────┤
│  Target             │  Real Production                  │
│  [________] units   │  [__________] units               │
└─────────────────────────────────────────────────────────┘
```

### types/planner.ts - Interface Atualizada

```typescript
export interface SkuRow {
  id: string;
  sku: string;
  product: string;
  productionTarget: number;  // NOVO
  realProduction: number;    // NOVO
}

export const createEmptySkuRow = (): SkuRow => ({
  id: `sku-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  sku: '',
  product: '',
  productionTarget: 0,       // NOVO
  realProduction: 0,         // NOVO
});
```

### Planner.tsx - Salvar com Quantidades

```typescript
// Ao criar ShiftFormData para cada SKU:
const formData: ShiftFormData = {
  // ... outros campos
  productionTarget: row.productionTarget, // Usar valor do formulário
  realProduction: row.realProduction,     // Usar valor do formulário
  // performance é calculado automaticamente no ShiftContext
};
```

---

## Fluxo de Uso Esperado

1. **Supervisor acessa Planner**
2. **Preenche informações do turno** (data, shift, linha, líder)
3. **Adiciona SKUs** com botão "+ Add SKU"
4. **Para cada SKU, preenche:**
   - SKU (obrigatório) - auto-completa Product Name
   - Target (quantidade esperada)
   - Real Production (quantidade produzida)
5. **Salva** - cada SKU vira um registro no banco
6. **Dashboard** exibe os dados com performance calculada

---

## Benefícios

1. **Dashboard mais limpo** - sem botões que não funcionam
2. **Workflow unificado** - planejar e reportar na mesma tela
3. **Performance automática** - calculada ao salvar (real/target × 100)
4. **Sem alteração de banco** - aproveita estrutura existente

