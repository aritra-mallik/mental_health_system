import React, { createContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';
import apiClient, { setInMemoryToken } from '../api/apiClient';

interface AuthContextType {
  userToken: string | null;
  login: (access: string, refresh: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userToken, setUserToken] = useState<string | null>(null);
  const router = useRouter();

  // Check for existing tokens when the app loads
  useEffect(() => {
    const loadToken = async () => {
      const token = await SecureStore.getItemAsync('access_token');
      if (token) {
        setUserToken(token);
        setInMemoryToken(token);
      }
    };
    loadToken();
  }, []);

  const login = async (access: string, refresh: string) => {
    await SecureStore.setItemAsync('access_token', access);
    await SecureStore.setItemAsync('refresh_token', refresh);
    setUserToken(access);
    setInMemoryToken(access);
  };

  const logout = async () => {
    try {
      // 1. Get the refresh token before we delete it
      const refreshToken = await SecureStore.getItemAsync('refresh_token');
      
      if (refreshToken) {
        // 2. Send it to your Django backend to be blacklisted
        // This hits the LogoutView in your views.py
        await apiClient.post('/accounts/logout/', { 
          refresh: refreshToken 
        });
      }
    } catch (error) {
      console.log('Backend logout failed (token might already be expired):', error);
    } finally {
      // 3. ALWAYS clear the local vault and state, even if the server is unreachable
      await SecureStore.deleteItemAsync('access_token');
      await SecureStore.deleteItemAsync('refresh_token');
      
      // Destroy the cached journal encryption key so the vault locks completely
      await SecureStore.deleteItemAsync('smera_journal_key');
      
      setUserToken(null);
      
      // 4. Safely route the user back to the login page
      router.replace('/accounts/login');
    }
  };

  return (
    <AuthContext.Provider value={{ userToken, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}