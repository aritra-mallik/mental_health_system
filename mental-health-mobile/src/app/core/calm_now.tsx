import React, { useState, useEffect, useRef } from 'react';
import { View, ScrollView, TouchableOpacity, Animated, Easing, Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Speech from 'expo-speech';
import { ArrowLeft, Volume2, VolumeX, Wind, Eye, Hand, Ear, Sparkles, Heart, Check } from 'lucide-react-native';
import { Button } from 'heroui-native';

const GROUNDING_STEPS = [
  { count: 5, sense: "SEE", color: "#6366f1", bgClass: "bg-indigo-500", borderClass: "border-indigo-200 dark:border-indigo-900", Icon: Eye, desc: "Look around. Notice colors, shapes, or shadows you usually ignore." },
  { count: 4, sense: "FEEL", color: "#3b82f6", bgClass: "bg-blue-500", borderClass: "border-blue-200 dark:border-blue-900", Icon: Hand, desc: "Pay attention to your body. The weight of your clothes, the chair beneath you." },
  { count: 3, sense: "HEAR", color: "#10b981", bgClass: "bg-emerald-500", borderClass: "border-emerald-200 dark:border-emerald-900", Icon: Ear, desc: "Listen closely. Focus on distant sounds or the hum of the room." },
  { count: 2, sense: "SMELL", color: "#f59e0b", bgClass: "bg-amber-500", borderClass: "border-amber-200 dark:border-amber-900", Icon: Wind, desc: "Breathe in. Notice any scents, or just the temperature of the air." },
  { count: 1, sense: "GOOD THING", color: "#f43f5e", bgClass: "bg-rose-500", borderClass: "border-rose-200 dark:border-rose-900", Icon: Heart, desc: "Acknowledge one positive thing about yourself or your day today." }
];

export default function CalmNowScreen() {
  const params = useLocalSearchParams();
  const [mode, setMode] = useState<'breathe' | 'ground'>(params.mode === 'grounding' ? 'ground' : 'breathe');
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  
  // UI State
  const [isBreathing, setIsBreathing] = useState(false);
  const [breatheText, setBreatheText] = useState('START');
  
  // Refs for synchronous logic and animation
  const isBreathingRef = useRef(false); 
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const cycleTimeoutRefs = useRef<NodeJS.Timeout[]>([]);

  const [groundingStep, setGroundingStep] = useState(0);
  const [clickedBubbles, setClickedBubbles] = useState<number[]>([]);

  const speak = (text: string) => {
    if (isVoiceEnabled) {
      Speech.stop();
      Speech.speak(text, { rate: 0.9, pitch: 1 });
    }
  };

  const clearBreathingCycle = () => {
    cycleTimeoutRefs.current.forEach(clearTimeout);
    cycleTimeoutRefs.current = [];
    scaleAnim.stopAnimation();
    Animated.timing(scaleAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  };

  useEffect(() => {
    return () => { 
      clearBreathingCycle(); 
      Speech.stop(); 
      isBreathingRef.current = false;
    };
  }, []);

  const runBreathingCycle = () => {
    // Check the ref instead of state to avoid stale closures
    if (!isBreathingRef.current) return;
    
    setBreatheText('INHALE'); 
    speak('Inhale');
    
    Animated.timing(scaleAnim, { toValue: 1.8, duration: 4000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }).start();
    
    cycleTimeoutRefs.current.push(setTimeout(() => { 
      if (!isBreathingRef.current) return;
      setBreatheText('HOLD'); speak('Hold'); 
    }, 4000));
    
    cycleTimeoutRefs.current.push(setTimeout(() => {
      if (!isBreathingRef.current) return;
      setBreatheText('EXHALE'); speak('Exhale');
      Animated.timing(scaleAnim, { toValue: 1, duration: 8000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }).start();
    }, 11000));
    
    cycleTimeoutRefs.current.push(setTimeout(() => {
      if (isBreathingRef.current) runBreathingCycle();
    }, 19000));
  };

  const toggleBreathing = () => {
    if (isBreathingRef.current) {
      isBreathingRef.current = false;
      setIsBreathing(false); 
      clearBreathingCycle(); 
      setBreatheText('START');
    } else {
      isBreathingRef.current = true;
      setIsBreathing(true); 
      runBreathingCycle(); 
    }
  };

  useEffect(() => {
    if (mode === 'ground' && groundingStep < GROUNDING_STEPS.length) {
      const step = GROUNDING_STEPS[groundingStep];
      speak(`Find ${step.count} things you can ${step.sense}. ${step.desc}`);
    }
  }, [groundingStep, mode]);

  const handleBubbleClick = (index: number) => {
    if (clickedBubbles.includes(index)) return;
    const newClicked = [...clickedBubbles, index];
    setClickedBubbles(newClicked);

    if (newClicked.length === GROUNDING_STEPS[groundingStep].count) {
      setTimeout(() => {
        if (groundingStep === GROUNDING_STEPS.length - 1) {
          setGroundingStep(groundingStep + 1);
          speak("Exercise complete. You have successfully brought your mind back to the present moment. Take a deep breath.");
        } else {
          setGroundingStep(groundingStep + 1); setClickedBubbles([]);
        }
      }, 700);
    }
  };

  const CurrentIcon = GROUNDING_STEPS[groundingStep]?.Icon;

  return (
    <View className="flex-1 bg-transparent">
      <ScrollView contentContainerClassName="p-6 pb-20 pt-12 items-center" showsVerticalScrollIndicator={false}>
        
        {/* Header Actions */}
        <View className="flex-row items-center justify-between w-full mb-8 max-w-2xl">
          <TouchableOpacity onPress={() => router.back()} className="w-12 h-12 rounded-full bg-amber-50/90 dark:bg-stone-950/90 border border-neutral-200 dark:border-neutral-800 items-center justify-center mb-8 shadow-sm">
            <ArrowLeft size={22} color="#64748b" />
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => { setIsVoiceEnabled(!isVoiceEnabled); if (isVoiceEnabled) Speech.stop(); }}
            className={`flex-row items-center gap-2 px-4 py-2 rounded-xl border ${isVoiceEnabled ? 'bg-emerald-100 dark:bg-[#064E3B]/60 border-transparent dark:border-[#10B981]/30' : 'bg-slate-100 dark:bg-neutral-800 border-transparent'}`}>
            {isVoiceEnabled ? <Volume2 size={16} color="#10b981" /> : <VolumeX size={16} color="#64748b" />}
            <Text className={`text-md font-bold tracking-wider uppercase ${isVoiceEnabled ? 'text-emerald-700 dark:text-[#10B981]' : 'text-slate-500 dark:text-slate-400'}`}>
              Voice: {isVoiceEnabled ? 'ON' : 'OFF'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Mode Switcher */}
        <View className="flex-row p-1.5 bg-slate-100 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl mb-12 w-full max-w-md shadow-sm">
          <TouchableOpacity onPress={() => { setMode('breathe'); isBreathingRef.current = false; setIsBreathing(false); clearBreathingCycle(); setBreatheText('START'); }} className={`flex-1 py-3 items-center justify-center rounded-xl transition-all ${mode === 'breathe' ? 'bg-white dark:bg-neutral-800 shadow-sm' : 'bg-transparent'}`}>
            <Text className={`font-bold ${mode === 'breathe' ? 'text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>Breathing</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setMode('ground'); setGroundingStep(0); setClickedBubbles([]); }} className={`flex-1 py-3 items-center justify-center rounded-xl transition-all ${mode === 'ground' ? 'bg-white dark:bg-neutral-800 shadow-sm' : 'bg-transparent'}`}>
            <Text className={`font-bold ${mode === 'ground' ? 'text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>Grounding</Text>
          </TouchableOpacity>
        </View>

        {/* BREATHING UI */}
        {mode === 'breathe' && (
          <View className="items-center w-full max-w-2xl">
            <Text className="text-3xl font-black text-slate-800 dark:text-white mb-2">4-7-8 Breathing</Text>
            <Text className="text-slate-500 dark:text-slate-400 font-medium mb-16">
              Follow the circle. Inhale for 4, hold for 7, exhale for 8.
            </Text>

            <View className="relative w-64 h-64 items-center justify-center mb-16">
              {/* Static Background Circle */}
              <View className="absolute inset-0 bg-emerald-500/20 dark:bg-emerald-500/10 rounded-full" />
              
              {/* Animated Inner Circle */}
              <Animated.View style={{ transform: [{ scale: scaleAnim }] }} className="absolute w-32 h-32 rounded-full items-center justify-center shadow-2xl shadow-emerald-500/40">
                {/* Explicitly passing borderRadius to LinearGradient fixes the square bug */}
                <LinearGradient 
                  colors={['#10b981', '#0f766e']} 
                  style={{ width: '100%', height: '100%', borderRadius: 9999 }}
                />
              </Animated.View>

              {/* Breathing Text */}
              <Text className="relative z-10 text-3xl font-black tracking-widest text-emerald-950 dark:text-white">
                {breatheText}
              </Text>
            </View>

            <Button 
              onPress={toggleBreathing}
              className={`px-10 h-16 rounded-2xl w-full max-w-sm shadow-lg ${isBreathing ? 'bg-emerald-700 dark:bg-emerald-400' : 'bg-emerald-600 dark:bg-[#10B981]'}`}>
              <Text className={`font-bold text-lg ${isBreathing ? 'text-emerald-100 dark:text-emerald-900' : 'text-white dark:text-[#022C22]'}`}>
                {isBreathing ? 'Stop Exercise' : 'Begin Exercise'}
              </Text>
            </Button>
          </View>
        )}

        {/* GROUNDING UI */}
        {mode === 'ground' && (
          <View className="items-center w-full max-w-2xl">
            <Text className="text-3xl font-black text-slate-800 dark:text-white mb-2">5-4-3-2-1 Grounding</Text>
            <Text className="text-slate-500 dark:text-slate-400 font-medium mb-8 text-center px-4">
              Physical action interrupts anxiety. Tap a circle each time you find an item.
            </Text>

            <View className="w-full bg-amber-50/90 dark:bg-stone-950/90 border border-slate-200 dark:border-neutral-800 rounded-[2rem] p-8 md:p-12 shadow-xl min-h-[360px] items-center justify-center">
              {groundingStep < GROUNDING_STEPS.length ? (
                <>
                  <Text className="text-5xl mb-4" style={{ color: GROUNDING_STEPS[groundingStep].color }}>
                    <CurrentIcon size={48} color={GROUNDING_STEPS[groundingStep].color} />
                  </Text>
                  
                  <Text className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white mb-2 tracking-tight text-center">
                    Find <Text style={{ color: GROUNDING_STEPS[groundingStep].color }}>{GROUNDING_STEPS[groundingStep].count}</Text> things you can <Text style={{ color: GROUNDING_STEPS[groundingStep].color }}>{GROUNDING_STEPS[groundingStep].sense}</Text>
                  </Text>
                  <Text className="text-sm text-slate-500 dark:text-slate-400 mb-10 max-w-sm mx-auto text-center">
                    {GROUNDING_STEPS[groundingStep].desc}
                  </Text>

                  <View className="flex-row flex-wrap justify-center gap-4 md:gap-6 w-full">
                    {Array.from({ length: GROUNDING_STEPS[groundingStep].count }).map((_, i) => {
                      const isClicked = clickedBubbles.includes(i);
                      return (
                        <TouchableOpacity
                          key={i} onPress={() => handleBubbleClick(i)} disabled={isClicked}
                          className={`w-14 h-14 md:w-16 md:h-16 rounded-full items-center justify-center border-2 transition-all ${isClicked ? `${GROUNDING_STEPS[groundingStep].bgClass} border-transparent scale-110` : `bg-slate-50 dark:bg-neutral-950 ${GROUNDING_STEPS[groundingStep].borderClass}`}`}>
                          {isClicked && <Check size={28} color="#ffffff" />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              ) : (
                <View className="items-center justify-center">
                  <View className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-[#064E3B]/40 border border-emerald-200 dark:border-[#10B981]/50 items-center justify-center mb-6 shadow-inner">
                    <Sparkles size={36} color="#10b981" />
                  </View>
                  <Text className="text-3xl font-black text-slate-800 dark:text-white mb-3">Exercise Complete</Text>
                  <Text className="text-slate-500 dark:text-slate-400 font-medium max-w-md mx-auto leading-relaxed text-center mb-8">
                    You have successfully brought your mind back to the present moment. Take a deep breath.
                  </Text>
                  <Button className="bg-slate-100 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-xl px-8 h-12 shadow-sm" onPress={() => { setGroundingStep(0); setClickedBubbles([]); }}>
                    <Text className="text-slate-800 dark:text-white font-bold">Start Over</Text>
                  </Button>
                </View>
              )}
            </View>

            {/* Progress Indicators */}
            <View className="flex-row gap-3 mt-8">
              {GROUNDING_STEPS.map((step, i) => (
                <View key={i} className={`rounded-full transition-all ${i === groundingStep ? `w-4 h-4 shadow-md ${step.bgClass}` : i < groundingStep ? `w-3 h-3 opacity-40 ${step.bgClass}` : 'w-3 h-3 bg-slate-200 dark:bg-neutral-700'}`} />
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}