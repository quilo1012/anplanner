

# Plano: Ajustes e Correcoes do Sistema

## Resumo das Alteracoes

### 1. Supervisor / History / Planner

| Alteracao | Descricao |
|-----------|-----------|
| Photo no Edit History | Adicionar upload de foto de monitoramento no EditShiftDialog (apenas ao editar, nao ao criar) |
| Downtime no History | Adicionar secao para adicionar/editar downtime no EditShiftDialog |
| Remover Downtime do Planner | Remover a secao StructuredDowntimeForm do Planner (mover para History apenas) |
| Downtime manual | Permitir digitar reason manualmente quando "Other" selecionado |

### 2. Dashboard

| Alteracao | Descricao |
|-----------|-----------|
| Remover status badges | Remover os badges "Running", "Warning", "Stopped" do LineStatusCard |

### 3. Login

| Alteracao | Descricao |
|-----------|-----------|
| Logo maior | Aumentar tamanho do logo de h-16 para h-24 ou h-32 |
| Remover "Applied Nutrition" texto | Remover o h1 com texto "Applied Nutrition" abaixo do logo |
| Remover "Production Control" | Remover subtitulo do Sidebar e MobileMenu |
| Corrigir Sign Out | Verificar e corrigir problema no logout (EATS) |

### 4. Mensagens / Textos

| Alteracao | Descricao |
|-----------|-----------|
| Remover "Applied Nutrition" | Remover texto do Sidebar header |
| Ajustar rodape | Mudar para "© 2026 Applied Nutrition. All rights reserved." |

### 5. Navegacao

| Alteracao | Descricao |
|-----------|-----------|
| Botao Back | Adicionar botao de voltar no Header ou navegacao |

---

## Detalhes de Implementacao

### Parte 1: EditShiftDialog - Adicionar Photo e Downtime

**Arquivo:** `src/components/history/EditShiftDialog.tsx`

Adicionar:
1. Estado para monitoringPhoto e photoFilename
2. Componente PhotoUpload no formulario
3. Componente StructuredDowntimeForm para adicionar/editar downtimes
4. Atualizar handleSubmit para salvar photo e downtimes

```tsx
// Novos estados
const [monitoringPhoto, setMonitoringPhoto] = useState<string | undefined>();
const [photoFilename, setPhotoFilename] = useState<string | undefined>();
const [structuredDowntimes, setStructuredDowntimes] = useState<StructuredDowntime[]>([]);

// No useEffect
setMonitoringPhoto(shift.monitoringPhoto);
setPhotoFilename(shift.photoFilename);
setStructuredDowntimes(shift.structuredDowntimes || []);

// No formulario, adicionar:
<PhotoUpload ... />
<StructuredDowntimeForm ... />
```

### Parte 2: Planner - Remover Downtime Section

**Arquivo:** `src/pages/Planner.tsx`

Remover:
- Import do StructuredDowntimeForm
- Estado structuredDowntimes do formState
- Secao visual do StructuredDowntimeForm (linhas 472-480 aproximadamente)
- Remover structuredDowntimes do handleSubmit

### Parte 3: Dashboard - Remover Status Badges

**Arquivo:** `src/components/dashboard/LineStatusCard.tsx`

Remover:
- O componente StatusBadge (linhas 69-93)
- A chamada `<StatusBadge />` na linha 124

### Parte 4: Login - Redesenhar Layout

**Arquivo:** `src/pages/Login.tsx`

Alteracoes:
```tsx
// Logo maior e centralizado
<img
  src="/lovable-uploads/c9db809b-a260-417c-b42f-c908f00093c1.jpg"
  alt="Applied Nutrition"
  className="h-28 sm:h-32 w-auto rounded-xl shadow-lg"  // era h-16
/>

// Remover estas linhas (118-121):
// <h1 className="text-xl font-bold text-primary tracking-tight">
//   Applied Nutrition
// </h1>
// <p className="text-sm text-muted-foreground mt-1">Shift Report System</p>
```

### Parte 5: Sidebar - Remover Textos

**Arquivo:** `src/components/Sidebar.tsx`

Alteracoes:
```tsx
// Linha 27-28: Remover "Applied Nutrition" e "Production Control"
// Manter apenas o icone ou simplificar o header

// Linha 80-82: Atualizar versao/rodape
<p>© 2026 Applied Nutrition. All rights reserved.</p>
```

### Parte 6: MobileMenu - Remover "Production Control"

**Arquivo:** `src/components/MobileMenu.tsx`

Alteracao linha 37:
```tsx
// De:
<span className="font-semibold text-sm">Production Control</span>
// Para:
<span className="font-semibold text-sm">Shift Report</span>
// Ou remover completamente
```

### Parte 7: Header - Adicionar Botao Back

**Arquivo:** `src/components/Header.tsx`

Adicionar botao de voltar:
```tsx
import { ArrowLeft } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

// No componente:
const navigate = useNavigate();
const location = useLocation();
const canGoBack = location.pathname !== '/';

// No JSX:
{canGoBack && (
  <button onClick={() => navigate(-1)} className="btn-secondary p-2">
    <ArrowLeft size={16} />
  </button>
)}
```

### Parte 8: Corrigir Sign Out

**Arquivo:** `src/contexts/AuthContext.tsx`

O logout atual parece correto, mas pode haver um problema de redirecionamento. Verificar:
1. Se o logout limpa completamente o estado
2. Se redireciona para /login apos logout

---

## Arquivos a Modificar

| Arquivo | Tipo | Alteracoes |
|---------|------|------------|
| `src/components/history/EditShiftDialog.tsx` | Modificar | Adicionar PhotoUpload + StructuredDowntimeForm |
| `src/pages/Planner.tsx` | Modificar | Remover secao de downtime |
| `src/components/dashboard/LineStatusCard.tsx` | Modificar | Remover StatusBadge (Running/Warning/Stopped) |
| `src/pages/Login.tsx` | Modificar | Logo maior, remover textos |
| `src/components/Sidebar.tsx` | Modificar | Remover "Applied Nutrition", "Production Control", atualizar rodape |
| `src/components/MobileMenu.tsx` | Modificar | Remover "Production Control" |
| `src/components/Header.tsx` | Modificar | Adicionar botao Back |
| `src/contexts/AuthContext.tsx` | Verificar | Corrigir logout se necessario |

---

## Resultado Esperado

1. **History Edit**: Supervisor pode adicionar foto e downtime ao editar um shift
2. **Planner**: Formulario simplificado sem secao de downtime
3. **Dashboard**: Cards de linha sem badges de status (mais limpo)
4. **Login**: Logo grande e centralizado como destaque principal
5. **Navegacao**: Botao Back funcional no header
6. **Textos**: Rodape padronizado "© 2026 Applied Nutrition. All rights reserved."

---

## Detalhes Tecnicos - EditShiftDialog com Photo e Downtime

```tsx
// Imports adicionais
import { PhotoUpload } from '@/components/PhotoUpload';
import { StructuredDowntimeForm } from '@/components/StructuredDowntimeForm';
import { StructuredDowntime } from '@/types/shift';

// Estados adicionais
const [monitoringPhoto, setMonitoringPhoto] = useState<string | undefined>();
const [photoFilename, setPhotoFilename] = useState<string | undefined>();
const [structuredDowntimes, setStructuredDowntimes] = useState<StructuredDowntime[]>([]);

// useEffect atualizado
useEffect(() => {
  if (shift) {
    // ... estados existentes ...
    setMonitoringPhoto(shift.monitoringPhoto);
    setPhotoFilename(shift.photoFilename);
    setStructuredDowntimes(shift.structuredDowntimes || []);
  }
}, [shift]);

// Handler para photo
const handlePhotoChange = (photo: string | undefined, filename: string | undefined) => {
  setMonitoringPhoto(photo);
  setPhotoFilename(filename);
};

// handleSubmit atualizado
const result = await updateShift(shift.id, {
  // ... campos existentes ...
  monitoringPhoto,
  photoFilename,
  structuredDowntimes,
});

// JSX - Adicionar antes do DialogFooter:
<div className="space-y-4 border-t pt-4 mt-4">
  <h4 className="font-semibold">Monitoring Photo</h4>
  <PhotoUpload
    value={monitoringPhoto}
    filename={photoFilename}
    onChange={handlePhotoChange}
  />
</div>

<div className="space-y-4 border-t pt-4 mt-4">
  <StructuredDowntimeForm
    downtimes={structuredDowntimes}
    onChange={setStructuredDowntimes}
    downtimeThreshold={60}
  />
</div>
```

