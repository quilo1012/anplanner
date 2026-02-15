import { createContext, useContext, ReactNode, useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';

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

interface AuthContextType {
  user: User | null;
  users: User[];
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<{ success: boolean; error?: string }>;
  signup: (credentials: LoginCredentials & { name: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  hasRole: (roles: UserRole | UserRole[]) => boolean;
  canEdit: (createdByRole?: UserRole) => boolean;
  addUser: (userData: { name: string; email: string; password: string; role: UserRole }) => Promise<{ success: boolean; error?: string }>;
  updateUser: (id: string, data: Partial<{ name: string; email: string; role: UserRole }>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  refreshUsers: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isInitializing = useRef(true);

  // Fetch user profile and role from database
  const fetchUserData = async (supabaseUser: SupabaseUser): Promise<User | null> => {
    try {
      // Fetch profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', supabaseUser.id)
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        return null;
      }

      // Fetch role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', supabaseUser.id)
        .maybeSingle();

      if (roleError) {
        console.error('Error fetching role:', roleError);
      }

      if (profile) {
        return {
          id: profile.id,
          email: profile.email,
          name: profile.name,
          role: (roleData?.role as UserRole) || 'operator',
          createdAt: profile.created_at,
        };
      }

      // Fallback: create user from Supabase Auth data when profile doesn't exist yet
      return {
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        name: supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || 'User',
        role: (roleData?.role as UserRole) || 'operator',
        createdAt: supabaseUser.created_at || new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error fetching user data:', error);
      return null;
    }
  };

  // Fetch all users (admin only)
  const refreshUsers = async () => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        return;
      }

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) {
        console.error('Error fetching roles:', rolesError);
      }

      const roleMap = new Map(roles?.map(r => [r.user_id, r.role as UserRole]) || []);

      const usersWithRoles: User[] = (profiles || []).map(p => ({
        id: p.id,
        email: p.email,
        name: p.name,
        role: roleMap.get(p.id) || 'operator',
        createdAt: p.created_at,
      }));

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error refreshing users:', error);
    }
  };

  // Initialize auth state
  useEffect(() => {
    let isMounted = true;

    // Check initial session FIRST
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!isMounted) return;
        
        if (session?.user) {
          const userData = await fetchUserData(session.user);
          if (isMounted) {
            if (userData) {
              setUser(userData);
              if (userData.role === 'admin') {
                await refreshUsers();
              }
            } else {
              // Stale session — clear it to prevent zombie auth state
              await supabase.auth.signOut();
            }
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    // Safety timeout: force loading to false after 5s to prevent infinite spinner
    const safetyTimeout = setTimeout(() => {
      if (isMounted) {
        setIsLoading(false);
        isInitializing.current = false;
      }
    }, 5000);

    initializeAuth().finally(() => {
      isInitializing.current = false;
      clearTimeout(safetyTimeout);
    });

    // Set up auth state listener for subsequent changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;

        // Skip events during initialization to prevent race conditions
        if (isInitializing.current) return;
        
        // Skip initial session event since we handle it above
        if (event === 'INITIAL_SESSION') return;

        if (session?.user) {
          const userData = await fetchUserData(session.user);
          if (isMounted) {
            setUser(userData);
            if (userData?.role === 'admin') {
              await refreshUsers();
            }
          }
        } else {
          if (isMounted) {
            setUser(null);
            setUsers([]);
          }
        }
      }
    );

    return () => {
      isMounted = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const login = async (credentials: LoginCredentials): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        const userData = await fetchUserData(data.user);
        setUser(userData);
        if (userData?.role === 'admin') {
          await refreshUsers();
        }
        return { success: true };
      }

      return { success: false, error: 'Login failed' };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  };

  const signup = async (credentials: LoginCredentials & { name: string }): Promise<{ success: boolean; error?: string }> => {
    try {
      // Validate name length (server-side also validates, this is for UX)
      const trimmedName = credentials.name.trim();
      if (trimmedName.length === 0) {
        return { success: false, error: 'Name is required' };
      }
      if (trimmedName.length > 100) {
        return { success: false, error: 'Name must be 100 characters or less' };
      }

      const { data, error } = await supabase.auth.signUp({
        email: credentials.email,
        password: credentials.password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            name: trimmedName,
          },
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        return { success: true };
      }

      return { success: false, error: 'Signup failed' };
    } catch (error) {
      console.error('Signup error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setUsers([]);
  };

  const hasRole = (roles: UserRole | UserRole[]): boolean => {
    if (!user) return false;
    const roleArray = Array.isArray(roles) ? roles : [roles];
    return roleArray.includes(user.role);
  };

  const canEdit = (createdByRole?: UserRole): boolean => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (user.role === 'supervisor') return true;
    return user.role === 'operator';
  };

  const addUser = async (userData: { name: string; email: string; password: string; role: UserRole }): Promise<{ success: boolean; error?: string }> => {
    try {
      // Create user via Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            name: userData.name,
          },
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        // Update role if not operator (default)
        if (userData.role !== 'operator') {
          const { error: roleError } = await supabase
            .from('user_roles')
            .update({ role: userData.role })
            .eq('user_id', data.user.id);

          if (roleError) {
            console.error('Error updating role:', roleError);
          }
        }

        await refreshUsers();
        return { success: true };
      }

      return { success: false, error: 'Failed to create user' };
    } catch (error) {
      console.error('Add user error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  };

  const updateUser = async (id: string, data: Partial<{ name: string; email: string; role: UserRole }>) => {
    try {
      // Update profile
      if (data.name || data.email) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            ...(data.name && { name: data.name }),
            ...(data.email && { email: data.email }),
          })
          .eq('id', id);

        if (profileError) {
          console.error('Error updating profile:', profileError);
        }
      }

      // Update role
      if (data.role) {
        const { error: roleError } = await supabase
          .from('user_roles')
          .update({ role: data.role })
          .eq('user_id', id);

        if (roleError) {
          console.error('Error updating role:', roleError);
        }
      }

      await refreshUsers();

      // Update current user if editing self
      if (id === user?.id) {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser) {
          const userData = await fetchUserData(currentUser);
          setUser(userData);
        }
      }
    } catch (error) {
      console.error('Update user error:', error);
    }
  };

  const deleteUser = async (id: string) => {
    if (id === user?.id) return;

    try {
      // Delete from profiles (will cascade to user_roles via auth.users)
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting user:', error);
      }

      await refreshUsers();
    } catch (error) {
      console.error('Delete user error:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        users,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        logout,
        hasRole,
        canEdit,
        addUser,
        updateUser,
        deleteUser,
        refreshUsers,
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

// Re-export types for compatibility
export const ROLE_LABELS: Record<UserRole, string> = {
  operator: 'Lider',
  supervisor: 'Supervisor',
  admin: 'Manager',
};

export const ROLE_COLORS: Record<UserRole, string> = {
  operator: 'bg-blue-100 text-blue-800',
  supervisor: 'bg-purple-100 text-purple-800',
  admin: 'bg-red-100 text-red-800',
};
