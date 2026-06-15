import '../global.css'; 
import { Stack } from 'expo-router';
import { HeroUINativeProvider } from 'heroui-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Your custom context providers
import { AuthProvider } from '../context/AuthContext';
import { PreferencesProvider } from '../context/PreferencesContext';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      
      <HeroUINativeProvider>
        
        <AuthProvider>
          <PreferencesProvider> 
            
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }}>
              {/* Landing Page */}
              <Stack.Screen name="index" />
              <Stack.Screen name="about" />
              
              {/* Accounts App Routing */}
              <Stack.Screen name="accounts/login" />
              <Stack.Screen name="accounts/register" />
              <Stack.Screen name="accounts/otp" />
              <Stack.Screen name="accounts/consent" />
              <Stack.Screen name="accounts/forgot" />
              <Stack.Screen name="accounts/reset" />

              {/* Articles App Routing */}
              <Stack.Screen name="articles/all_articles" />
              <Stack.Screen name="articles/[id]" />
              
              {/* Consultation App Routing */}
              <Stack.Screen name="consultation/consultation" />
              <Stack.Screen name="consultation/booking" />
              <Stack.Screen name="consultation/review_booking" />
              <Stack.Screen name="consultation/reschedule_booking" />
              <Stack.Screen name="consultation/booking_history" />
              
              {/* Core App Routing */}
              <Stack.Screen name="core/dashboard" />
              <Stack.Screen name="core/journal" />
              <Stack.Screen name="core/chatbot" />
              <Stack.Screen name="core/assessment" />
              <Stack.Screen name="core/recovery_hub" />
              <Stack.Screen name="core/calm_now" />
              <Stack.Screen name="core/sleep_support" />
              <Stack.Screen name="core/burnout_recovery" />
              
              {/* User Control Routing */}
              <Stack.Screen name="user_control/profile" />
              <Stack.Screen name="user_control/settings" />
              <Stack.Screen name="user_control/consent" />
              <Stack.Screen name="user_control/export" />
            </Stack>
            
          </PreferencesProvider>
        </AuthProvider>

      </HeroUINativeProvider>
    </GestureHandlerRootView>
  );
}