import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  Platform, 
  Animated, 
  ScrollView,
  Image,
  Modal,
  ActivityIndicator
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Button } from 'heroui-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { KeyRound, AlertCircle, CheckCircle2 } from 'lucide-react-native';
import apiClient from '@/api/apiClient';
import { useAuth } from '@/context/AuthContext';

// --- Reusable Custom Input matching the Video UI ---
const CustomInput = ({ icon: Icon, placeholder, value, onChangeText, keyboardType, maxLength, textAlign, style }: any) => (
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
      maxLength={maxLength}
      textAlign={textAlign}
      autoCapitalize="none"
      style={style}
    />
  </View>
);

export default function OtpScreen() {
  const router = useRouter();
  
  // Gets the email passed from the Register or Login Screen
  const { email } = useLocalSearchParams<{ email: string }>(); 
  
  // --- State ---
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

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
    if (action) action(); // Executes navigation if it's a success
  };

  // --- API Calls ---
  const handleVerify = async () => {
    if (otp.length < 6) {
      showAlert('Invalid Code', 'Please enter the full 6-digit verification code to continue.');
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.post('/accounts/verify-otp/', { 
        email, 
        email_otp: otp 
      });
      
      if (response.data.status === 'success') {
        // Extract tokens but DO NOT call login() here!
        const { access, refresh } = response.data.data.tokens;
        
        showAlert(
          'Verification Complete', 
          'Your email has been successfully verified! Let\'s proceed.', 
          'success',
          () => router.replace({ 
            pathname: '/accounts/consent', 
            params: { access, refresh } 
          })
        );
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Invalid verification code. Please check and try again.';
      showAlert('Verification Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    try {
      const response = await apiClient.post('/accounts/resend-otp/', { email });
      if (response.data.status === 'success') {
        showAlert('Code Resent', 'A fresh verification code has been sent to your email address.', 'success');
      }
    } catch (error: any) {
      showAlert('Resend Failed', error.response?.data?.message || 'Could not resend the code. Please try again later.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F4E4DB' }}>
      <KeyboardAwareScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, paddingTop: 60, paddingBottom: 100 }} 
        showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" enableOnAndroid={true}
        extraScrollHeight={20} enableAutomaticScroll={true}>

          <View className="flex-1 justify-center">
            
            {/* TOP HALF: Slides DOWN into place */}
            <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideDownAnim }] }}>
              {/* Top Illustration Image */}
              <View className="items-center mb-8">
                <Image 
                  // UPDATE THIS PATH to match your downloaded OTP image
                  source={require('@/assets/images/otp_image.png')} 
                  style={{ width: '100%', height: 220, resizeMode: 'contain' }}
                />
              </View>

              {/* Header Text */}
              <View className="mb-10 items-center">
                <Text className="text-[36px] font-black text-[#4A3623] tracking-tight mb-2 leading-tight text-center">
                  Verify Email
                </Text>
                <Text className="text-base text-[#6F4E37] font-medium leading-relaxed text-center px-4">
                  We've sent a 6-digit code to{'\n'}
                  <Text className="font-bold text-[#4A3623]">{email || 'your email'}</Text>
                </Text>
              </View>
            </Animated.View>

            {/* BOTTOM HALF: Slides UP into place */}
            <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideUpAnim }] }}>
              
              {/* OTP Field - Formatted identically to other inputs but visually distinct text spacing */}
              <CustomInput 
                icon={KeyRound} 
                placeholder="000000" 
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
                maxLength={6}
                style={{ fontSize: 24, letterSpacing: 12, marginLeft: 10 }}
              />

              {/* Verify Button (Using HeroUI native) */}
              <TouchableOpacity 
                className="w-full h-14 rounded-full items-center justify-center shadow-md shadow-black/10 mt-4"
                style={{ backgroundColor: '#4A3623' }} // Solid theme color, no flashing
                onPress={handleVerify} 
                disabled={loading || otp.length < 6}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#F4E4DB" /> // Rotating spinner
                ) : (
                  <Text className="text-white text-lg font-bold tracking-widest uppercase">
                    Verify & Continue
                  </Text>
                )}
              </TouchableOpacity>

              {/* Resend Link */}
              <View className="mt-8 flex-row justify-center items-center">
                <Text className="text-[#6F4E37] text-base font-medium mr-1">
                  Didn't receive the code?
                </Text>
                {resendLoading ? (
                  <ActivityIndicator size="small" color="#69A283" style={{ marginLeft: 8 }} />
                ) : (
                  <TouchableOpacity onPress={handleResend} activeOpacity={0.6} className="p-1">
                    <Text className="text-[#69A283] font-bold text-base underline">
                      Resend
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              
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