import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import apiClient from '@/api/apiClient';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
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

  const handleSendCode = async () => {
    setLoading(true);
    try {
      const response = await apiClient.post('/accounts/password-reset/', { email });
      if (response.data.status === 'success') {
        router.push({ pathname: '/accounts/reset', params: { email } });
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to send reset code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-[#af4304] justify-center px-6">
      
      {/* Header */}
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }} className="items-center mb-10">
        <Text className="text-4xl font-serif font-bold text-[#044b01] tracking-tight text-center">Regain Access 🥬</Text>
        <Text className="text-amber-200 mt-2 text-base italic text-center">It happens to the best of us.{'\n'}Let’s get you back in.</Text>
      </Animated.View>

      {/* Glass Card */}
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }} className="bg-white/60 border border-white/40 p-8 rounded-[40px] shadow-2xl">
        
        <View className="items-center mb-8">
          <Text className="text-2xl font-black tracking-[0.27em] text-amber-900/90 uppercase text-center">FORGOT PASSWORD</Text>
          <View className="h-1.5 w-10 bg-amber-400/60 rounded-full mt-3" />
        </View>

        <View className="mb-6">
          <Text className="text-[10px] font-bold text-[#9a3412] uppercase tracking-widest ml-2 mb-2">Enter Registered Email</Text>
          <TextInput
            className="w-full bg-white/50 border border-orange-400/60 text-[#7c2d12] px-6 py-4 rounded-2xl text-base"
            placeholder="yourname@university.edu"
            placeholderTextColor="#fed7aa"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <TouchableOpacity 
          className={`w-full py-4 rounded-2xl items-center shadow-lg mt-2 ${loading || !email ? 'bg-[#7c2d12]/60' : 'bg-[#7c2d12]'}`}
          onPress={handleSendCode} 
          disabled={loading || !email}
        >
          {loading ? <ActivityIndicator color="#fff7ed" /> : <Text className="text-orange-50 text-lg font-bold">Send Recovery Code</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()} className="mt-8 flex-row justify-center items-center">
          <Text className="text-center text-[#9a3412] font-bold">← Back to Login</Text>
        </TouchableOpacity>

      </Animated.View>
    </View>
  );
}