import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator, 
  Animated,
  Platform,
  Modal,
  Pressable
} from 'react-native';
import { useRouter } from 'expo-router';
import { 
  Mail, Lock, Calendar as CalendarIcon, Eye, EyeOff, 
  Users, ArrowLeft, Tag, ChevronDown, AlertCircle, CheckCircle2 
} from 'lucide-react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view'; 
import DateTimePicker from '@react-native-community/datetimepicker';
import apiClient from '@/api/apiClient';

// --- Reusable Custom Input ---
const CustomInput = ({ icon: Icon, placeholder, value, onChangeText, secureTextEntry, rightElement, editable = true, pointerEvents, ...props }: any) => (
  <View pointerEvents={pointerEvents} className="flex-row items-center border-[1.5px] border-[#6F4E37]/20 bg-transparent rounded-full h-14 px-4 mb-4">
    <Icon size={20} color="#8A7362" />
    <Text className="text-[#8A7362]/30 text-2xl font-light mx-3 pb-1">|</Text>
    <TextInput
      className="flex-1 text-[#4A3623] font-medium text-base h-full"
      placeholder={placeholder}
      placeholderTextColor="#8A7362"
      value={value}
      onChangeText={onChangeText}
      secureTextEntry={secureTextEntry}
      editable={editable}
      {...props}
    />
    {rightElement}
  </View>
);

export default function RegisterScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ 
    first_name: '', middle_name: '', last_name: '', 
    email: '', password: '', confirm_password: '',
    date_of_birth: '', gender: ''
  });

  // UI States
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Date Picker States
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [displayDate, setDisplayDate] = useState(''); 

  // Dropdown States
  const [showGenderPicker, setShowGenderPicker] = useState(false);
  const GENDER_OPTIONS = ['male', 'female', 'other'];

  // Custom Alert States
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', type: 'error' });

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
  }, []);

  // --- Helpers ---
  const showAlert = (title: string, message: string, type: 'error' | 'success' = 'error') => {
    setAlertConfig({ visible: true, title, message, type });
  };

  const closeAlert = () => setAlertConfig(prev => ({ ...prev, visible: false }));

  // --- Password Strength & Validation Logic ---
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { text: '', color: 'bg-transparent', width: 'w-0', hint: '' };
    
    const hasUpper = /[A-Z]/.test(pass);
    const hasLower = /[a-z]/.test(pass);
    const hasNumber = /[0-9]/.test(pass);
    const hasSymbol = /[^A-Za-z0-9]/.test(pass);
    const isLongEnough = pass.length >= 8;

    const missing = [];
    if (!isLongEnough) missing.push('8+ chars');
    if (!hasUpper) missing.push('1 uppercase');
    if (!hasLower) missing.push('1 lowercase');
    if (!hasNumber) missing.push('1 number');
    if (!hasSymbol) missing.push('1 symbol');

    if (missing.length === 0) {
      return { text: 'Strong', color: 'bg-emerald-500', width: 'w-full', hint: 'Perfect! Password meets all requirements.' };
    } else if (missing.length <= 2 && missing.length > 0) {
      return { text: 'Good', color: 'bg-amber-500', width: 'w-2/3', hint: `Missing: ${missing.join(', ')}` };
    } else {
      return { text: 'Weak', color: 'bg-rose-500', width: 'w-1/3', hint: `Missing: ${missing.join(', ')}` };
    }
  };

  const passStrength = getPasswordStrength(formData.password);

  // --- Handlers ---
  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    
    if (selectedDate) {
      const yyyy = selectedDate.getFullYear();
      const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const dd = String(selectedDate.getDate()).padStart(2, '0');
      
      setFormData({ ...formData, date_of_birth: `${yyyy}-${mm}-${dd}` });
      setDisplayDate(`${dd}-${mm}-${yyyy}`);
    }
  };

  const handleRegister = async () => {
    if (!formData.first_name || !formData.email || !formData.password || !formData.date_of_birth || !formData.gender) {
      showAlert('Missing Fields', 'Please fill in all required fields to continue.');
      return;
    }

    if (passStrength.text !== 'Strong') {
      showAlert('Weak Password', 'Please ensure your password meets all the security requirements.');
      return;
    }

    if (formData.password !== formData.confirm_password) {
      showAlert('Password Mismatch', 'Your passwords do not match. Please try again.');
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.post('/accounts/register/', formData);
      if (response.data.status === 'success') {
        router.push({ pathname: '/accounts/otp', params: { email: formData.email } });
      }
    } catch (error: any) {
      let errorMessage = 'Registration failed. Please check your connection and try again.';
      
      if (error.response?.data?.errors) {
        const errors = error.response.data.errors;
        const firstErrorKey = Object.keys(errors)[0];
        const rawMessage = errors[firstErrorKey][0];
        
        // Hide raw backend keys for general errors
        if (firstErrorKey === 'non_field_errors' || firstErrorKey === 'error' || firstErrorKey === 'detail') {
          errorMessage = rawMessage;
        } else {
          // Format field names cleanly (e.g., "first_name" -> "First name:")
          const cleanKey = firstErrorKey.charAt(0).toUpperCase() + firstErrorKey.slice(1).replace(/_/g, ' ');
          errorMessage = `${cleanKey}: ${rawMessage}`;
        }
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      showAlert('Registration Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F4E4DB' }}>
      <KeyboardAwareScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, paddingTop: 60, paddingBottom: 100 }} 
        showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" enableOnAndroid={true}
        extraScrollHeight={20} enableAutomaticScroll={true}>

          <Animated.View style={{ opacity: fadeAnim }}>
            
            {/* Header */}
            <TouchableOpacity onPress={() => router.back()} className="mb-6 w-10">
              <ArrowLeft size={28} color="#4A3623" />
            </TouchableOpacity>
            
            <Text className="text-[40px] font-black text-[#4A3623] mb-1 tracking-tight">Hello!</Text>
            <Text className="text-lg text-[#6F4E37] font-medium mb-10">Create a new account</Text>

            {/* Form Fields */}
            <CustomInput icon={Tag} placeholder="First name" value={formData.first_name} onChangeText={(t: string) => setFormData({...formData, first_name: t})} />
            <CustomInput icon={Tag} placeholder="Middle name (Optional)" value={formData.middle_name} onChangeText={(t: string) => setFormData({...formData, middle_name: t})} />
            <CustomInput icon={Tag} placeholder="Last name" value={formData.last_name} onChangeText={(t: string) => setFormData({...formData, last_name: t})} />
            <CustomInput icon={Mail} placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={formData.email} onChangeText={(t: string) => setFormData({...formData, email: t})} />

            {/* Date of Birth Picker */}
            <TouchableOpacity activeOpacity={0.7} onPress={() => setShowDatePicker(true)}>
              <CustomInput 
                icon={CalendarIcon} 
                placeholder="Date of Birth (DD-MM-YYYY)" 
                value={displayDate} 
                editable={false}
                pointerEvents="none"
              />
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={formData.date_of_birth ? new Date(formData.date_of_birth) : new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onValueChange={handleDateChange}
                onDismiss={() => setShowDatePicker(false)}
                maximumDate={new Date()}
              />
            )}

            {/* Gender Dropdown Trigger */}
            <TouchableOpacity activeOpacity={0.7} onPress={() => setShowGenderPicker(true)}>
              <CustomInput 
                icon={Users} 
                placeholder="Gender" 
                value={formData.gender} 
                editable={false}
                pointerEvents="none"
                rightElement={<ChevronDown size={20} color="#8A7362" />}
              />
            </TouchableOpacity>

            {/* Password Field */}
            <CustomInput 
              icon={Lock} 
              placeholder="Password" 
              secureTextEntry={!showPassword}
              value={formData.password} 
              onChangeText={(t: string) => setFormData({...formData, password: t})} 
              rightElement={
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} className="p-2">
                  {showPassword ? <EyeOff size={20} color="#8A7362" /> : <Eye size={20} color="#8A7362" />}
                </TouchableOpacity>
              }
            />

            {/* Advanced Password Strength Indicator */}
            {formData.password.length > 0 && (
              <View className="mb-4 px-4 -mt-2">
                <View className="h-1.5 w-full bg-[#6F4E37]/10 rounded-full overflow-hidden flex-row">
                  <Animated.View className={`h-full ${passStrength.width} ${passStrength.color}`} />
                </View>
                <View className="flex-row justify-between items-start mt-1.5">
                  <Text className="text-[10px] text-[#6F4E37]/80 flex-1 pr-4 leading-tight">{passStrength.hint}</Text>
                  <Text className="text-xs text-[#6F4E37] font-bold">{passStrength.text}</Text>
                </View>
              </View>
            )}

            {/* Confirm Password Field */}
            <CustomInput 
              icon={Lock} 
              placeholder="Confirm Password" 
              secureTextEntry={!showConfirmPassword}
              value={formData.confirm_password} 
              onChangeText={(t: string) => setFormData({...formData, confirm_password: t})} 
              rightElement={
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} className="p-2">
                  {showConfirmPassword ? <EyeOff size={20} color="#8A7362" /> : <Eye size={20} color="#8A7362" />}
                </TouchableOpacity>
              }
            />

            {/* Register Button */}
            <TouchableOpacity 
              className={`w-full py-4 rounded-full items-center shadow-md shadow-black/10 mt-6`}
              style={{ backgroundColor: '#4A3623'  }}
              onPress={handleRegister} 
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#F4E4DB" />
              ) : (
                <Text className="text-white text-lg font-bold tracking-widest uppercase">Register</Text>
              )}
            </TouchableOpacity>
            
            {/* Footer Login Link */}
            <TouchableOpacity onPress={() => router.push('/accounts/login')} className="mt-8 items-center" activeOpacity={0.6}>
              <Text className="text-[#6F4E37] text-base font-medium">
                Already have an account? <Text className="text-[#ba9d1e] font-bold underline">LOGIN</Text>
              </Text>
            </TouchableOpacity>

          </Animated.View>
        </KeyboardAwareScrollView>

      {/* --- CUSTOM GENDER DROPDOWN MODAL --- */}
      <Modal visible={showGenderPicker} transparent animationType="fade">
        <Pressable 
          className="flex-1 bg-black/40 justify-end"
          onPress={() => setShowGenderPicker(false)}
        >
          <View className="bg-[#F4E4DB] rounded-t-[30px] p-6 pb-12 shadow-2xl">
            <View className="w-12 h-1.5 bg-[#4A3623]/20 rounded-full self-center mb-6" />
            <Text className="text-xl font-bold text-[#4A3623] mb-4 text-center">Select Gender</Text>
            
            {GENDER_OPTIONS.map((option, idx) => (
              <TouchableOpacity 
                key={idx}
                className={`py-4 px-6 rounded-2xl mb-2 ${formData.gender === option ? 'bg-[#69A283]/20' : 'bg-transparent'}`}
                onPress={() => {
                  setFormData({ ...formData, gender: option });
                  setShowGenderPicker(false);
                }}
              >
                <Text className={`text-lg text-center ${formData.gender === option ? 'text-[#69A283] font-bold' : 'text-[#6F4E37] font-medium'}`}>
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* --- CUSTOM ALERT MODAL --- */}
      <Modal visible={alertConfig.visible} transparent animationType="fade">
        <View className="flex-1 bg-black/40 justify-center items-center px-6">
          <View className="bg-[#F4E4DB] w-full rounded-[28px] p-6 items-center shadow-2xl">
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