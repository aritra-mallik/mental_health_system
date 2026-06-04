import React, { useState } from 'react';
import { View, Switch, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router'; 
import { Text } from '@/components/themed-text';
import { usePreferences } from '@/context/PreferencesContext';
import { useAuth } from '@/context/AuthContext';
import apiClient from '@/api/apiClient';
import { Ionicons } from '@expo/vector-icons';
import { ThemedView } from '@/components/themed-view'; // Bringing in the 3D Orbs!

export default function SettingsScreen() {
  const router = useRouter(); 
  const { isDarkMode, fontSize, updatePreferences } = usePreferences();
  const { logout } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleClearData = () => {
    Alert.alert(
      "Clear All Personal Data?",
      "This will permanently erase your journal entries, assessments, and chat history. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Yes, Clear Data", 
          style: "destructive", 
          onPress: async () => {
            try {
              setIsProcessing(true);
              await apiClient.delete('/user/clear-data/'); 
              Alert.alert("Success", "Your personal data has been securely cleared.");
            } catch (error) {
              Alert.alert("Error", "Could not clear data. Please try again.");
            } finally {
              setIsProcessing(false);
            }
          }
        }
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account?",
      "We're sorry to see you go. This action is irreversible and will completely destroy your account and all associated data.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete Account", 
          style: "destructive", 
          onPress: async () => {
            try {
              setIsProcessing(true);
              await apiClient.delete('/user/delete/'); 
              await logout();
            } catch (error) {
              Alert.alert("Error", "Could not delete account. Please try again.");
              setIsProcessing(false);
            }
          }
        }
      ]
    );
  };

  return (
    <ThemedView style={{ flex: 1 }} showOrbs={true}>
      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ padding: 24, paddingBottom: 80, paddingTop: 60 }}
        showsVerticalScrollIndicator={false}
      >
        
        {/* --- TOP NAVIGATION BAR --- */}
        <View className="flex-row justify-between items-center mb-6">
          <TouchableOpacity 
            onPress={() => router.back()}
            activeOpacity={0.7}
            className="w-12 h-12 bg-white/70 dark:bg-slate-900/70 rounded-full items-center justify-center shadow-lg shadow-black/5 border border-white/40 dark:border-slate-700/50"
            // Note: React Native doesn't natively support backdrop-blur via Tailwind easily, but the translucent background allows the orbs to show through!
          >
            <Ionicons name="arrow-back" size={24} color={isDarkMode ? "#f8fafc" : "#475569"} />
          </TouchableOpacity>
          <View className="w-12 h-12" /> {/* Invisible spacer to perfectly center the hero section below if needed */}
        </View>

        {/* --- HERO HEADER SECTION --- */}
        <View className="mb-10 items-center">
          {/* Glowing Glassmorphic Logo */}
          <View className="w-28 h-28 bg-white/60 dark:bg-slate-800/60 rounded-[2.5rem] items-center justify-center mb-6 shadow-2xl shadow-indigo-500/20 border border-white/50 dark:border-slate-700/50">
            <View className="w-20 h-20 bg-indigo-500 rounded-[1.8rem] items-center justify-center shadow-inner">
              <Ionicons name="options" size={42} color="#ffffff" />
            </View>
          </View>
          
          <Text className="text-5xl font-black text-slate-900 dark:text-white tracking-tight mb-3 text-center">
            Settings
          </Text>
          <Text className="text-slate-500 dark:text-slate-400 text-base font-medium text-center px-6 leading-relaxed">
            Customize your sanctuary. Adjust the environment to fit your needs perfectly.
          </Text>
        </View>

        {/* --- APPEARANCE SECTION --- */}
        <View className="mb-3 ml-2 flex-row items-center">
          <Ionicons name="color-palette-outline" size={20} color="#4f46e5" />
          <Text className="text-xs font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 ml-2">Appearance</Text>
        </View>
        
        <View className="bg-white/70 dark:bg-slate-900/60 rounded-[2.5rem] p-3 mb-10 shadow-xl shadow-slate-200/20 dark:shadow-black/20 border border-white/60 dark:border-slate-700/50">
          
          {/* Dark Mode Toggle */}
          <View className="flex-row items-center justify-between p-5 border-b border-slate-200/50 dark:border-slate-700/50">
            <View className="w-12 h-12 bg-indigo-100 dark:bg-indigo-500/20 rounded-2xl items-center justify-center mr-4">
               <Ionicons name={isDarkMode ? "moon" : "sunny"} size={24} color={isDarkMode ? "#818cf8" : "#4f46e5"} />
            </View>
            <View className="flex-1 pr-4">
              <Text className="font-black text-slate-800 dark:text-white text-xl mb-1">Theme</Text>
              <Text className="text-slate-500 dark:text-slate-400 text-sm font-medium">Toggle dark mode sanctuary.</Text>
            </View>
            <Switch 
              value={isDarkMode} 
              onValueChange={(val) => updatePreferences({ dark_mode: val })}
              trackColor={{ false: '#cbd5e1', true: '#4f46e5' }}
              thumbColor={'#ffffff'}
              style={{ transform: [{ scaleX: 1.1 }, { scaleY: 1.1 }] }}/>
          </View>

          {/* Font Size Selector */}
          <View className="p-5">
          <View className="flex-row items-center mb-6">
            <View className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl items-center justify-center mr-4">
                <Ionicons name="text-outline" size={24} color="#4f46e5" />
            </View>
            <Text className="font-bold text-slate-800 dark:text-white text-xl">Text Size</Text>
          </View>
          
          <View className="flex-row justify-between gap-4">
            {(['small', 'medium', 'large'] as const).map((size) => (
              <TouchableOpacity
                key={size}
                activeOpacity={0.7}
                onPress={() => updatePreferences({ font_size: size })}
                className={`flex-1 py-4 px-2 rounded-2xl border-2 transition-all ${
                  fontSize === size 
                    ? 'bg-indigo-50 border-indigo-500 dark:bg-indigo-900/30 dark:border-indigo-500' 
                    : 'bg-white border-slate-100 dark:bg-slate-800 dark:border-slate-700'
                }`}>
                <Text className={`text-center capitalize ${
                  fontSize === size ? 'text-indigo-600 dark:text-indigo-400 font-black text-lg' : 'text-slate-500 dark:text-slate-400 font-bold text-lg'
                }`}>
                  {size}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

        {/* --- PRIVACY & CONTROL SECTION --- */}
        <View className="mb-3 ml-2 flex-row items-center">
          <Ionicons name="shield-checkmark-outline" size={20} color="#f43f5e" />
          <Text className="text-xs font-black uppercase tracking-widest text-rose-500 dark:text-rose-400 ml-2">
            Data & Privacy
          </Text>
        </View>

        <View className="bg-white/70 dark:bg-slate-900/60 rounded-[2.5rem] p-3 shadow-xl shadow-slate-200/20 dark:shadow-black/20 border border-white/60 dark:border-slate-700/50 mb-8">
          
          {/* Clear Data Button */}
          <TouchableOpacity 
            activeOpacity={0.7}
            onPress={handleClearData}
            disabled={isProcessing}
            className="flex-row items-center justify-between p-5 border-b border-slate-200/50 dark:border-slate-700/50"
          >
            <View className="w-12 h-12 bg-orange-100 dark:bg-orange-500/20 rounded-2xl items-center justify-center mr-4">
              <Ionicons name="refresh" size={24} color="#ea580c" />
            </View>
            <View className="flex-1 pr-4">
              <Text className="font-black text-slate-800 dark:text-white text-xl mb-1">Reset Vault</Text>
              <Text className="text-slate-500 dark:text-slate-400 text-sm font-medium">Wipe your journal & logs.</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#94a3b8" />
          </TouchableOpacity>

          {/* Delete Account Button */}
          <TouchableOpacity 
            activeOpacity={0.7}
            onPress={handleDeleteAccount}
            disabled={isProcessing}
            className="flex-row items-center justify-between p-5"
          >
            <View className="w-12 h-12 bg-rose-100 dark:bg-rose-500/20 rounded-2xl items-center justify-center mr-4">
              {isProcessing ? (
                <ActivityIndicator color="#e11d48" />
              ) : (
                <Ionicons name="trash" size={24} color="#e11d48" />
              )}
            </View>
            <View className="flex-1 pr-4">
              <Text className="font-black text-rose-600 dark:text-rose-400 text-xl mb-1">Delete Account</Text>
              <Text className="text-slate-500 dark:text-slate-400 text-sm font-medium">Permanently erase identity.</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#94a3b8" />
          </TouchableOpacity>

        </View>

      </ScrollView>
    </ThemedView>
  );
}