

# Plano: Melhorar Performance by SKU

## Problema Identificado

Os SKUs estão armazenados com formato complexo:
```
BEEFXPBLUERAS;BEEF-XP 1.8KG BLUE RASPBERRY     [HS CODE:2106102090];;
```

Isso torna o gráfico ilegível e confuso.

---

## Solução Proposta

### 1. Criar função de limpeza de SKU

Extrair apenas o **código limpo** (primeira parte antes do `;`):

```
Antes: BEEFXPBLUERAS;BEEF-XP 1.8KG BLUE RASPBERRY     [HS CODE:2106102090];;
Depois: BEEFXPBLUERAS
```

### 2. Melhorar visualização do gráfico

| Melhoria | Descrição |
|----------|-----------|
| SKU limpo | Mostrar apenas o código (ex: `CW2S`) |
| Tooltip melhorado | Mostrar nome do produto no hover |
| Ordenação | Top 10 por produção total |
| Labels | Formatar valores com separador de milhares |

---

## Layout Visual

### Antes (Atual)
```
┌──────────────────────────────────────────────────────────────────────┐
│  Performance by SKU                                                  │
├──────────────────────────────────────────────────────────────────────┤
│  BEEFXPBLUERAS;BEEF-XP 1.8K...  ████████████████  15,000            │
│  CMS6;CRITICAL MASS 6KG  ST...  █████████████     12,000            │
│  CW2S;CRITICAL WHEY 2KG ST...   ██████████        10,000            │
└──────────────────────────────────────────────────────────────────────┘
```

### Depois (Proposto)
```
┌──────────────────────────────────────────────────────────────────────┐
│  Production by SKU (Top 10)                                          │
├──────────────────────────────────────────────────────────────────────┤
│  BEEFXPBLUERAS  ████████████████████  15,000 units                  │
│  CMS6           █████████████████     12,000 units                  │
│  CW2S           ██████████████        10,000 units                  │
│  CW2V           ████████████          8,500 units                   │
│  ...                                                                 │
├──────────────────────────────────────────────────────────────────────┤
│  [Tooltip: CW2S - CRITICAL WHEY 2KG STRAWBERRY | 10,000 units]      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Mudanças Técnicas

### Função de Extração de SKU

```typescript
const cleanSkuData = (rawSku: string): { code: string; name: string } => {
  if (!rawSku) return { code: '-', name: '' };
  
  // Format: "CODE;DESCRIPTION     [HS CODE:XXXXX];;"
  const parts = rawSku.split(';');
  const code = parts[0]?.trim() || rawSku;
  
  // Extract name without HS CODE
  let name = parts[1] || '';
  name = name.replace(/\s*\[HS CODE:[^\]]+\]/gi, '').trim();
  
  return { code, name };
};
```

### Dados do Gráfico Melhorados

```typescript
const chartData = useMemo(() => {
  const bySku: Record<string, { code: string; name: string; total: number }> = {};
  
  shifts.forEach(s => {
    if (s.sku) {
      const { code, name } = cleanSkuData(s.sku);
      if (!bySku[code]) {
        bySku[code] = { code, name, total: 0 };
      }
      bySku[code].total += s.realProduction;
    }
  });

  return Object.values(bySku)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);
}, [shifts]);
```

### Tooltip Personalizado

```typescript
<Tooltip 
  content={({ payload }) => {
    if (!payload?.[0]) return null;
    const data = payload[0].payload;
    return (
      <div className="bg-card border border-border rounded-lg p-2 shadow-lg">
        <p className="font-semibold text-sm">{data.code}</p>
        {data.name && <p className="text-xs text-muted-foreground">{data.name}</p>}
        <p className="text-sm mt-1">{data.total.toLocaleString()} units</p>
      </div>
    );
  }}
/>
```

---

## Arquivo a Modificar

| Arquivo | Mudanças |
|---------|----------|
| `src/components/charts/PerformanceBySKU.tsx` | Limpeza de SKU, tooltip melhorado |

---

## Sugestões Adicionais de Melhoria

### Curto Prazo (Incluído neste plano)

1. **SKU limpo** - Extrair só o código
2. **Tooltip informativo** - Mostrar nome do produto
3. **Labels formatados** - Separador de milhares
4. **Título atualizado** - "Production by SKU (Top 10)"

### Médio Prazo (Futuras melhorias)

| Melhoria | Benefício |
|----------|-----------|
| **Filtro de período** | Ver produção por SKU da semana/mês |
| **Drill-down** | Clicar no SKU e ver detalhes por dia |
| **Performance %** | Mostrar % real vs target por SKU |
| **Cores por status** | Verde se atingiu meta, vermelho se não |
| **Comparativo** | Comparar SKU atual vs período anterior |

### Longo Prazo

| Feature | Descrição |
|---------|-----------|
| **SKU Trends** | Gráfico de linha mostrando evolução de produção por SKU |
| **SKU Efficiency** | UPM médio por SKU (quais são mais rápidos de produzir) |
| **Pareto Analysis** | 80/20 - quais SKUs representam 80% da produção |
| **SKU Downtime** | Tempo de downtime associado a cada SKU |

---

## Benefícios Imediatos

1. **Legibilidade** - SKUs curtos e claros no gráfico
2. **Contexto** - Nome do produto visível no tooltip
3. **Foco** - Top 10 mais produzidos em destaque
4. **Profissional** - Valores formatados corretamente

