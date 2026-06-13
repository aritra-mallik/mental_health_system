import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity,  
  Platform, 
  Animated, 
  ScrollView,
  Image,
  ActivityIndicator,
  Modal
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router'; 
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useAuth } from '@/context/AuthContext'; 
import { Button } from 'heroui-native';
import { 
  ShieldCheck, 
  Bot, 
  KeyRound, 
  HeartHandshake, 
  UserCheck, 
  Check, 
  AlertCircle, 
  CheckCircle2 
} from 'lucide-react-native';
import apiClient from '@/api/apiClient';


// --- Static Policy Data ---
const POLICIES = [
  {
    icon: ShieldCheck,
    title: "Privacy & Data Policy",
    desc: "Your data remains a private reflection of your personal growth and is guarded securely."
  },
  {
    icon: Bot,
    title: "AI Boundary Rules",
    desc: "Artificial Intelligence contextually assists your journey but is not a medical practitioner."
  },
  {
    icon: KeyRound,
    title: "Secure Storage",
    desc: "I consent to the secure, zero-knowledge local encryption and protected cloud storage."
  },
  {
    icon: HeartHandshake,
    title: "Support Framework",
    desc: "This platform delivers strictly non-clinical emotional support and does not replace psychiatric care."
  },
  {
    icon: UserCheck,
    title: "Age Declaration",
    desc: "Access requires all users to be legally 16 years of age or older to maintain platform safety."
  }
];

export default function ConsentScreen() {
  const router = useRouter();
  const { login } = useAuth();
  
  const { access, refresh } = useLocalSearchParams<{ access: string, refresh: string }>();
  
  // --- State ---
  const [hasConsented, setHasConsented] = useState(false);
  const [loading, setLoading] = useState(false);

  // --- Custom Alert State ---
  const [alertConfig, setAlertConfig] = useState({ 
    visible: false, 
    title: '', 
    message: '', 
    type: 'error',
    onConfirm: () => {} 
  });

  // --- Animations ---
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideDownAnim = useRef(new Animated.Value(-60)).current;
  const slideUpAnim = useRef(new Animated.Value(60)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.timing(slideDownAnim, { toValue: 0, duration: 900, useNativeDriver: true }),
      Animated.timing(slideUpAnim, { toValue: 0, duration: 900, useNativeDriver: true })
    ]).start();
  }, []);

  // --- Helpers ---
  const showAlert = (title: string, message: string, type: 'error' | 'success' = 'error', onConfirm = () => {}) => {
    setAlertConfig({ visible: true, title, message, type, onConfirm });
  };

  const closeAlert = () => {
    const action = alertConfig.onConfirm;
    setAlertConfig(prev => ({ ...prev, visible: false }));
    if (action) action();
  };

  // --- API Call ---
  const handleConsentSubmit = async () => {
    if (!hasConsented) {
      showAlert('Consent Required', 'You must accept the terms and policies before continuing your journey.');
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.patch('/user/consent/', 
        { consent_all_policies: true },
        { headers: { Authorization: `Bearer ${access}` } } 
      );
      
      if (access && refresh) {
        await login(access, refresh);
      }

      router.replace('/core/dashboard');
      
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to record your consent. Please try again.';
      showAlert('Submission Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F4E4DB' }}>
      <KeyboardAwareScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, paddingTop: 60, paddingBottom: 100 }} 
        showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" enableOnAndroid={true}
        extraScrollHeight={20} enableAutomaticScroll={true}>
          
          <View className="flex-1">
            
            {/* TOP HALF: Slides DOWN into place */}
            <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideDownAnim }] }}>
              
              {/* Top Illustration Image */}
              <View className="items-center mb-6">
                <Image 
                  // UPDATE THIS PATH to match your downloaded consent image
                  source={require('@/assets/images/consent_image.png')} 
                  style={{ width: '100%', height: 180, resizeMode: 'contain' }}
                />
              </View>

              {/* Header Text */}
              <View className="mb-8 items-center">
                <Text className="text-[36px] font-black text-[#4A3623] tracking-tight mb-2 leading-tight text-center">
                  Gentle Consent
                </Text>
                <Text className="text-base text-[#6F4E37] font-medium leading-relaxed text-center px-4">
                  Your journey is safe with us. Please review and accept our global care policies below.
                </Text>
              </View>
            </Animated.View>

            {/* BOTTOM HALF: Slides UP into place */}
            <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideUpAnim }] }}>
              
              {/* Policy List */}
              <View className="mb-8 space-y-6">
                {POLICIES.map((policy, index) => {
                  const Icon = policy.icon;
                  return (
                    <View key={index} className="flex-row items-start pr-4">
                      <View className="w-12 h-12 rounded-2xl bg-[#6F4E37]/10 items-center justify-center mr-4 border border-[#6F4E37]/20">
                        <Icon size={24} color="#4A3623" />
                      </View>
                      <View className="flex-1 pt-1">
                        <Text className="text-base font-black text-[#4A3623] tracking-wide mb-1 uppercase">
                          {policy.title}
                        </Text>
                        <Text className="text-sm text-[#6F4E37] font-medium leading-relaxed">
                          {policy.desc}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>

              {/* Master Checkbox Box */}
              <TouchableOpacity 
                activeOpacity={0.8}
                onPress={() => setHasConsented(!hasConsented)}
                className={`flex-row items-center p-5 rounded-2xl border-2 mb-8 ${hasConsented ? 'border-[#69A283] bg-[#69A283]/10' : 'border-[#6F4E37]/30 bg-transparent'}`}
              >
                <View className={`w-7 h-7 rounded-lg border-2 mr-4 items-center justify-center ${hasConsented ? 'border-[#69A283] bg-[#69A283]' : 'border-[#8A7362] bg-transparent'}`}>
                  {hasConsented && <Check size={16} color="#FFFFFF" strokeWidth={3.5} />}
                </View>
                <Text className="flex-1 text-sm font-bold text-[#4A3623] leading-tight">
                  I explicitly accept all the terms, data storage declarations, AI tracking frameworks, and confirm I am 16 years of age or older.
                </Text>
              </TouchableOpacity>

              {/* Submit Button (Using HeroUI native) */}
              <TouchableOpacity 
                className="w-full py-4 rounded-full items-center shadow-md shadow-black/10 mb-4"
                style={{ backgroundColor: '#4A3623' }} 
                onPress={handleConsentSubmit} 
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#F4E4DB" />
                ) : (
                  <Text className="text-white text-lg font-bold tracking-widest uppercase">
                    I'm Ready to Begin
                  </Text>
                )}
              </TouchableOpacity>

              <Text className="text-center text-sm text-[#6F4E37] font-bold italic mt-2 mb-6">
                Step forward into your growth.
              </Text>

            </Animated.View>

          </View>
      </KeyboardAwareScrollView>

      {/* --- CUSTOM ALERT MODAL --- */}
      <Modal visible={alertConfig.visible} transparent animationType="fade">
        <View className="flex-1 bg-black/40 justify-center items-center px-6">
          <View className="bg-[#F4E4DB] w-full rounded-[28px] p-6 items-center shadow-2xl">
            
            {/* Dynamic Icon based on Success/Error */}
            <View className={`w-16 h-16 rounded-full items-center justify-center mb-4 ${alertConfig.type === 'error' ? 'bg-rose-100' : 'bg-emerald-100'}`}>
              {alertConfig.type === 'error' 
                ? <AlertCircle size={32} color="#f43f5e" /> 
                : <CheckCircle2 size={32} color="#10b981" />
              }
            </View>
            
            <Text className="text-xl font-black text-[#4A3623] mb-2 text-center tracking-tight">
              {alertConfig.title}
            </Text>
            
            <Text className="text-base text-[#6F4E37] text-center leading-relaxed mb-8 px-2">
              {alertConfig.message}
            </Text>
            
            <TouchableOpacity 
              className="w-full py-4 rounded-full items-center"
              style={{ backgroundColor: '#4A3623' }}
              onPress={closeAlert}
            >
              <Text className="text-white text-base font-bold tracking-widest uppercase">Got It</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}