import React, { useEffect, useState } from 'react';
import { View, ScrollView, TouchableOpacity, ActivityIndicator, Text, Modal, Linking, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card, Button } from 'heroui-native';
import * as Speech from 'expo-speech';
import apiClient from '@/api/apiClient';

export default function ArticleDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();

  const [article, setArticle] = useState<any>(null);
  const [allArticles, setAllArticles] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [loading, setLoading] = useState(true);
  
  // TTS State
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Custom Modal State
  const [linkModalVisible, setLinkModalVisible] = useState(false);
  const [pendingLink, setPendingLink] = useState({ url: '', type: '', domain: '' });

  useEffect(() => {
    const fetchArticleData = async () => {
      try {
        const detailRes = await apiClient.get(`/articles/${id}/`);
        setArticle(detailRes.data);

        // Fetch all articles for continuous looping
        const listRes = await apiClient.get('/articles/');
        setAllArticles(listRes.data);
        
        const idx = listRes.data.findIndex((a: any) => String(a.id) === String(id));
        setCurrentIndex(idx);
      } catch (error) {
        console.error("Failed to fetch article", error);
        router.back();
      } finally {
        setLoading(false);
      }
    };
    fetchArticleData();
  }, [id]);

  useEffect(() => {
    return () => { Speech.stop(); };
  }, []);

  const handleLinkPress = (url: string, type: string) => {
    if (!url || url === '#') return;
    let domain = url;
    try { domain = new URL(url).hostname; } catch (e) {}
    setPendingLink({ url, type, domain });
    setLinkModalVisible(true);
  };

  const proceedToLink = () => {
    setLinkModalVisible(false);
    if (pendingLink.url) Linking.openURL(pendingLink.url);
  };

  const toggleAudioSummary = async () => {
    const speaking = await Speech.isSpeakingAsync();
    if (speaking) {
      Speech.stop();
      setIsSpeaking(false);
    } else {
      setIsSpeaking(true);
      Speech.speak(article.full, {
        language: 'en-US',
        pitch: 1,
        rate: 0.9,
        onDone: () => setIsSpeaking(false),
        onStopped: () => setIsSpeaking(false),
      });
    }
  };

  // --- Perfect Looping Pagination ---
  const handlePrev = () => {
    if (allArticles.length === 0) return;
    Speech.stop();
    const prevIndex = currentIndex <= 0 ? allArticles.length - 1 : currentIndex - 1;
    router.replace(`/articles/${allArticles[prevIndex].id}`); 
  };

  const handleNext = () => {
    if (allArticles.length === 0) return;
    Speech.stop();
    const nextIndex = currentIndex >= allArticles.length - 1 ? 0 : currentIndex + 1;
    router.replace(`/articles/${allArticles[nextIndex].id}`);
  };

  const getMoodTheme = (mood: string) => {
    const m = (mood || 'neutral').toLowerCase();
    switch(m) {
      case 'good': return { 
        bg: 'bg-emerald-50 dark:bg-emerald-900/10', border: 'border-emerald-200 dark:border-emerald-800/50', 
        text: 'text-emerald-700 dark:text-emerald-400', badge: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-200',
        btnBg: 'bg-emerald-600', btnText: 'text-white'
      };
      case 'great': return { 
        bg: 'bg-purple-50 dark:bg-purple-900/10', border: 'border-purple-200 dark:border-purple-800/50', 
        text: 'text-purple-700 dark:text-purple-400', badge: 'bg-purple-100 dark:bg-purple-500/20 text-purple-800 dark:text-purple-200',
        btnBg: 'bg-purple-600', btnText: 'text-white'
      };
      case 'low': return { 
        bg: 'bg-blue-50 dark:bg-blue-900/10', border: 'border-blue-200 dark:border-blue-800/50', 
        text: 'text-blue-700 dark:text-blue-400', badge: 'bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-200',
        btnBg: 'bg-blue-600', btnText: 'text-white'
      };
      case 'stressed': return { 
        bg: 'bg-orange-50 dark:bg-orange-900/10', border: 'border-orange-200 dark:border-orange-800/50', 
        text: 'text-orange-700 dark:text-orange-400', badge: 'bg-orange-100 dark:bg-orange-500/20 text-orange-800 dark:text-orange-200',
        btnBg: 'bg-orange-600', btnText: 'text-white'
      };
      case 'stress': return { 
        bg: 'bg-rose-50 dark:bg-rose-900/10', border: 'border-rose-200 dark:border-rose-800/50', 
        text: 'text-rose-700 dark:text-rose-400', badge: 'bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-200',
        btnBg: 'bg-rose-600', btnText: 'text-white'
      };
      case 'overwhelmed': return { 
        bg: 'bg-slate-100 dark:bg-slate-800/50', border: 'border-slate-300 dark:border-slate-700', 
        text: 'text-slate-700 dark:text-slate-300', badge: 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white',
        btnBg: 'bg-slate-700 dark:bg-slate-600', btnText: 'text-white'
      };
      default: return { 
        bg: 'bg-indigo-50 dark:bg-indigo-900/10', border: 'border-indigo-200 dark:border-indigo-800/50', 
        text: 'text-indigo-700 dark:text-indigo-400', badge: 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-800 dark:text-indigo-200',
        btnBg: 'bg-indigo-600', btnText: 'text-white'
      };
    }
  };

  if (loading || !article) {
    return (
      <View className="flex-1 justify-center items-center bg-neutral-50 dark:bg-black">
        <ActivityIndicator size="large" color={isDark ? '#818cf8' : '#4f46e5'} />
      </View>
    );
  }

  const theme = getMoodTheme(article.mood);

  return (
    <View className="flex-1 bg-transparent">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 200 }}>
        
        {/* Top Header */}
        <View className="flex-row justify-between items-center px-6 pt-16 pb-4">
          <TouchableOpacity 
            onPress={() => { Speech.stop(); router.back(); }}
            className="w-12 h-12 bg-amber-50/90 dark:bg-stone-950/90 rounded-full items-center justify-center border border-neutral-200 dark:border-neutral-800 shadow-sm"
          >
            <Ionicons name="arrow-back" size={24} color={isDark ? '#f8fafc' : '#0f172a'} />
          </TouchableOpacity>
          <Text className="text-3xl font-black text-neutral-900 dark:text-white tracking-tight mx-4 flex-1" numberOfLines={1}>
            Article
          </Text>
        </View>

        {/* Main Content Card */}
        <View className="px-5 pb-6">
          <Card className={`bg-amber-50/90 dark:bg-stone-950/90 border border-neutral-200 dark:border-neutral-800 rounded-[2.5rem] p-6 md:p-8 shadow-sm overflow-hidden`}>
            
            {/* Subtle mood background tint */}
            <View className={`absolute inset-0 opacity-40 dark:opacity-20 pointer-events-none ${theme.bg}`} />
            
            <View className="relative z-10">
              <View className="flex-row justify-between items-center mb-6">
                <View className={`px-3 py-1.5 rounded-full ${theme.badge}`}>
                  <Text className={`text-[10px] font-black uppercase tracking-widest ${theme.badge.split(' ')[3] || ''}`}>{article.mood}</Text>
                </View>
                <View className="flex-row items-center bg-neutral-50/80 dark:bg-neutral-800/80 px-3 py-1.5 rounded-full border border-neutral-200 dark:border-neutral-700 shadow-sm">
                  <Ionicons name="time-outline" size={14} color={isDark ? '#9ca3af' : '#64748b'} />
                  <Text className="text-sm font-bold text-neutral-600 dark:text-neutral-300 ml-1.5">{article.read_time}</Text>
                </View>
              </View>

              <Text className="text-3xl md:text-4xl font-black text-neutral-900 dark:text-white mb-6 leading-tight tracking-tight">
                {article.title}
              </Text>

              {/* Author & Date Section - PERFECTLY ALIGNED & WRAPPING */}
              <View className="flex-row items-center justify-between w-full mb-8">
                
                {/* Left side: Avatar + Author Info */}
                <View className="flex-row items-center flex-1 pr-4">
                  <View className={`w-11 h-11 rounded-full items-center justify-center shadow-sm flex-shrink-0 ${theme.btnBg}`}>
                    <Text className="text-white font-black text-lg">
                      {article.author ? article.author[0].toUpperCase() : 'A'}
                    </Text>
                  </View>
                  <View className="flex-1 ml-3 justify-center">
                    <Text 
                      className="text-base font-bold text-neutral-800 dark:text-neutral-200 leading-tight" 
                      numberOfLines={2} 
                    >
                      {article.author || 'Unknown'}
                    </Text>
                    <Text className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mt-0.5">
                      Author
                    </Text>
                  </View>
                </View>

                {/* Right side: Fixed Date */}
                <View className="flex-row items-center flex-shrink-0">
                  <Ionicons name="calendar-outline" size={14} color={isDark ? '#9ca3af' : '#64748b'} />
                  <Text className="text-sm font-bold text-neutral-600 dark:text-neutral-400 ml-1.5">
                    {article.date || 'Recently'}
                  </Text>
                </View>

              </View>

              <Text className="text-neutral-700 dark:text-neutral-300 text-base md:text-lg font-medium leading-relaxed mb-6">
                {article.full}
              </Text>

              {/* Dynamic TTS Button */}
              <View className="items-end mb-2">
                <TouchableOpacity 
                  onPress={toggleAudioSummary}
                  className={`flex-row items-center gap-2 px-5 py-3 rounded-full border shadow-sm ${theme.bg} ${theme.border}`}
                >
                  <Ionicons name={isSpeaking ? "stop-circle" : "volume-high"} size={18} color={isDark ? '#ffffff' : '#0f172a'} />
                  <Text className={`font-bold text-sm uppercase tracking-widest ${theme.text}`}>
                    {isSpeaking ? 'Stop Summary' : 'Read Summary'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Card>
        </View>

        {/* Beautiful Media Suggestions */}
        <View className="px-5 mb-8 flex-col gap-4">
          
          <View className="bg-rose-50/90 dark:bg-rose-900/60 border border-rose-200 dark:border-rose-500/30 rounded-[2.5rem] p-6 shadow-sm relative overflow-hidden">
             <View className="absolute -top-10 -right-10 w-32 h-32 bg-rose-200 dark:bg-rose-500/20 rounded-full blur-3xl pointer-events-none" />
             
             <View className="flex-row items-center gap-4 mb-4 relative z-10">
                <View className="w-14 h-14 bg-rose-500/90 rounded-2xl items-center justify-center shadow-md">
                   <Ionicons name="play" size={24} color="white" style={{ marginLeft: 3 }} />
                </View>
                <View className="flex-1">
                   <Text className="text-[10px] uppercase font-black text-rose-500 dark:text-rose-400 tracking-[0.1em] mb-1">Recommended</Text>
                   <Text className="text-2xl font-black text-neutral-900 dark:text-white flex-wrap">Video Session</Text>
                </View>
             </View>
             
             <Text className="text-neutral-600 dark:text-neutral-300 text-sm mb-6 font-medium relative z-10 leading-relaxed">
                Guided videos selected based on your emotional state.
             </Text>
             
             <TouchableOpacity 
               onPress={() => handleLinkPress(article.video_link, 'Video')}
               className="bg-rose-500 rounded-2xl h-14 flex-row items-center justify-center shadow-md shadow-rose-500/30 relative z-10"
             >
                <Text className="text-white font-bold text-sm uppercase tracking-widest mr-2">Watch Now</Text>
                <Ionicons name="arrow-forward" size={18} color="white" />
             </TouchableOpacity>
          </View>

          <View className="bg-purple-50/90 dark:bg-purple-900/60 border border-purple-200 dark:border-purple-500/30 rounded-[2.5rem] p-6 shadow-sm relative overflow-hidden">
             <View className="absolute -bottom-10 -left-10 w-32 h-32 bg-purple-200 dark:bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

             <View className="flex-row items-center gap-4 mb-4 relative z-10">
                <View className="w-14 h-14 bg-purple-500/90 rounded-2xl items-center justify-center shadow-md">
                   <Ionicons name="musical-notes" size={24} color="white" />
                </View>
                <View className="flex-1">
                   <Text className="text-[10px] uppercase font-black text-purple-500 dark:text-purple-400 tracking-[0.1em] mb-1">Personalized</Text>
                   <Text className="text-2xl font-black text-neutral-900 dark:text-white flex-wrap">Mood Music</Text>
                </View>
             </View>
             
             <Text className="text-neutral-600 dark:text-neutral-300 text-sm mb-6 font-medium relative z-10 leading-relaxed">
                Relaxation sounds and music tailored for your mood.
             </Text>
             
             <TouchableOpacity 
               onPress={() => handleLinkPress(article.music_link, 'Music')}
               className="bg-purple-500 rounded-2xl h-14 flex-row items-center justify-center shadow-md shadow-purple-500/30 relative z-10"
             >
                <Text className="text-white font-bold text-sm uppercase tracking-widest mr-2">Listen Now</Text>
                <Ionicons name="arrow-forward" size={18} color="white" />
             </TouchableOpacity>
          </View>
        </View>

        {/* Dynamic Theme Full Article Button */}
        <View className="px-5 pt-4 border-t border-neutral-200 dark:border-neutral-800">
           <TouchableOpacity 
             className={`w-full h-14 rounded-2xl flex-row items-center justify-center shadow-md ${theme.btnBg}`}
             onPress={() => handleLinkPress(article.link, 'Article')}
           >
              <Text className={`font-black text-sm uppercase tracking-widest mr-2 ${theme.btnText}`}>Read Full Web Article</Text>
              <Ionicons name="open-outline" size={18} color={theme.btnText.includes('white') ? 'white' : 'black'} />
           </TouchableOpacity>
        </View>
      </ScrollView>

      {/* --- Sticky Bottom Navigation --- */}
      <View 
        style={{ paddingBottom: Math.max(insets.bottom + 16, 32) }}
        className="absolute bottom-0 left-0 right-0 px-5 pt-4 bg-neutral-50/90 dark:bg-black/90 border-t border-neutral-200 dark:border-neutral-800 backdrop-blur-xl flex-row items-center justify-between"
      >
        
        {/* Previous Button (Loops) */}
        <TouchableOpacity 
          onPress={handlePrev}
          className="w-14 h-14 rounded-full border bg-amber-50/90 dark:bg-stone-950/90 border-neutral-200 dark:border-neutral-700 items-center justify-center shadow-sm"
        >
          <Ionicons name="chevron-back" size={24} color={isDark ? '#f8fafc' : '#0f172a'} />
        </TouchableOpacity>

        {/* View All Button */}
        <Button 
          color="default"
          onPress={() => { Speech.stop(); router.replace('/articles/all_articles'); }}
          className="flex-1 mx-4 h-14 bg-amber-50/90 dark:bg-stone-950/90 border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-sm flex-row"
        >
          <Ionicons name="grid-outline" size={18} color={isDark ? '#9ca3af' : '#64748b'} />
          <Text className="font-bold text-neutral-600 dark:text-neutral-300 text-sm uppercase tracking-widest ml-2">View All</Text>
        </Button>

        {/* Next Button (Loops) */}
        <TouchableOpacity 
          onPress={handleNext}
          className="w-14 h-14 rounded-full border bg-amber-50/90 dark:bg-stone-950/90 border-neutral-200 dark:border-neutral-700 items-center justify-center shadow-sm"
        >
          <Ionicons name="chevron-forward" size={24} color={isDark ? '#f8fafc' : '#0f172a'} />
        </TouchableOpacity>
      </View>

      {/* Custom Modal */}
      <Modal visible={linkModalVisible} transparent={true} animationType="fade">
        <View className="flex-1 justify-center items-center bg-black/60 px-5 backdrop-blur-md">
          <Card className="w-full max-w-sm bg-white dark:bg-neutral-900 rounded-[2.5rem] p-8 items-center shadow-2xl border border-neutral-200 dark:border-neutral-800">
            
            <View className="w-20 h-20 bg-rose-50 dark:bg-rose-900/20 rounded-full items-center justify-center mb-6 border border-rose-200 dark:border-rose-500/30">
              <Ionicons name="warning" size={36} color={isDark ? '#fb7185' : '#e11d48'} />
            </View>
            
            <Text className="text-2xl font-black text-neutral-900 dark:text-white mb-2 text-center tracking-tight">Leaving App</Text>
            <Text className="text-neutral-500 dark:text-neutral-400 text-center font-medium mb-6 leading-relaxed">
              You are about to be redirected to an external website:
            </Text>

            <View className="bg-neutral-50 dark:bg-neutral-800 px-4 py-4 rounded-xl w-full mb-8 border border-neutral-200 dark:border-neutral-700 shadow-inner">
              <Text className="text-indigo-600 dark:text-indigo-400 font-bold text-center" numberOfLines={1}>
                {pendingLink.domain}
              </Text>
            </View>

            <View className="flex-row w-full gap-3">
              <Button 
                color="default"
                className="flex-1 h-14 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl"
                onPress={() => setLinkModalVisible(false)}
              >
                <Text className="font-bold text-neutral-600 dark:text-neutral-300 text-sm uppercase tracking-widest">Cancel</Text>
              </Button>
              
              <Button 
                color="danger"
                className="flex-[1.2] h-14 rounded-xl shadow-md"
                onPress={proceedToLink}
              >
                <Text className="font-bold text-white text-sm uppercase tracking-widest">Continue</Text>
              </Button>
            </View>
          </Card>
        </View>
      </Modal>
    </View>
  );
}