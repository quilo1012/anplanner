import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { User, UserRole, LoginCredentials, DEFAULT_USERS } from '@/types/auth';
import { useLocalStorage } from '@/hooks/useLocalStorage';

interface AuthContextType {
  user: User | null;
  users: (User & { password: string })[];
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => { success: boolean; error?: string };
  logout: () => void;
  hasRole: (roles: UserRole | UserRole[]) => boolean;
  canEdit: (createdByRole?: UserRole) => boolean;
  addUser: (user: Omit<User, 'id' | 'createdAt'> & { password: string }) => void;
  updateUser: (id: string, data: Partial<User & { password?: string }>) => void;
  deleteUser: (id: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useLocalStorage<(User & { password: string })[]>('app-users', DEFAULT_USERS);
  const [currentUserId, setCurrentUserId] = useLocalStorage<string | null>('current-user-id', null);
  const [user, setUser] = useState<User | null>(null);

  // Load user on mount
  useEffect(() => {
    if (currentUserId) {
      const foundUser = users.find(u => u.id === currentUserId);
      if (foundUser) {
        const { password, ...userData } = foundUser;
        setUser(userData);
      } else {
        setCurrentUserId(null);
      }
    }
  }, [currentUserId, users]);

  const login = (credentials: LoginCredentials): { success: boolean; error?: string } => {
    const foundUser = users.find(
      u => u.email.toLowerCase() === credentials.email.toLowerCase() && u.password === credentials.password
    );

    if (foundUser) {
      const { password, ...userData } = foundUser;
      setUser(userData);
      setCurrentUserId(foundUser.id);
      return { success: true };
    }

    return { success: false, error: 'Invalid email or password' };
  };

  const logout = () => {
    setUser(null);
    setCurrentUserId(null);
  };

  const hasRole = (roles: UserRole | UserRole[]): boolean => {
    if (!user) return false;
    const roleArray = Array.isArray(roles) ? roles : [roles];
    return roleArray.includes(user.role);
  };

  const canEdit = (createdByRole?: UserRole): boolean => {
    if (!user) return false;
    // Admins can edit everything
    if (user.role === 'admin') return true;
    // Supervisors can edit operator and supervisor content
    if (user.role === 'supervisor') return true;
    // Operators can only edit their own content
    return user.role === 'operator';
  };

  const addUser = (userData: Omit<User, 'id' | 'createdAt'> & { password: string }) => {
    const newUser = {
      ...userData,
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
    };
    setUsers(prev => [...prev, newUser]);
  };

  const updateUser = (id: string, data: Partial<User & { password?: string }>) => {
    setUsers(prev =>
      prev.map(u => (u.id === id ? { ...u, ...data } : u))
    );
  };

  const deleteUser = (id: string) => {
    // Prevent deleting yourself
    if (id === user?.id) return;
    setUsers(prev => prev.filter(u => u.id !== id));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        users,
        isAuthenticated: !!user,
        login,
        logout,
        hasRole,
        canEdit,
        addUser,
        updateUser,
        deleteUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
