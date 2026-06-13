import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform, 
  Animated, 
  ScrollView,
  ActivityIndicator,
  Image,
  Modal
} from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from 'heroui-native';
import { Mail, AlertCircle } from 'lucide-react-native';
import apiClient from '@/api/apiClient';

// --- Reusable Custom Input matching the Video/Image UI ---
const CustomInput = ({ icon: Icon, placeholder, value, onChangeText, keyboardType, autoCapitalize }: any) => (
  <View className="flex-row items-center border-[1.5px] border-[#6F4E37]/20 bg-transparent rounded-full h-14 px-4 mb-4">
    <Icon size={20} color="#8A7362" />
    <Text className="text-[#8A7362]/30 text-2xl font-light mx-3 pb-1">|</Text>
    <TextInput
      className="flex-1 text-[#4A3623] font-medium text-base h-full"
      placeholder={placeholder}
      placeholderTextColor="#8A7362"
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
    />
  </View>
);

export default function ForgotPasswordScreen() {
  const router = useRouter();
  
  // --- State ---
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  // --- Custom Alert State ---
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '' });

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

  const showAlert = (title: string, message: string) => {
    setAlertConfig({ visible: true, title, message });
  };

  const closeAlert = () => setAlertConfig(prev => ({ ...prev, visible: false }));

  const handleSendCode = async () => {
    if (!email) {
      showAlert('Missing Email', 'Please enter your registered email address to continue.');
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.post('/accounts/password-reset/', { email });
      if (response.data.status === 'success') {
        router.push({ pathname: '/accounts/reset', params: { email } });
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to send recovery code. Please check the email and try again.';
      showAlert('Request Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F4E4DB' }}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView 
          // Massive paddingBottom ensures keyboard has space to push inputs upward
          contentContainerStyle={{ flexGrow: 1, padding: 24, paddingTop: 60, paddingBottom: 180 }} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets={true}
        >
          <View className="flex-1 justify-center">
            
            {/* TOP HALF: Slides DOWN into place */}
            <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideDownAnim }] }}>
              {/* Top Illustration Image */}
              <View className="items-center mb-8">
                <Image 
                  // UPDATE THIS PATH to match where you saved the downloaded forgot password image
                  source={require('@/assets/images/forgot_image.png')} 
                  style={{ width: '100%', height: 220, resizeMode: 'contain' }}
                />
              </View>

              {/* Header Text */}
              <View className="mb-10">
                <Text className="text-[34px] font-black text-[#4A3623] tracking-tight mb-2 leading-tight">
                  Password Assistance
                </Text>
                <Text className="text-base text-[#6F4E37] font-medium leading-relaxed pr-4">
                  Enter the email address associated with your account
                </Text>
              </View>
            </Animated.View>

            {/* BOTTOM HALF: Slides UP into place */}
            <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideUpAnim }] }}>
              
              {/* Email Field */}
              <View className="mb-6">
                <CustomInput 
                  icon={Mail} 
                  placeholder="Email" 
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              {/* Continue Button (Using HeroUI native) */}
              <TouchableOpacity 
                className="w-full h-14 rounded-full items-center justify-center shadow-md shadow-black/10"
                style={{ backgroundColor: '#4A3623' }} // Solid theme color
                onPress={handleSendCode} 
                disabled={loading || !email}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#F4E4DB" /> // Rotating spinner
                ) : (
                  <Text className="text-white text-lg font-bold tracking-widest uppercase">
                    Continue
                  </Text>
                )}
              </TouchableOpacity>

              {/* Go Back Link */}
              <TouchableOpacity onPress={() => router.push('/accounts/login')} className="mt-8 items-center" activeOpacity={0.6}>
                <Text className="text-[#625505] font-bold text-base underline">
                  Go Back
                </Text>
              </TouchableOpacity>
            </Animated.View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* --- CUSTOM ALERT MODAL --- */}
      <Modal visible={alertConfig.visible} transparent animationType="fade">
        <View className="flex-1 bg-black/40 justify-center items-center px-6">
          <View className="bg-[#F4E4DB] w-full rounded-[28px] p-6 items-center shadow-2xl">
            <View className="w-16 h-16 rounded-full items-center justify-center mb-4 bg-rose-100">
              <AlertCircle size={32} color="#f43f5e" /> 
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