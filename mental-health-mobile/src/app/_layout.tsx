import { Stack } from 'expo-router';
import { AuthProvider } from '../context/AuthContext';
import { PreferencesProvider } from '../context/PreferencesContext';
import '../global.css'; 



export default function RootLayout() {
  return (
    <AuthProvider>
      <PreferencesProvider> {}
      <Stack screenOptions={{ headerShown: false }}>
        {/* Landing Page */}
        <Stack.Screen name="index" />
        
        {/* Accounts App Routing */}
        <Stack.Screen name="accounts/login" />
        <Stack.Screen name="accounts/register" />
        <Stack.Screen name="accounts/otp" />
        <Stack.Screen name="accounts/consent" />
        <Stack.Screen name="accounts/forgot" />
        <Stack.Screen name="accounts/reset" />
        
        {/* Core App Routing */}
        <Stack.Screen name="core/dashboard" />
        <Stack.Screen name="core/journal" />
        <Stack.Screen name="core/chatbot" />
        <Stack.Screen name="core/assessment" />
        
        {/* User Control Routing */}
        <Stack.Screen name="user_control/profile" />
        <Stack.Screen name="user_control/settings" />
        <Stack.Screen name="user_control/consent" />
        {/* <Stack.Screen name="user_control/export" /> */}
      </Stack>
      </PreferencesProvider>
    </AuthProvider>
  );
}
// import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
// import { useColorScheme } from 'react-native';

// import { AnimatedSplashOverlay } from '@/components/animated-icon';
// import AppTabs from '@/components/app-tabs';

// export default function TabLayout() {
//   const colorScheme = useColorScheme();
//   return (
//     <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
//       <AnimatedSplashOverlay />
//       <AppTabs />
//     </ThemeProvider>
//   );
// }
