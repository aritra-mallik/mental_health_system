import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Animated, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

interface SidebarProps {
  slideAnim: Animated.Value;
  toggleSidebar: () => void;
  logout: () => void;
}

export default function Sidebar({ slideAnim, toggleSidebar, logout }: SidebarProps) {
  const router = useRouter();

  return (
    <Animated.View style={[styles.sidebar, { transform: [{ translateX: slideAnim }] }]}>
      <View style={styles.sidebarHeader}>
        <Text style={styles.sidebarTitle}>Menu</Text>
        <TouchableOpacity onPress={toggleSidebar}>
          <Text style={{ color: '#a1a1aa', fontSize: 24 }}>✕</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView style={{ flex: 1, paddingBottom: 40 }}>
        <Text style={styles.sidebarSection}>Account</Text>
        <TouchableOpacity style={styles.navItem} onPress={() => { toggleSidebar(); router.push('/user_control/profile'); }}>
          <Text style={styles.navIcon}>👤</Text>
          <Text style={styles.navText}>My Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => { toggleSidebar(); router.push('/user_control/settings'); }}>
          <Text style={styles.navIcon}>⚙️</Text>
          <Text style={styles.navText}>Settings</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => { toggleSidebar(); router.push('/user_control/consent'); }}>
          <Text style={styles.navIcon}>🛡️</Text>
          <Text style={styles.navText}>Security & Consent</Text>
        </TouchableOpacity>

        <Text style={styles.sidebarSection}>Session</Text>
        <TouchableOpacity style={[styles.navItem, { borderBottomWidth: 0 }]} onPress={logout}>
          <Text style={styles.navIcon}>🚪</Text>
          <Text style={[styles.navText, { color: '#ef4444' }]}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sidebar: { position: 'absolute', top: 0, left: 0, bottom: 0, width: width * 0.75, backgroundColor: '#18181b', zIndex: 20, borderRightWidth: 1, borderRightColor: '#27272a' },
  sidebarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingTop: 60, borderBottomWidth: 1, borderBottomColor: '#27272a' },
  sidebarTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  sidebarSection: { color: '#a855f7', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 8 },
  navItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 24, borderBottomWidth: 1, borderBottomColor: '#27272a' },
  navIcon: { fontSize: 20, marginRight: 16 },
  navText: { color: '#e4e4e7', fontSize: 16, fontWeight: '500' }
});