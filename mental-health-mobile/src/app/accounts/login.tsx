import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import apiClient from '@/api/apiClient';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true })
    ]).start();
  }, []);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const response = await apiClient.post('/accounts/login/', { email, password });
      if (response.data.status === 'success') {
        await login(response.data.data.access, response.data.data.refresh);
        router.replace('/core/dashboard');
      }
    } catch (error: any) {
      Alert.alert('Login Failed', error.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 bg-[#fbe519]">
      <View className="flex-1 justify-center px-6">
        
        {/* Header */}
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }} className="items-center mb-8">
          <Text className="text-4xl font-serif font-bold text-blue-700 tracking-tight text-center">Welcome Home 🏡</Text>
          <Text className="text-amber-900 mt-2 text-base italic text-center">Take a deep breath and step inside. 🍃🍂</Text>
        </Animated.View>

        {/* Glass Card */}
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }} className="bg-white/60 border border-white/40 p-8 rounded-[40px] shadow-xl">
          
          <View className="items-center mb-8">
            <Text className="text-2xl font-black tracking-[0.2em] text-blue-900/90 uppercase">LOGIN</Text>
            <View className="h-1.5 w-10 bg-amber-400/60 rounded-full mt-3" />
          </View>

          <View className="space-y-4 mb-4">
            <View>
              <Text className="text-[10px] font-bold text-blue-900 uppercase tracking-widest ml-2 mb-2">Email</Text>
              <TextInput
                className="w-full bg-white/50 border border-stone-200/60 text-stone-800 px-6 py-4 rounded-2xl text-base"
                placeholder="hello@mentalhealth.com"
                placeholderTextColor="#a8a29e"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
              />
            </View>
            <View className="mt-4">
              <Text className="text-[10px] font-bold text-blue-900 uppercase tracking-widest ml-2 mb-2">Password</Text>
              <TextInput
                className="w-full bg-white/50 border border-stone-200/60 text-stone-800 px-6 py-4 rounded-2xl text-base"
                placeholder="••••••••"
                placeholderTextColor="#a8a29e"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>
          </View>

          <TouchableOpacity onPress={() => router.push('/accounts/forgot')} className="items-end mb-6 mt-2">
            <Text className="text-amber-800/80 font-bold text-xs">Forgot password?</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            className={`w-full py-4 rounded-2xl items-center shadow-lg ${loading ? 'bg-blue-800/70' : 'bg-blue-800'}`}
            onPress={handleLogin} disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fef3c7" /> : <Text className="text-amber-50 text-lg font-bold">Enter Space</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/accounts/register')} className="mt-8">
            <Text className="text-center text-stone-500/80 text-sm">
              New here? <Text className="text-stone-800 font-bold underline">Join our community</Text>
            </Text>
          </TouchableOpacity>
        </Animated.View>

      </View>
    </KeyboardAvoidingView>
  );
}