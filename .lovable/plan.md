

# Fix: Translate Portuguese to English + Admin Page Full-Width Layout

## 1. Translate Portuguese text to English

All Portuguese text is in `src/pages/Admin.tsx` within the Role Permissions section (lines 292-316). Changes:

**Leader role (lines 292-296):**
- "Lider" -> "Leader"
- "Acesso somente ao Dashboard" -> "Dashboard access only"
- "Visualiza apenas dados/turnos vinculados ao proprio nome" -> "Can only view data/shifts linked to their own name"

**Supervisor role (lines 299-307):**
- "Acesso completo ao sistema" -> "Full system access"
- "Criar, revisar e concluir turnos" -> "Create, review, and complete shifts"
- "Adicionar resultados de producao" -> "Add production results"
- "Upload de fotos de monitoramento" -> "Upload monitoring photos"
- "Editar e excluir turnos" -> "Edit and delete shifts"
- "Visualizar historico e dashboards" -> "View history and dashboards"

**Manager role (lines 310-316):**
- "Todos os acessos do Supervisor" -> "All Supervisor permissions"
- "Gerenciar utilizadores" -> "Manage users"
- "Atribuir papeis" -> "Assign roles"
- "Configuracoes do sistema" -> "System settings"

Also on line 163, the role dropdown option says "Lider" -- change to "Leader".

## 2. Fix Admin page layout to use full width

The Admin page currently uses `max-w-4xl mx-auto` (line 96), which constrains the content to ~896px and centers it, wasting horizontal space. Other pages like Dashboard use full width.

**Change:** Remove `max-w-4xl mx-auto` from the container div so the Admin page content stretches to fill the available width, matching the high-density layout pattern used elsewhere.

## Technical Details

**File to modify:** `src/pages/Admin.tsx`

- Line 96: Change `<div className="max-w-4xl mx-auto">` to `<div>`
- Lines 292-316: Replace all Portuguese role permission text with English equivalents
- Line 163: Change `"Lider"` to `"Leader"` in the role select dropdown

