import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { View } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import apiClient from '../api/apiClient';
import { useAuth } from './AuthContext';
import { useColorScheme } from 'nativewind';

// 1. Types
type FontSize = 'small' | 'medium' | 'large';

// 2. Interface
interface PreferencesContextType {
  isDarkMode: boolean;
  fontSize: FontSize;
  updatePreferences: (updates: { dark_mode?: boolean; font_size?: FontSize }) => Promise<void>;
}

// 3. Context Initialization
const PreferencesContext = createContext<PreferencesContextType | null>(null);

// 4. Custom Hook for easy access
export const usePreferences = () => {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error('usePreferences must be used within a PreferencesProvider');
  return context;
};

// 5. The Provider Component
export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { userToken } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [fontSize, setFontSize] = useState<FontSize>('medium');
  
  const { setColorScheme } = useColorScheme(); 

  useEffect(() => {
    const loadSettings = async () => {
      if (!userToken) {
        setIsDarkMode(false);
        setFontSize('medium');
        setColorScheme('light'); // reset on logout
        return;
      }

      // Load from local cache for instant UI
      const cached = await SecureStore.getItemAsync('user_preferences');
      if (cached) {
        const parsed = JSON.parse(cached);
        setIsDarkMode(parsed.dark_mode);
        setFontSize(parsed.font_size);
        setColorScheme(parsed.dark_mode ? 'dark' : 'light');
      }

      // Fetch fresh from backend
      try {
        const { data } = await apiClient.get('/user/profile/');
        setIsDarkMode(data.dark_mode);
        setFontSize(data.font_size);
        setColorScheme(data.dark_mode ? 'dark' : 'light'); 
        
        await SecureStore.setItemAsync('user_preferences', JSON.stringify({
          dark_mode: data.dark_mode,
          font_size: data.font_size
        }));
      } catch (error) {
        console.error('Failed to fetch user preferences', error);
      }
    };

    loadSettings();
  }, [userToken]);

  const updatePreferences = async (updates: { dark_mode?: boolean; font_size?: FontSize }) => {
    const previousState = { dark_mode: isDarkMode, font_size: fontSize };

    // 1. Optimistic UI Updates
    if (updates.dark_mode !== undefined) {
      setIsDarkMode(updates.dark_mode);
      setColorScheme(updates.dark_mode ? 'dark' : 'light');
    }
    
    if (updates.font_size !== undefined) {
      setFontSize(updates.font_size);
    }

    // 2. Persistence (Syncing with Server and Cache)
    try {
      await apiClient.patch('/user/profile/', updates);
      
      await SecureStore.setItemAsync('user_preferences', JSON.stringify({
        ...previousState,
        ...updates
      }));
    } catch (error) {
      // Rollback on failure
      setIsDarkMode(previousState.dark_mode);
      setColorScheme(previousState.dark_mode ? 'dark' : 'light');
      setFontSize(previousState.font_size);
      console.error('Failed to save preferences to server', error);
    }
  };

  return (
    <PreferencesContext.Provider value={{ isDarkMode, fontSize, updatePreferences }}>
      <View style={{ flex: 1 }}>
        {children}
      </View>
    </PreferencesContext.Provider>
  );
}