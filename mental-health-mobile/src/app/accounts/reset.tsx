import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  ActivityIndicator,
  Platform, 
  Animated, 
  ScrollView,
  Image,
  Modal
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Button } from 'heroui-native';
import { Lock, KeyRound, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react-native';
import apiClient from '@/api/apiClient';

// --- Reusable Custom Input matching the Video UI ---
const CustomInput = ({ icon: Icon, placeholder, value, onChangeText, secureTextEntry, rightElement, keyboardType, maxLength }: any) => (
  <View className="flex-row items-center border-[1.5px] border-[#6F4E37]/20 bg-transparent rounded-full h-14 px-4 mb-4">
    <Icon size={20} color="#8A7362" />
    <Text className="text-[#8A7362]/30 text-2xl font-light mx-3 pb-1">|</Text>
    <TextInput
      className="flex-1 text-[#4A3623] font-medium text-base h-full"
      placeholder={placeholder}
      placeholderTextColor="#8A7362"
      value={value}
      onChangeText={onChangeText}
      secureTextEntry={secureTextEntry}
      keyboardType={keyboardType}
      maxLength={maxLength}
      autoCapitalize="none"
    />
    {rightElement}
  </View>
);

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams(); 
  
  // --- State ---
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
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
    if (action) action(); // Execute navigation if it's a success
  };

  // --- Password Strength Logic (Same as Register) ---
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { text: '', color: 'bg-transparent', width: 'w-0', hint: '' };
    
    const hasUpper = /[A-Z]/.test(pass);
    const hasLower = /[a-z]/.test(pass);
    const hasNumber = /[0-9]/.test(pass);
    const hasSymbol = /[^A-Za-z0-9]/.test(pass);
    const isLongEnough = pass.length >= 8;

    const missing = [];
    if (!isLongEnough) missing.push('8+ chars');
    if (!hasUpper) missing.push('1 upper');
    if (!hasLower) missing.push('1 lower');
    if (!hasNumber) missing.push('1 number');
    if (!hasSymbol) missing.push('1 symbol');

    if (missing.length === 0) {
      return { text: 'Strong', color: 'bg-emerald-500', width: 'w-full', hint: 'Perfect! Password is secure.' };
    } else if (missing.length <= 2 && missing.length > 0) {
      return { text: 'Good', color: 'bg-amber-500', width: 'w-2/3', hint: `Missing: ${missing.join(', ')}` };
    } else {
      return { text: 'Weak', color: 'bg-rose-500', width: 'w-1/3', hint: `Missing: ${missing.join(', ')}` };
    }
  };

  const passStrength = getPasswordStrength(newPassword);

  // --- API Call ---
  const handleReset = async () => {
    if (passStrength.text !== 'Strong') {
      showAlert('Weak Password', 'Please ensure your new password meets all the security requirements before continuing.');
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.post('/accounts/password-reset-confirm/', { 
        email, 
        otp, 
        new_password: newPassword 
      });
      
      if (response.data.status === 'success') {
        // Trigger Success Alert, then route to login on dismiss
        showAlert(
          'Password Updated', 
          'Your password has been successfully reset. You can now log in with your new credentials.', 
          'success',
          () => router.replace('/accounts/login')
        );
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to reset password. Please check your verification code and try again.';
      showAlert('Reset Failed', errorMessage);
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
          contentContainerStyle={{ flexGrow: 1, padding: 24, paddingTop: 60, paddingBottom: 250 }} 
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
                  // UPDATE THIS PATH to match your downloaded image
                  source={require('@/assets/images/reset_image.png')} 
                  style={{ width: '100%', height: 220, resizeMode: 'contain' }}
                />
              </View>

              {/* Header Text */}
              <View className="mb-10">
                <Text className="text-[36px] font-black text-[#4A3623] tracking-tight mb-2 leading-tight">
                  Secure Account
                </Text>
                <Text className="text-base text-[#6F4E37] font-medium leading-relaxed">
                  Enter the verification code sent to your email and choose a new password.
                </Text>
              </View>
            </Animated.View>

            {/* BOTTOM HALF: Slides UP into place */}
            <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideUpAnim }] }}>
              
              {/* OTP Field */}
              <CustomInput 
                icon={KeyRound} 
                placeholder="6-Digit Verification Code" 
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
                maxLength={6}
              />

              {/* New Password Field */}
              <CustomInput 
                icon={Lock} 
                placeholder="New Password" 
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!isPasswordVisible}
                rightElement={
                  <TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)} className="p-2">
                    {isPasswordVisible ? <EyeOff size={20} color="#8A7362" /> : <Eye size={20} color="#8A7362" />}
                  </TouchableOpacity>
                }
              />

              {/* Advanced Password Strength Indicator */}
              {newPassword.length > 0 && (
                <View className="mb-6 px-4 -mt-2">
                  <View className="h-1.5 w-full bg-[#6F4E37]/10 rounded-full overflow-hidden flex-row">
                    <Animated.View className={`h-full ${passStrength.width} ${passStrength.color}`} />
                  </View>
                  <View className="flex-row justify-between items-start mt-1.5">
                    <Text className="text-[10px] text-[#6F4E37]/80 flex-1 pr-4 leading-tight">{passStrength.hint}</Text>
                    <Text className="text-xs text-[#6F4E37] font-bold">{passStrength.text}</Text>
                  </View>
                </View>
              )}

              {/* Reset Button (Using HeroUI native) */}
              <TouchableOpacity 
                className={`w-full h-14 rounded-full items-center justify-center shadow-md shadow-black/10 ${!newPassword && otp.length < 6 ? 'mt-4' : ''}`}
                style={{ backgroundColor: '#4A3623' }} 
                onPress={handleReset} 
                disabled={loading || otp.length < 6 || !newPassword}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#F4E4DB" />
                ) : (
                  <Text className="text-white text-lg font-bold tracking-widest uppercase">
                    Update Password
                  </Text>
                )}
              </TouchableOpacity>

              {/* Go Back Link */}
              <TouchableOpacity onPress={() => router.push('/accounts/login')} className="mt-8 items-center" activeOpacity={0.6}>
                <Text className="text-[#69A283] font-bold text-base underline">
                  Back to Login
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