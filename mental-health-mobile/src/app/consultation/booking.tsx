import React, { useEffect, useState } from 'react';
import { ScrollView, TouchableOpacity, Alert, ActivityIndicator, View, Text, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card, Button } from 'heroui-native';
import apiClient from '@/api/apiClient';

export default function BookingScreen() {
  const { counselorId, bookingId } = useLocalSearchParams();
  const insets = useSafeAreaInsets(); 
  
  // Use exact theme detection logic as profile.tsx
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const [counselor, setCounselor] = useState<any>(null);
  const [oldBooking, setOldBooking] = useState<any>(null);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  
  // Mobile-perfect filters
  const [uniqueDates, setUniqueDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [modeFilter, setModeFilter] = useState('');
  const [timeFilter, setTimeFilter] = useState('All'); 
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        let loadedCounselor = null;

        if (bookingId) {
          // Reschedule Flow
          const { data } = await apiClient.get('/consultation/my-bookings/');
          const existingBooking = data.find((b: any) => String(b.id) === String(bookingId));
          if (existingBooking) {
            setOldBooking(existingBooking);
            loadedCounselor = existingBooking.counselor;
          }
        } else if (counselorId) {
          // New Booking Flow
          const response = await apiClient.get(`/consultation/counselors/${counselorId}/`);
          loadedCounselor = response.data;
        }

        if (loadedCounselor) {
          setCounselor(loadedCounselor);
          
          const availableSlots = loadedCounselor.slots.filter((s: any) => !s.booked);
          const dates = [...new Set(availableSlots.map((s: any) => s.date))].sort() as string[];
          setUniqueDates(dates);
          if (dates.length > 0) setSelectedDate(dates[0]); 
        }

      } catch (error) {
        Alert.alert("Error", "Could not load counselor details.");
        router.back();
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [counselorId, bookingId]);

  const handleBooking = async () => {
    if (!selectedSlot) return Alert.alert("Select Slot", "Please pick a time for your appointment.");
    
    if (bookingId) {
      // Reschedule Flow
      try {
        await apiClient.post(`/consultation/reschedule-booking/${bookingId}/`, { slot: selectedSlot.id });
        Alert.alert("Rescheduled! 🎉", "Your appointment has been successfully updated.");
        router.replace('/consultation/booking_history');
      } catch (error: any) {
        Alert.alert("Error", error.response?.data?.error || "Action failed. Slot might be taken.");
      }
    } else {
      // New Booking Flow
      router.push({
        pathname: '/consultation/review_booking',
        params: { counselorId: counselor.id, slotId: selectedSlot.id }
      });
    }
  };

  const formatTimeAMPM = (timeStr: string) => {
    if (!timeStr) return '';
    let [hours, minutes] = timeStr.split(':');
    let h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${minutes} ${ampm}`;
  };

  const formatLocalDate = (dateString: string) => {
    if (!dateString) return "";
    const parts = dateString.split("-");
    if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
    return dateString;
  };

  const parseDateBubble = (dateStr: string) => {
    const d = new Date(dateStr);
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
    const dayNum = d.toLocaleDateString('en-US', { day: '2-digit' });
    const month = d.toLocaleDateString('en-US', { month: 'short' });
    return { dayName, dayNum, month };
  };

  if (loading || !counselor) return (
    <View className="flex-1 justify-center items-center bg-neutral-50 dark:bg-black">
      <ActivityIndicator size="large" color={isDark ? '#fb7185' : '#e11d48'} />
    </View>
  );

  const filteredSlots = counselor.slots.filter((s: any) => {
    if (s.booked) return false;
    if (s.date !== selectedDate) return false;
    if (modeFilter !== '' && s.mode !== modeFilter) return false;
    
    if (timeFilter !== 'All') {
      const hour = parseInt(s.time.split(':')[0], 10);
      if (timeFilter === 'Morning' && hour >= 12) return false;
      if (timeFilter === 'Afternoon' && (hour < 12 || hour >= 17)) return false;
      if (timeFilter === 'Evening' && hour < 17) return false;
    }
    
    return true;
  });

  const totalFee = parseFloat(counselor.consultation_fee) + 50;

  return (
    <View className="flex-1 bg-transparent">
      <ScrollView 
        className="flex-1 px-5 pt-14" 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 220 }} 
      >
        
        {/* Back Arrow Button */}
        <TouchableOpacity 
          onPress={() => router.back()} 
          className="w-12 h-12 mb-6 bg-amber-50/90 dark:bg-stone-950/90 border border-neutral-200 dark:border-neutral-800 shadow-sm rounded-full items-center justify-center self-start"
        >
          <Ionicons name="arrow-back" size={24} color={isDark ? '#f8fafc' : '#0f172a'} />
        </TouchableOpacity>

        {/* Old Booking Card */}
        {oldBooking && (
          <Card className="bg-amber-50/90 dark:bg-stone-950/90 rounded-[2.5rem] p-6 border border-amber-200 dark:border-amber-500/20 shadow-sm mb-6">
            <Text className="text-xl font-black text-neutral-900 dark:text-white tracking-tight mb-1 flex-wrap">Reschedule Session</Text>
            <Text className="text-md font-bold text-neutral-500 dark:text-amber-200/70 uppercase tracking-widest mb-4 flex-wrap">Current Booking Details</Text>
            
            <View className="flex-row flex-wrap gap-2">
              <View className="bg-amber-50/90 dark:bg-stone-950/90 px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm">
                <Text className="font-bold text-neutral-700 dark:text-neutral-300 text-md">📅 {formatLocalDate(oldBooking.slot.date)}</Text>
              </View>
              <View className="bg-amber-50/90 dark:bg-stone-950/90 px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm">
                <Text className="font-bold text-neutral-700 dark:text-neutral-300 text-md">🕒 {formatTimeAMPM(oldBooking.slot.time)}</Text>
              </View>
              <View className="bg-amber-50/90 dark:bg-stone-950/90 px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm">
                <Text className="font-bold text-neutral-700 dark:text-neutral-300 text-md uppercase">{oldBooking.slot.mode === 'online' ? '💻' : '🏥'} {oldBooking.slot.mode}</Text>
              </View>
            </View>
          </Card>
        )}

        {/* Doctor Info Card */}
        <Card className="bg-amber-50/90 dark:bg-stone-950/90 rounded-[2.5rem] p-6 md:p-8 border border-neutral-200 dark:border-neutral-800 shadow-sm mb-6 items-center text-center">
          
          <View className="flex-row justify-center mb-4">
            <View className="flex-row items-center bg-amber-50/90 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 px-3 py-1.5 rounded-2xl">
              <Text className="text-md font-black text-amber-500 dark:text-amber-400">⭐ {counselor.rating}</Text>
              <Text className="text-md font-bold text-amber-700/70 dark:text-amber-300/70 ml-1">({counselor.total_sessions})</Text>
            </View>
          </View>

          <View className="w-24 h-24 bg-rose-50/90 dark:bg-rose-900/30 border border-rose-100 dark:border-rose-500/20 rounded-[2rem] items-center justify-center mb-4 shadow-sm">
            <Text className="text-4xl">👨‍⚕️</Text>
          </View>
          
          <Text className="text-3xl font-black text-neutral-900 dark:text-white tracking-tight text-center leading-tight flex-wrap">{counselor.name}</Text>
          <Text className="text-sm font-bold text-rose-600 dark:text-rose-400 uppercase tracking-widest mt-2 text-center flex-wrap">{counselor.designation}</Text>

          <Text className="text-base text-neutral-600 dark:text-neutral-400 font-medium text-center mt-5 flex-wrap">{counselor.specialization || ""}</Text>

          {counselor.email && (
            <View className="mt-4 flex-row items-center justify-center flex-wrap gap-1">
              <Ionicons name="mail" size={16} color={isDark ? "#fb7185" : "#e11d48"} />
              <Text className="text-sm font-bold text-neutral-600 dark:text-neutral-300 lowercase flex-shrink">{counselor.email}</Text>
            </View>
          )}

          {/* Badges: Verified & Mode */}
          <View className="flex-row flex-wrap justify-center gap-3 mt-6">
            <View className="px-4 py-2 rounded-xl border bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30">
               <Text numberOfLines={1} className="text-md font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">✓ Verified</Text>
            </View>
            <View className={`px-4 py-2 rounded-xl border ${counselor.mode === 'online' ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30' : 'bg-cyan-50 dark:bg-cyan-500/10 border-cyan-200 dark:border-cyan-500/30'}`}>
              <Text numberOfLines={1} className={`text-md font-black uppercase tracking-widest ${counselor.mode === 'online' ? 'text-emerald-600 dark:text-emerald-400' : 'text-cyan-600 dark:text-cyan-400'}`}>
                {counselor.mode === 'online' ? '💻' : '🏥'} {counselor.mode}
              </Text>
            </View>
          </View>

          {/* Office Address */}
          {counselor.office_address && (
            <View className="mt-6 w-full p-4 rounded-2xl bg-neutral-50/90 dark:bg-neutral-800/90 border border-neutral-200 dark:border-neutral-700 text-center items-center">
              <Text className="text-md uppercase font-bold tracking-widest text-neutral-500 dark:text-neutral-400">📍 Doctor Office</Text>
              <Text className="mt-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 text-center flex-wrap">{counselor.office_address}</Text>
            </View>
          )}

          {/* Experience & Session Length Grid */}
          <View className="flex-row w-full mt-8 gap-4 flex-wrap">
            <View className="flex-1 bg-neutral-50/90 dark:bg-neutral-800/90 px-2 py-4 rounded-2xl border border-neutral-200 dark:border-neutral-700 items-center">
              <Text numberOfLines={1} adjustsFontSizeToFit className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">Experience</Text>
              <Text numberOfLines={1} adjustsFontSizeToFit className="font-black text-xl text-neutral-900 dark:text-white mt-1">{counselor.experience}+ Yrs</Text>
            </View>
            <View className="flex-1 bg-neutral-50/90 dark:bg-neutral-800/90 px-2 py-4 rounded-2xl border border-neutral-200 dark:border-neutral-700 items-center">
              <Text numberOfLines={1} adjustsFontSizeToFit className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">Session</Text>
              <Text numberOfLines={1} adjustsFontSizeToFit className="font-black text-xl text-neutral-900 dark:text-white mt-1">45 min</Text>
            </View>
          </View>

          {/* Consultation Fee */}
          <View className="w-full mt-4 bg-rose-50/90 dark:bg-rose-900/40 border border-rose-100 dark:border-rose-500/20 rounded-3xl p-5 items-center">
            <Text numberOfLines={1} adjustsFontSizeToFit className="text-md font-bold uppercase tracking-widest text-neutral-600 dark:text-rose-200/70">Consultation Fee</Text>
            <Text numberOfLines={1} adjustsFontSizeToFit className="text-3xl font-black text-rose-600 dark:text-rose-400 mt-1">₹{counselor.consultation_fee}</Text>
          </View>
        </Card>

        {/* Middle Card: Slot Selection */}
        <Card className="bg-amber-50/90 dark:bg-stone-950/90 border border-neutral-200 dark:border-neutral-800 rounded-[2.5rem] p-6 md:p-8 shadow-sm mb-6">
          <Text className="text-2xl md:text-3xl font-black text-neutral-900 dark:text-white tracking-tight mb-6 flex-wrap">
            {bookingId ? "Choose New Slot" : "Choose Available Slot"}
          </Text>
          
          {/* 1. Horizontal Date Picker */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6" contentContainerStyle={{ paddingRight: 20 }}>
            {uniqueDates.length === 0 && <Text className="text-neutral-500 italic mt-2">No dates available.</Text>}
            {uniqueDates.map(date => {
              const isSelected = selectedDate === date;
              const { dayName, dayNum, month } = parseDateBubble(date);
              return (
                <TouchableOpacity 
                  key={date}
                  onPress={() => { setSelectedDate(date); setSelectedSlot(null); }}
                  className={`mr-3 px-5 py-4 rounded-[1.5rem] border items-center justify-center ${
                    isSelected 
                      ? 'bg-rose-600/80 border-rose-600/80' 
                      : 'bg-neutral-50/80 dark:bg-neutral-800/80 border-neutral-200 dark:border-neutral-700'
                  }`}
                >
                  <Text numberOfLines={1} className={`text-md font-bold mb-1 ${isSelected ? 'text-rose-100' : 'text-neutral-500 dark:text-neutral-400'}`}>{dayName}</Text>
                  <Text numberOfLines={1} className={`text-2xl font-black ${isSelected ? 'text-white' : 'text-neutral-900 dark:text-white'}`}>{dayNum}</Text>
                  <Text numberOfLines={1} className={`text-[10px] font-bold uppercase mt-1 ${isSelected ? 'text-rose-100' : 'text-neutral-500 dark:text-neutral-400'}`}>{month}</Text>
                </TouchableOpacity>
              )
            })}
          </ScrollView>

          {/* 2. Mode Filters */}
          <View className="mb-8">
            <Text className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mb-3 ml-2">
              Consultation Mode
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 20 }}>
              <View className="flex-row gap-3">
                <TouchableOpacity onPress={() => setModeFilter('')} className={`px-5 py-2.5 rounded-full border items-center flex-row ${modeFilter === '' ? 'bg-rose-50/90 border-rose-200/90 dark:bg-rose-900/20 dark:border-rose-500/30' : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700'}`}>
                  <Text numberOfLines={1} className={`font-bold text-sm ${modeFilter === '' ? 'text-rose-700 dark:text-rose-300' : 'text-neutral-500 dark:text-neutral-400'}`}>All Modes</Text>
                </TouchableOpacity>
                
                <TouchableOpacity onPress={() => setModeFilter('online')} className={`px-5 py-2.5 rounded-full border items-center flex-row ${modeFilter === 'online' ? 'bg-emerald-50/90 border-emerald-200/90 dark:bg-emerald-500/10 dark:border-emerald-500/30' : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700'}`}>
                  <Text numberOfLines={1} className={`font-bold text-sm ${modeFilter === 'online' ? 'text-emerald-700 dark:text-emerald-300' : 'text-neutral-500 dark:text-neutral-400'}`}>💻 Online</Text>
                </TouchableOpacity>
                
                <TouchableOpacity onPress={() => setModeFilter('offline')} className={`px-5 py-2.5 rounded-full border items-center flex-row ${modeFilter === 'offline' ? 'bg-cyan-50/90 border-cyan-200/90 dark:bg-cyan-500/10 dark:border-cyan-500/30' : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700'}`}>
                  <Text numberOfLines={1} className={`font-bold text-sm ${modeFilter === 'offline' ? 'text-cyan-700 dark:text-cyan-300' : 'text-neutral-500 dark:text-neutral-400'}`}>🏥 Offline</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>

          {/* 3. Time Filters */}
          <View className="mb-8">
            <Text className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mb-3 ml-2">
              Time of Day
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 20 }}>
              <View className="flex-row gap-3">
                {[
                  { id: 'All', label: 'All Times', icon: '🕒' },
                  { id: 'Morning', label: 'Morning', icon: '🌅' },
                  { id: 'Afternoon', label: 'Afternoon', icon: '☀️' },
                  { id: 'Evening', label: 'Evening', icon: '🌙' }
                ].map(filter => (
                   <TouchableOpacity 
                     key={filter.id}
                     onPress={() => setTimeFilter(filter.id)} 
                     className={`px-5 py-2.5 rounded-full border items-center flex-row ${timeFilter === filter.id ? 'bg-rose-50/90 border-rose-200/90 dark:bg-rose-900/20 dark:border-rose-500/30' : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700'}`}>
                     <Text numberOfLines={1} className={`font-bold text-sm ${timeFilter === filter.id ? 'text-rose-700 dark:text-rose-300' : 'text-neutral-500 dark:text-neutral-400'}`}>
                       {filter.icon} {filter.label}
                     </Text>
                   </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Time Slots Grid */}
          <View className="flex-row items-center justify-between mb-4 border-t border-neutral-200 dark:border-neutral-800 pt-4 flex-wrap">
            <Text className="font-bold text-neutral-900 dark:text-white text-lg">Available Times</Text>
            <View className="px-3 py-1 bg-rose-50/90 dark:bg-rose-900/20 rounded-lg border border-rose-100 dark:border-rose-500/30">
              <Text numberOfLines={1} className="text-md font-bold text-rose-700 dark:text-rose-300">{filteredSlots.length} Slots</Text>
            </View>
          </View>

          <View className="flex-row flex-wrap justify-between">
            {filteredSlots.length === 0 && (
              <View className="w-full py-8 items-center bg-amber-50/90 dark:bg-stone-950/90 rounded-2xl border border-neutral-200 dark:border-neutral-700">
                <Ionicons name="time-outline" size={32} color={isDark ? "#fb7185" : "#94a3b8"} />
                <Text className="text-neutral-600 dark:text-neutral-400 font-medium mt-2 text-center px-4 flex-wrap">No slots match your current date and time filters.</Text>
              </View>
            )}
            
            {filteredSlots.map((s: any) => {
              const isSelected = selectedSlot?.id === s.id;
              return (
                <TouchableOpacity 
                  key={s.id}
                  onPress={() => setSelectedSlot(s)}
                  className={`w-[48%] p-4 mb-3 rounded-[1.5rem] border ${
                    isSelected 
                      ? 'border-rose-500 bg-rose-50/90 dark:bg-rose-900/20 shadow-sm' 
                      : 'border-neutral-200 bg-neutral-50/80 dark:border-neutral-700 dark:bg-neutral-800/80'
                  }`}
                >
                  <Text numberOfLines={1} adjustsFontSizeToFit className={`font-black text-xl mb-2 flex-wrap ${isSelected ? 'text-rose-600 dark:text-rose-400' : 'text-neutral-900 dark:text-white'}`}>
                    🕒 {formatTimeAMPM(s.time.substring(0,5))}
                  </Text>
                  
                  <View className="flex-row flex-wrap mt-1">
                    <Text numberOfLines={1} className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${s.mode === 'online' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-cyan-50 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-400'}`}>
                      {s.mode === 'online' ? '💻' : '🏥'} {s.mode}
                    </Text>
                  </View>
                </TouchableOpacity>
              )
            })}
          </View>
        </Card>

        {/* Bottom Card: Booking Summary */}
        <Card className="bg-amber-50/90 dark:bg-stone-950/90 border border-neutral-200 dark:border-neutral-800 rounded-[2.5rem] p-6 md:p-8 shadow-sm">
          <Text className="text-2xl font-black text-neutral-900 dark:text-white mb-6 flex-wrap">Booking Summary</Text>
          <View className="flex-row justify-between mb-4 flex-wrap">
            <Text className="text-neutral-600 dark:text-neutral-400 font-medium text-lg">Consultation Fee</Text>
            <Text className="text-neutral-900 dark:text-white font-bold text-lg">₹{counselor.consultation_fee}</Text>
          </View>
          <View className="flex-row justify-between mb-6 flex-wrap">
            <Text className="text-neutral-600 dark:text-neutral-400 font-medium text-lg">Platform Fee</Text>
            <Text className="text-neutral-900 dark:text-white font-bold text-lg">₹50.00</Text>
          </View>
          <View className="flex-row justify-between pt-6 border-t border-dashed border-neutral-300 dark:border-neutral-700 flex-wrap">
            <Text className="font-black text-2xl text-neutral-900 dark:text-white">Total</Text>
            <Text className="font-black text-3xl text-rose-600 dark:text-rose-400">₹{totalFee.toFixed(2)}</Text>
          </View>
        </Card>

      </ScrollView>

      {/* Floating Confirm Button (Sticky Footer using HeroUI Button) */}
      <View 
        style={{ paddingBottom: Math.max(insets.bottom + 16, 32) }}
        className="absolute bottom-0 left-0 right-0 pt-4 px-5 bg-neutral-50/90 dark:bg-black/90 border-t border-neutral-200 dark:border-neutral-800 backdrop-blur-xl"
      >
        <Button 
          className={`w-full h-14 rounded-2xl flex-row shadow-sm ${selectedSlot ? 'bg-rose-600/90 dark:bg-rose-500/90' : 'bg-neutral-200/90 dark:bg-neutral-800/90'}`}
          onPress={handleBooking}
          disabled={!selectedSlot}
        >
          <Text className={`font-black text-sm uppercase tracking-widest text-center flex-wrap ${selectedSlot ? 'text-white' : 'text-neutral-400 dark:text-neutral-500'}`}>
            {bookingId ? "Confirm Reschedule" : "Continue Booking"}
          </Text>
          {selectedSlot && <Ionicons name="checkmark-circle" size={20} color="white" style={{ marginLeft: 8 }} />}
        </Button>
      </View>
    </View>
  );
}