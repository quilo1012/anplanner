
# Plano: Correcao de Erros no History + Performance + Layout

## Problemas Identificados

### 1. Editar/Deletar no History Nao Funciona
**Causa**: As politicas RLS do banco de dados estao mais restritivas que a interface:
- DELETE shifts: Somente ADMIN pode deletar
- DELETE downtimes: Somente ADMIN pode deletar
- A interface mostra botoes de delete para SUPERVISOR, mas o banco rejeita silenciosamente

**Solucao**: Atualizar as politicas RLS para permitir que SUPERVISORS tambem possam deletar registros

### 2. Carregamento Lento dos SKUs no Planner
**Causa**: O componente `ProductSearch` faz uma busca no banco a cada 300ms enquanto o usuario digita (debounce de 300ms linha 98). Para muitos produtos, isso pode ser lento.

**Solucao**: 
- Aumentar o debounce para 500ms
- Limitar os resultados iniciais
- Adicionar cache local dos produtos

### 3. Espaco em Branco Nao Utilizado
**Causa**: O layout usa `max-w-4xl` no Planner e margens conservadoras em todas as paginas, deixando muito espaco vazio em telas grandes.

**Solucao**:
- Aumentar `max-w-4xl` para `max-w-6xl` ou `max-w-7xl` no Planner
- Ajustar paddings e margens para melhor aproveitamento
- Expandir os cards no Dashboard para usar mais espaco horizontal

---

## Implementacao

### Parte 1: Corrigir RLS para DELETE (Banco de Dados)

Criar nova migration SQL para adicionar politicas de DELETE para supervisors:

```sql
-- Atualizar politica de delete em shifts para incluir supervisors
DROP POLICY IF EXISTS "Admins can delete shifts" ON public.shifts;
CREATE POLICY "Supervisors and admins can delete shifts"
  ON public.shifts FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role));

-- Atualizar politica de delete em structured_downtimes para incluir supervisors
DROP POLICY IF EXISTS "Admins can delete downtimes" ON public.structured_downtimes;
CREATE POLICY "Supervisors and admins can delete downtimes"
  ON public.structured_downtimes FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'supervisor'::app_role));
```

### Parte 2: Melhorar Performance do ProductSearch

**Arquivo**: `src/components/ProductSearch.tsx`

Alteracoes:
- Aumentar debounce de 300ms para 500ms (linha 98)
- Adicionar "Loading..." visual enquanto carrega
- Melhorar a query para usar index (product_code primeiro)

### Parte 3: Expandir Layout Para Usar Mais Espaco

**Arquivo**: `src/pages/Planner.tsx`
- Alterar `max-w-4xl` para `max-w-6xl` (linha 109)

**Arquivo**: `src/pages/Dashboard.tsx`
- Ajustar padding de `p-3 sm:p-5` para `p-4 sm:p-6` (linha 178)
- Aumentar o panel OEE de `w-52` para `w-64` (linha 309)

**Arquivo**: `src/pages/History.tsx`
- Aumentar padding de `p-4 sm:p-6` para `p-4 sm:p-8` (linha 136)

**Arquivo**: `src/components/Header.tsx`
- Ajustar padding para melhor aproveitamento

---

## Arquivos a Modificar

| Arquivo | Tipo | Descricao |
|---------|------|-----------|
| Migration SQL | Database | Atualizar RLS para permitir DELETE por supervisors |
| `src/components/ProductSearch.tsx` | Codigo | Aumentar debounce, melhorar performance |
| `src/pages/Planner.tsx` | Codigo | Expandir max-width para usar mais espaco |
| `src/pages/Dashboard.tsx` | Codigo | Ajustar layout para mais espaco |
| `src/pages/History.tsx` | Codigo | Ajustar padding |

---

## Resultado Esperado

1. **Edit/Delete no History**: Supervisores e Admins poderao editar e deletar registros sem erros

2. **Performance do SKU Search**: 
   - Busca mais responsiva com debounce maior
   - Menos requisicoes ao banco

3. **Layout Expandido**:
   - Formularios do Planner usarao mais espaco horizontal
   - Dashboard aproveitara melhor a tela
   - Menos espacos em branco nao utilizados

---

## Hierarquia de Permissoes Corrigida

| Acao | Operator | Supervisor | Admin |
|------|----------|------------|-------|
| Ver shifts | Sim | Sim | Sim |
| Criar shift | Nao | Sim | Sim |
| Editar shift | Nao | Sim | Sim |
| Deletar shift | Nao | Sim | Sim |
| Ver downtimes | Sim | Sim | Sim |
| Criar downtime | Sim | Sim | Sim |
| Editar downtime | Nao | Sim | Sim |
| Deletar downtime | Nao | Sim | Sim |
