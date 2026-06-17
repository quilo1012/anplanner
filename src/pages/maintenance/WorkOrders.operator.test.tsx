import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { UserRole } from '@/types/auth';

// --- Mocks ----------------------------------------------------------------

vi.mock('@/components/Header', () => ({
  Header: ({ title }: { title: string }) => <div>{title}</div>,
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => Promise.resolve({ data: [], error: null }),
    }),
  },
}));

vi.mock('@/hooks/useWorkOrders', () => ({
  useWorkOrders: () => ({
    workOrders: [],
    isLoading: false,
    error: null,
    openCount: 0,
    linesStoppedCount: 0,
    advanceWorkOrder: vi.fn(),
    stopLine: vi.fn(),
    resumeLine: vi.fn(),
    refreshWorkOrders: vi.fn(),
  }),
  nextStatus: () => null,
}));

vi.mock('@/hooks/useProblemDescriptions', () => ({
  useProblemDescriptions: () => ({ problems: [] }),
}));

vi.mock('@/hooks/useLineWoHistory', () => ({
  useLineWoHistory: () => ({ history: [] }),
}));

const makeAuth = (role: UserRole) => ({
  user: { id: 'u1', name: 'Test User', role },
  hasRole: (r: UserRole | UserRole[]) =>
    Array.isArray(r) ? r.includes(role) : r === role,
});

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => makeAuth(currentRole),
}));

let currentRole: UserRole = 'operator';

// --- Tests ----------------------------------------------------------------

async function renderPage() {
  const { WorkOrders } = await import('./WorkOrders');
  return render(
    <MemoryRouter>
      <WorkOrders />
    </MemoryRouter>,
  );
}

describe('WorkOrders — operator (leader) permissions', () => {
  it('hides the "New Work Order" button and creation banners for operator', async () => {
    currentRole = 'operator';
    await renderPage();

    expect(screen.queryByRole('button', { name: /new work order/i })).toBeNull();
    expect(screen.queryByText(/machine stopped/i)).toBeNull();
    expect(screen.queryByText(/problem, line still running/i)).toBeNull();
    // List view is still rendered
    expect(screen.getByText(/work orders/i)).toBeInTheDocument();
  });

  it('shows the "New Work Order" button for supervisor', async () => {
    currentRole = 'supervisor';
    vi.resetModules();
    await renderPage();

    expect(screen.getAllByText(/new work order/i).length).toBeGreaterThan(0);
  });
});
