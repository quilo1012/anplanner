
# Correção: Downtime - Incompatibilidade entre Código e Banco de Dados

## Problema Encontrado

A tabela `structured_downtimes` tem uma constraint que só aceita categorias específicas, mas o código está enviando valores diferentes:

| Banco de Dados (Permitido) | Código (Enviado) | Status |
|---------------------------|------------------|--------|
| `machine` | `maintenance` | Rejeitado |
| `material` | `quality` | Rejeitado |
| `people` | `health_safety` | Rejeitado |
| `process` | `warehouse` | Rejeitado |
| `other` | `staff` | Rejeitado |
| `other` | `other` | Aceito |

### Erro no Log do Banco:
```
"new row for relation 'structured_downtimes' violates check constraint 'structured_downtimes_category_check'"
```

---

## Solução: Atualizar Constraint do Banco

A melhor abordagem é atualizar a constraint do banco para aceitar as categorias definidas no código, pois as categorias do código são mais descritivas e específicas para o contexto industrial.

### Migration SQL Necessária:

```sql
-- Remover constraint antiga
ALTER TABLE structured_downtimes 
DROP CONSTRAINT IF EXISTS structured_downtimes_category_check;

-- Adicionar nova constraint com categorias corretas
ALTER TABLE structured_downtimes 
ADD CONSTRAINT structured_downtimes_category_check 
CHECK (category = ANY (ARRAY[
  'maintenance'::text, 
  'quality'::text, 
  'health_safety'::text, 
  'warehouse'::text, 
  'staff'::text, 
  'other'::text
]));
```

---

## Mudanças Adicionais

### 1. Campo Duration - Formato HH:MM
Já implementado na última mudança. O componente `DurationInput` aceita:
- `"90"` - minutos diretos
- `"1:30"` - formato hora:minutos
- `"1.5"` - formato decimal
- `"1h30m"` - formato explícito

### 2. Verificação Após Correção

Uma vez que a constraint seja atualizada:
- **Dashboard**: Exibirá `totalDowntime` calculado automaticamente
- **Página Downtime**: Listará todos os registros da tabela `structured_downtimes`

---

## Arquivos a Modificar

### 1. Migração SQL (via ferramenta de migração)
- Atualizar constraint `structured_downtimes_category_check`

### 2. Nenhuma mudança de código necessária
- O código TypeScript já usa as categorias corretas
- O `ShiftContext.tsx` já salva corretamente quando a constraint permite

---

## Fluxo Após Correção

```text
1. Usuário adiciona Downtime no Planner
   → Categoria: "maintenance", Reason: "cleaning", Duration: "1:30"

2. Sistema converte duração
   → 90 minutos

3. Ao salvar shift
   → INSERT INTO structured_downtimes (category: "maintenance", reason: "cleaning", duration: 90)
   → Aceito pela nova constraint

4. Dashboard
   → Busca shifts com totalDowntime calculado
   → Exibe: "Total Downtime: 90 min"

5. Página Downtime
   → Lista entrada com categoria "Maintenance Issues", 90 min
```

---

## Benefícios

1. **Downtimes salvos corretamente** - Constraint aceita categorias do código
2. **Visibilidade imediata** - Dashboard e Downtime page mostram dados
3. **Entrada flexível** - Formato HH:MM já implementado
4. **Categorias descritivas** - Nomes mais claros para operadores
