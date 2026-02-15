

# Import iTouching Downtime no Modulo Downtime

## Objetivo

Adicionar um botao "Import iTouching" na pagina Downtime que permite importar apenas os dados de downtime de um relatorio iTouching (.xlsx) e associa-los automaticamente as sessoes de producao existentes (linhas ativas do turno).

---

## O que muda

### 1. Novo componente: `src/components/DowntimeImport.tsx`

Componente modal dedicado para importar downtimes, diferente do IntouchImport existente (que importa producao + downtimes juntos). Este foca exclusivamente em downtimes:

- Upload de arquivo .xlsx
- Parser reutiliza a logica existente de detecao de colunas de downtime (Category, Reason, Duration, Comment) e separadores "Machine:"
- Preview mostra downtimes agrupados por linha com contagens e validacao
- Selecao de Data e Turno para localizar as sessoes existentes
- O sistema cruza cada linha do arquivo com sessoes existentes (mesma linha + data + turno)
- Se nao encontrar sessao existente para uma linha, mostra alerta amarelo
- Ao confirmar, salva os downtimes nas sessoes correspondentes via `saveDowntimesBatch`
- Mostra resumo final: X downtimes importados, Y linhas atualizadas

### 2. Modificar: `src/pages/Downtime.tsx`

- Importar o novo componente `DowntimeImport`
- Adicionar estado `showImport` para controlar o modal
- Adicionar botao "Import iTouching" ao lado do botao Export, visivel apenas para supervisores e admins
- Icone: `FileSpreadsheet` (consistente com o importador existente)
- Ao fechar o modal apos importacao bem-sucedida, os dados ja aparecem na tabela (via `refreshSessions` chamado internamente)

---

## Fluxo do Usuario

```text
1. Shift termina
2. Usuario vai a pagina Downtime
3. Clica "Import iTouching"
4. Seleciona data, turno e arquivo .xlsx
5. Sistema parseia e mostra preview dos downtimes por linha
6. Sistema indica quais linhas tem sessao existente (verde) e quais nao (amarelo)
7. Usuario confirma
8. Downtimes sao salvos nas sessoes correspondentes
9. Dashboard e metricas atualizam automaticamente
```

---

## Detalhes Tecnicos

### Parser de Downtimes

Reutiliza a mesma logica do `IntouchImport.tsx`:
- Procura aba "downtime" ou "parad" ou segunda aba do workbook
- Detecta colunas via `DOWNTIME_HEADER_MAP` (category, reason, duration, comment)
- Agrupa por linha usando separadores "Machine:"
- Normaliza nomes de linha com `normalizeLineName`

### Associacao com Sessoes

- Busca sessoes existentes filtrando por `date` + `shift` + `production_line`
- Para cada linha do arquivo com downtimes validos, encontra a sessao correspondente
- Chama `saveDowntimesBatch(sessionId, downtimes)` para cada sessao
- Se a sessao ja tem downtimes, os novos sao adicionados (merge)

### Verificacao de Duplicidade

Antes de salvar, compara downtimes existentes na sessao com os novos (mesma category + reason + duration) para evitar duplicatas.

---

## Arquivos a Criar (1)

| Arquivo | Descricao |
|---------|-----------|
| `src/components/DowntimeImport.tsx` | Modal de importacao de downtimes do iTouching |

## Arquivos a Modificar (1)

| Arquivo | Mudanca |
|---------|---------|
| `src/pages/Downtime.tsx` | Botao "Import iTouching" + estado do modal |

