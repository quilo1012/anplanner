export type UserRole = 'operator' | 'supervisor' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

// Default users for demo purposes
export const DEFAULT_USERS: (User & { password: string })[] = [
  {
    id: 'user-admin-001',
    email: 'admin@appliednutrition.com',
    name: 'Admin User',
    role: 'admin',
    password: 'admin123',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user-supervisor-001',
    email: 'supervisor@appliednutrition.com',
    name: 'Supervisor User',
    role: 'supervisor',
    password: 'super123',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user-operator-001',
    email: 'operator@appliednutrition.com',
    name: 'Operator User',
    role: 'operator',
    password: 'oper123',
    createdAt: new Date().toISOString(),
  },
];

export const ROLE_LABELS: Record<UserRole, string> = {
  operator: 'Operator',
  supervisor: 'Supervisor',
  admin: 'Administrator',
};

export const ROLE_COLORS: Record<UserRole, string> = {
  operator: 'bg-blue-100 text-blue-800',
  supervisor: 'bg-purple-100 text-purple-800',
  admin: 'bg-red-100 text-red-800',
};
