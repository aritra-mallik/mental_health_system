import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, Animated } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import apiClient from '@/api/apiClient';

export default function OtpScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams(); 
  const { login } = useAuth();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true })
    ]).start();
  }, []);

  const handleVerify = async () => {
    setLoading(true);
    try {
      const response = await apiClient.post('/accounts/verify-otp/', { email: email, email_otp: otp });
      if (response.data.status === 'success') {
        await login(response.data.data.tokens.access, response.data.data.tokens.refresh);
        router.replace('/accounts/consent'); 
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-[#5272ff] px-6 justify-center">
      
      {/* Header */}
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }} className="items-center mb-10">
        <Text className="text-4xl font-serif font-bold text-orange-900 tracking-tight text-center">Just One More Step 🪜</Text>
        <Text className="text-yellow-200 mt-3 text-base italic text-center">We've sent a whisper your way.{'\n'}Please verify it's you.</Text>
      </Animated.View>

      {/* Glass Card */}
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }} className="bg-white/60 border border-white/40 p-8 rounded-[40px] shadow-2xl">
        
        <View className="text-center mb-8 items-center">
          <Text className="text-2xl font-black tracking-[0.2em] text-violet-800/90 uppercase">VERIFY OTP</Text>
          <View className="h-1.5 w-10 bg-amber-600 rounded-full mt-3" />
        </View>

        <View className="bg-stone-100/50 p-4 rounded-2xl border border-stone-200/50 mb-6 flex-row justify-between items-center">
          <Text className="text-[10px] font-bold text-violet-600 uppercase tracking-widest">Email</Text>
          <Text className="text-stone-600 text-sm font-medium">{email}</Text>
        </View>

        <View className="mb-6">
          <Text className="text-[10px] font-bold text-amber-900 uppercase tracking-widest ml-2 mb-2">Email Code</Text>
          <TextInput
            className="w-full bg-white/40 border border-stone-200/60 px-6 py-5 rounded-2xl text-center text-2xl font-mono tracking-[12px] text-stone-800"
            placeholder="••••••"
            placeholderTextColor="#d6d3d1"
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            maxLength={6}
          />
        </View>

        <TouchableOpacity 
          className={`w-full py-4 rounded-2xl items-center shadow-lg ${loading || otp.length < 6 ? 'bg-purple-800/50' : 'bg-purple-800'}`}
          onPress={handleVerify} disabled={loading || otp.length < 6}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text className="text-amber-50 text-lg font-bold">Verify & Continue</Text>}
        </TouchableOpacity>

      </Animated.View>
    </View>
  );
}