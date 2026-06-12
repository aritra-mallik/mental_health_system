import React, { useEffect, useState } from 'react';
import { ScrollView, TouchableOpacity, Alert, ActivityIndicator, View, Modal, Text, useColorScheme } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card, Button } from 'heroui-native';
import apiClient from '@/api/apiClient';

export default function RescheduleBookingScreen() {
  const { bookingId } = useLocalSearchParams(); 
  
  // Use standard system theme detection
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const [oldBooking, setOldBooking] = useState<any>(null);
  const [counselor, setCounselor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Filters & Selection
  const [uniqueDates, setUniqueDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [modeFilter, setModeFilter] = useState<string>('');
  const [timeFilter, setTimeFilter] = useState<string>('All'); 
  const [selectedSlot, setSelectedSlot] = useState<any>(null);

  const [isModalVisible, setModalVisible] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const fetchBookingDetails = async () => {
      try {
        if (!bookingId) {
          Alert.alert("Error", "Missing booking details.");
          router.back();
          return;
        }

        const { data } = await apiClient.get('/consultation/my-bookings/');
        const existingBooking = data.find((b: any) => String(b.id) === String(bookingId));
        
        if (!existingBooking) {
          Alert.alert("Error", "Booking not found.");
          router.back();
          return;
        }

        setOldBooking(existingBooking);
        setCounselor(existingBooking.counselor);
        
        const availableSlots = existingBooking.counselor.slots.filter((s: any) => !s.booked);
        const dates = [...new Set(availableSlots.map((s: any) => s.date))].sort() as string[];
        setUniqueDates(dates);
        if (dates.length > 0) setSelectedDate(dates[0]);

      } catch (error) {
        Alert.alert("Error", "Could not load booking details.");
        router.back();
      } finally {
        setLoading(false);
      }
    };
    fetchBookingDetails();
  }, [bookingId]);

  const handleReschedule = async () => {
    setIsProcessing(true);
    try {
      await apiClient.post(`/consultation/reschedule-booking/${bookingId}/`, { slot: selectedSlot.id });
      setModalVisible(false);
      router.replace('/consultation/booking_history');
    } catch (error: any) {
      setModalVisible(false);
      Alert.alert("Reschedule Failed", error.response?.data?.error || "This slot might have just been taken.");
    } finally {
      setIsProcessing(false);
    }
  };

  // --- Formatters ---
  const formatTimeAMPM = (timeStr: string | undefined) => {
    if (!timeStr) return '--';
    let [hours, minutes] = timeStr.split(':');
    const ampm = parseInt(hours, 10) >= 12 ? 'PM' : 'AM';
    let h = parseInt(hours, 10) % 12 || 12;
    return `${h}:${minutes} ${ampm}`;
  };

  const formatIndianDate = (dateString: string | undefined) => {
    if (!dateString) return "--";
    if (dateString.includes("-")) {
      const parts = dateString.split("-");
      if (parts[0].length === 4) { 
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }
    return dateString;
  };

  const parseDateBubble = (dateStr: string) => {
    const d = new Date(dateStr);
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
    const dayNum = d.toLocaleDateString('en-US', { day: '2-digit' });
    const month = d.toLocaleDateString('en-US', { month: 'short' });
    return { dayName, dayNum, month };
  };

  // Apply filters to slots
  const filteredSlots = counselor?.slots.filter((s: any) => {
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

  if (loading || !counselor || !oldBooking) {
    return (
      <View className="flex-1 justify-center items-center bg-neutral-50 dark:bg-black">
        <ActivityIndicator size="large" color={isDark ? '#fb7185' : '#e11d48'} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-neutral-50 dark:bg-black">
      <ScrollView className="flex-1 px-5 pt-14" showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom: 150}}>
        
        {/* Back Arrow Button */}
        <TouchableOpacity 
          onPress={() => router.back()} 
          className="w-12 h-12 mb-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm rounded-full items-center justify-center self-start"
        >
          <Ionicons name="arrow-back" size={24} color={isDark ? '#f8fafc' : '#0f172a'} />
        </TouchableOpacity>

        {/* Page Header */}
        <View className="mb-8">
          <Text className="text-4xl font-black text-neutral-900 dark:text-white tracking-tight leading-tight mb-2">
            Reschedule Session
          </Text>
          <Text className="text-base text-neutral-600 dark:text-neutral-400 font-medium leading-relaxed">
            Select a new appointment slot for your consultation.
          </Text>
        </View>

        {/* --- 1. CURRENT BOOKING CARD --- */}
        <Card className="bg-amber-50 dark:bg-amber-900/10 rounded-[2.5rem] p-6 border border-amber-200 dark:border-amber-500/20 shadow-sm mb-6">
          <Text className="text-md font-bold text-neutral-500 dark:text-amber-200/70 uppercase tracking-widest mb-4 flex-wrap">Current Booking Details</Text>
          
          <View className="flex-row flex-wrap gap-2">
            <View className="bg-white dark:bg-neutral-800 px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm">
              <Text className="font-bold text-neutral-700 dark:text-neutral-300 text-md">📅 {formatIndianDate(oldBooking.slot.date)}</Text>
            </View>
            <View className="bg-white dark:bg-neutral-800 px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm">
              <Text className="font-bold text-neutral-700 dark:text-neutral-300 text-md">🕒 {formatTimeAMPM(oldBooking.slot.time)}</Text>
            </View>
            <View className="bg-white dark:bg-neutral-800 px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm">
              <Text className="font-bold text-neutral-700 dark:text-neutral-300 text-md uppercase">{oldBooking.slot.mode === 'online' ? '💻' : '🏥'} {oldBooking.slot.mode}</Text>
            </View>
          </View>
        </Card>

        {/* --- 2. DOCTOR INFO CARD --- */}
        <Card className="bg-white dark:bg-neutral-900 rounded-[2.5rem] p-6 md:p-8 border border-neutral-200 dark:border-neutral-800 shadow-sm mb-6 items-center text-center">
          
          <View className="flex-row justify-center mb-4">
            <View className="flex-row items-center bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 px-3 py-1.5 rounded-2xl">
              <Text className="text-md font-black text-amber-500 dark:text-amber-400">⭐ {counselor.rating}</Text>
              <Text className="text-md font-bold text-amber-700/70 dark:text-amber-300/70 ml-1">({counselor.total_sessions})</Text>
            </View>
          </View>

          <View className="w-24 h-24 bg-rose-50 dark:bg-rose-900/10 rounded-[2rem] items-center justify-center mb-4 shadow-sm border border-rose-100 dark:border-rose-500/20 overflow-hidden">
            <Text className="text-4xl">👨‍⚕️</Text>
          </View>
          
          <Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.75} className="text-3xl font-black text-neutral-900 dark:text-white tracking-tight text-center leading-tight px-2">{counselor.name}</Text>
          <Text className="text-sm font-bold text-rose-600 dark:text-rose-400 uppercase tracking-widest mt-2 text-center">{counselor.designation}</Text>

          <Text className="text-base text-neutral-600 dark:text-neutral-400 font-medium text-center mt-5">{counselor.specialization || ""}</Text>

          {counselor.email && (
            <View className="mt-4 flex-row items-center justify-center flex-wrap gap-1">
              <Ionicons name="mail" size={16} color={isDark ? "#fb7185" : "#e11d48"} />
              <Text className="text-sm font-bold text-neutral-600 dark:text-neutral-300 lowercase">{counselor.email}</Text>
            </View>
          )}

          {/* Badges: Verified & Mode */}
          <View className="flex-row flex-wrap justify-center gap-3 mt-6">
            <View className="px-4 py-2 rounded-xl border bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30">
               <Text className="text-md font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">✓ Verified</Text>
            </View>
            <View className={`px-4 py-2 rounded-xl border ${counselor.mode === 'online' ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30' : 'bg-cyan-50 dark:bg-cyan-500/10 border-cyan-200 dark:border-cyan-500/30'}`}>
              <Text className={`text-md font-black uppercase tracking-widest ${counselor.mode === 'online' ? 'text-emerald-600 dark:text-emerald-400' : 'text-cyan-600 dark:text-cyan-400'}`}>
                {counselor.mode === 'online' ? '💻' : '🏥'} {counselor.mode}
              </Text>
            </View>
          </View>

          {/* Office Address */}
          {counselor.office_address && (
            <View className="mt-6 w-full p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-center items-center">
              <Text className="text-md uppercase font-bold tracking-widest text-neutral-500 dark:text-neutral-400">📍 Doctor Office</Text>
              <Text className="mt-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 text-center" allowFontScaling>{counselor.office_address}</Text>
            </View>
          )}

          {/* Experience & Session Length Grid */}
          <View className="flex-row w-full mt-8 gap-4 flex-wrap">
            <View className="flex-1 bg-neutral-50 dark:bg-neutral-800 px-2 py-4 rounded-2xl border border-neutral-200 dark:border-neutral-700 items-center">
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">Experience</Text>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5} className="font-black text-xl text-neutral-900 dark:text-white mt-1 w-full text-center">{counselor.experience}+ Yrs</Text>
            </View>

            <View className="flex-1 bg-neutral-50 dark:bg-neutral-800 px-2 py-4 rounded-2xl border border-neutral-200 dark:border-neutral-700 items-center">
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">Session</Text>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5} className="font-black text-xl text-neutral-900 dark:text-white mt-1 w-full text-center">45 min</Text>
            </View>
          </View>

          {/* Consultation Fee */}
          <View className="w-full mt-4 bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-500/20 rounded-3xl p-5 items-center">
            <Text className="text-md font-bold uppercase tracking-widest text-neutral-600 dark:text-rose-200/70">Consultation Fee</Text>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} className="text-3xl font-black text-rose-600 dark:text-rose-400 mt-1 px-2">₹{counselor.consultation_fee}</Text>
          </View>
        </Card>

        {/* --- 3. MIDDLE CARD: SLOT SELECTION --- */}
        <Card className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-[2.5rem] p-6 md:p-8 shadow-sm mb-6">
          <Text className="text-2xl md:text-3xl font-black text-neutral-900 dark:text-white tracking-tight mb-6">
            Choose New Slot
          </Text>
          
          {/* Horizontal Date Picker */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6" contentContainerStyle={{ paddingRight: 20 }}>
            {uniqueDates.length === 0 && <Text className="text-neutral-500 italic mt-2">No dates available.</Text>}
            {uniqueDates.map(date => {
              const isSelected = selectedDate === date;
              const { dayName, dayNum, month } = parseDateBubble(date);
              return (
                <TouchableOpacity 
                  key={date}
                  onPress={() => { setSelectedDate(date); setSelectedSlot(null); }}
                  className={`mr-3 px-5 py-4 rounded-[1.5rem] border items-center justify-center shadow-sm ${
                    isSelected ? 'bg-rose-600 border-rose-600' : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700'
                  }`}
                >
                  <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} className={`text-md font-bold mb-1 ${isSelected ? 'text-rose-100' : 'text-neutral-500 dark:text-neutral-400'}`}>{dayName}</Text>
                  <Text className={`text-2xl font-black ${isSelected ? 'text-white' : 'text-neutral-900 dark:text-white'}`}>{dayNum}</Text>
                  <Text className={`text-[10px] font-bold uppercase mt-1 ${isSelected ? 'text-rose-100' : 'text-neutral-500 dark:text-neutral-400'}`}>{month}</Text>
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
              <TouchableOpacity onPress={() => setModeFilter('')} className={`px-5 py-2.5 rounded-full border items-center flex-row ${modeFilter === '' ? 'bg-rose-50 border-rose-200 dark:bg-rose-900/20 dark:border-rose-500/30' : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700'}`}>
                <Text numberOfLines={1} className={`font-bold text-sm ${modeFilter === '' ? 'text-rose-700 dark:text-rose-300' : 'text-neutral-500 dark:text-neutral-400'}`}>All Modes</Text>
              </TouchableOpacity>
                          
              <TouchableOpacity onPress={() => setModeFilter('online')} className={`px-5 py-2.5 rounded-full border items-center flex-row ${modeFilter === 'online' ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/30' : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700'}`}>
                <Text numberOfLines={1} className={`font-bold text-sm ${modeFilter === 'online' ? 'text-emerald-700 dark:text-emerald-300' : 'text-neutral-500 dark:text-neutral-400'}`}>💻 Online</Text>
              </TouchableOpacity>
                          
              <TouchableOpacity onPress={() => setModeFilter('offline')} className={`px-5 py-2.5 rounded-full border items-center flex-row ${modeFilter === 'offline' ? 'bg-cyan-50 border-cyan-200 dark:bg-cyan-500/10 dark:border-cyan-500/30' : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700'}`}>
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
                className={`px-5 py-2.5 rounded-full border items-center flex-row ${timeFilter === filter.id ? 'bg-rose-50 border-rose-200 dark:bg-rose-900/20 dark:border-rose-500/30' : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700'}`}>
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
            <View className="px-3 py-1 bg-rose-50 dark:bg-rose-900/20 rounded-lg border border-rose-100 dark:border-rose-500/30">
              <Text className="text-md font-bold text-rose-700 dark:text-rose-300">{filteredSlots?.length || 0} Slots</Text>
            </View>
          </View>

          <View className="flex-row flex-wrap justify-between">
            {(!filteredSlots || filteredSlots.length === 0) && (
              <View className="w-full py-8 items-center bg-neutral-50 dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700">
                <Ionicons name="time-outline" size={32} color={isDark ? "#fb7185" : "#94a3b8"} />
                <Text className="text-neutral-600 dark:text-neutral-400 font-medium mt-2 text-center px-4 flex-wrap">No slots match your current date and time filters.</Text>
              </View>
            )}
            
            {filteredSlots?.map((s: any) => {
              const isSelected = selectedSlot?.id === s.id;
              return (
                <TouchableOpacity
                  key={s.id}
                  onPress={() => setSelectedSlot(s)}
                  className={`w-[48%] p-4 mb-3 rounded-[1.5rem] border ${isSelected ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20 shadow-sm' : 'border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800'}`}
                >
                  <Text
                    numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} className={`font-black text-xl mb-2 ${isSelected ? 'text-rose-600 dark:text-rose-400' : 'text-neutral-900 dark:text-white'}`}>
                    🕒 {formatTimeAMPM(s.time.substring(0,5))}
                  </Text>

                  <View className="flex-row flex-wrap mt-1">
                    <Text numberOfLines={1} className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                        s.mode === 'online'
                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                          : 'bg-cyan-50 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-400'}`}
                    >
                      {s.mode === 'online' ? '💻' : '🏥'} {s.mode}
                    </Text>
                  </View>
                </TouchableOpacity>
              )
            })}
          </View>
        </Card>
      </ScrollView>

      {/* Floating Sticky Save Button */}
      <View className="absolute bottom-0 left-0 right-0 pt-4 pb-8 px-5 bg-neutral-50/90 dark:bg-black/90 border-t border-neutral-200 dark:border-neutral-800 backdrop-blur-xl">
        <Button 
          className={`w-full h-14 rounded-2xl flex-row shadow-sm ${selectedSlot ? 'bg-rose-600 dark:bg-rose-500' : 'bg-neutral-200 dark:bg-neutral-800'}`}
          onPress={() => setModalVisible(true)}
          disabled={!selectedSlot}
        >
          <Text className={`font-black text-sm uppercase tracking-widest text-center flex-wrap ${selectedSlot ? 'text-white' : 'text-neutral-400 dark:text-neutral-500'}`}>
            Review Changes
          </Text>
          {selectedSlot && <Ionicons name="arrow-forward" size={18} color="white" style={{ marginLeft: 8 }} />}
        </Button>
      </View>

      {/* Custom Confirmation Modal */}
      <Modal visible={isModalVisible} transparent={true} animationType="fade">
        <View className="flex-1 justify-center items-center bg-black/60 px-5">
          <Card className="w-full max-w-sm bg-white dark:bg-neutral-900 rounded-[2.5rem] p-8 items-center shadow-2xl border border-neutral-200 dark:border-neutral-800">
            
            {isProcessing ? (
              <View className="items-center w-full py-2">
                <View className="w-24 h-24 rounded-full bg-rose-50 dark:bg-rose-900/10 items-center justify-center mb-6 border-[3px] border-rose-200 dark:border-rose-500/30">
                   <ActivityIndicator size="large" color={isDark ? '#fb7185' : '#e11d48'} />
                </View>
                <Text className="text-2xl font-black text-neutral-900 dark:text-white mb-3 text-center flex-wrap tracking-tight">
                  Securing Slot...
                </Text>
                <Text className="text-neutral-500 dark:text-neutral-400 text-center font-medium leading-relaxed flex-wrap">
                  Please wait while we update your appointment. Do not close this screen.
                </Text>
              </View>
            ) : (
              <>
                <View className="w-20 h-20 bg-rose-50 dark:bg-rose-900/10 rounded-[1.5rem] items-center justify-center mb-6 border border-rose-100 dark:border-rose-500/20">
                  <Ionicons name="swap-horizontal" size={36} color={isDark ? '#fb7185' : '#e11d48'} />
                </View>
                
                <Text className="text-2xl font-black text-neutral-900 dark:text-white mb-6 text-center tracking-tight flex-wrap">Confirm Reschedule</Text>
                
                <View className="w-full mb-8 space-y-4">
                  <View className="items-center">
                    <Text className="text-neutral-500 dark:text-neutral-400 font-bold text-md uppercase tracking-widest mb-1 flex-wrap">Moving From</Text>
                    <Text className="text-neutral-400 dark:text-neutral-500 font-medium flex-wrap text-center" style={{ textDecorationLine: 'line-through' }}>
                      {formatIndianDate(oldBooking?.slot?.date)} at {formatTimeAMPM(oldBooking?.slot?.time)}
                    </Text>
                  </View>
                  
                  <View className="items-center py-2">
                    <Ionicons name="arrow-down" size={20} color={isDark ? '#fb7185' : '#e11d48'} />
                  </View>

                  <View className="items-center">
                    <Text className="text-rose-600 dark:text-rose-400 font-bold text-md uppercase tracking-widest mb-1 flex-wrap">New Appointment</Text>
                    <Text className="text-neutral-900 dark:text-white font-black text-lg flex-wrap text-center">
                      {formatIndianDate(selectedSlot?.date)} at {formatTimeAMPM(selectedSlot?.time)}
                    </Text>
                  </View>
                </View>

                <View className="flex-row w-full gap-3 flex-wrap">
                  <Button 
                    className="flex-1 h-14 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl"
                    onPress={() => setModalVisible(false)}
                    disabled={isProcessing}
                  >
                    <Text numberOfLines={1} adjustsFontSizeToFit className="font-bold text-neutral-600 dark:text-neutral-300 uppercase text-md tracking-widest">Cancel</Text>
                  </Button>
                  
                  <Button 
                    className="flex-[1.5] h-14 rounded-xl bg-rose-600 dark:bg-rose-500"
                    onPress={handleReschedule}
                    disabled={isProcessing}
                  >
                    <Text numberOfLines={1} adjustsFontSizeToFit className="font-black text-white uppercase text-md tracking-widest">Save Changes</Text>
                  </Button>
                </View>
              </>
            )}

          </Card>
        </View>
      </Modal>

    </View>
  );
}