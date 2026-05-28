// app/core/dashboard.tsx
import React, { useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Animated, Dimensions, TouchableWithoutFeedback } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../api/apiClient';

// Import your new Sidebar component
import Sidebar from '../sidebar';

const { width } = Dimensions.get('window');

export default function DashboardScreen() {
  const router = useRouter();
  const { logout } = useAuth();
  
  // Sidebar State & Animation
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const slideAnim = useRef(new Animated.Value(-width * 0.75)).current;

  const toggleSidebar = () => {
    if (isSidebarOpen) {
      Animated.timing(slideAnim, { toValue: -width * 0.75, duration: 250, useNativeDriver: true }).start(() => setSidebarOpen(false));
    } else {
      setSidebarOpen(true);
      Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start();
    }
  };

  // Dashboard State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefresh] = useState(false);
  const [alertData, setAlertData] = useState({
    msg: "Take a moment to pause and check in with yourself today.",
    level: "gray",
    mood: null,
    risk: null
  });

  const fetchDashboardData = async () => {
    try {
      const response = await apiClient.get('/core/live-alert/');
      if (response.data) setAlertData(response.data);
    } catch (error) {
      console.log("Error fetching live alert", error);
    } finally {
      setLoading(false);
      setRefresh(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchDashboardData(); }, []));

  const getAlertStyle = () => {
    switch (alertData.level) {
      case "red": return { bg: '#fee2e2', border: '#f43f5e', text: '#881337', icon: '❤️‍🩹' };
      case "orange": return { bg: '#ffedd5', border: '#f97316', text: '#7c2d12', icon: '🌤️' };
      case "green": return { bg: '#ecfdf5', border: '#10b981', text: '#064e3b', icon: '🌿' };
      default: return { bg: '#f4f4f5', border: '#a1a1aa', text: '#3f3f46', icon: '💭' };
    }
  };
  const alertStyle = getAlertStyle();

  return (
    <View style={styles.container}>
      {/* --- MAIN DASHBOARD CONTENT --- */}
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefresh(true); fetchDashboardData(); }} tintColor="#a855f7" />}>
        
        {/* Header with Hamburger */}
        <View style={styles.header}>
          <TouchableOpacity onPress={toggleSidebar} style={styles.hamburgerBtn}>
            <Text style={{ color: '#fff', fontSize: 24 }}>☰</Text>
          </TouchableOpacity>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.greeting}>MindfulSpace</Text>
          </View>
        </View>

        {/* Live AI Alert Box */}
        <View style={[styles.alertBox, { backgroundColor: alertStyle.bg, borderColor: alertStyle.border }]}>
          <View style={styles.alertHeader}>
            <Text style={styles.alertTitle}>Smera Insight {alertStyle.icon}</Text>
            {loading && <ActivityIndicator size="small" color={alertStyle.text} />}
          </View>
          <Text style={[styles.alertMessage, { color: alertStyle.text }]}>"{alertData.msg}"</Text>
          {alertData.mood && (
            <View style={styles.badgeRow}>
              <View style={[styles.badge, { backgroundColor: alertStyle.border }]}><Text style={styles.badgeText}>Mood: {alertData.mood.toUpperCase()}</Text></View>
            </View>
          )}
        </View>

        {/* Core App Grid */}
        <Text style={styles.sectionTitle}>Your Space</Text>
        <View style={styles.grid}>
          <TouchableOpacity style={[styles.card, { backgroundColor: '#e0e7ff' }]} onPress={() => router.push('/core/chatbot')}>
            <Text style={styles.cardEmoji}>💬</Text><Text style={styles.cardTitle}>Smera Chat</Text>
            <Text style={styles.cardDesc}>Open-ended conversations with no judgement.</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.card, { backgroundColor: '#dcfce7' }]} onPress={() => router.push('/core/journal')}>
            <Text style={styles.cardEmoji}>📓</Text><Text style={styles.cardTitle}>Encrypted Journal</Text>
            <Text style={styles.cardDesc}>Zero-knowledge storage for your private thoughts.</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.card, { backgroundColor: '#f3e8ff' }]} onPress={() => router.push('/core/assessment')}>
            <Text style={styles.cardEmoji}>📊</Text><Text style={styles.cardTitle}>WHO-5 Check-In</Text>
            <Text style={styles.cardDesc}>Validated scales to track your progress.</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* --- SIDEBAR COMPONENT --- */}
      {isSidebarOpen && (
        <TouchableWithoutFeedback onPress={toggleSidebar}>
          <View style={styles.overlay} />
        </TouchableWithoutFeedback>
      )}
      
      <Sidebar 
        slideAnim={slideAnim} 
        toggleSidebar={toggleSidebar} 
        logout={logout} 
      />

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090b' },
  content: { padding: 24, paddingBottom: 60, paddingTop: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  hamburgerBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12 },
  greeting: { fontSize: 20, fontWeight: '900', color: '#fff' },
  
  alertBox: { padding: 24, borderRadius: 24, borderWidth: 1, marginBottom: 32 },
  alertHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  alertTitle: { fontSize: 14, fontWeight: '900', color: '#18181b', textTransform: 'uppercase', letterSpacing: 1 },
  alertMessage: { fontSize: 18, fontStyle: 'italic', fontWeight: '500', lineHeight: 26 },
  badgeRow: { flexDirection: 'row', marginTop: 16 },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 16 },
  grid: { gap: 16 },
  card: { padding: 20, borderRadius: 24, borderBottomWidth: 3, borderBottomColor: 'rgba(0,0,0,0.1)' },
  cardEmoji: { fontSize: 32, marginBottom: 12 },
  cardTitle: { fontSize: 18, fontWeight: '900', color: '#18181b', marginBottom: 4 },
  cardDesc: { fontSize: 14, color: '#3f3f46', lineHeight: 20 },

  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 10 }
});