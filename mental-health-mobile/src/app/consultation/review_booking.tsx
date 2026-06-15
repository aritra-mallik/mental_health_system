import React, { useEffect, useState } from 'react';
import { ScrollView, TouchableOpacity, ActivityIndicator, View, Text, Modal, Alert, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card, Button } from 'heroui-native';
import apiClient from '@/api/apiClient';

export default function ReviewBookingScreen() {
  const { counselorId, slotId } = useLocalSearchParams(); 
  const insets = useSafeAreaInsets();
  
  // Use exact theme detection logic
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const [counselor, setCounselor] = useState<any>(null);
  const [slot, setSlot] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setModalVisible] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        if (!counselorId || !slotId) {
          Alert.alert("Error", "Missing booking details.");
          router.back();
          return;
        }

        const response = await apiClient.get(`/consultation/counselors/${counselorId}/`);
        const cData = response.data;
        setCounselor(cData);
        
        const sData = cData.slots.find((s: any) => String(s.id) === String(slotId));
        if (sData) {
          setSlot(sData);
        } else {
          Alert.alert("Error", "Slot is no longer available.");
          router.back();
        }
      } catch (error) {
        Alert.alert("Error", "Could not load booking details.");
        router.back();
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [counselorId, slotId]);

  const confirmBooking = async () => {
    setIsProcessing(true);
    try {
      await apiClient.post('/consultation/book/', { counselor: counselorId, slot: slotId });
      setModalVisible(false);
      
      // Directly redirect to booking history without any extra popup
      router.replace('/consultation/booking_history');
    } catch (error: any) {
      setModalVisible(false);
      Alert.alert("Booking Failed", error.response?.data?.error || "This slot might have just been taken.");
    } finally {
      setIsProcessing(false);
    }
  };

  // --- Formatters ---
  const formatTimeAMPM = (timeStr: string) => {
    if (!timeStr) return '';
    let [hours, minutes] = timeStr.split(':');
    const ampm = parseInt(hours) >= 12 ? 'PM' : 'AM';
    let h = parseInt(hours) % 12 || 12;
    return `${h}:${minutes} ${ampm}`;
  };

  const formatLocalDate = (dateString: string) => {
    if (!dateString) return "";
    const parts = dateString.split("-");
    if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
    return dateString;
  };

  if (loading || !counselor || !slot) {
    return (
      <View className="flex-1 justify-center items-center bg-neutral-50 dark:bg-black">
        <ActivityIndicator size="large" color={isDark ? '#fb7185' : '#e11d48'} />
      </View>
    );
  }

  const platformFee = 50;
  const totalFee = parseFloat(counselor.consultation_fee) + platformFee;

  return (
    <View className="flex-1 bg-transparent">
      <ScrollView 
        className="flex-1 px-5 pt-14" 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 200 }}
      >
        
        {/* Back Button */}
        <TouchableOpacity 
          onPress={() => router.back()} 
          className="px-5 py-3 mb-8 bg-amber-50/90 dark:bg-stone-950/90 border border-neutral-200 dark:border-neutral-800 shadow-sm rounded-2xl self-start flex-row items-center"
        >
          <Ionicons name="arrow-back" size={18} color={isDark ? '#f8fafc' : '#0f172a'} />
          <Text className="font-bold text-neutral-700 dark:text-neutral-200 ml-2">Back to Slots</Text>
        </TouchableOpacity>

        {/* Header Section */}
        <View className="mb-10">
          <Text className="text-4xl font-black text-neutral-900 dark:text-white tracking-tight leading-tight mb-2 flex-wrap">
            Review & Confirm
          </Text>
          <Text className="text-base text-neutral-600 dark:text-neutral-400 font-medium leading-relaxed flex-wrap">
            Please check your appointment details before confirming.
          </Text>
        </View>

        {/* Card 1: Doctor Info */}
        <Card className="bg-amber-50/90 dark:bg-stone-950/90 rounded-[2.5rem] p-6 border border-neutral-200 dark:border-neutral-800 shadow-sm mb-6 flex-row items-center">
          <View className="w-20 h-20 bg-rose-50/90 dark:bg-rose-900/10 rounded-[1.5rem] items-center justify-center shadow-sm border border-rose-100 dark:border-rose-500/20">
            <Text className="text-4xl">👨‍⚕️</Text>
          </View>
          <View className="ml-5 flex-1 justify-center">
            <View className="flex-row items-center flex-wrap mb-1 gap-1">
              <Text className="text-2xl font-black text-neutral-900 dark:text-white leading-tight flex-wrap">{counselor.name}</Text>
              <Ionicons name="checkmark-circle" size={18} color={isDark ? '#34d399' : '#10b981'} />
            </View>
            <Text className="text-md font-bold text-rose-600 dark:text-rose-400 uppercase tracking-widest mb-3 flex-wrap">{counselor.designation}</Text>
            
            <View className="flex-row items-center gap-2 flex-wrap">
              <View className="flex-row items-center bg-amber-50/90 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 px-2.5 py-1 rounded-lg">
                <Text className="text-[10px] font-black text-amber-500 dark:text-amber-400">⭐ {counselor.rating || '0.0'}</Text>
              </View>
              <Text className="text-md text-neutral-600 dark:text-neutral-400 font-bold">{counselor.total_sessions || '0'} Sessions</Text>
            </View>
          </View>
        </Card>

        {/* Card 2: Appointment Details */}
        <Card className="bg-amber-50/90 dark:bg-stone-950/90 border-neutral-200 dark:border-neutral-800 rounded-[2.5rem] p-6 md:p-8 shadow-sm mb-6">
          
          <View className="flex-row items-center mb-6">
            <View className="w-10 h-10 rounded-[1rem] bg-rose-50/90 dark:bg-rose-900/20 items-center justify-center mr-3 border border-rose-100 dark:border-rose-500/30">
              <Ionicons name="calendar" size={18} color={isDark ? '#fb7185' : '#e11d48'} />
            </View>
            <Text className="text-xl font-black text-neutral-900 dark:text-white flex-wrap">Appointment Details</Text>
          </View>
          
          <View className="flex-row flex-wrap justify-between gap-y-4 gap-x-2">
            <View className="flex-1 min-w-[45%] bg-neutral-50/70 dark:bg-neutral-800/70 p-4 rounded-[1.5rem] border border-neutral-200 dark:border-neutral-700 shadow-sm items-center">
              <Text numberOfLines={1} adjustsFontSizeToFit className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400 mb-1">📅 Date</Text>
              <Text numberOfLines={1} adjustsFontSizeToFit className="font-black text-lg text-neutral-900 dark:text-white">{formatLocalDate(slot.date)}</Text>
            </View>
            
            <View className="flex-1 min-w-[45%] bg-neutral-50/70 dark:bg-neutral-800/70 p-4 rounded-[1.5rem] border border-neutral-200 dark:border-neutral-700 shadow-sm items-center">
              <Text numberOfLines={1} adjustsFontSizeToFit className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400 mb-1">🕒 Time</Text>
              <Text numberOfLines={1} adjustsFontSizeToFit className="font-black text-lg text-neutral-900 dark:text-white">{formatTimeAMPM(slot.time)}</Text>
            </View>
            
            <View className="w-full bg-neutral-50/70 dark:bg-neutral-800/70 p-4 rounded-[1.5rem] border border-neutral-200 dark:border-neutral-700 shadow-sm items-center">
              <Text numberOfLines={1} adjustsFontSizeToFit className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400 mb-1">🏥 Mode</Text>
              <Text numberOfLines={1} adjustsFontSizeToFit className={`font-black text-lg ${slot.mode === 'online' ? 'text-emerald-600 dark:text-emerald-400' : 'text-cyan-600 dark:text-cyan-400'} uppercase`}>
                {slot.mode === 'online' ? '💻' : '🏥'} {slot.mode} Session
              </Text>
            </View>
          </View>
        </Card>

        {/* Card 3: Payment Summary */}
        <Card className="bg-amber-50/90 dark:bg-stone-950/90 border-neutral-200 dark:border-neutral-800 rounded-[2.5rem] p-6 md:p-8 shadow-sm mb-6">
          <Text className="text-xl font-black text-neutral-900 dark:text-white mb-6 flex-wrap">Payment Summary</Text>
          <View className="flex-row justify-between mb-4 flex-wrap">
            <Text className="text-neutral-600 dark:text-neutral-400 font-medium text-base">Consultation Fee</Text>
            <Text className="text-neutral-900 dark:text-white font-bold text-base">₹{counselor.consultation_fee}</Text>
          </View>
          <View className="flex-row justify-between mb-6 flex-wrap">
            <Text className="text-neutral-600 dark:text-neutral-400 font-medium text-base">Platform Fee</Text>
            <Text className="text-neutral-900 dark:text-white font-bold text-base">₹{platformFee.toFixed(2)}</Text>
          </View>
          <View className="flex-row justify-between pt-6 border-t border-dashed border-neutral-300 dark:border-neutral-700 flex-wrap">
            <Text className="font-black text-2xl text-neutral-900 dark:text-white">Total</Text>
            <Text className="font-black text-3xl text-rose-600 dark:text-rose-400">₹{totalFee.toFixed(2)}</Text>
          </View>
        </Card>
      </ScrollView>

      {/* Sticky Confirm Button */}
      <View 
        style={{ paddingBottom: Math.max(insets.bottom + 16, 32) }}
        className="absolute bottom-0 left-0 right-0 pt-4 px-5 bg-neutral-50/90 dark:bg-black/90 border-t border-neutral-200 dark:border-neutral-800 backdrop-blur-xl"
      >
        <Button 
          className="h-14 rounded-2xl flex-row w-full shadow-sm bg-rose-600/90 dark:bg-rose-500/90"
          onPress={() => setModalVisible(true)}
        >
          <Text className="font-black text-sm uppercase tracking-wide text-white text-center flex-wrap">
            Confirm Booking
          </Text>
          <Ionicons name="lock-closed" size={18} color="white" style={{ marginLeft: 8 }} />
        </Button>
      </View>

      {/* Custom Confirmation Modal with Waiting Animation */}
      <Modal visible={isModalVisible} transparent={true} animationType="fade">
        <View className="flex-1 justify-center items-center bg-black/60 px-5">
          <Card className="w-full max-w-sm bg-amber-50/90 dark:bg-stone-950/90 rounded-[2.5rem] p-8 items-center shadow-2xl border border-neutral-200 dark:border-neutral-800">
            
            {isProcessing ? (
              <View className="items-center w-full py-2">
                <View className="w-24 h-24 rounded-full bg-rose-50/90 dark:bg-rose-900/10 items-center justify-center mb-6 border-[3px] border-rose-200 dark:border-rose-500/30">
                   <ActivityIndicator size="large" color={isDark ? '#fb7185' : '#e11d48'} />
                </View>
                <Text className="text-2xl font-black text-neutral-900 dark:text-white mb-3 text-center flex-wrap tracking-tight">
                  Securing Slot...
                </Text>
                <Text className="text-neutral-500 dark:text-neutral-400 text-center font-medium leading-relaxed flex-wrap">
                  Please wait while we confirm your appointment. Do not close this screen.
                </Text>
              </View>
            ) : (
              <>
                <View className="w-20 h-20 bg-rose-50/90 dark:bg-rose-900/30 rounded-full items-center justify-center mb-6 shadow-sm border border-rose-100 dark:border-rose-500/20">
                  <Ionicons name="calendar" size={32} color={isDark ? '#fb7185' : '#e11d48'} />
                </View>
                
                <Text className="text-2xl font-black text-neutral-900 dark:text-white mb-3 text-center flex-wrap tracking-tight">Confirm Appointment</Text>
                <Text className="text-neutral-500 dark:text-neutral-400 text-center font-medium mb-8 leading-relaxed flex-wrap">
                  Are you ready to book this session with <Text className="font-black text-neutral-900 dark:text-white">{counselor.name}</Text> on <Text className="font-black text-neutral-900 dark:text-white">{formatLocalDate(slot.date)}</Text> at <Text className="font-black text-neutral-900 dark:text-white">{formatTimeAMPM(slot.time)}</Text>?
                </Text>

                <View className="flex-row w-full gap-3 flex-wrap">
                  <Button 
                    className="flex-1 h-14 bg-neutral-100/90 dark:bg-neutral-800/90 rounded-2xl border border-neutral-200 dark:border-neutral-700"
                    onPress={() => setModalVisible(false)}
                    disabled={isProcessing}
                  >
                    <Text numberOfLines={1} adjustsFontSizeToFit className="font-bold text-neutral-600 dark:text-neutral-300 uppercase text-md tracking-widest">Cancel</Text>
                  </Button>
                  
                  <Button 
                    className="flex-1 h-14 rounded-2xl bg-rose-600/90 dark:bg-rose-500/90"
                    onPress={confirmBooking}
                    disabled={isProcessing}
                  >
                    <Text numberOfLines={1} adjustsFontSizeToFit className="font-bold text-white uppercase text-md tracking-widest">Confirm</Text>
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