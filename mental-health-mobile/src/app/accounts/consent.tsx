import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, ScrollView, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import apiClient from '@/api/apiClient';

export default function ConsentScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [policies, setPolicies] = useState({ data: false, ai: false, encryption: false, terms: false });

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true })
    ]).start();
  }, []);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await apiClient.patch('/user/consent/', {
        consent_data_policy: policies.data,
        consent_ai_policy: policies.ai,
        consent_encryption: policies.encryption,
        consent_terms: policies.terms
      });
      router.replace('/accounts/login'); 
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to save consent.');
    } finally {
      setLoading(false);
    }
  };

  const CustomCheckbox = ({ textNormal, textBold, textAfter, isChecked, onPress }: any) => (
    <TouchableOpacity className="flex-row items-start mb-6 pr-4" onPress={onPress} activeOpacity={0.7}>
      <View className={`w-6 h-6 rounded-lg border-2 mt-0.5 mr-4 items-center justify-center ${isChecked ? 'bg-[#588157] border-[#3a5a40]' : 'bg-white/60 border-[#a3b18a]'}`}>
        {isChecked && <Text className="text-white text-xs font-black">✓</Text>}
      </View>
      <Text className="flex-1 text-base leading-relaxed text-[#344e41]">
        {textNormal} <Text className="font-bold text-[#3a5a40]">{textBold}</Text> {textAfter}
      </Text>
    </TouchableOpacity>
  );

  const allChecked = policies.data && policies.ai && policies.encryption && policies.terms;

  return (
    <ScrollView className="flex-1 bg-[#bbfd36]" contentContainerStyle={{ padding: 24, paddingVertical: 60, justifyContent: 'center', flexGrow: 1 }}>
      
      {/* Header */}
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }} className="items-center mb-12">
        <Text className="text-4xl font-serif font-bold text-[#344e41] tracking-tight text-center">Gentle Consent 🍂</Text>
        <Text className="text-[#588157] mt-3 text-lg italic text-center px-4">Your journey is safe with us. Please take a moment to review our care policies.</Text>
      </Animated.View>

      {/* Glass Card */}
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }} className="bg-white/40 border border-white/60 p-8 rounded-[48px] shadow-2xl">
        
        <View className="items-center mb-8">
          <Text className="text-2xl font-black tracking-[0.2em] text-[#13481c] uppercase">USER CONSENT</Text>
          <View className="h-1.5 w-10 bg-[#cdf006] rounded-full mt-3" />
        </View>

        <View className="mb-4">
          <CustomCheckbox 
            textNormal="I agree to the" textBold="Privacy Policy." textAfter="My data is a private reflection of my growth."
            isChecked={policies.data} onPress={() => setPolicies(p => ({...p, data: !p.data}))} 
          />
          <CustomCheckbox 
            textNormal="I accept that" textBold="AI assistance" textAfter="helps guide my experience, but is not a doctor."
            isChecked={policies.ai} onPress={() => setPolicies(p => ({...p, ai: !p.ai}))} 
          />
          <CustomCheckbox 
            textNormal="I consent to" textBold="Encrypted Storage," textAfter="ensuring my words stay only between us."
            isChecked={policies.encryption} onPress={() => setPolicies(p => ({...p, encryption: !p.encryption}))} 
          />
          <CustomCheckbox 
            textNormal="I agree to the" textBold="Terms of Service" textAfter="for this supportive space."
            isChecked={policies.terms} onPress={() => setPolicies(p => ({...p, terms: !p.terms}))} 
          />
        </View>

        <TouchableOpacity 
          className={`w-full py-5 rounded-[32px] items-center shadow-lg mt-4 ${loading || !allChecked ? 'bg-[#3a5a40]/50' : 'bg-[#3a5a40]'}`} 
          onPress={handleSubmit} disabled={loading || !allChecked}
        >
          {loading ? <ActivityIndicator color="#f1f5e9" /> : <Text className="text-[#f1f5e9] text-xl font-bold tracking-wide">I'm Ready to Begin</Text>}
        </TouchableOpacity>
        
        <Text className="text-center mt-5 text-sm text-[#588157]/80 italic font-medium">Step forward into your growth.</Text>

      </Animated.View>
    </ScrollView>
  );
}