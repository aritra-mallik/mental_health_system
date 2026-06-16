import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Appearance, View, ImageBackground } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import apiClient from '../api/apiClient';
import { useAuth } from './AuthContext';

export type ThemeMode = 'light' | 'dark';

interface PreferencesContextType {
  themeMode: ThemeMode;
  isDarkMode: boolean;
  updatePreferences: (updates: { theme_mode?: ThemeMode }) => Promise<void>;
}

const defaultPreferences = {
  themeMode: 'light' as ThemeMode, 
  isDarkMode: false,
  updatePreferences: async () => {},
};

const PreferencesContext = createContext<PreferencesContextType | null>(null);

export const usePreferences = () => {
  return useContext(PreferencesContext) ?? defaultPreferences;
};

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { userToken } = useAuth();
  
  const [themeMode, setThemeMode] = useState<ThemeMode>('light');

  const isDarkMode = themeMode === 'dark';

  useEffect(() => {
    Appearance.setColorScheme(isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  useEffect(() => {
    const loadSettings = async () => {
      if (!userToken) {
        setThemeMode('light');
        return;
      }

      let localTheme: ThemeMode | null = null;
      const cachedTheme = await SecureStore.getItemAsync('device_theme_mode');
      
      if (cachedTheme) {
        localTheme = cachedTheme as ThemeMode;
        setThemeMode(localTheme);
      }

      try {
        const { data } = await apiClient.get('/user/profile/');
        
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

    setThemeMode(newMode);
    await SecureStore.setItemAsync('device_theme_mode', newMode);

    const backendCompatibleDarkMode = newMode === 'dark';

    try {
      await apiClient.patch('/user/profile/', { 
        dark_mode: backendCompatibleDarkMode 
      });
    } catch (error) {
      setThemeMode(previousMode);
      await SecureStore.setItemAsync('device_theme_mode', previousMode);
      console.error('Failed to update preferences on server', error);
    }
  };

  return (
    <PreferencesContext.Provider value={{ themeMode, isDarkMode, updatePreferences }}>
      <ImageBackground 
        source={
          isDarkMode 
            ? require('@/assets/images/dark_b.png') 
            : require('@/assets/images/light_b.png')
        }
        className="flex-1"
        resizeMode="cover">
        <View className="flex-1 z-10 bg-transparent">
          {children}
        </View>
      </ImageBackground>
    </PreferencesContext.Provider>
  );
}