import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, Animated } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import apiClient from '@/api/apiClient';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams(); 
  
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true })
    ]).start();
  }, []);

  // Password Strength Calculator
  const handlePasswordChange = (val: string) => {
    setNewPassword(val);
    if (!val) {
      setPasswordStrength(0);
      return;
    }
    let strength = 0;
    if (val.length >= 8) strength += 1;
    if (/[a-z]/.test(val) && /[A-Z]/.test(val)) strength += 1;
    if (/\d/.test(val)) strength += 1;
    if (/[^a-zA-Z\d]/.test(val)) strength += 1;
    setPasswordStrength(strength);
  };

  const getStrengthUI = () => {
    if (passwordStrength === 0) return { colors: ['bg-stone-300', 'bg-stone-300', 'bg-stone-300', 'bg-stone-300'], text: '', textColor: '' };
    if (passwordStrength === 1) return { colors: ['bg-red-500', 'bg-stone-300', 'bg-stone-300', 'bg-stone-300'], text: 'WEAK', textColor: 'text-red-500' };
    if (passwordStrength === 2) return { colors: ['bg-amber-400', 'bg-amber-400', 'bg-stone-300', 'bg-stone-300'], text: 'FAIR', textColor: 'text-amber-500' };
    if (passwordStrength === 3) return { colors: ['bg-blue-500', 'bg-blue-500', 'bg-blue-500', 'bg-stone-300'], text: 'GOOD', textColor: 'text-blue-600' };
    return { colors: ['bg-green-500', 'bg-green-500', 'bg-green-500', 'bg-green-500'], text: 'STRONG', textColor: 'text-green-600' };
  };

  const strengthUI = getStrengthUI();

  const handleReset = async () => {
    setLoading(true);
    try {
      const response = await apiClient.post('/accounts/password-reset-confirm/', { email, otp, new_password: newPassword });
      if (response.data.status === 'success') {
        Alert.alert('Success', 'Password updated successfully!');
        router.replace('/accounts/login'); 
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-[#ea5b09] justify-center px-6">
      
      {/* Header */}
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }} className="items-center mb-10">
        <Text className="text-4xl font-serif font-bold text-[#044b01] tracking-tight text-center">Set a New Path 💐</Text>
        <Text className="text-[#9a3412] mt-3 text-base italic text-center font-medium">Enter the code we sent and{'\n'}choose a fresh password.</Text>
      </Animated.View>

      {/* Glass Card */}
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }} className="bg-white/60 border border-white/40 p-8 rounded-[40px] shadow-2xl">
        
        <View className="items-center mb-8">
          <Text className="text-2xl font-black tracking-[0.27em] text-amber-900/90 uppercase text-center">RESET PASSWORD</Text>
          <View className="h-1.5 w-10 bg-amber-400/40 rounded-full mt-3" />
        </View>

        <View className="mb-4">
          <Text className="text-[10px] font-bold text-[#9a3412] uppercase tracking-widest ml-2 mb-2">Verification Code</Text>
          <TextInput
            className="w-full bg-white/50 border border-orange-200/60 text-[#7c2d12] px-6 py-4 rounded-2xl text-2xl text-center font-mono tracking-widest"
            placeholder="••••••"
            placeholderTextColor="#fed7aa"
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            maxLength={6}
          />
        </View>

        <View className="mb-8">
          <Text className="text-[10px] font-bold text-[#9a3412] uppercase tracking-widest ml-2 mb-2">New Password</Text>
          <TextInput
            className="w-full bg-white/50 border border-orange-200/60 text-[#7c2d12] px-6 py-4 rounded-2xl text-base"
            placeholder="••••••••"
            placeholderTextColor="#fed7aa"
            value={newPassword}
            onChangeText={handlePasswordChange}
            secureTextEntry
          />
          
          {/* Dynamic Password Strength Indicator */}
          {newPassword.length > 0 && (
            <View className="mt-3 px-2">
              <View className="flex-row gap-1.5 h-1.5 w-full rounded-full overflow-hidden mb-1">
                <View className={`h-full w-1/4 ${strengthUI.colors[0]}`} />
                <View className={`h-full w-1/4 ${strengthUI.colors[1]}`} />
                <View className={`h-full w-1/4 ${strengthUI.colors[2]}`} />
                <View className={`h-full w-1/4 ${strengthUI.colors[3]}`} />
              </View>
              <Text className={`text-[10px] font-bold uppercase tracking-wider text-right ${strengthUI.textColor}`}>
                {strengthUI.text}
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity 
          className={`w-full py-4 rounded-2xl items-center shadow-lg ${loading || otp.length < 6 || !newPassword ? 'bg-[#7c2d12]/60' : 'bg-[#7c2d12]'}`}
          onPress={handleReset} 
          disabled={loading || otp.length < 6 || !newPassword}
        >
          {loading ? <ActivityIndicator color="#fff7ed" /> : <Text className="text-orange-50 text-lg font-bold">Update Password</Text>}
        </TouchableOpacity>

        <View className="mt-6 text-center">
          <Text className="text-sm text-[#9a3412]/70 italic text-center">
            Gain the freedom to explore again. Your new password is the key to your journey forward. 🔑✨
          </Text>
        </View>

      </Animated.View>
    </View>
  );
}