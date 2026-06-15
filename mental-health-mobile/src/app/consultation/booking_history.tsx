import React, { useEffect, useState } from 'react';
import { ScrollView, TouchableOpacity, ActivityIndicator, View, Text, Alert, Linking, Modal, useColorScheme } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card, Button } from 'heroui-native';
import apiClient from '@/api/apiClient';

export default function BookingHistoryScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  // Custom Modal States
  const [isCancelModalVisible, setCancelModalVisible] = useState(false);
  const [isSuccessModalVisible, setSuccessModalVisible] = useState(false);
  const [selectedBookingToCancel, setSelectedBookingToCancel] = useState<any>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const fetchBookings = async () => {
    try {
      const response = await apiClient.get('/consultation/my-bookings/');
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let fetchedData = response.data || [];
      // Sort: Upcoming sessions first, then past sessions
      fetchedData.sort((a: any, b: any) => {
          const dateA = new Date(a.slot.date);
          const dateB = new Date(b.slot.date);
          const isPastA = dateA < today;
          const isPastB = dateB < today;

          if (isPastA !== isPastB) return isPastA ? 1 : -1; 
          if (!isPastA) {
              if (dateA.getTime() !== dateB.getTime()) return dateA.getTime() - dateB.getTime();
              return a.slot.time.localeCompare(b.slot.time);
          }
          if (dateA.getTime() !== dateB.getTime()) return dateB.getTime() - dateA.getTime();
          return b.slot.time.localeCompare(a.slot.time); 
      });

      setBookings(fetchedData);
    } catch (error) {
      console.error("Failed to fetch bookings", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBookings(); }, []);

  const openCancelModal = (id: any) => {
    setSelectedBookingToCancel(id);
    setCancelModalVisible(true);
  };

  const confirmCancel = async () => {
    if (!selectedBookingToCancel) return;
    setIsCancelling(true);
    try {
      await apiClient.post(`/consultation/cancel-booking/${selectedBookingToCancel}/`);
      await fetchBookings(); 
      
      setCancelModalVisible(false);
      
      setTimeout(() => {
        setSuccessModalVisible(true);
      }, 400);
      
    } catch (e) {
      setCancelModalVisible(false);
      Alert.alert("Error", "Could not cancel booking.");
    } finally {
      setIsCancelling(false);
      setSelectedBookingToCancel(null);
    }
  };

  const formatAMPM = (timeStr: string) => {
    if (!timeStr) return "";
    let [hours, minutes] = timeStr.split(':');
    let h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12; 
    return `${h.toString().padStart(2, '0')}:${minutes} ${ampm}`;
  };

  const formatIndianDate = (dateString: string) => {
    if (!dateString) return "";
    const parts = dateString.split("-");
    if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
    return dateString;
  };

  const displayedBookings = filter === 'all' ? bookings : bookings.filter((b: any) => b.status === filter);

  const renderBooking = ({ item }: { item: any }) => {
    return (
      <Card className="bg-amber-50/90 dark:bg-stone-950/90 p-6 md:p-8 rounded-[2.5rem] border border-neutral-200 dark:border-neutral-800 shadow-sm mb-6">
        
        {/* Separated Status Row */}
        <View className="flex-row flex-wrap justify-between items-center gap-3 mb-5 pb-4 border-b border-neutral-200 dark:border-neutral-800">
          <Text numberOfLines={1} className="text-md font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest shrink mr-2">
            Session Details
          </Text>
          <View className={`px-3.5 py-1.5 rounded-lg border ${
            item.status === 'booked' ? 'bg-emerald-50/90 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30' : 
            item.status === 'completed' ? 'bg-purple-50/90 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/30' : 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30'
          }`}>
            <Text numberOfLines={1} className={`text-[10px] font-black uppercase tracking-widest ${
              item.status === 'booked' ? 'text-emerald-600 dark:text-emerald-400' : 
              item.status === 'completed' ? 'text-purple-600 dark:text-purple-400' : 'text-rose-600 dark:text-rose-400'
            }`}>
              {item.status === 'booked' ? '✅ Booked' : item.status === 'completed' ? '⭐ Completed' : '⛔ Cancelled'}
            </Text>
          </View>
        </View>

        {/* Doctor Info Row */}
        <View className="flex-row items-center gap-4 mb-6 flex-wrap">
          <View className="w-16 h-16 rounded-2xl bg-rose-50/90 dark:bg-rose-900/30 items-center justify-center border border-rose-100 dark:border-rose-500/20 shrink-0">
            <Text className="text-4xl">👨‍⚕️</Text>
          </View>
          <View className="flex-1 justify-center min-w-[50%]">
            <Text className="font-black text-2xl text-neutral-900 dark:text-white leading-tight flex-wrap">{item.counselor?.name}</Text>
            <Text className="text-sm font-bold text-rose-600 dark:text-rose-400 mt-1 flex-wrap">{item.counselor?.designation || "Specialist"}</Text>
          </View>
        </View>

        {/* Unified Vertical Details Box */}
        <View className="bg-neutral-50/70 dark:bg-neutral-800/70 rounded-[1.5rem] border border-neutral-200 dark:border-neutral-700 mb-6 overflow-hidden">
          
          {/* Date Row */}
          <View className="flex-row justify-between items-center p-4 md:p-5 border-b border-neutral-200 dark:border-neutral-700 flex-wrap gap-2">
            <View className="flex-row items-center gap-3">
              <View className="w-9 h-9 rounded-full bg-rose-50/90 dark:bg-rose-900/20 items-center justify-center border border-rose-100 dark:border-rose-500/30">
                <Text className="text-sm">📅</Text>
              </View>
              <Text className="text-md font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">Date</Text>
            </View>
            <Text className="font-black text-sm md:text-base text-neutral-900 dark:text-white flex-shrink text-right">{formatIndianDate(item.slot?.date)}</Text>
          </View>

          {/* Time Row */}
          <View className="flex-row justify-between items-center p-4 md:p-5 border-b border-neutral-200 dark:border-neutral-700 flex-wrap gap-2">
            <View className="flex-row items-center gap-3">
              <View className="w-9 h-9 rounded-full bg-amber-50/90 dark:bg-amber-900/20 items-center justify-center border border-amber-100 dark:border-amber-500/30">
                <Text className="text-sm">🕒</Text>
              </View>
              <Text className="text-md font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">Time</Text>
            </View>
            <Text className="font-black text-sm md:text-base text-neutral-900 dark:text-white flex-shrink text-right">{formatAMPM(item.slot?.time)}</Text>
          </View>

          {/* Mode Row */}
          <View className="flex-row justify-between items-center p-4 md:p-5 flex-wrap gap-2">
            <View className="flex-row items-center gap-3">
              <View className={`w-9 h-9 rounded-full items-center justify-center border ${item.slot?.mode === 'online' ? 'bg-emerald-50/80 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-500/30' : 'bg-cyan-50 dark:bg-cyan-900/20 border-cyan-100 dark:border-cyan-500/30'}`}>
                <Text className="text-sm">{item.slot?.mode === 'online' ? '💻' : '🏥'}</Text>
              </View>
              <Text className="text-md font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">Mode</Text>
            </View>
            <Text className={`font-black text-sm md:text-base uppercase flex-shrink text-right ${item.slot?.mode === "online" ? "text-emerald-600 dark:text-emerald-400" : "text-cyan-600 dark:text-cyan-400"}`}>
              {item.slot?.mode} Session
            </Text>
          </View>

        </View>
        
        {/* Highlighted Total Fee Row */}
        <View className="flex-row flex-wrap justify-between items-center bg-neutral-100/80 dark:bg-neutral-800/80 px-5 py-4 rounded-[1.5rem] mb-6 border border-neutral-200 dark:border-neutral-700 gap-2">
          <Text numberOfLines={1} className="text-neutral-600 dark:text-neutral-400 font-bold text-md uppercase tracking-widest shrink mr-4">Total Fee</Text>
          <Text numberOfLines={1} adjustsFontSizeToFit className="font-black text-xl text-neutral-900 dark:text-white shrink-0 text-right flex-1">₹{item.total_fee}</Text>
        </View>

        {/* Action Buttons & Offline Session Data */}
        {item.status === "booked" ? (
          <View className="mt-auto">
            {item.slot?.mode === "online" ? (
              item.can_join ? (
                <Button 
                  color="success"
                  className="w-full h-14 rounded-2xl mb-4"
                  onPress={() => Linking.openURL(item.meeting_link)}
                >
                  <Text numberOfLines={1} adjustsFontSizeToFit className="text-white font-black text-md uppercase tracking-widest text-center flex-wrap">🎥 Join Session</Text>
                </Button>
              ) : (
                <View className="bg-neutral-50/80 dark:bg-neutral-800/80 p-4 rounded-xl items-center justify-center mb-4 border border-neutral-200 dark:border-neutral-700">
                  <Text className="font-bold text-neutral-500 dark:text-neutral-400 text-md text-center flex-wrap">Join available 30 minutes before session</Text>
                </View>
              )
            ) : (
              <View className="bg-cyan-50/80 dark:bg-cyan-900/10 border border-cyan-200 dark:border-cyan-800/40 rounded-[1.5rem] p-5 mb-4">
                <Text className="text-center font-black text-cyan-700 dark:text-cyan-400 uppercase text-md tracking-widest mb-4 flex-wrap">🏥 Offline Session Details</Text>
                
                <View className="p-4 rounded-[1.25rem] bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 mb-3 items-center">
                  <Text className="text-[10px] uppercase font-bold tracking-widest text-neutral-500 dark:text-neutral-400 text-center flex-wrap">🔑 Clinic Access Key</Text>
                  <Text numberOfLines={1} adjustsFontSizeToFit className="font-black text-xl md:text-2xl mt-1.5 text-neutral-900 dark:text-white text-center">{item.access_key}</Text>
                </View>

                {item.counselor?.google_map_link && (
                  <View className="p-4 rounded-[1.25rem] bg-amber-50/90 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 items-center">
                    <Text className="text-[10px] uppercase font-bold tracking-widest text-neutral-500 dark:text-neutral-400 mb-3 text-center flex-wrap">📍 Clinic Address Direction</Text>
                    <Button 
                      className="h-12 w-full rounded-xl bg-rose-600/90 dark:bg-rose-500/90"
                      onPress={() => Linking.openURL(item.counselor.google_map_link)}
                    >
                      <Text numberOfLines={1} adjustsFontSizeToFit className="text-white font-bold text-md uppercase tracking-widest text-center">Open in Maps</Text>
                    </Button>
                  </View>
                )}
              </View>
            )}

            {/* Adaptive Action Buttons */}
            {item.can_modify && (
              <View className="flex-row flex-wrap gap-3 mt-2">
                <Button 
                  color="default"
                  className="flex-1 h-12 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl"
                  onPress={() => router.push({ pathname: '/consultation/reschedule_booking', params: { bookingId: item.id } })}
                >
                  <Text numberOfLines={1} adjustsFontSizeToFit className="text-neutral-900 dark:text-white font-bold text-md uppercase tracking-widest text-center">Reschedule</Text>
                </Button>
                
                <Button 
                  color="danger"
                  className="flex-1 h-12 rounded-xl"
                  onPress={() => openCancelModal(item.id)}
                >
                  <Text numberOfLines={1} adjustsFontSizeToFit className="text-white font-bold text-md uppercase tracking-widest text-center">Cancel</Text>
                </Button>
              </View>
            )}
          </View>
        ) : item.status === "completed" ? (
          <View className="w-full bg-purple-50/90 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800/40 py-4 rounded-xl items-center justify-center">
            <Text numberOfLines={1} adjustsFontSizeToFit className="text-purple-600 dark:text-purple-400 font-black text-md uppercase tracking-widest text-center">⭐ Session Completed</Text>
          </View>
        ) : (
          <View className="w-full bg-rose-50/90 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-800/40 py-4 rounded-xl items-center justify-center">
            <Text numberOfLines={1} adjustsFontSizeToFit className="text-rose-600 dark:text-rose-400 font-black text-md uppercase tracking-widest text-center">⛔ Booking Cancelled</Text>
          </View>
        )}
      </Card>
    );
  };

  if (loading) return (
    <View className="flex-1 justify-center items-center bg-amber-50/90 dark:bg-stone-950/90">
      <ActivityIndicator size="large" color={isDark ? '#fb7185' : '#e11d48'} />
    </View>
  );

  return (
    <View className="flex-1 bg-transparent">
      <ScrollView 
        className="flex-1 z-10" 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60 }}
      >
        <View className="px-5 pt-14 pb-4">
          
          <View className="flex-row items-center justify-between mb-8 flex-wrap">
            <View className="flex-row items-center flex-1 pr-4">
              <TouchableOpacity 
                onPress={() => router.back()} 
                className="w-12 h-12 mr-4 shrink-0 bg-amber-50/90 dark:bg-stone-950/90 border-neutral-200 dark:border-neutral-800 rounded-full items-center justify-center shadow-sm"
              >
                <Ionicons name="arrow-back" size={24} color={isDark ? '#f8fafc' : '#0f172a'} />
              </TouchableOpacity>
              <View className="flex-1">
                <Text className="text-4xl font-black text-neutral-900 dark:text-white tracking-tight leading-tight mb-2 flex-wrap">
                  My Bookings
                </Text>
              </View>
            </View>
          </View>

          {/* Filters */}
          <View className="mb-4">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 20 }}>
              {[{ id: 'all', label: 'All' }, { id: 'booked', label: 'Booked' }, { id: 'completed', label: 'Completed' }, { id: 'cancelled', label: 'Cancelled' }].map((f) => {
                const isActive = filter === f.id;
                return (
                  <TouchableOpacity 
                    key={f.id}
                    onPress={() => setFilter(f.id)}
                    className={`mr-2 px-6 py-3.5 rounded-xl border items-center justify-center flex-shrink-0 min-w-[80px] shadow-sm ${
                      isActive 
                        ? 'bg-rose-600/90 border-rose-600' 
                        : 'bg-amber-50/90 dark:bg-stone-950/90 border-neutral-200 dark:border-neutral-800'
                    }`}
                  >
                    <Text 
                      numberOfLines={1}
                      className={`font-bold text-[12px] uppercase tracking-wide ${isActive ? 'text-white' : 'text-neutral-600 dark:text-neutral-400'}`}
                    >
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>

        <View className="px-5">
          {displayedBookings.length === 0 ? (
            <Card className="bg-amber-50/90 dark:bg-stone-950/90 rounded-[2.5rem] p-12 text-center shadow-sm border border-neutral-200 dark:border-neutral-800 items-center mt-6">
              <View className="w-24 h-24 bg-neutral-50/90 dark:bg-neutral-800/90 rounded-full flex items-center justify-center mx-auto mb-6 border border-neutral-200 dark:border-neutral-700 shadow-sm">
                 <Text className="text-4xl opacity-50 grayscale">😔</Text>
              </View>
              <Text className="text-2xl font-black text-neutral-900 dark:text-white mt-2 text-center flex-wrap">No bookings found</Text>
              <Text className="text-neutral-500 dark:text-neutral-400 mt-2 font-medium text-center flex-wrap">You don't have any matching sessions.</Text>
            </Card>
          ) : (
            displayedBookings.map((item: any) => (
              <View key={item.id.toString()}>
                {renderBooking({ item })}
              </View>
            ))
          )}
        </View>

      </ScrollView>

      {/* --- 1. CUSTOM CANCEL CONFIRMATION MODAL WITH WAITING ANIMATION --- */}
      <Modal visible={isCancelModalVisible} transparent={true} animationType="fade">
        <View className="flex-1 justify-center items-center bg-black/60 px-5">
          <Card className="w-full max-w-sm bg-amber-50/90 dark:bg-stone-950/90 rounded-[2.5rem] p-8 items-center shadow-2xl border border-neutral-200 dark:border-neutral-800">
            
            {isCancelling ? (
              <View className="items-center w-full py-2">
                <View className="w-24 h-24 rounded-full bg-rose-50 dark:bg-rose-900/10 items-center justify-center mb-6 border-[3px] border-rose-200 dark:border-rose-500/30">
                   <ActivityIndicator size="large" color={isDark ? '#fb7185' : '#e11d48'} />
                </View>
                <Text className="text-2xl font-black text-neutral-900 dark:text-white mb-3 text-center flex-wrap tracking-tight">
                  Cancelling Slot...
                </Text>
                <Text className="text-neutral-500 dark:text-neutral-400 text-center font-medium leading-relaxed flex-wrap">
                  Please wait while we cancel your appointment. Do not close this screen.
                </Text>
              </View>
            ) : (
              <>
                <View className="w-20 h-20 bg-rose-50/90 dark:bg-rose-900/10 rounded-full items-center justify-center mb-6 border border-rose-200 dark:border-rose-500/30">
                  <Text className="text-4xl">⚠️</Text>
                </View>
                
                <Text className="text-3xl font-black text-neutral-900 dark:text-white mb-4 text-center tracking-tight flex-wrap">Confirm Action</Text>
                <Text className="text-neutral-500 dark:text-neutral-400 text-center font-medium mb-8 text-base flex-wrap">
                  Are you sure you want to cancel this booking?
                </Text>

                <View className="flex-row w-full gap-3 flex-wrap">
                  <Button 
                    color="default"
                    className="flex-1 h-14 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl"
                    onPress={() => setCancelModalVisible(false)}
                    disabled={isCancelling}
                  >
                    <Text numberOfLines={1} adjustsFontSizeToFit className="font-bold text-neutral-600 dark:text-neutral-300 text-center text-md uppercase tracking-widest">No, wait</Text>
                  </Button>
                  
                  <Button 
                    className="flex-[1.2] h-14 rounded-xl bg-rose-600 dark:bg-rose-500"
                    onPress={confirmCancel}
                    disabled={isCancelling}
                  >
                    <Text numberOfLines={1} adjustsFontSizeToFit className="font-bold text-white text-center text-md uppercase tracking-widest">Yes, Cancel</Text>
                  </Button>
                </View>
              </>
            )}

          </Card>
        </View>
      </Modal>

      {/* --- 2. BEAUTIFUL SUCCESS MODAL --- */}
      <Modal visible={isSuccessModalVisible} transparent={true} animationType="fade">
        <View className="flex-1 justify-center items-center bg-black/60 px-5">
          <Card className="w-full max-w-sm bg-amber-50/90 dark:bg-stone-950/90 rounded-[2.5rem] p-8 items-center shadow-2xl border border-neutral-200 dark:border-neutral-800">
            
            <View className="w-24 h-24 bg-emerald-50/90 dark:bg-emerald-500/10 rounded-full items-center justify-center mb-6 border border-emerald-200 dark:border-emerald-500/30">
              <Ionicons name="checkmark-done" size={48} color={isDark ? '#34d399' : '#10b981'} />
            </View>
            
            <Text className="text-3xl font-black text-neutral-900 dark:text-white mb-4 text-center tracking-tight flex-wrap">Cancelled</Text>
            <Text className="text-neutral-500 dark:text-neutral-400 text-center font-medium mb-8 text-base leading-relaxed flex-wrap">
              Your booking has been cancelled successfully.
            </Text>

            <Button 
              color="success"
              className="w-full h-14 rounded-xl"
              onPress={() => setSuccessModalVisible(false)}
            >
              <Text className="font-black text-white tracking-widest uppercase text-sm text-center">Done</Text>
            </Button>
          </Card>
        </View>
      </Modal>

    </View>
  );
}