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
  Image,
  Modal,
  ActivityIndicator,
  Pressable
} from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from 'heroui-native';
import { Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import apiClient from '@/api/apiClient';

// --- Reusable Custom Input ---
const CustomInput = ({ icon: Icon, placeholder, value, onChangeText, secureTextEntry, rightElement, keyboardType, autoCapitalize }: any) => (
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
      autoCapitalize={autoCapitalize}
    />
    {rightElement}
  </View>
);

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  
  // --- State ---
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  // --- Custom Alert State ---
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '' });

  // --- Animations ---
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideDownAnim = useRef(new Animated.Value(-60)).current; // Starts 60px higher
  const slideUpAnim = useRef(new Animated.Value(60)).current;    // Starts 60px lower

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

  const handleLogin = async () => {
    if (!email || !password) {
      showAlert('Missing Fields', 'Please enter both your email and password to continue.');
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
      const errorMessage = error.response?.data?.message || 'Invalid credentials. Please check your email and password.';
      showAlert('Login Failed', errorMessage);
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
          // Notice the massive paddingBottom: 180. This gives the keyboard space to push the inputs upwards!
          contentContainerStyle={{ flexGrow: 1, padding: 24, paddingTop: 60, paddingBottom: 180 }} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-1 justify-center">
            
            {/* TOP HALF: Slides DOWN into place */}
            <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideDownAnim }] }}>
              {/* Top Illustration Image */}
              <View className="items-center mb-8">
                <Image 
                  source={require('@/assets/images/login_image.png')} 
                  style={{ width: '100%', height: 220, resizeMode: 'contain' }}
                />
              </View>

              {/* Header Text */}
              <View className="mb-10">
                <Text className="text-[36px] font-black text-[#4A3623] tracking-tight mb-1">
                  Welcome Back!
                </Text>
                <Text className="text-lg text-[#6F4E37] font-medium">
                  Glad to see you again
                </Text>
              </View>
            </Animated.View>

            {/* BOTTOM HALF: Slides UP into place */}
            <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideUpAnim }] }}>
              {/* Form Fields */}
              <View className="space-y-2 mb-2">
                <CustomInput 
                  icon={Mail} 
                  placeholder="Email" 
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />

                <CustomInput 
                  icon={Lock} 
                  placeholder="Password" 
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!isPasswordVisible}
                  rightElement={
                    <TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)} className="p-2">
                      {isPasswordVisible ? <EyeOff size={20} color="#8A7362" /> : <Eye size={20} color="#8A7362" />}
                    </TouchableOpacity>
                  }
                />
              </View>

              {/* Forgot Password Link */}
              <TouchableOpacity onPress={() => router.push('/accounts/forgot')} className="items-end mb-8 mt-2" activeOpacity={0.6}>
                <Text className="text-[#4A3623] font-bold text-sm">Forgot Password?</Text>
              </TouchableOpacity>

              {/* Login Button */}
              <TouchableOpacity 
                className="w-full py-4 rounded-full items-center shadow-md shadow-black/10"
                style={{ backgroundColor: '#4A3623' }} // Stays a consistent color!
                onPress={handleLogin} 
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#F4E4DB" />
                ) : (
                  <Text className="text-white text-lg font-bold tracking-widest uppercase">
                    Login
                  </Text>
                )}
              </TouchableOpacity>

              {/* Bottom Registration Link */}
              <TouchableOpacity onPress={() => router.push('/accounts/register')} className="mt-8 items-center" activeOpacity={0.6}>
                <Text className="text-[#6F4E37] text-base font-medium">
                  Don't have an account? <Text className="text-[#4c9f10] font-bold underline">REGISTER</Text>
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