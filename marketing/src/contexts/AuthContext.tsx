import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, getUser, getToken, saveToken, saveUser, logout as clearAuth } from '../lib/auth';
import api from '../lib/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  isLoggedIn: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(getUser());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const verifyToken = async () => {
      const token = getToken();
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await api.get('/auth/me');
        const fullUser = response.data;
        setUser(fullUser);
        saveUser(fullUser);
      } catch (error) {
        console.error('Token verification failed', error);
        logout();
      } finally {
        setIsLoading(false);
      }
    };

    verifyToken();
  }, []);

  const login = (token: string, userData: User) => {
    saveToken(token);
    saveUser(userData);
    setUser(userData);
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {}
    clearAuth();
    setUser(null);
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      login,
      logout,
      isLoggedIn: !!user
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
