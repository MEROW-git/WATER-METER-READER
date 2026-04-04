import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { AuthState } from '@/types';
import { authApi } from '@/lib/api';

interface AuthContextType extends AuthState {
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  hasRole: (role: 'admin' | 'staff') => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getStoredAuth = (): Partial<AuthState> => {
  try {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    return { token, user };
  } catch {
    return { token: null, user: null };
  }
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const stored = getStoredAuth();
  const [state, setState] = useState<AuthState>({
    user: stored.user || null,
    token: stored.token || null,
    isAuthenticated: !!(stored.token && stored.user),
    isLoading: true,
  });

  useEffect(() => {
    const verifyAuth = async () => {
      const { token } = getStoredAuth();
      
      if (!token) {
        setState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      try {
        const response = await authApi.getMe();
        const user = response.data.user;
        
        setState({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
        });
        localStorage.setItem('user', JSON.stringify(user));
      } catch {
        // Token invalid
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setState({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    };

    verifyAuth();
  }, []);

  const login = async (username: string, password: string) => {
    const response = await authApi.login(username, password);
    const { token, user } = response.data;

    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));

    setState({
      user,
      token,
      isAuthenticated: true,
      isLoading: false,
    });
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore error
    }
    
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
  };

  const hasRole = (role: 'admin' | 'staff') => {
    return state.user?.role === role;
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
