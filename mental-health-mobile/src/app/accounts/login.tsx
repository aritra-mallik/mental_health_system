import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, Animated, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Card } from 'heroui-native';
import { useAuth } from '@/context/AuthContext';
import apiClient from '@/api/apiClient';

// --- Password Strength Utility ---
const checkPasswordStrength = (pass: string) => {
  if (!pass) return { label: '', color: 'bg-transparent', textColor: 'text-transparent', width: 'w-0' };
  
  let score = 0;
  if (pass.length >= 6) score += 1;
  if (pass.length >= 8) score += 1;
  if (/[A-Z]/.test(pass)) score += 1;
  if (/[0-9]/.test(pass)) score += 1;
  if (/[^A-Za-z0-9]/.test(pass)) score += 1;

  if (score <= 2) return { label: 'Weak', color: 'bg-rose-500', textColor: 'text-rose-500', width: 'w-1/3' };
  if (score <= 4) return { label: 'Fair', color: 'bg-amber-500', textColor: 'text-amber-500', width: 'w-2/3' };
  return { label: 'Strong', color: 'bg-emerald-500', textColor: 'text-emerald-500', width: 'w-full' };
};

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  
  // --- State ---
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  // --- Animations ---
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true })
    ]).start();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Missing Fields', 'Please enter both email and password.');
      return;
    }

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

  const strength = checkPasswordStrength(password);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 bg-neutral-50 dark:bg-black">
      <ScrollView contentContainerClassName="flex-grow justify-center px-6 py-12" showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }} className="items-center mb-10">
          <Text className="text-4xl font-black text-neutral-900 dark:text-white tracking-tight text-center">
            Welcome Home 🏡
          </Text>
          <Text className="text-neutral-500 dark:text-neutral-400 mt-3 text-base italic text-center">
            Take a deep breath and step inside. 🍃
          </Text>
        </Animated.View>

        {/* HeroUI Card */}
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <Card className="p-8 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-[32px] shadow-sm dark:shadow-none">
            
            <View className="items-center mb-8">
              <Text className="text-2xl font-black tracking-[0.2em] text-neutral-900 dark:text-white uppercase">LOGIN</Text>
              <View className="h-1.5 w-10 bg-amber-500 rounded-full mt-3" />
            </View>

            <View className="space-y-5 mb-2">
              
              {/* Email Input */}
              <View>
                <Text className="text-[11px] font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-widest ml-2 mb-2">Email</Text>
                <TextInput
                  className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white px-5 py-4 rounded-2xl text-base"
                  placeholder="hello@mindfulspace.com"
                  placeholderTextColor="#a1a1aa"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              {/* Password Input */}
              <View>
                <Text className="text-[11px] font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-widest ml-2 mb-2">Password</Text>
                <View className="relative justify-center">
                  <TextInput
                    className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white px-5 py-4 pr-12 rounded-2xl text-base"
                    placeholder="••••••••"
                    placeholderTextColor="#a1a1aa"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!isPasswordVisible}
                  />
                  {/* Eye Toggle */}
                  <TouchableOpacity 
                    className="absolute right-4 p-2"
                    activeOpacity={0.7}
                    onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                  >
                    <Text className="text-xl">{isPasswordVisible ? '🙈' : '👁️'}</Text>
                  </TouchableOpacity>
                </View>

                {/* Password Strength Indicator */}
                {password.length > 0 && (
                  <View className="mt-3 px-1">
                    <View className="flex-row justify-between items-center mb-1.5">
                      <Text className="text-[10px] text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Strength</Text>
                      <Text className={`text-[10px] font-bold uppercase tracking-wider ${strength.textColor}`}>
                        {strength.label}
                      </Text>
                    </View>
                    <View className="h-1.5 w-full bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden flex-row">
                      <View className={`h-full rounded-full ${strength.color} ${strength.width}`} />
                    </View>
                  </View>
                )}
              </View>
            </View>

            <TouchableOpacity onPress={() => router.push('/accounts/forgot')} className="items-end mb-8 mt-4">
              <Text className="text-amber-600 dark:text-amber-500 font-bold text-md">Forgot password?</Text>
            </TouchableOpacity>

            {/* HeroUI Button */}
            <Button 
              color="primary"
              className="w-full rounded-2xl h-14"
              isLoading={loading}
              onPress={handleLogin} 
              isDisabled={loading}
            >
              <Text className="text-white text-base font-bold tracking-wide">ENTER SPACE</Text>
            </Button>

            <TouchableOpacity onPress={() => router.push('/accounts/register')} className="mt-8">
              <Text className="text-center text-neutral-500 dark:text-neutral-400 text-sm">
                New here? <Text className="text-amber-600 dark:text-amber-500 font-bold">Join our community</Text>
              </Text>
            </TouchableOpacity>

          </Card>
        </Animated.View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}