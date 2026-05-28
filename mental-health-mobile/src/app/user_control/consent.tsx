import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import apiClient from '../../api/apiClient';

export default function ConsentViewScreen() {
  const router = useRouter();
  const [consent, setConsent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      const fetchConsent = async () => {
        try {
          const res = await apiClient.get('/user/consent/');
          setConsent(res.data);
        } catch (e) {
          console.log('Error fetching consent', e);
        } finally {
          setLoading(false);
        }
      };
      fetchConsent();
    }, [])
  );

  const renderStatus = (val: boolean) => (
    <Text style={[styles.status, { color: val ? '#10b981' : '#ef4444' }]}>
      {val ? '✔ Accepted' : '✖ Not Accepted'}
    </Text>
  );

  if (loading) return <View style={styles.center}><ActivityIndicator color="#a855f7" /></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={styles.backBtn}>← Back</Text></TouchableOpacity>
        <Text style={styles.title}>Security Policies</Text>
        <View style={{ width: 50 }} />
      </View>

      <View style={styles.card}>
        <Text style={styles.infoText}>These are the policies you agreed to during account setup. Consent is securely recorded and cannot be modified.</Text>

        <View style={styles.policyRow}>
          <Text style={styles.policyText}>Privacy & Data Policy</Text>
          {renderStatus(consent?.consent_data_policy)}
        </View>

        <View style={styles.policyRow}>
          <Text style={styles.policyText}>AI Assistance Guidelines</Text>
          {renderStatus(consent?.consent_ai_policy)}
        </View>

        <View style={styles.policyRow}>
          <Text style={styles.policyText}>Zero-Knowledge Encryption</Text>
          {renderStatus(consent?.consent_encryption)}
        </View>

        <View style={styles.policyRow}>
          <Text style={styles.policyText}>Terms of Service</Text>
          {renderStatus(consent?.consent_terms)}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090b' },
  content: { padding: 24, paddingTop: 60 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#09090b' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  backBtn: { color: '#a1a1aa', fontWeight: 'bold' },
  title: { fontSize: 20, fontWeight: '900', color: '#fff' },
  card: { backgroundColor: '#18181b', padding: 24, borderRadius: 24, borderWidth: 1, borderColor: '#27272a' },
  infoText: { color: '#a1a1aa', fontSize: 14, lineHeight: 20, marginBottom: 24, fontStyle: 'italic' },
  policyRow: { backgroundColor: '#27272a', padding: 16, borderRadius: 16, marginBottom: 12 },
  policyText: { color: '#fff', fontSize: 14, fontWeight: 'bold', marginBottom: 8 },
  status: { fontSize: 12, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 }
});