import React, { useState, useCallback } from 'react';
import { View, TextInput, TouchableOpacity, ActivityIndicator, useColorScheme, Modal, Text } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; // NEW: For navigation bar spacing
import { Ionicons } from '@expo/vector-icons';
import { Card, Button } from 'heroui-native';
import apiClient from '@/api/apiClient';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

type AlertType = 'success' | 'error' | 'warning' | null;

interface AlertConfig {
  visible: boolean;
  type: AlertType;
  title: string;
  message: string;
}

export default function ProfileScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets(); // Initialize insets
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  
  const [profile, setProfile] = useState({ 
    first_name: '', middle_name: '', last_name: '', 
    display_name: '', email: '', date_of_birth: '', gender: '', is_email_verified: false, age: '' 
  });
  
  const [passwords, setPasswords] = useState({ old_password: '', new_password: '' });
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [alertConfig, setAlertConfig] = useState<AlertConfig>({
    visible: false, type: null, title: '', message: ''
  });

  const showAlert = (type: AlertType, title: string, message: string) => {
    setAlertConfig({ visible: true, type, title, message });
  };

  const closeAlert = () => {
    setAlertConfig(prev => ({ ...prev, visible: false }));
  };

  useFocusEffect(useCallback(() => {
    const fetchProfile = async () => {
      try {
        const res = await apiClient.get('/user/profile/');
        setProfile(res.data);
      } catch (error) {
        console.log('Error fetching profile', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []));

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await apiClient.patch('/user/profile/', {
        first_name: profile.first_name,
        middle_name: profile.middle_name,
        last_name: profile.last_name,
      });
      showAlert('success', 'Profile Updated', 'Your identity details have been saved securely.');
    } catch (error) {
      showAlert('error', 'Update Failed', 'We encountered an issue saving your profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwords.old_password || !passwords.new_password) {
      return showAlert('warning', 'Missing Fields', 'Please enter both your current and new passwords.');
    }
    setPasswordSaving(true);
    try {
      await apiClient.post('/accounts/change-password/', passwords);
      showAlert('success', 'Security Updated', 'Your password has been changed securely.');
      setPasswords({ old_password: '', new_password: '' });
      setShowOldPassword(false);
      setShowNewPassword(false);
    } catch (error: any) {
      showAlert('error', 'Update Failed', error.response?.data?.message || 'Failed to change password. Please check your current password.');
    } finally {
      setPasswordSaving(false);
    }
  };

  const getPasswordStrength = (pass: string) => {
    let score = 0;
    if (!pass) return 0;
    if (pass.length > 5) score += 1;
    if (pass.length > 7) score += 1;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass) && /[^A-Za-z0-9]/.test(pass)) score += 1;
    return score;
  };

  const strength = getPasswordStrength(passwords.new_password);
  const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = ['bg-neutral-200 dark:bg-neutral-800', 'bg-rose-500', 'bg-orange-500', 'bg-amber-400', 'bg-emerald-500'];
  const activeColorClass = passwords.new_password ? (strengthColors[strength] || strengthColors[1]) : strengthColors[0];

  const getModalStyles = (type: AlertType) => {
    switch (type) {
      case 'success': return { icon: 'checkmark-circle', color: '#10b981', bg: 'bg-emerald-50 dark:bg-emerald-500/10', border: 'border-emerald-200 dark:border-emerald-500/30' };
      case 'error': return { icon: 'alert-circle', color: '#ef4444', bg: 'bg-rose-50 dark:bg-rose-500/10', border: 'border-rose-200 dark:border-rose-500/30' };
      case 'warning': return { icon: 'warning', color: '#f59e0b', bg: 'bg-amber-50 dark:bg-amber-500/10', border: 'border-amber-200 dark:border-amber-500/30' };
      default: return { icon: 'information-circle', color: '#64748b', bg: 'bg-neutral-100 dark:bg-neutral-800', border: 'border-neutral-200 dark:border-neutral-700' };
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-neutral-50 dark:bg-black">
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  const dynamicDisplayName = [profile.first_name, profile.middle_name, profile.last_name].filter(Boolean).join(' ') || profile.display_name || 'Anonymous User';
  const initial = dynamicDisplayName.charAt(0).toUpperCase();

  return (
    <View className="flex-1 bg-neutral-50 dark:bg-black">
      
      {/* CUSTOM THEMED MODAL */}
      <Modal transparent visible={alertConfig.visible} animationType="fade" onRequestClose={closeAlert}>
        <View className="flex-1 bg-black/60 items-center justify-center px-6">
          <Card className="w-full bg-white dark:bg-neutral-900 rounded-[2.5rem] p-8 items-center shadow-2xl border border-neutral-200 dark:border-neutral-800">
            
            {alertConfig.type && (
              <View className={`w-20 h-20 rounded-full items-center justify-center mb-6 border ${getModalStyles(alertConfig.type).bg} ${getModalStyles(alertConfig.type).border}`}>
                <Ionicons name={getModalStyles(alertConfig.type).icon as any} size={40} color={getModalStyles(alertConfig.type).color} />
              </View>
            )}

            <Text className="text-2xl font-black text-neutral-900 dark:text-white text-center mb-3 tracking-tight">{alertConfig.title}</Text>
            <Text className="text-neutral-500 dark:text-neutral-400 text-center font-medium leading-relaxed mb-8">{alertConfig.message}</Text>

            <View className="w-full flex-row gap-3">
              <Button color="default" className="w-full h-14 rounded-2xl bg-neutral-900 dark:bg-white" onPress={closeAlert}>
                <Text className="font-bold text-white dark:text-neutral-900">Close</Text>
              </Button>
            </View>

          </Card>
        </View>
      </Modal>

      <KeyboardAwareScrollView 
        showsVerticalScrollIndicator={false} 
        keyboardShouldPersistTaps="handled" 
        enableOnAndroid={true} 
        enableAutomaticScroll={true}
        extraScrollHeight={80}
        // FIX: Dynamically add the bottom inset padding to push content above the nav bar
        contentContainerStyle={{
          padding: 24,
          paddingTop: 64,
          paddingBottom: Math.max(insets.bottom + 40, 100) 
        }}
      >
        
        {/* HEADER */}
        <View className="flex-row justify-between items-center mb-8">
          <TouchableOpacity 
            onPress={() => router.back()}
            className="w-12 h-12 bg-white dark:bg-neutral-900 rounded-full items-center justify-center border border-neutral-200 dark:border-neutral-800 shadow-sm">
            <Ionicons name="arrow-back" size={24} color={isDark ? '#f8fafc' : '#0f172a'} />
          </TouchableOpacity>
          <Text className="text-4xl font-black text-neutral-900 dark:text-white tracking-tight">Profile</Text>
          <View className="w-12 h-12" /> 
        </View>

        {/* HERO IDENTITY CARD */}
        <Card className="bg-indigo-50 dark:bg-indigo-900/10 rounded-[3rem] p-8 mb-10 items-center shadow-sm dark:shadow-none border border-indigo-100 dark:border-indigo-500/20">
          <View className="w-28 h-28 rounded-full bg-white dark:bg-neutral-900 items-center justify-center mb-5 border border-neutral-200 dark:border-neutral-800 shadow-sm">
            <Text className="text-6xl font-black text-indigo-600 dark:text-indigo-400 text-center" maxFontSizeMultiplier={1.2} style={{ includeFontPadding: false, textAlignVertical: 'center' }}>
              {initial}
            </Text>
          </View>
          
          <Text className="text-3xl font-black text-neutral-900 dark:text-white mb-3 text-center tracking-tight">{dynamicDisplayName}</Text>
        
          <View className="flex-row items-center justify-between bg-white dark:bg-neutral-900 px-5 py-3 rounded-full mb-8 border border-neutral-200 dark:border-neutral-800 w-full shadow-sm">
            <View className="flex-row items-center flex-1 pr-3">
              <Ionicons name="mail" size={16} color={isDark ? '#818cf8' : '#4f46e5'} style={{ marginRight: 8 }} />
              <Text className="text-sm font-bold text-neutral-700 dark:text-neutral-300 flex-1" numberOfLines={1} ellipsizeMode="tail">{profile.email}</Text>
            </View>
            {profile.is_email_verified && <Ionicons name="checkmark-circle" size={20} color="#10b981" />}
          </View>

          <View className="flex-row flex-wrap gap-3 w-full justify-center mt-2">
            <View className="flex-row items-center bg-white dark:bg-neutral-900 py-3 px-5 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
              <Ionicons name="calendar" size={16} color={isDark ? '#94a3b8' : '#64748b'} style={{ marginRight: 6 }} />
              <Text className="text-sm font-bold text-neutral-700 dark:text-neutral-300">{profile.date_of_birth || 'N/A'}</Text>
            </View>
            <View className="flex-row items-center bg-white dark:bg-neutral-900 py-3 px-5 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
              <Ionicons name="hourglass" size={16} color={isDark ? '#94a3b8' : '#64748b'} style={{ marginRight: 6 }} />
              <Text className="text-sm font-bold text-neutral-700 dark:text-neutral-300">{profile.age ? `${profile.age} yrs` : 'N/A'}</Text>
            </View>
          </View>
        </Card>

        {/* UPDATE INFORMATION */}
        <View className="mb-2 ml-2 flex-row items-center">
          <Ionicons name="id-card" size={18} color={isDark ? '#818cf8' : '#4f46e5'} />
          <Text className="text-md font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 ml-2">Personal Details</Text>
        </View>
        
        <Card className="bg-white dark:bg-neutral-900 rounded-3xl p-5 mb-10 border border-neutral-200 dark:border-neutral-800 shadow-sm dark:shadow-none">
          <View className="flex-row items-center bg-neutral-50 dark:bg-neutral-800 rounded-2xl px-5 mb-4 border border-neutral-200 dark:border-neutral-700">
            <Ionicons name="person" size={18} color={isDark ? '#94a3b8' : '#cbd5e1'} />
            <TextInput 
              className="flex-1 py-4 px-4 text-neutral-900 dark:text-white font-bold text-base"
              value={profile.first_name} 
              onChangeText={(t) => setProfile({...profile, first_name: t})} 
              placeholder="First Name" 
              placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}/>
          </View>

          <View className="flex-row items-center bg-neutral-50 dark:bg-neutral-800 rounded-2xl px-5 mb-4 border border-neutral-200 dark:border-neutral-700">
            <Ionicons name="person" size={18} color={isDark ? '#94a3b8' : '#cbd5e1'} opacity={0.5} />
            <TextInput 
              className="flex-1 py-4 px-4 text-neutral-900 dark:text-white font-bold text-base"
              value={profile.middle_name} 
              onChangeText={(t) => setProfile({...profile, middle_name: t})} 
              placeholder="Middle Name (Optional)" 
              placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}/>
          </View>

          <View className="flex-row items-center bg-neutral-50 dark:bg-neutral-800 rounded-2xl px-5 mb-6 border border-neutral-200 dark:border-neutral-700">
            <Ionicons name="person" size={18} color={isDark ? '#94a3b8' : '#cbd5e1'} />
            <TextInput 
              className="flex-1 py-4 px-4 text-neutral-900 dark:text-white font-bold text-base"
              value={profile.last_name} 
              onChangeText={(t) => setProfile({...profile, last_name: t})} 
              placeholder="Last Name" 
              placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}/>
          </View>
          
          {/* FIX: Manual ActivityIndicator + Styling */}
          <Button 
            className="h-14 rounded-2xl bg-indigo-600"
            onPress={handleSaveProfile} 
            disabled={saving}>
            {saving ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <View className="flex-row items-center">
                <Ionicons name="save" size={20} color="#ffffff" style={{ marginRight: 6 }} />
                <Text className="text-white font-bold text-base tracking-wide">Save Identity</Text>
              </View>
            )}
          </Button>
        </Card>

        {/* SECURITY SECTION */}
        <View className="mb-2 ml-2 flex-row items-center">
          <Ionicons name="shield-checkmark" size={18} color={isDark ? '#facc15' : '#d97706'} />
          <Text className="text-md font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 ml-2">Security</Text>
        </View>

        <Card className="bg-white dark:bg-neutral-900 rounded-3xl p-5 shadow-sm dark:shadow-none border border-neutral-200 dark:border-neutral-800 mb-6">
          <View className="flex-row items-center bg-neutral-50 dark:bg-neutral-800 rounded-2xl px-5 mb-4 border border-neutral-200 dark:border-neutral-700">
            <Ionicons name="key" size={18} color={isDark ? '#94a3b8' : '#cbd5e1'} />
            <TextInput 
              className="flex-1 py-4 px-4 text-neutral-900 dark:text-white font-bold text-base"
              value={passwords.old_password} 
              onChangeText={(t) => setPasswords({...passwords, old_password: t})} 
              placeholder="Current Password" 
              secureTextEntry={!showOldPassword} 
              placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}/>
            <TouchableOpacity onPress={() => setShowOldPassword(!showOldPassword)} className="p-2">
              <Ionicons name={showOldPassword ? "eye-off" : "eye"} size={20} color={isDark ? '#94a3b8' : '#cbd5e1'} />
            </TouchableOpacity>
          </View>

          <View className="flex-row items-center bg-neutral-50 dark:bg-neutral-800 rounded-2xl px-5 border border-neutral-200 dark:border-neutral-700">
            <Ionicons name="lock-closed" size={18} color={isDark ? '#94a3b8' : '#cbd5e1'} />
            <TextInput 
              className="flex-1 py-4 px-4 text-neutral-900 dark:text-white font-bold text-base"
              value={passwords.new_password} 
              onChangeText={(t) => setPasswords({...passwords, new_password: t})} 
              placeholder="New Password" 
              secureTextEntry={!showNewPassword} 
              placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}/>
            <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)} className="p-2">
              <Ionicons name={showNewPassword ? "eye-off" : "eye"} size={20} color={isDark ? '#94a3b8' : '#cbd5e1'} />
            </TouchableOpacity>
          </View>

          <View className="px-1 mb-6 mt-4">
            <View className="flex-row gap-1.5 h-1.5 mb-2">
              {[1, 2, 3, 4].map((level) => (
                <View key={level} className={`flex-1 rounded-full transition-colors ${strength >= level ? activeColorClass : 'bg-neutral-200 dark:bg-neutral-800'}`} />
              ))}
            </View>
            {passwords.new_password.length > 0 && (
              <Text className="text-md font-bold text-neutral-500 dark:text-neutral-400 text-right">
                Strength: {strengthLabels[strength] || 'Weak'}
              </Text>
            )}
          </View>
          
          {/* FIX: Manual ActivityIndicator + Amber Styling */}
          <Button 
            className="h-14 rounded-2xl bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700"
            onPress={handleChangePassword} 
            disabled={passwordSaving}>
            {passwordSaving ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <View className="flex-row items-center">
                <Ionicons name="key" size={20} color="#ffffff" style={{ marginRight: 6 }} />
                <Text className="text-white font-bold text-base tracking-wide">Change Password</Text>
              </View>
            )}
          </Button>
        </Card>

      </KeyboardAwareScrollView>   
    </View>
  );
}