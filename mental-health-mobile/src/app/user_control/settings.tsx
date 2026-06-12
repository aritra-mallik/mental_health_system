import React, { useState, useEffect, useRef } from 'react';
import { View, TouchableOpacity, ScrollView, Modal, Text } from 'react-native';
import { useRouter } from 'expo-router'; 
import { Card, Button } from 'heroui-native';
import { usePreferences, ThemeMode } from '@/context/PreferencesContext';
import { useAuth } from '@/context/AuthContext';
import apiClient from '@/api/apiClient';
import { Ionicons } from '@expo/vector-icons';

type AlertType = 'clear' | 'delete' | 'success' | 'error' | null;

interface AlertConfig {
  visible: boolean;
  type: AlertType;
  title: string;
  message: string;
}

export default function SettingsScreen() {
  const router = useRouter(); 
  const { themeMode, isDarkMode, updatePreferences } = usePreferences();
  const { logout } = useAuth();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [alertConfig, setAlertConfig] = useState<AlertConfig>({
    visible: false,
    type: null,
    title: '',
    message: ''
  });

  // --- CRITICAL FIX: Track mounted state to prevent orphaned unmount crashes ---
  const isMounted = useRef(true);
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // --- MODAL CONTROLLERS ---
  const showAlert = (type: AlertType, title: string, message: string) => {
    if (isMounted.current) {
      setAlertConfig({ visible: true, type, title, message });
    }
  };

  const closeAlert = () => {
    if (!isProcessing && isMounted.current) {
      setAlertConfig(prev => ({ ...prev, visible: false }));
    }
  };

  // --- ACTION HANDLERS ---
  const handleConfirmAction = async () => {
    setIsProcessing(true);
    
    try {
      if (alertConfig.type === 'clear') {
          await apiClient.delete('/user/clear-data/');

          if (!isMounted.current) return;
          setIsProcessing(false);
          showAlert('success', 'Sanctuary Cleared', 'Your personal data has been securely erased.');
          return;

      } else if (alertConfig.type === 'delete') {
        await apiClient.delete('/user/delete/');

        if (!isMounted.current) return;
        setAlertConfig(prev => ({ ...prev, visible: false }));
        setIsProcessing(false);
        await logout();
        return;
      }
    } catch (error) {
      if (!isMounted.current) return;
      setIsProcessing(false);
      showAlert('error', 'Action Failed', 'We encountered an issue. Please try again.');
    }
  };

  // --- UI TRIGGERS ---
  const triggerClearData = () => {
    showAlert('clear', 'Clear Personal Data?', 'This will permanently erase all your account data. This action cannot be undone.');
  };

  const triggerDeleteAccount = () => {
    showAlert('delete', 'Delete Account?', 'We are sorry to see you go. This action is irreversible and will completely destroy your account and all associated data.');
  };

  // --- DYNAMIC MODAL STYLING ---
  const getModalStyles = (type: AlertType) => {
    switch (type) {
      case 'clear': return { icon: 'refresh-circle', color: '#f59e0b', bg: 'bg-amber-50 dark:bg-amber-500/10', border: 'border-amber-200 dark:border-amber-500/30', btnColor: 'warning' as any };
      case 'delete': return { icon: 'warning', color: '#f43f5e', bg: 'bg-rose-50 dark:bg-rose-500/10', border: 'border-rose-200 dark:border-rose-500/30', btnColor: 'danger' as any };
      case 'success': return { icon: 'checkmark-circle', color: '#10b981', bg: 'bg-emerald-50 dark:bg-emerald-500/10', border: 'border-emerald-200 dark:border-emerald-500/30', btnColor: 'success' as any };
      case 'error': return { icon: 'alert-circle', color: '#ef4444', bg: 'bg-red-50 dark:bg-red-500/10', border: 'border-red-200 dark:border-red-500/30', btnColor: 'danger' as any };
      default: return { icon: 'information-circle', color: '#64748b', bg: 'bg-neutral-100 dark:bg-neutral-800', border: 'border-neutral-200 dark:border-neutral-700', btnColor: 'default' as any };
    }
  };

  return (
    <View className="flex-1 bg-neutral-50 dark:bg-black">
      
      {/* --- CUSTOM THEMED MODAL --- */}
      <Modal transparent visible={alertConfig.visible} animationType="fade" onRequestClose={closeAlert}>
        <View className="flex-1 bg-black/60 items-center justify-center px-6">
          <Card className="w-full bg-white dark:bg-neutral-900 rounded-[2.5rem] p-8 items-center shadow-2xl border border-neutral-200 dark:border-neutral-800">

            {/* Modal Icon Header */}
            {alertConfig.type && (
              <View className={`w-20 h-20 rounded-full items-center justify-center mb-6 border ${getModalStyles(alertConfig.type).bg} ${getModalStyles(alertConfig.type).border}`}>
                <Ionicons name={getModalStyles(alertConfig.type).icon as any} size={40} color={getModalStyles(alertConfig.type).color} />
              </View>
            )}

            {/* Modal Text */}
            <Text className="text-2xl font-black text-neutral-900 dark:text-white text-center mb-3 tracking-tight">
              {alertConfig.title}
            </Text>
            <Text className="text-neutral-500 dark:text-neutral-400 text-center font-medium leading-relaxed mb-8">
              {alertConfig.message}
            </Text>

            {/* Modal Buttons (HeroUI) */}
            <View className="w-full flex-row gap-3">
              {(alertConfig.type === 'clear' || alertConfig.type === 'delete') ? (
                <>
                  <Button 
                    variant="flat" 
                    color="default" 
                    className="flex-1 h-14 rounded-2xl" 
                    onPress={closeAlert} 
                    isDisabled={isProcessing}
                  >
                    <Text className="font-bold text-neutral-700 dark:text-neutral-300">Cancel</Text>
                  </Button>
                  
                  <Button 
                    color={getModalStyles(alertConfig.type).btnColor}
                    className="flex-1 h-14 rounded-2xl"
                    onPress={handleConfirmAction}
                    isLoading={isProcessing}
                  >
                    <Text className="font-bold text-white">Confirm</Text>
                  </Button>
                </>
              ) : (
                <Button 
                  color="default"
                  className="w-full h-14 rounded-2xl bg-neutral-900 dark:bg-white"
                  onPress={closeAlert}
                >
                  <Text className="font-bold text-white dark:text-neutral-900">Close</Text>
                </Button>
              )}
            </View>

          </Card>
        </View>
      </Modal>

      <ScrollView contentContainerClassName="p-6 pb-20 pt-16" showsVerticalScrollIndicator={false}>
        
        {/* --- TOP NAVIGATION BAR --- */}
        <View className="flex-row justify-between items-center mb-6">
          <TouchableOpacity 
            onPress={() => router.back()}
            className="w-12 h-12 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-full items-center justify-center shadow-sm"
          >
            <Ionicons name="arrow-back" size={24} color={isDarkMode ? "#94a3b8" : "#475569"} />
          </TouchableOpacity>
        </View>

        {/* --- HERO HEADER SECTION --- */}
        <View className="mb-10 items-center">
          <View className="w-24 h-24 bg-indigo-50 dark:bg-indigo-500/10 rounded-3xl items-center justify-center mb-6 border border-indigo-100 dark:border-indigo-500/20">
            <Ionicons name="options" size={42} color={isDarkMode ? "#818cf8" : "#4f46e5"} />
          </View>
          
          <Text className="text-4xl font-black text-neutral-900 dark:text-white tracking-tight mb-3 text-center">
            Settings
          </Text>
          <Text className="text-neutral-500 dark:text-neutral-400 text-sm font-medium text-center px-4 leading-relaxed">
            Customize your sanctuary. Adjust the environment to fit your needs perfectly.
          </Text>
        </View>

        {/* --- APPEARANCE SECTION --- */}
        <View className="mb-3 ml-2 flex-row items-center gap-2">
          <Ionicons name="color-palette" size={18} color={isDarkMode ? "#818cf8" : "#4f46e5"} />
          <Text className="text-md font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Appearance</Text>
        </View>
        
        <Card className="bg-white dark:bg-neutral-900 rounded-3xl p-2 mb-10 shadow-sm dark:shadow-none border border-neutral-200 dark:border-neutral-800">
          
          {/* Three-Way Theme Selector */}
          <View className="p-4 py-5">
            <View className="flex-row items-center mb-5">
              <View className="w-12 h-12 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl items-center justify-center mr-4 border border-indigo-100/50 dark:border-indigo-500/20">
                  <Ionicons 
                    name={themeMode === 'system' ? 'settings' : isDarkMode ? 'moon' : 'sunny'} 
                    size={24} 
                    color={isDarkMode ? "#818cf8" : "#4f46e5"} 
                  />
              </View>
              <View>
                <Text className="font-black text-neutral-900 dark:text-white text-lg">Theme</Text>
                <Text className="text-neutral-500 dark:text-neutral-400 text-md font-medium mt-0.5">Select your sanctuary's environment.</Text>
              </View>
            </View>
            
            <View className="flex-row justify-between gap-3">
              {(['light', 'dark', 'system'] as ThemeMode[]).map((mode) => (
                <TouchableOpacity
                  key={mode}
                  activeOpacity={0.7}
                  onPress={() => updatePreferences({ theme_mode: mode })}
                  className={`flex-1 py-3 px-2 rounded-2xl border transition-all ${
                    themeMode === mode 
                      ? 'bg-indigo-50 border-indigo-500 dark:bg-indigo-900/30 dark:border-indigo-500' 
                      : 'bg-neutral-50 border-neutral-200 dark:bg-neutral-800 dark:border-neutral-700'
                  }`}>
                  <Text className={`text-center capitalize ${
                    themeMode === mode ? 'text-indigo-600 dark:text-indigo-400 font-black text-base' : 'text-neutral-500 dark:text-neutral-400 font-bold text-base'
                  }`}>
                    {mode}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Card>

        {/* --- PRIVACY & CONTROL SECTION --- */}
        <View className="mb-3 ml-2 flex-row items-center gap-2">
          <Ionicons name="shield-checkmark" size={18} color={isDarkMode ? "#fb7185" : "#e11d48"} />
          <Text className="text-md font-black uppercase tracking-widest text-rose-600 dark:text-rose-400">
            Data & Privacy
          </Text>
        </View>

        <Card className="bg-white dark:bg-neutral-900 rounded-3xl p-2 shadow-sm dark:shadow-none border border-neutral-200 dark:border-neutral-800 mb-8">
          
          {/* Clear Data Row */}
          <TouchableOpacity 
            activeOpacity={0.7}
            onPress={triggerClearData}
            disabled={isProcessing}
            className="flex-row items-center justify-between p-4 border-b border-neutral-100 dark:border-neutral-800/50"
          >
            <View className="w-12 h-12 bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 rounded-2xl items-center justify-center mr-4">
              <Ionicons name="refresh" size={24} color={isDarkMode ? "#fbbf24" : "#d97706"} />
            </View>
            <View className="flex-1 pr-4">
              <Text className="font-black text-neutral-900 dark:text-white text-lg mb-1">Reset Account</Text>
              <Text className="text-neutral-500 dark:text-neutral-400 text-md font-medium">Wipe all your associated data.</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={isDarkMode ? "#475569" : "#cbd5e1"} />
          </TouchableOpacity>

          {/* Delete Account Row */}
          <TouchableOpacity 
            activeOpacity={0.7}
            onPress={triggerDeleteAccount}
            disabled={isProcessing}
            className="flex-row items-center justify-between p-4"
          >
            <View className="w-12 h-12 bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 rounded-2xl items-center justify-center mr-4">
              <Ionicons name="trash" size={24} color={isDarkMode ? "#fb7185" : "#e11d48"} />
            </View>
            <View className="flex-1 pr-4">
              <Text className="font-black text-rose-600 dark:text-rose-500 text-lg mb-1">Delete Account</Text>
              <Text className="text-neutral-500 dark:text-neutral-400 text-md font-medium">Permanently erase identity.</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={isDarkMode ? "#475569" : "#cbd5e1"} />
          </TouchableOpacity>

        </Card>

      </ScrollView>
    </View>
  );
}