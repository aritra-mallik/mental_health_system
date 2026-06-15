import React from 'react';
import { View, TouchableOpacity, ScrollView, Animated, Dimensions, useColorScheme, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface SidebarProps {
  slideAnim: Animated.Value;
  toggleSidebar: () => void;
  logout: () => void;
}

export default function Sidebar({ slideAnim, toggleSidebar, logout }: SidebarProps) {
  const router = useRouter();
  
  // We keep this ONLY for passing explicit hex colors to the Ionicons component.
  // All backgrounds, borders, and text are now handled cleanly by Uniwind's dark: classes!
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const handleNavigation = (path: any) => {
    toggleSidebar();
    router.push(path);
  };

  const NavItem = ({ 
    icon, 
    label, 
    onPress, 
    isDestructive = false 
  }: { 
    icon: keyof typeof Ionicons.glyphMap, 
    label: string, 
    onPress: () => void, 
    isDestructive?: boolean 
  }) => (
    <TouchableOpacity 
      activeOpacity={0.7}
      onPress={onPress} 
      className={`flex-row items-center p-4 mb-3 rounded-2xl border ${
        isDestructive 
          ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-100 dark:border-rose-500/20' 
          : 'bg-stone-50 dark:bg-stone-800/40 border-stone-100 dark:border-stone-700/50'
      }`}>
      <View className={`w-10 h-10 rounded-xl items-center justify-center mr-4 ${
        isDestructive 
          ? 'bg-rose-100 dark:bg-rose-500/20' 
          : 'bg-indigo-50 dark:bg-stone-700/50'
      }`}>
        <Ionicons 
          name={icon} 
          size={20} 
          color={isDestructive ? (isDark ? '#f43f5e' : '#e11d48') : (isDark ? '#818cf8' : '#4f46e5')}/>
      </View>
      
      {/* Refactored to use standard Tailwind dark: modifiers */}
      <Text className={`text-base font-bold flex-1 ${
        isDestructive 
          ? 'text-rose-600 dark:text-rose-500' 
          : 'text-stone-700 dark:text-stone-200'
      }`}>
        {label}
      </Text>
      
      <Ionicons 
        name="chevron-forward" 
        size={18} 
        color={isDestructive ? (isDark ? 'rgba(244, 63, 94, 0.5)' : 'rgba(225, 29, 72, 0.5)') : (isDark ? '#475569' : '#cbd5e1')}/>
    </TouchableOpacity>
  );

  return (
    <Animated.View 
      className="absolute top-0 left-0 bottom-0 z-20 border-r border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-2xl"
      style={{ 
        width: width * 0.75,
        transform: [{ translateX: slideAnim }]
      }}
    >
      
      {/* --- Beautiful Header Section --- */}
      <View className="px-6 pt-16 pb-8 border-b border-stone-100 dark:border-stone-800 bg-white/95 dark:bg-stone-900/95 relative overflow-hidden">
        {/* Subtle background glow */}
        <View className="absolute -top-10 -left-10 w-32 h-32 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full blur-3xl" />
        
        <View className="flex-row justify-between items-center mb-6 z-10">
          <View className="w-12 h-12 bg-indigo-50 dark:bg-indigo-500/20 rounded-2xl items-center justify-center border border-indigo-100 dark:border-indigo-500/30">
            <Ionicons name="leaf" size={24} color={isDark ? '#818cf8' : '#4f46e5'} />
          </View>
          <TouchableOpacity 
            onPress={toggleSidebar}
            className="w-10 h-10 bg-stone-50 dark:bg-stone-800 rounded-full items-center justify-center border border-stone-200 dark:border-stone-700 shadow-sm">
            <Ionicons name="close" size={20} color={isDark ? '#94a3b8' : '#64748b'} />
          </TouchableOpacity>
        </View>
        <Text className="text-3xl font-black text-stone-900 dark:text-white tracking-tight z-10">Smera</Text>
        <Text className="text-sm font-medium text-stone-500 dark:text-stone-400 mt-1 z-10">Your personal sanctuary</Text>
      </View>
      
      {/* --- Scrollable Menu Content --- */}
      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ padding: 20, paddingBottom: 60 }} 
        showsVerticalScrollIndicator={false}>
        
        <Text className="text-[10px] font-black text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-3 ml-2 mt-2">Account</Text>
        <NavItem 
          icon="person-outline" 
          label="My Profile" 
          onPress={() => handleNavigation('/user_control/profile')}/>
        <NavItem 
          icon="settings-outline" 
          label="Settings" 
          onPress={() => handleNavigation('/user_control/settings')}/>
        <NavItem 
          icon="shield-checkmark-outline" 
          label="Security & Consent" 
          onPress={() => handleNavigation('/user_control/consent')}/>

        <View className="h-4" />

        <Text className="text-[10px] font-black text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-3 ml-2">Data & Session</Text>
        <NavItem 
          icon="download-outline" 
          label="Export Data" 
          onPress={() => handleNavigation('/user_control/export')}/>
        <NavItem 
          icon="information-circle-outline" 
          label="App Info" 
          onPress={() => handleNavigation('/about')}/>
        
        <View className="h-6" />
        
        {/* Destructive Logout Button */}
        <NavItem 
          icon="log-out-outline" 
          label="Log Out" 
          onPress={logout} 
          isDestructive={true}/>
        
      </ScrollView>
    </Animated.View>
  );
}