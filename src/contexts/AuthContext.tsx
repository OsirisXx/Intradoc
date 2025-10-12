import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { AuthUser } from '../types/auth';
import { checkAuthAPI } from '../services/auth';

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: AuthUser) => void;
  logout: () => void;
  checkAuth: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Session duration: 8 hours
  const SESSION_DURATION = 8 * 60 * 60 * 1000; // 8 hours in milliseconds

  // Check for existing session on mount
  useEffect(() => {
    const checkExistingSession = () => {
      try {
        const storedUser = localStorage.getItem('user');
        const loginTime = localStorage.getItem('loginTime');
        
        if (storedUser && loginTime) {
          const elapsed = Date.now() - parseInt(loginTime);
          if (elapsed > SESSION_DURATION) {
            // Session expired
            console.log('Session expired, logging out user');
            setUser(null);
            localStorage.removeItem('user');
            localStorage.removeItem('loginTime');
            return;
          }
          const userData = JSON.parse(storedUser);
          setUser(userData);
        }
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        localStorage.removeItem('user');
        localStorage.removeItem('loginTime');
      } finally {
        setIsLoading(false);
      }
    };

    checkExistingSession();
  }, []);

  const login = (userData: AuthUser) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('loginTime', Date.now().toString());
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('loginTime');
    localStorage.removeItem('authToken');
  };

  const checkAuth = async (): Promise<boolean> => {
    try {
      // First check local session expiry
      const storedUser = localStorage.getItem('user');
      const loginTime = localStorage.getItem('loginTime');
      
      if (storedUser && loginTime) {
        const elapsed = Date.now() - parseInt(loginTime);
        if (elapsed > SESSION_DURATION) {
          // Session expired
          console.log('Session expired during auth check');
          setUser(null);
          localStorage.removeItem('user');
          localStorage.removeItem('loginTime');
          localStorage.removeItem('authToken');
          return false;
        }
      }

      // Now verify with backend API
      const result = await checkAuthAPI();
      if (result.success && result.user) {
        setUser(result.user);
        return true;
      } else {
        setUser(null);
        localStorage.removeItem('user');
        localStorage.removeItem('loginTime');
        localStorage.removeItem('authToken');
        return false;
      }
    } catch (error) {
      console.error('Error checking authentication:', error);
      setUser(null);
      localStorage.removeItem('user');
      localStorage.removeItem('loginTime');
      localStorage.removeItem('authToken');
      return false;
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    checkAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
