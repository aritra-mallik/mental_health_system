import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import apiClient from '../../api/apiClient';

export default function ProfileScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [profile, setProfile] = useState({ 
    first_name: '', middle_name: '', last_name: '', 
    display_name: '', email: '', date_of_birth: '', gender: '', is_email_verified: false 
  });
  
  const [passwords, setPasswords] = useState({ old_password: '', new_password: '' });

  useFocusEffect(useCallback(() => {
    const fetchProfile = async () => {
      try {
        const res = await apiClient.get('/user/profile/');
        setProfile(res.data);
      } catch (error) {
        console.log('Error fetching profile', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []));

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await apiClient.patch('/user/profile/', {
        first_name: profile.first_name,
        middle_name: profile.middle_name,
        last_name: profile.last_name,
      });
      Alert.alert('Success', 'Profile updated successfully.');
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwords.old_password || !passwords.new_password) return Alert.alert('Error', 'Fill all fields');
    setSaving(true);
    try {
      await apiClient.post('/accounts/change-password/', passwords);
      Alert.alert('Success', 'Password changed securely.');
      setPasswords({ old_password: '', new_password: '' });
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to change password.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color="#a855f7" /></View>;

  // ⚡ DYNAMIC NAME CALCULATION: Instantly updates as the user types
  const dynamicDisplayName = [profile.first_name, profile.middle_name, profile.last_name]
    .filter(Boolean)
    .join(' ') || profile.display_name || 'Anonymous User';

  // Get first letter for the Avatar
  const initial = dynamicDisplayName.charAt(0).toUpperCase();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={styles.backBtn}>← Back</Text></TouchableOpacity>
        <Text style={styles.title}>My Profile</Text>
        <View style={{ width: 50 }} />
      </View>

      {/* --- UPGRADED IDENTITY CARD --- */}
      <View style={styles.identityCard}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        
        <Text style={styles.dynamicName}>{dynamicDisplayName}</Text>
        
        <Text style={styles.emailText}>
          {profile.email} {profile.is_email_verified && <Text style={{ color: '#10b981' }}>✓</Text>}
        </Text>

        <View style={styles.pillContainer}>
          <View style={styles.pill}>
            <Text style={styles.pillText}>🎂 {profile.date_of_birth || 'N/A'}</Text>
          </View>
          <View style={styles.pill}>
            <Text style={styles.pillText}>👤 {profile.gender ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1) : 'N/A'}</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Update Information</Text>
        <TextInput style={styles.input} value={profile.first_name} onChangeText={(t) => setProfile({...profile, first_name: t})} placeholder="First Name" placeholderTextColor="#71717a" />
        <TextInput style={styles.input} value={profile.middle_name} onChangeText={(t) => setProfile({...profile, middle_name: t})} placeholder="Middle Name" placeholderTextColor="#71717a" />
        <TextInput style={styles.input} value={profile.last_name} onChangeText={(t) => setProfile({...profile, last_name: t})} placeholder="Last Name" placeholderTextColor="#71717a" />
        
        <TouchableOpacity style={styles.primaryBtn} onPress={handleSaveProfile} disabled={saving}>
          <Text style={styles.primaryBtnText}>Save Updates</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Security</Text>
        <TextInput style={styles.input} value={passwords.old_password} onChangeText={(t) => setPasswords({...passwords, old_password: t})} placeholder="Current Password" secureTextEntry placeholderTextColor="#71717a" />
        <TextInput style={styles.input} value={passwords.new_password} onChangeText={(t) => setPasswords({...passwords, new_password: t})} placeholder="New Password" secureTextEntry placeholderTextColor="#71717a" />
        <TouchableOpacity style={styles.primaryBtn} onPress={handleChangePassword} disabled={saving}>
          <Text style={styles.primaryBtnText}>Change Password</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090b' },
  content: { padding: 24, paddingTop: 60, paddingBottom: 60 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#09090b' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  backBtn: { color: '#a1a1aa', fontWeight: 'bold' },
  title: { fontSize: 24, fontWeight: '900', color: '#fff' },
  
  // New Identity Card Styles
  identityCard: { backgroundColor: '#18181b', padding: 32, borderRadius: 32, borderWidth: 1, borderColor: '#27272a', marginBottom: 24, alignItems: 'center', shadowColor: '#a855f7', shadowOpacity: 0.1, shadowRadius: 20, shadowOffset: { width: 0, height: 10 } },
  avatarCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(168, 85, 247, 0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: 'rgba(168, 85, 247, 0.4)' },
  avatarText: { fontSize: 32, fontWeight: 'bold', color: '#c084fc' },
  dynamicName: { fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 4, textAlign: 'center' },
  emailText: { fontSize: 14, color: '#a1a1aa', marginBottom: 20, fontWeight: '500' },
  pillContainer: { flexDirection: 'row', gap: 12 },
  pill: { backgroundColor: '#27272a', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#3f3f46' },
  pillText: { color: '#e4e4e7', fontSize: 12, fontWeight: 'bold' },

  card: { backgroundColor: '#18181b', padding: 24, borderRadius: 24, borderWidth: 1, borderColor: '#27272a', marginBottom: 24 },
  sectionTitle: { color: '#a855f7', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 },
  input: { backgroundColor: '#27272a', color: '#fff', padding: 16, borderRadius: 16, marginBottom: 12, fontSize: 16 },
  primaryBtn: { backgroundColor: '#a855f7', padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 8 },
  primaryBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});