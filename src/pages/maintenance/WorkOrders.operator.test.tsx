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
  it('hides every creation entry-point for operator', async () => {
    currentRole = 'operator';
    await renderPage();

    // Toolbar "+ New Work Order" button
    expect(screen.queryByRole('button', { name: /new work order/i })).toBeNull();
    // Top shortcut cards
    expect(screen.queryByText('New Work Order')).toBeNull();
    expect(screen.queryByText('Submit a maintenance request')).toBeNull();
    expect(screen.queryByText('My Work Orders')).toBeNull();
    expect(screen.queryByText('Track your submitted orders')).toBeNull();
    // Red / amber action banners (exact copy)
    expect(screen.queryByText('● MACHINE STOPPED')).toBeNull();
    expect(screen.queryByText('⚠ PROBLEM, LINE STILL RUNNING')).toBeNull();
    expect(
      screen.queryByText(/Open WO Request — Line Stopped/i),
    ).toBeNull();
    expect(
      screen.queryByText(/Open WO Request — Line in Operation/i),
    ).toBeNull();
    // List is still rendered
    expect(
      screen.getByText(/no work orders for this filter/i),
    ).toBeInTheDocument();
  });

  it('shows the creation entry-points for supervisor', async () => {
    currentRole = 'supervisor';
    vi.resetModules();
    await renderPage();

    expect(
      screen.getAllByRole('button', { name: /new work order/i }).length,
    ).toBeGreaterThanOrEqual(2); // shortcut card + toolbar button
    expect(screen.getByText('● MACHINE STOPPED')).toBeInTheDocument();
    expect(
      screen.getByText('⚠ PROBLEM, LINE STILL RUNNING'),
    ).toBeInTheDocument();
  });
});
