import React, { useEffect, useState } from 'react';
import { View, ScrollView, TouchableOpacity, ActivityIndicator, Text } from 'react-native';
import { useRouter } from 'expo-router'; 
import { LinearGradient } from 'expo-linear-gradient';
import { Card, Button } from 'heroui-native';
import { usePreferences } from '@/context/PreferencesContext';
import apiClient from '@/api/apiClient';
import { ArrowLeft, ChevronRight, AlertTriangle, Wind, Moon, Battery, BookOpen, Quote, Sparkles } from 'lucide-react-native';

interface Suggestion {
  title: string;
  desc: string;
  action_url: string;
  type: 'urgent' | 'routine' | 'education';
  icon: string;
  color: string;
  bg: string;
  border: string;
}

interface AdviceCard {
  icon: string;
  title: string;
  desc: string;
}

interface RecoveryData {
  current_state: { overall_mood: string };
  advice: string;
  suggestions: Suggestion[];
  advice_cards: AdviceCard[];
}

export default function RecoveryHubScreen() {
  const router = useRouter();
  const { isDarkMode } = usePreferences();
  const [data, setData] = useState<RecoveryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecoveryData = async () => {
      try {
        const response = await apiClient.get('/core/recovery-suggestions/');
        setData(response.data);
      } catch (error) {
        console.error('Failed to load recovery suggestions', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecoveryData();
  }, []);

  // Map Django API web URLs to native Expo Router paths
  const handleActionNavigation = (url: string) => {
    if (url.includes('calm-now/?mode=grounding')) {
      router.push({ pathname: '/core/calm_now', params: { mode: 'grounding' } });
    } else if (url.includes('calm-now')) {
      router.push('/core/calm_now');
    } else if (url.includes('burnout-recovery')) {
      router.push('/core/burnout_recovery');
    } else if (url.includes('journal-page')) {
      router.push('/core/journal');
    } else if (url.includes('sleep-support')) {
      router.push('/core/sleep_support');
    } else if (url.includes('assessment-page')) {
      router.push('/core/assessment');
    } else {
      router.push('/core/dashboard'); // Fallback safe route
    }
  };

  const CategoryTag = ({ type }: { type: string }) => {
    switch (type) {
      case 'urgent':
        return (
          <View className="px-2.5 py-1 rounded-md border border-rose-200 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-900/40 shrink-0">
            <Text numberOfLines={1} adjustsFontSizeToFit className="text-rose-600 dark:text-rose-400 text-md font-black">Fast Relief</Text>
          </View>
        );
      case 'routine':
        return (
          <View className="px-2.5 py-1 rounded-md border border-indigo-200 bg-indigo-50 dark:bg-indigo-950/30 dark:border-indigo-900/40 shrink-0">
            <Text numberOfLines={1} adjustsFontSizeToFit className="text-indigo-600 dark:text-indigo-400 text-md font-black">Routine</Text>
          </View>
        );
      case 'education':
        return (
          <View className="px-2.5 py-1 rounded-md border border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-900/40 shrink-0">
            <Text numberOfLines={1} adjustsFontSizeToFit className="text-blue-600 dark:text-blue-400 text-md font-black">Learn</Text>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <View className="flex-1 bg-transparent">
      <ScrollView contentContainerClassName="p-6 pb-20 pt-16" showsVerticalScrollIndicator={false}>
        
        {/* --- TOP NAVIGATION BAR --- */}
        <View className="flex-row justify-between items-center mb-6">
          <TouchableOpacity 
            onPress={() => router.push('/core/dashboard')}
            className="w-12 h-12 bg-amber-50/90 dark:bg-stone-950/90 border border-neutral-200 dark:border-neutral-800 rounded-full items-center justify-center shadow-sm"
          >
            <ArrowLeft size={24} color={isDarkMode ? "#94a3b8" : "#475569"} />
          </TouchableOpacity>
        </View>

        {/* --- HERO GRADIENT HEADER AREA (HeroUI Embedded) --- */}
        <Card className="bg-emerald-950 rounded-[2.5rem] p-6 mb-10 border border-emerald-800 dark:border-emerald-500/20 overflow-hidden shadow-xl relative">
          <LinearGradient
            colors={['#047857', '#022C22']} 
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />
          
          <View className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-400/20 rounded-full blur-3xl" />
          <View className="absolute -bottom-10 -left-10 w-40 h-40 bg-teal-300/10 rounded-full blur-3xl" />

          <View className="items-center mb-6 z-10">
            <View className="flex-row items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 shadow-sm">
              <View className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              <Text className="text-[10px] font-black tracking-[0.2em] uppercase text-white">
                {data 
                  ? `State: ${(data.current_state?.overall_mood || 'Neutral').toUpperCase()}` 
                  : 'Analyzing State...'}
              </Text>
            </View>
          </View>

          <Text className="text-center font-black text-white mb-6 leading-tight text-3xl tracking-tight z-10">
            Your Fundamental{"\n"}Guidance Area
          </Text>

          <View className="bg-white/10 p-5 rounded-3xl border border-white/15 mb-4 z-10">
            <Quote size={18} color="rgba(255,255,255,0.4)" className="mb-2" />
            <Text className="text-base font-semibold leading-relaxed italic text-neutral-100">
              {loading ? "Gathering insights to personalize your routine..." : `"${data?.advice}"`}
            </Text>
          </View>

          <TouchableOpacity 
            activeOpacity={0.8}
            onPress={() => router.push('/core/chatbot')} 
            className="bg-white/10 p-4 rounded-3xl border border-white/15 flex-row items-center gap-4 mb-4 z-10"
          >
            <View className="w-12 h-12 bg-emerald-400/20 rounded-2xl border border-emerald-300/30 items-center justify-center">
               <Sparkles size={22} color="#6ee7b7" />
            </View>
            <View className="flex-1">
              <View className="flex-row items-center gap-2 mb-0.5">
                <Text className="font-black text-lg tracking-wide text-white">Talk to Smera</Text>
                <View className="px-2 py-0.5 rounded-full bg-white/20 border border-white/20">
                  <Text className="text-[9px] font-black uppercase tracking-widest text-white">AI</Text>
                </View>
              </View>
              <Text className="text-md font-medium text-emerald-200">Discuss thoughts in a safe space.</Text>
            </View>
            <View className="w-8 h-8 rounded-full bg-white/10 items-center justify-center border border-white/10">
              <ChevronRight size={16} color="#ffffff" />
            </View>
          </TouchableOpacity>

          <View className="flex-row items-start gap-3 p-4 rounded-3xl bg-amber-500/15 border border-amber-500/30 z-10">
            <AlertTriangle size={18} color="#fcd34d" className="mt-0.5" />
            <View className="flex-1">
              <Text className="text-[11px] leading-relaxed font-medium text-amber-100">
                <Text className="tracking-widest uppercase font-black text-[11px] text-amber-400">Note: </Text> 
                Exercises are for general wellness and grounding. They do not constitute professional clinical guidance.
              </Text>
            </View>
          </View>
        </Card>

        {loading ? (
          <ActivityIndicator size="large" color="#10b981" className="my-10" />
        ) : (
          <>
            {/* --- SECTION 1: DYNAMIC SERVER SUGGESTIONS --- */}
            {data?.suggestions && data.suggestions.length > 0 && (
              <View className="mb-10">
                <View className="mb-4 ml-2 flex-row items-center gap-2">
                  <Sparkles size={16} color={isDarkMode ? "#818cf8" : "#4f46e5"} />
                  <Text className="text-md font-black uppercase tracking-widest text-indigo-800 dark:text-indigo-300">
                    Recommended Right Now
                  </Text>
                </View>
                
                <View className="gap-4">
                  {data.suggestions.map((sugg, i) => (
                    <Card key={i} className={`rounded-3xl p-2 shadow-none border ${sugg.bg} ${sugg.border}`}>
                      <TouchableOpacity 
                        activeOpacity={0.7}
                        onPress={() => handleActionNavigation(sugg.action_url)}
                        className="flex-row items-center p-3 gap-4"
                      >
                        <View className={`w-12 h-12 rounded-2xl items-center justify-center border bg-white/60 dark:bg-black/20 ${sugg.border}`}>
                          <Text className="text-2xl">{sugg.icon}</Text>
                        </View>
                        
                        <View className="flex-1">
                          <View className="flex-row justify-between items-start mb-1 gap-2">
                            <View className="flex-1">
                              <Text className={`font-black text-base leading-tight ${sugg.color}`}>
                                {sugg.title}
                              </Text>
                            </View>
                            <CategoryTag type={sugg.type} />
                          </View>
                          {/* Description explicitly untouched to remain neutral */}
                          <Text className="text-sm font-medium text-neutral-500 dark:text-neutral-400 leading-normal">
                            {sugg.desc}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    </Card>
                  ))}
                </View>
              </View>
            )}

            {/* --- SECTION 2: LONG-FORM THERAPEUTIC HORIZONTAL LIST --- */}
            {data?.advice_cards && data.advice_cards.length > 0 && (
              <View className="mb-10">
                <View className="mb-4 ml-2 flex-row items-center gap-2">
                  <BookOpen size={16} color={isDarkMode ? "#818cf8" : "#4f46e5"} />
                  <Text className="text-md font-black uppercase tracking-widest text-indigo-700 dark:text-indigo-300">
                    Therapeutic Guidance
                  </Text>
                </View>
                
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="overflow-visible" contentContainerStyle={{ gap: 14 }}>
                  {data.advice_cards.map((card, i) => (
                    <Card key={i} className="w-72 bg-amber-50/80 dark:bg-stone-950/80 border border-indigo-100 dark:border-indigo-500/20 p-5 rounded-3xl shadow-none">
                      <View className="w-11 h-11 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 items-center justify-center mb-3.5 border border-indigo-200 dark:border-indigo-500/30">
                        <Text className="text-xl">{card.icon}</Text>
                      </View>
                      <Text className="text-base font-black text-indigo-950 dark:text-indigo-100 mb-1.5">{card.title}</Text>
                      <Text className="text-md font-medium text-indigo-700/80 dark:text-indigo-300/80 leading-relaxed">{card.desc}</Text>
                    </Card>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* --- SECTION 3: CORE STATIC WELLNESS LIBRARY --- */}
            <View className="mb-10">
              <View className="mb-5 ml-2 flex-row items-center gap-2">
                <BookOpen size={18} color={isDarkMode ? "#818cf8" : "#4f46e5"} />
                <Text className="text-md font-black uppercase tracking-widest text-indigo-700 dark:text-indigo-300">
                  Explore the Library
                </Text>
              </View>

              <View className="gap-4">
                
                {/* Panic & Anxiety Card - Rose Theme */}
                <Card className="bg-rose-50/80 dark:bg-rose-500/30 border border-rose-100 dark:border-rose-500/20 p-5 rounded-3xl shadow-none">
                  <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/core/calm_now')}>
                    <View className="flex-row justify-between items-start mb-4">
                      <View className="w-12 h-12 bg-white dark:bg-rose-950/40 border border-rose-200 dark:border-rose-500/30 rounded-2xl items-center justify-center">
                        <Wind size={22} color={isDarkMode ? "#fb7185" : "#e11d48"} />
                      </View>
                      <View className="px-2.5 py-1 bg-white/60 dark:bg-rose-500/20 rounded-full border border-rose-200 dark:border-rose-500/30">
                        <Text className="text-[10px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-400">Immediate</Text>
                      </View>
                    </View>
                    <Text className="font-black text-rose-950 dark:text-rose-100 text-lg mb-1">Panic & Anxiety</Text>
                    <Text className="text-md text-rose-700/80 dark:text-rose-300/80 font-medium leading-relaxed mb-4">
                      Grounding techniques and breathing exercises to regulate acute stress and interrupt panic loops instantly.
                    </Text>
                    <View className="flex-row flex-wrap gap-2 pt-3 border-t border-rose-200/60 dark:border-rose-800/50">
                      <View className="bg-white/60 dark:bg-rose-500/15 px-2.5 py-1 rounded-xl border border-rose-200 dark:border-rose-500/20">
                        <Text className="text-md font-bold text-rose-700 dark:text-rose-300">4-7-8 Breathing</Text>
                      </View>
                      <View className="bg-white/60 dark:bg-rose-500/15 px-2.5 py-1 rounded-xl border border-rose-200 dark:border-rose-500/20">
                        <Text className="text-md font-bold text-rose-700 dark:text-rose-300">5-4-3-2-1</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                </Card>

                {/* Sleep Optimization Card - Indigo Theme */}
                <Card className="bg-indigo-50/80 dark:bg-indigo-500/30 border border-indigo-100 dark:border-indigo-500/20 p-5 rounded-3xl shadow-none">
                  <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/core/sleep_support')}>
                    <View className="flex-row justify-between items-start mb-4">
                      <View className="w-12 h-12 bg-white dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-500/30 rounded-2xl items-center justify-center">
                        <Moon size={22} color={isDarkMode ? "#818cf8" : "#4f46e5"} />
                      </View>
                      <View className="px-2.5 py-1 bg-white/60 dark:bg-indigo-500/20 rounded-full border border-indigo-200 dark:border-indigo-500/30">
                        <Text className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Nightly</Text>
                      </View>
                    </View>
                    <Text className="font-black text-indigo-950 dark:text-indigo-100 text-lg mb-1">Sleep Optimization</Text>
                    <Text className="text-md text-indigo-700/80 dark:text-indigo-300/80 font-medium leading-relaxed mb-4">
                      Calculate optimal sleep cycles, enforce digital curfews, and build personalized wind-down routines.
                    </Text>
                    <View className="flex-row flex-wrap gap-2 pt-3 border-t border-indigo-200/60 dark:border-indigo-800/50">
                      <View className="bg-white/60 dark:bg-indigo-500/15 px-2.5 py-1 rounded-xl border border-indigo-200 dark:border-indigo-500/20">
                        <Text className="text-md font-bold text-indigo-700 dark:text-indigo-300">Calculator</Text>
                      </View>
                      <View className="bg-white/60 dark:bg-indigo-500/15 px-2.5 py-1 rounded-xl border border-indigo-200 dark:border-indigo-500/20">
                        <Text className="text-md font-bold text-indigo-700 dark:text-indigo-300">Timer</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                </Card>

                {/* Burnout Recovery Card - Emerald Theme */}
                <Card className="bg-emerald-50/80 dark:bg-emerald-500/30 border border-emerald-100 dark:border-emerald-500/20 p-5 rounded-3xl shadow-none">
                  <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/core/burnout_recovery')}>
                    <View className="flex-row justify-between items-start mb-4">
                      <View className="w-12 h-12 bg-white dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/30 rounded-2xl items-center justify-center">
                        <Battery size={22} color={isDarkMode ? "#34d399" : "#059669"} />
                      </View>
                      <View className="px-2.5 py-1 bg-white/60 dark:bg-emerald-500/20 rounded-full border border-emerald-200 dark:border-emerald-500/30">
                        <Text className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Paced</Text>
                      </View>
                    </View>
                    <Text className="font-black text-emerald-950 dark:text-emerald-100 text-lg mb-1">Burnout Recovery</Text>
                    <Text className="text-md text-emerald-700/80 dark:text-emerald-300/80 font-medium leading-relaxed mb-4">
                      Gentle micro-activations and strict energy pacing strategies to rebuild your stamina safely over time.
                    </Text>
                    <View className="flex-row flex-wrap gap-2 pt-3 border-t border-emerald-200/60 dark:border-emerald-800/50">
                      <View className="bg-white/60 dark:bg-emerald-500/15 px-2.5 py-1 rounded-xl border border-emerald-200 dark:border-emerald-500/20">
                        <Text className="text-md font-bold text-emerald-700 dark:text-emerald-300">Micro-Tasks</Text>
                      </View>
                      <View className="bg-white/60 dark:bg-emerald-500/15 px-2.5 py-1 rounded-xl border border-emerald-200 dark:border-emerald-500/20">
                        <Text className="text-md font-bold text-emerald-700 dark:text-emerald-300">50% Rule</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                </Card>

              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}