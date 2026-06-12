import React, { useState, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, ActivityIndicator, useColorScheme, Modal, Text } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card, Button } from 'heroui-native';
import apiClient from '@/api/apiClient';

type AlertType = 'success' | 'error' | null;

interface AlertConfig {
  visible: boolean;
  type: AlertType;
  title: string;
  message: string;
}

export default function ConsentScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasConsent, setHasConsent] = useState(false);

  const [alertConfig, setAlertConfig] = useState<AlertConfig>({
    visible: false,
    type: null,
    title: '',
    message: ''
  });

  const showAlert = (type: AlertType, title: string, message: string) => {
    setAlertConfig({ visible: true, type, title, message });
  };

  const closeAlert = () => {
    setAlertConfig(prev => ({ ...prev, visible: false }));
  };

  useFocusEffect(useCallback(() => {
    const fetchConsentStatus = async () => {
      try {
        const res = await apiClient.get('/user/consent/');
        setHasConsent(res.data.consent_all_policies);
      } catch (error) {
        console.log('Error fetching consent', error);
      } finally {
        setLoading(false);
      }
    };
    fetchConsentStatus();
  }, []));

  const handleSignConsent = async () => {
    setSaving(true);
    try {
      await apiClient.patch('/user/consent/', {
        consent_all_policies: true
      });
      setHasConsent(true);
      showAlert('success', 'Authorization Complete', 'Attestation agreement signed and vaulted securely.');
    } catch (error) {
      showAlert('error', 'Signature Failed', 'Failed to securely sign the agreement. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const getModalStyles = (type: AlertType) => {
    switch (type) {
      case 'success': return { icon: 'checkmark-circle', color: '#10b981', bg: 'bg-emerald-50 dark:bg-emerald-500/10', border: 'border-emerald-200 dark:border-emerald-500/30' };
      case 'error': return { icon: 'alert-circle', color: '#ef4444', bg: 'bg-rose-50 dark:bg-rose-500/10', border: 'border-rose-200 dark:border-rose-500/30' };
      default: return { icon: 'information-circle', color: '#64748b', bg: 'bg-neutral-100 dark:bg-neutral-800', border: 'border-neutral-200 dark:border-neutral-700' };
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-neutral-50 dark:bg-black">
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-neutral-50 dark:bg-black">
      
      {/* CUSTOM THEMED MODAL */}
      <Modal transparent visible={alertConfig.visible} animationType="fade" onRequestClose={closeAlert}>
        <View className="flex-1 bg-black/60 items-center justify-center px-6">
          <Card className="w-full bg-white dark:bg-neutral-900 rounded-[2.5rem] p-8 items-center shadow-2xl border border-neutral-200 dark:border-neutral-800">
            
            {alertConfig.type && (
              <View className={`w-20 h-20 rounded-full items-center justify-center mb-6 border ${getModalStyles(alertConfig.type).bg} ${getModalStyles(alertConfig.type).border}`}>
                <Ionicons name={getModalStyles(alertConfig.type).icon as any} size={40} color={getModalStyles(alertConfig.type).color} />
              </View>
            )}

            <Text className="text-2xl font-black text-neutral-900 dark:text-white text-center mb-3 tracking-tight">
              {alertConfig.title}
            </Text>
            <Text className="text-neutral-500 dark:text-neutral-400 text-center font-medium leading-relaxed mb-8">
              {alertConfig.message}
            </Text>

            <View className="w-full flex-row gap-3">
              <Button 
                color="default" 
                className="w-full h-14 rounded-2xl bg-neutral-900 dark:bg-white" 
                onPress={closeAlert}
              >
                <Text className="font-bold text-white dark:text-neutral-900">Close</Text>
              </Button>
            </View>

          </Card>
        </View>
      </Modal>

      <ScrollView contentContainerClassName="p-6 pb-24 pt-16" showsVerticalScrollIndicator={false}>
        
        {/* HEADER */}
        <View className="flex-row justify-between items-center mb-8">
          <TouchableOpacity 
            onPress={() => router.back()}
            className="w-12 h-12 bg-white dark:bg-neutral-900 rounded-full items-center justify-center border border-neutral-200 dark:border-neutral-800 shadow-sm">
            <Ionicons name="arrow-back" size={24} color={isDark ? '#f8fafc' : '#0f172a'} />
          </TouchableOpacity>
          <View className="flex-1 items-end">
            {hasConsent ? (
              <View className="flex-row items-center bg-emerald-50 dark:bg-emerald-500/10 px-4 py-2.5 rounded-full border border-emerald-200 dark:border-emerald-500/20">
                <Ionicons name="checkmark-circle" size={16} color={isDark ? '#34d399' : '#059669'} style={{ marginRight: 6 }} />
                <Text className="text-md font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400">Fully Authorized</Text>
              </View>
            ) : (
              <View className="flex-row items-center bg-rose-50 dark:bg-rose-500/10 px-4 py-2.5 rounded-full border border-rose-200 dark:border-rose-500/20">
                <Ionicons name="close-circle" size={16} color={isDark ? '#fb7185' : '#e11d48'} style={{ marginRight: 6 }} />
                <Text className="text-md font-black uppercase tracking-widest text-rose-700 dark:text-rose-400">Signature Pending</Text>
              </View>
            )}
          </View>
        </View>

        <Text className="text-4xl font-black text-neutral-900 dark:text-white tracking-tight mb-2">Consent & Security</Text>
        <Text className="text-sm font-bold text-neutral-500 dark:text-neutral-400 mb-8">Review your active cryptographic protection metrics.</Text>

        {/* MAIN HERO CARD */}
        <Card className="bg-emerald-50 dark:bg-emerald-900/10 rounded-[2.5rem] p-6 mb-6 shadow-sm dark:shadow-none border border-emerald-100 dark:border-emerald-500/20">
          <Text className="text-md font-black tracking-widest text-emerald-600 dark:text-emerald-400 uppercase mb-2">Active Safeguards</Text>
          <Text className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight mb-3 leading-8">Platform Protection Framework</Text>
          <Text className="text-neutral-600 dark:text-neutral-300 text-sm leading-relaxed mb-6">
            Smera functions using client-side verification parameters. Your global agreement locks down historical processing models, ensuring your record data stays private.
          </Text>

          <View className="flex-row items-center bg-white dark:bg-neutral-900 p-4 rounded-3xl border border-neutral-200 dark:border-neutral-800">
            <View className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 items-center justify-center mr-4">
              <Text className="text-xl font-black text-indigo-600 dark:text-indigo-400">16+</Text>
            </View>
            <View className="flex-1">
              <View className="flex-row items-center mb-1">
                <Text className="text-[10px] font-black text-neutral-500 dark:text-neutral-400 tracking-widest uppercase mr-2">Age Clearance</Text>
                <View className="w-2 h-2 rounded-full bg-emerald-500" />
              </View>
              <Text className="text-lg font-black text-neutral-900 dark:text-white mb-1">Verified Account</Text>
              <View className="flex-row items-center">
                <Ionicons name="shield-checkmark" size={14} color={isDark ? '#34d399' : '#059669'} style={{ marginRight: 4 }} />
                <Text className="text-emerald-600 dark:text-emerald-400 text-md font-bold">Attestation Active</Text>
              </View>
            </View>
          </View>
        </Card>

        {/* DYNAMIC ACTION BUTTON */}
        {!hasConsent && (
          <Button 
            color="primary"
            className="h-16 rounded-[2rem] mb-8"
            onPress={handleSignConsent} 
            isLoading={saving}
          >
            <Ionicons name="finger-print" size={24} color="#ffffff" style={{ marginRight: 8 }} />
            <Text className="text-white font-black text-lg tracking-wide">Authorize & Sign Agreement</Text>
          </Button>
        )}

        {/* INFO CARDS GRID */}
        <View className="gap-4 mb-10">
          <Card className="flex-row items-start bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm dark:shadow-none">
            <View className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 items-center justify-center mr-4">
              <Ionicons name="shield-outline" size={24} color={isDark ? '#60a5fa' : '#3b82f6'} />
            </View>
            <View className="flex-1">
              <Text className="font-bold text-neutral-900 dark:text-white text-base mb-1">Privacy & Data Isolation</Text>
              <Text className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">Your interactions and system queries operate within completely isolated data boundaries.</Text>
            </View>
          </Card>

          <Card className="flex-row items-start bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm dark:shadow-none">
            <View className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-500/10 border border-purple-100 dark:border-purple-500/20 items-center justify-center mr-4">
              <Ionicons name="hardware-chip-outline" size={24} color={isDark ? '#c084fc' : '#9333ea'} />
            </View>
            <View className="flex-1">
              <Text className="font-bold text-neutral-900 dark:text-white text-base mb-1">AI Boundary Parameters</Text>
              <Text className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">Systems remain strictly non-clinical and do not draft clinical therapy prescriptions.</Text>
            </View>
          </Card>

          <Card className="flex-row items-start bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm dark:shadow-none">
            <View className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 items-center justify-center mr-4">
              <Ionicons name="key-outline" size={24} color={isDark ? '#34d399' : '#10b981'} />
            </View>
            <View className="flex-1">
              <Text className="font-bold text-neutral-900 dark:text-white text-base mb-1">Zero-Knowledge Protocols</Text>
              <Text className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">Personal logs are processed with server-side encryption models ensuring end-to-end isolation.</Text>
            </View>
          </Card>

          <Card className="flex-row items-start bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm dark:shadow-none">
            <View className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 items-center justify-center mr-4">
              <Ionicons name="medkit-outline" size={24} color={isDark ? '#fbbf24' : '#d97706'} />
            </View>
            <View className="flex-1">
              <Text className="font-bold text-neutral-900 dark:text-white text-base mb-1">Non-Clinical Support Rules</Text>
              <Text className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">The platform functions inside safe parameters and does not replace medical intervention.</Text>
            </View>
          </Card>
        </View>

        {/* FOOTER STATUS */}
        {hasConsent && (
          <View className="flex-row items-center justify-center bg-neutral-100 dark:bg-neutral-900 py-4 px-6 rounded-2xl border border-neutral-200 dark:border-neutral-800">
            <Ionicons name="lock-closed" size={16} color={isDark ? '#94a3b8' : '#64748b'} />
            <Text className="text-md font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest ml-2">System Status: Secured</Text>
          </View>
        )}

      </ScrollView>
    </View>
  );
}