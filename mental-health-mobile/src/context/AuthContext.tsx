import React, { createContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router'; // 1. IMPORT IMPERATIVE ROUTER
import apiClient, { setInMemoryToken } from '@/api/apiClient';

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
  
  // 2. DELETED: const router = useRouter(); <- This was causing the fatal crash!

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
      const refreshToken = await SecureStore.getItemAsync('refresh_token');
      
      if (refreshToken) {
        await apiClient.post('/accounts/logout/', { 
          refresh: refreshToken 
        });
      }
    } catch (error) {
      console.log('Backend logout failed (token might already be expired):', error);
    } finally {
      await SecureStore.deleteItemAsync('access_token');
      await SecureStore.deleteItemAsync('refresh_token');
      await SecureStore.deleteItemAsync('smera_journal_key');
      await SecureStore.deleteItemAsync('user_preferences');
      await SecureStore.deleteItemAsync('device_theme_mode');
      
      setUserToken(null);
      
      // 3. This now uses the imperative router, which never loses context
      //console.log('Logout completed');
      router.replace('/accounts/login');
    }
  };

  return (
    <AuthContext.Provider value={{ userToken, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}