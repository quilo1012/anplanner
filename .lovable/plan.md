# Fix: Date Filtering Defaults, Downtime Charts, and Print Layout with Logo

## 1. Default date filter to today's date (Downtime + History)

**Problem:** Both the Downtime and History pages initialize date filters as empty strings, which means ALL historical data is shown by default. The user wants the current date as the default, and when filters are cleared, the page should show empty/no results.

**Changes:**

### **1️⃣ Logo Principal**

- Substituir o logo atual pelo **logo oficial da empresa**.
- Versões necessárias:
  - **Login:** grande, centralizado, ~120px de altura, estilo industrial moderno.
  - **Sidebar / Header:** versão menor, ~32px, legível mesmo em tamanhos reduzidos.
- O logo deve transmitir **profissionalismo, confiabilidade e identidade industrial**.
- Atualizar título da página no navegador para o nome da empresa.

---

### **2️⃣ Ícones do Site**

- Criar pacote de ícones consistente e padronizado para:
  - **Menu / Sidebar:** Dashboard, Work Orders, Usuários, Estoque, Relatórios, Configurações.
  - **Botões e Ações:** Start, Stop, Editar, Deletar, Imprimir, Salvar.
  - **Notificações:** Som, alerta de WO aberta, mensagens, badge de contagem.
- Estilo sugerido: industrial, limpo, moderno, visual coerente com o logo.
- Todos os ícones devem ter **mesma paleta de cores, traços e proporções**.
- Garantir que os ícones funcionem em **tema claro e escuro** (se houver).Downtime page (`src/pages/Downtime.tsx`)

- Initialize `filterFromDate` and `filterToDate` with today's date (`new Date().toISOString().split('T')[0]`)
- When "Clear filters" is clicked, set dates back to empty strings (which will show no data since no entries match an empty date range)

### History page (`src/pages/History.tsx`)

- Initialize `filterFromDate` and `filterToDate` with today's date
- Same clear behavior -- clearing filters sets dates to empty, showing no data

## 2. Add downtime charts to the Downtime page

**Problem:** The Downtime page only shows a table. The user wants charts (by category breakdown) displayed alongside the downtime data.

**Changes in `src/pages/Downtime.tsx`:**

- Import `DowntimeByCategory` and `DowntimeByReason` chart components (already exist)
- Add a charts section between the summary cards and the table
- Filter the sessions to pass to the chart components based on current filter state
- Show a horizontal bar chart of downtime by category and a breakdown by reason

## 3. Add Applied Nutrition logo to print report

**Problem:** The print report (`PrintReport.tsx`) has no logo, just text. The user wants the Applied Nutrition logo included.

**Changes in `src/components/PrintReport.tsx`:**

- Import the uploaded logo image (`user-uploads://Applied_Logo_mono.jpg` will be copied to `src/assets/applied-logo-mono.jpg`)
- Add the logo to the report header area, displayed alongside the report title
- Style for proper print sizing (approximately 120px width)
- Ensure the logo prints correctly with `print-color-adjust: exact`

## Technical Details

### Files to modify:

1. `**src/pages/Downtime.tsx**`
  - Lines 33-34: Change initial state from `''` to `new Date().toISOString().split('T')[0]`
  - Add chart imports (DowntimeByCategory, DowntimeByReason)
  - Add a `filteredSessions` memo that filters sessions by the same criteria, to pass to chart components
  - Insert chart section (two cards side by side) between summary cards and filter section
2. `**src/pages/History.tsx**`
  - Lines 20-21: Change initial state from `''` to `new Date().toISOString().split('T')[0]`
3. `**src/components/PrintReport.tsx**`
  - Copy uploaded logo to `src/assets/applied-logo-mono.jpg`
  - Import logo and add it to the header div (left-aligned, with title to the right)
  - Adjust header layout to flex row with logo + text

### New file:

- `src/assets/applied-logo-mono.jpg` (copied from user upload)