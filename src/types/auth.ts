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


export const ROLE_LABELS: Record<UserRole, string> = {
  operator: 'Leader',
  supervisor: 'Supervisor',
  admin: 'Manager',
};

export const ROLE_COLORS: Record<UserRole, string> = {
  operator: 'bg-blue-100 text-blue-800',
  supervisor: 'bg-purple-100 text-purple-800',
  admin: 'bg-red-100 text-red-800',
};
