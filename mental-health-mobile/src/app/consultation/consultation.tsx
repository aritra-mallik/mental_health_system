import React, { useEffect, useState } from 'react';
import { View, TextInput, TouchableOpacity, ActivityIndicator, Text, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Card, Button } from 'heroui-native';
import apiClient from '@/api/apiClient';
import { useAuth } from '@/context/AuthContext';

export default function ConsultationScreen() {
  const { userToken } = useAuth();
  const router = useRouter();
  
  // Use exact theme detection logic as profile.tsx
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [counselors, setCounselors] = useState([]);
  const [filteredCounselors, setFilteredCounselors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState('');

  useEffect(() => {
    if (!userToken) return;
    const fetchCounselors = async () => {
      try {
        const response = await apiClient.get('/consultation/counselors/');
        setCounselors(response.data);
        setFilteredCounselors(response.data);
      } catch (error) {
        console.error("Failed to fetch counselors", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCounselors();
  }, [userToken]);

  useEffect(() => {
    let result = counselors;
    if (search) {
      result = result.filter((c: any) => 
        (c.name || '').toLowerCase().includes(search.toLowerCase()) || 
        (c.specialization || '').toLowerCase().includes(search.toLowerCase())
      );
    }
    if (mode) result = result.filter((c: any) => c.mode === mode);
    setFilteredCounselors(result);
  }, [search, mode, counselors]);

  const renderCounselor = ({ item }: { item: any }) => (
    <Card 
      key={item.id.toString()} 
      className="bg-white dark:bg-neutral-900 p-6 md:p-8 rounded-[2.5rem] border border-neutral-200 dark:border-neutral-800 shadow-sm mb-6"
    >
      {/* Top Floating Badge (Rating) */}
      <View className="flex-row justify-end mb-2">
        <View className="flex-row items-center bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 px-3 py-1.5 rounded-full">
          <Text className="text-[11px] font-black text-amber-500 dark:text-amber-400 uppercase tracking-widest">⭐ {item.rating}</Text>
          <Text className="text-[11px] font-bold text-amber-700/70 dark:text-amber-300/70 ml-1">({item.total_sessions})</Text>
        </View>
      </View>

      {/* Avatar */}
      <View className="w-20 h-20 rounded-[1.5rem] items-center justify-center mb-5 border border-rose-100 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-900/10 shadow-sm">
        <Text className="text-4xl">👨‍⚕️</Text>
      </View>
      
      {/* Name & Designation */}
      <Text className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight leading-tight flex-wrap">{item.name}</Text>
      <Text className="text-md font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest mt-2 flex-wrap">{item.designation}</Text>
      
      {/* Email Row */}
      {item.email && (
        <View className="mt-3 flex-row items-center flex-wrap gap-1.5">
          <Ionicons name="mail" size={16} color={isDark ? '#fb7185' : '#e11d48'} />
          <Text className="text-sm font-bold text-neutral-600 dark:text-neutral-400 lowercase flex-shrink">{item.email}</Text>
        </View>
      )}

      {/* Mode Badge */}
      <View className="flex-row flex-wrap gap-2 mt-4 mb-4">
        <View className={`px-4 py-1.5 rounded-xl border flex-row items-center gap-1.5 ${item.mode === 'online' ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30' : 'bg-cyan-50 dark:bg-cyan-500/10 border-cyan-200 dark:border-cyan-500/30'}`}>
          <Text className={`text-[10px] font-black uppercase tracking-widest ${item.mode === 'online' ? 'text-emerald-600 dark:text-emerald-400' : 'text-cyan-600 dark:text-cyan-400'}`}>
            {item.mode === 'online' ? '💻' : '🏥'} {item.mode}
          </Text>
        </View>
      </View>

      {/* Office Address Block */}
      {item.office_address && (
        <View className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 mb-4">
          <View className="flex-row items-center gap-1.5 mb-2">
            <Ionicons name="location" size={14} color={isDark ? '#94a3b8' : '#64748b'} />
            <Text className="text-[10px] uppercase font-black tracking-widest text-neutral-500 dark:text-neutral-400">Doctor Office</Text>
          </View>
          <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300 leading-relaxed flex-wrap">{item.office_address}</Text>
        </View>
      )}

      {/* Footer Info */}
      <View className="mt-2 pt-5 border-t border-neutral-200 dark:border-neutral-800 flex-row flex-wrap justify-between items-end gap-y-4">
        <View className="flex-1 min-w-[40%]">
          <Text className="text-[10px] font-black uppercase tracking-widest text-neutral-500 dark:text-neutral-400 mb-1">Experience</Text>
          <Text className="text-xl font-black text-neutral-900 dark:text-white">{item.experience}+ Yrs</Text>
        </View>
        <View className="flex-1 min-w-[40%] items-end">
          <Text className="text-[10px] font-black uppercase tracking-widest text-neutral-500 dark:text-neutral-400 mb-1">Fee</Text>
          <Text className="text-2xl font-black text-rose-600 dark:text-rose-400">₹{item.consultation_fee}</Text>
        </View>
      </View>
      
      {/* Request Button using HeroUI */}
      <Button 
        className="w-full h-14 rounded-2xl mt-6 flex-row bg-rose-600 dark:bg-rose-500"
        onPress={() => router.push({ pathname: '/consultation/booking', params: { counselorId: item.id } })}
      >
        <Text className="text-white font-black text-sm uppercase tracking-widest text-center flex-shrink mr-2 flex-wrap">Request Appointment</Text>
        <Ionicons name="arrow-forward" size={18} color="white" />
      </Button>
    </Card>
  );

  if (loading || !userToken) {
    return (
      <View className="flex-1 justify-center items-center bg-neutral-50 dark:bg-black">
        <ActivityIndicator size="large" color={isDark ? '#fb7185' : '#e11d48'} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-neutral-50 dark:bg-black">
      <KeyboardAwareScrollView 
        className="flex-1"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View className="px-5 pt-14 pb-4">
          
          {/* Header Row */}
          <View className="flex-row justify-between items-center mb-8 gap-4">
            <TouchableOpacity 
              onPress={() => router.replace('/core/dashboard')} 
              className="w-12 h-12 shrink-0 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-full items-center justify-center shadow-sm"
            >
              <Ionicons name="arrow-back" size={24} color={isDark ? '#f8fafc' : '#0f172a'} />
            </TouchableOpacity>
            
            <Button 
              className="h-12 rounded-2xl px-5 flex-row shrink bg-rose-600 dark:bg-rose-600"
              onPress={() => router.push('/consultation/booking_history')}
            >
              <Ionicons name="calendar" size={16} color="white" />
              <Text numberOfLines={1} className="font-bold text-white ml-2 text-[12px] uppercase tracking-wide">My Bookings</Text>
            </Button>
          </View>

          {/* Clinical Care Header */}
          <View className="mb-6">
            <Text className="text-4xl font-black text-neutral-900 dark:text-white tracking-tight leading-tight mb-2 flex-wrap">Clinical Care</Text>
            <View className="flex-row justify-between items-center gap-4">
              <Text className="flex-1 text-base text-neutral-500 dark:text-neutral-400 font-medium leading-relaxed flex-wrap">
                Consult securely with licensed specialists.
              </Text>
            </View>
          </View>

          {/* Search Bar */}
          <View className="flex-row items-center bg-white dark:bg-neutral-900 px-5 py-4 rounded-[1rem] mb-5 shadow-sm border border-neutral-200 dark:border-neutral-800">
            <Ionicons name="search" size={20} color={isDark ? '#fb7185' : '#e11d48'} />
            <TextInput 
              placeholder="Search by name or specialty..."
              placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
              value={search}
              onChangeText={setSearch}
              className="flex-1 ml-3 font-medium text-neutral-900 dark:text-white text-base"
            />
          </View>

          {/* Filters */}
          <View className="flex-row flex-wrap gap-2 mb-2">
            {[{ id: '', label: 'All' }, { id: 'online', label: '💻 Online' }, { id: 'offline', label: '🏥 Offline' }].map((filter) => {
              const isActive = mode === filter.id;
              return (
                <TouchableOpacity 
                  key={filter.id}
                  onPress={() => setMode(filter.id)}
                  className={`flex-1 min-w-[30%] py-3.5 px-2 rounded-xl items-center justify-center border shadow-sm ${
                    isActive 
                      ? 'bg-rose-600 border-rose-600' 
                      : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800'
                  }`}
                >
                  <Text numberOfLines={1} className={`font-bold text-md uppercase tracking-wide ${isActive ? 'text-white' : 'text-neutral-700 dark:text-neutral-300'}`}>
                    {filter.label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        {/* Doctor List */}
        <View className="px-5 pb-10">
          {filteredCounselors.length === 0 ? (
            <Card className="bg-white dark:bg-neutral-900 rounded-[2.5rem] p-10 mt-4 text-center shadow-sm border border-neutral-200 dark:border-neutral-800 items-center">
              <Text className="text-5xl mb-4">🔍</Text>
              <Text className="text-2xl font-black text-neutral-900 dark:text-white text-center flex-wrap tracking-tight">No Counselors</Text>
              <Text className="text-neutral-500 dark:text-neutral-400 mt-3 text-center font-medium text-base flex-wrap">Adjust your filters or try another search.</Text>
            </Card>
          ) : (
            filteredCounselors.map((item: any) => renderCounselor({ item }))
          )}
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}