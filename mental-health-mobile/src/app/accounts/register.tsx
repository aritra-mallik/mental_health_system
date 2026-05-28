import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import apiClient from '@/api/apiClient';

export default function RegisterScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ 
    first_name: '', middle_name: '', last_name: '', 
    email: '', password: '', confirm_password: '',
    date_of_birth: '', gender: ''
  });

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true })
    ]).start();
  }, []);

  const handleRegister = async () => {
    setLoading(true);
    try {
      const response = await apiClient.post('/accounts/register/', formData);
      if (response.data.status === 'success') {
        router.push({ pathname: '/accounts/otp', params: { email: formData.email } });
      }
    } catch (error: any) {
      let errorMessage = 'Registration failed';
      if (error.response?.data?.errors) {
        const errors = error.response.data.errors;
        const firstErrorKey = Object.keys(errors)[0];
        errorMessage = errors[firstErrorKey][0];
      }
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-[#cd4fff]" contentContainerStyle={{ padding: 24, paddingVertical: 60 }}>
      
      {/* Header */}
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }} className="items-center mb-10">
        <Text className="text-4xl font-serif font-bold text-green-900 tracking-tight text-center">Begin Journey 🧠</Text>
        <Text className="text-amber-200 mt-2 text-base italic text-center">We're glad you're here. Tell us about yourself.</Text>
      </Animated.View>

      {/* Glass Card */}
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }} className="bg-white/60 border border-white/40 p-6 sm:p-8 rounded-[40px] shadow-xl">
        
        <View className="items-center mb-8">
          <Text className="text-2xl font-black tracking-[0.2em] text-green-900/90 uppercase">REGISTER</Text>
          <View className="h-1.5 w-10 bg-amber-400/60 rounded-full mt-3" />
        </View>

        <View className="space-y-4 mb-6">
          
          {/* Names Row 1 */}
          <View className="flex-row gap-x-3 mb-4">
            <View className="flex-1">
              <Text className="text-[10px] font-bold text-green-900 uppercase tracking-widest ml-2 mb-1">First Name</Text>
              <TextInput className="bg-white/50 border border-stone-200/60 text-stone-800 px-5 py-3 rounded-xl" onChangeText={(t) => setFormData({...formData, first_name: t})} />
            </View>
            <View className="flex-1">
              <Text className="text-[10px] font-bold text-green-900 uppercase tracking-widest ml-2 mb-1">Last Name</Text>
              <TextInput className="bg-white/50 border border-stone-200/60 text-stone-800 px-5 py-3 rounded-xl" onChangeText={(t) => setFormData({...formData, last_name: t})} />
            </View>
          </View>

          {/* Names Row 2 & Email */}
          <View className="mb-4">
            <Text className="text-[10px] font-bold text-green-900 uppercase tracking-widest ml-2 mb-1">Middle Name</Text>
            <TextInput className="bg-white/50 border border-stone-200/60 text-stone-800 px-5 py-3 rounded-xl" placeholder="Optional" placeholderTextColor="#a8a29e" onChangeText={(t) => setFormData({...formData, middle_name: t})} />
          </View>

          <View className="mb-4">
            <Text className="text-[10px] font-bold text-green-900 uppercase tracking-widest ml-2 mb-1">Email</Text>
            <TextInput className="bg-white/50 border border-stone-200/60 text-stone-800 px-5 py-3 rounded-xl" placeholder="you@email.com" placeholderTextColor="#a8a29e" autoCapitalize="none" keyboardType="email-address" onChangeText={(t) => setFormData({...formData, email: t})} />
          </View>
          
          {/* Passwords */}
          <View className="flex-row gap-x-3 mb-4">
            <View className="flex-1">
              <Text className="text-[10px] font-bold text-green-900 uppercase tracking-widest ml-2 mb-1">Password</Text>
              <TextInput className="bg-white/50 border border-stone-200/60 text-stone-800 px-5 py-3 rounded-xl" placeholder="••••••••" placeholderTextColor="#a8a29e" secureTextEntry onChangeText={(t) => setFormData({...formData, password: t})} />
            </View>
            <View className="flex-1">
              <Text className="text-[10px] font-bold text-green-900 uppercase tracking-widest ml-2 mb-1">Confirm</Text>
              <TextInput className="bg-white/50 border border-stone-200/60 text-stone-800 px-5 py-3 rounded-xl" placeholder="••••••••" placeholderTextColor="#a8a29e" secureTextEntry onChangeText={(t) => setFormData({...formData, confirm_password: t})} />
            </View>
          </View>

          {/* Date of Birth & Gender */}
          <View className="flex-row gap-x-3">
            <View className="flex-1">
              <Text className="text-[10px] font-bold text-green-900 uppercase tracking-widest ml-2 mb-1">Birth Date</Text>
              <TextInput className="bg-white/50 border border-stone-200/60 text-stone-800 px-5 py-3 rounded-xl" placeholder="YYYY-MM-DD" placeholderTextColor="#a8a29e" onChangeText={(t) => setFormData({...formData, date_of_birth: t})} />
            </View>
            <View className="flex-1">
              <Text className="text-[10px] font-bold text-green-900 uppercase tracking-widest ml-2 mb-1">Gender</Text>
              <TextInput className="bg-white/50 border border-stone-200/60 text-stone-800 px-5 py-3 rounded-xl" placeholder="male/female/other" placeholderTextColor="#a8a29e" autoCapitalize="none" onChangeText={(t) => setFormData({...formData, gender: t})} />
            </View>
          </View>

        </View>

        <TouchableOpacity 
          className={`w-full py-4 rounded-2xl items-center shadow-lg mt-4 ${loading ? 'bg-green-800/70' : 'bg-green-800'}`}
          onPress={handleRegister} disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fef3c7" /> : <Text className="text-amber-50 text-lg font-bold">Create Account</Text>}
        </TouchableOpacity>
        
        <TouchableOpacity onPress={() => router.back()} className="mt-8">
          <Text className="text-center text-stone-500/80 text-sm">
            Already part of the community? <Text className="text-green-800 font-bold underline">Log in</Text>
          </Text>
        </TouchableOpacity>

      </Animated.View>
    </ScrollView>
  );
}