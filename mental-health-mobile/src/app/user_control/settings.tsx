import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Switch, Alert, ScrollView } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import apiClient from '../../api/apiClient';
import { useAuth } from '../../context/AuthContext';

export default function SettingsScreen() {
  const router = useRouter();
  const { logout } = useAuth();
  
  const [darkMode, setDarkMode] = useState(true);
  const [fontSize, setFontSize] = useState('medium'); // typically 'small', 'medium', 'large'

  useFocusEffect(useCallback(() => {
    const fetchPrefs = async () => {
      try {
        const res = await apiClient.get('/user/profile/');
        setDarkMode(res.data.dark_mode);
        if (res.data.font_size) setFontSize(res.data.font_size);
      } catch (e) { console.log(e); }
    };
    fetchPrefs();
  }, []));

  const savePreference = async (updates: any) => {
    try {
      await apiClient.patch('/user/profile/', updates);
    } catch (e) {
      Alert.alert('Error', 'Failed to save preference to server');
    }
  };

  const handleExport = async () => {
    try {
      const res = await apiClient.get('/user/export/');
      Alert.alert('Data Exported', 'Your secure JSON archive has been generated. In production, this saves directly to your phone files.');
    } catch (e) {
      Alert.alert('Error', 'Failed to export data.');
    }
  };

  const handleDelete = () => {
    Alert.alert('Final Warning', 'This will permanently delete your account, encrypted journals, and assessments.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete Forever', style: 'destructive', onPress: async () => {
          try {
            await apiClient.delete('/user/delete/');
            await logout(); 
          } catch (e) { Alert.alert('Error', 'Failed to delete account.'); }
        }
      }
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={styles.backBtn}>← Back</Text></TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={{ width: 50 }} />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Appearance</Text>
        
        <View style={styles.row}>
          <Text style={styles.rowText}>Dark Mode</Text>
          <Switch 
            value={darkMode} 
            onValueChange={(val) => { setDarkMode(val); savePreference({ dark_mode: val }); }} 
            trackColor={{ true: '#a855f7', false: '#3f3f46' }} 
          />
        </View>

        <View style={[styles.row, { marginTop: 20, borderTopWidth: 1, borderTopColor: '#27272a', paddingTop: 20 }]}>
          <Text style={styles.rowText}>Font Size</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {['small', 'medium', 'large'].map(size => (
              <TouchableOpacity 
                key={size}
                style={[styles.segmentBtn, fontSize === size && styles.segmentActive]}
                onPress={() => { setFontSize(size); savePreference({ font_size: size }); }}
              >
                <Text style={[styles.segmentText, fontSize === size && styles.segmentTextActive]}>
                  {size.charAt(0).toUpperCase() + size.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Data Control</Text>
        <TouchableOpacity style={styles.actionRow} onPress={handleExport}>
          <Text style={styles.actionIcon}>📦</Text><Text style={styles.actionText}>Export Personal Data</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionRow, { borderBottomWidth: 0 }]} onPress={handleDelete}>
          <Text style={styles.actionIcon}>🗑️</Text><Text style={[styles.actionText, { color: '#ef4444' }]}>Delete Account</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090b' },
  content: { padding: 24, paddingTop: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  backBtn: { color: '#a1a1aa', fontWeight: 'bold' },
  title: { fontSize: 24, fontWeight: '900', color: '#fff' },
  card: { backgroundColor: '#18181b', padding: 24, borderRadius: 24, borderWidth: 1, borderColor: '#27272a', marginBottom: 24 },
  sectionTitle: { color: '#a855f7', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowText: { color: '#fff', fontSize: 16, fontWeight: '500' },
  segmentBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: '#3f3f46' },
  segmentActive: { backgroundColor: '#a855f7', borderColor: '#a855f7' },
  segmentText: { color: '#a1a1aa', fontSize: 12, fontWeight: 'bold' },
  segmentTextActive: { color: '#fff' },
  actionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#27272a' },
  actionIcon: { fontSize: 20, marginRight: 16 },
  actionText: { color: '#e4e4e7', fontSize: 16, fontWeight: '500' }
});