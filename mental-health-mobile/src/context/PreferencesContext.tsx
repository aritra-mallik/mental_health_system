import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Appearance, useColorScheme as useSystemColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import apiClient from '../api/apiClient';
import { useAuth } from './AuthContext';

export type ThemeMode = 'light' | 'dark' | 'system';

interface PreferencesContextType {
  themeMode: ThemeMode;
  isDarkMode: boolean;
  updatePreferences: (updates: { theme_mode?: ThemeMode }) => Promise<void>;
}

const defaultPreferences = {
  themeMode: 'system' as ThemeMode,
  isDarkMode: false,
  updatePreferences: async () => {},
};

const PreferencesContext = createContext<PreferencesContextType | null>(null);

export const usePreferences = () => {
  return useContext(PreferencesContext) ?? defaultPreferences;
};

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { userToken } = useAuth();
  
  // 1. We hold the complex 3-way state exclusively on the device
  const [themeMode, setThemeMode] = useState<ThemeMode>('system');
  
  // 2. We listen to the native iOS/Android device color scheme
  const systemColorScheme = useSystemColorScheme();

  // 3. We compute the absolute boolean for NativeWind and the Backend
  const isDarkMode = themeMode === 'system' 
    ? systemColorScheme === 'dark' 
    : themeMode === 'dark';

  // Apply visual changes instantly to the app window
  useEffect(() => {
    Appearance.setColorScheme(isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  useEffect(() => {
    const loadSettings = async () => {
      if (!userToken) {
        setThemeMode('system');
        return;
      }

      // Check device storage first for the 3-way preference
      let localTheme: ThemeMode | null = null;
      const cachedTheme = await SecureStore.getItemAsync('device_theme_mode');
      
      if (cachedTheme) {
        localTheme = cachedTheme as ThemeMode;
        setThemeMode(localTheme);
      }

      // Sync with backend (without overriding a local 'system' choice)
      try {
        const { data } = await apiClient.get('/user/profile/');
        
        // If the device had no saved preference, inherit what the backend thinks
        if (!localTheme) {
          const backendInheritedTheme = data.dark_mode ? 'dark' : 'light';
          setThemeMode(backendInheritedTheme);
          await SecureStore.setItemAsync('device_theme_mode', backendInheritedTheme);
        }
      } catch (error) {
        console.error('Failed to fetch user preferences', error);
      }
    };

    loadSettings();
  }, [userToken]);

  const updatePreferences = async (updates: { theme_mode?: ThemeMode }) => {
    if (!updates.theme_mode) return;

    const previousMode = themeMode;
    const newMode = updates.theme_mode;

    // 1. Optimistically update local UI and Storage
    setThemeMode(newMode);
    await SecureStore.setItemAsync('device_theme_mode', newMode);

    // 2. Translate to a strict Boolean for your Django Backend
    const backendCompatibleDarkMode = newMode === 'system' 
      ? (systemColorScheme === 'dark') 
      : (newMode === 'dark');

    try {
      // The backend never knows about "system", it just gets the translated boolean!
      await apiClient.patch('/user/profile/', { 
        dark_mode: backendCompatibleDarkMode 
      });
    } catch (error) {
      // Rollback on failure
      setThemeMode(previousMode);
      await SecureStore.setItemAsync('device_theme_mode', previousMode);
      console.error('Failed to update preferences on server', error);
    }
  };

  return (
    <PreferencesContext.Provider value={{ themeMode, isDarkMode, updatePreferences }}>
      {children}
    </PreferencesContext.Provider>
  );
}