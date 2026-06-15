// app/articles/all_articles.tsx
import React, { useEffect, useState } from 'react';
import { View, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Text, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from 'heroui-native';
import apiClient from '@/api/apiClient';

export default function AllArticlesScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [articles, setArticles] = useState<any[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const response = await apiClient.get('/articles/');
        setArticles(response.data);
        setFilteredArticles(response.data);
      } catch (error) {
        console.error("Failed to fetch articles", error);
      } finally {
        setLoading(false);
      }
    };
    fetchArticles();
  }, []);

  useEffect(() => {
    if (!search.trim()) {
      setFilteredArticles(articles);
      return;
    }
    const lowerSearch = search.toLowerCase();
    const filtered = articles.filter((a: any) => 
      (a.title || '').toLowerCase().includes(lowerSearch) || 
      (a.mood || '').toLowerCase().includes(lowerSearch)
    );
    setFilteredArticles(filtered);
  }, [search, articles]);

  const getMoodTheme = (mood: string) => {
    const m = (mood || 'neutral').toLowerCase();
    switch(m) {
      case 'good': return { 
        bg: 'bg-emerald-50/90 dark:bg-emerald-900/50', border: 'border-emerald-200 dark:border-emerald-800/50', 
        text: 'text-emerald-700 dark:text-emerald-400', badge: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-200',
        iconBg: 'bg-emerald-500/90'
      };
      case 'great': return { 
        bg: 'bg-purple-50/90 dark:bg-purple-900/50', border: 'border-purple-200 dark:border-purple-800/50', 
        text: 'text-purple-700 dark:text-purple-400', badge: 'bg-purple-100 dark:bg-purple-500/20 text-purple-800 dark:text-purple-200',
        iconBg: 'bg-purple-500/90'
      };
      case 'low': return { 
        bg: 'bg-blue-50/90 dark:bg-blue-900/50', border: 'border-blue-200 dark:border-blue-800/50', 
        text: 'text-blue-700 dark:text-blue-400', badge: 'bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-200',
        iconBg: 'bg-blue-500/90'
      };
      case 'stressed': return { 
        bg: 'bg-orange-50/90 dark:bg-orange-900/50', border: 'border-orange-200 dark:border-orange-800/50', 
        text: 'text-orange-700 dark:text-orange-400', badge: 'bg-orange-100 dark:bg-orange-500/20 text-orange-800 dark:text-orange-200',
        iconBg: 'bg-orange-500/90'
      };
      case 'stress': return { 
        bg: 'bg-rose-50/90 dark:bg-rose-900/50', border: 'border-rose-200 dark:border-rose-800/50', 
        text: 'text-rose-700 dark:text-rose-400', badge: 'bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-200',
        iconBg: 'bg-rose-500/90'
      };
      case 'overwhelmed': return { 
        bg: 'bg-slate-100/90 dark:bg-slate-800/50', border: 'border-slate-300 dark:border-slate-700', 
        text: 'text-slate-700 dark:text-slate-300', badge: 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white',
        iconBg: 'bg-slate-600/90'
      };
      default: return { 
        bg: 'bg-indigo-50/90 dark:bg-indigo-900/50', border: 'border-indigo-200 dark:border-indigo-800/50', 
        text: 'text-indigo-700 dark:text-indigo-400', badge: 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-800 dark:text-indigo-200',
        iconBg: 'bg-indigo-500/90'
      };
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-amber-50/90 dark:bg-stone-950/90">
        <ActivityIndicator size="large" color={isDark ? '#818cf8' : '#4f46e5'} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-transparent">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
        
        {/* Top Header */}
        <View className="px-6 pt-16 pb-4">
          <TouchableOpacity 
            onPress={() => router.replace('/core/dashboard')} 
            className="w-12 h-12 mb-8 bg-amber-50/90 dark:bg-stone-950/90 rounded-full items-center justify-center border border-neutral-200 dark:border-neutral-800 shadow-sm"
          >
            <Ionicons name="arrow-back" size={24} color={isDark ? '#f8fafc' : '#0f172a'} />
          </TouchableOpacity>

          <View className="mb-8">
            <View className="self-start px-4 py-1.5 rounded-full bg-indigo-100 dark:bg-indigo-500/30 mb-4 border border-indigo-200 dark:border-indigo-500/20">
              <Text className="text-indigo-700 dark:text-indigo-300 text-[10px] font-black uppercase tracking-widest">📚 Wellness Articles</Text>
            </View>
            <Text className="text-4xl font-black text-neutral-900 dark:text-white tracking-tight leading-tight mb-3">
              Explore Helpful Insights
            </Text>
            <Text className="text-sm font-medium text-neutral-500 dark:text-neutral-400 leading-relaxed">
              Personalized guidance, mindfulness practices, and mental health education.
            </Text>
          </View>

          {/* Modern Search Bar */}
          <View className="flex-row items-center bg-amber-50/90 dark:bg-stone-950/90 px-5 h-14 rounded-2xl mb-8 shadow-sm border border-neutral-200 dark:border-neutral-800">
            <Ionicons name="search" size={20} color={isDark ? '#818cf8' : '#4f46e5'} />
            <TextInput 
              placeholder="Search by title or mood..."
              placeholderTextColor={isDark ? '#64748b' : '#9ca3af'}
              value={search}
              onChangeText={setSearch}
              className="flex-1 ml-3 font-medium text-neutral-900 dark:text-white text-base h-full"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} className="p-1">
                <Ionicons name="close-circle" size={18} color={isDark ? '#64748b' : '#9ca3af'} />
              </TouchableOpacity>
            )}
          </View>

          {/* Article Grid */}
          <View className="gap-5">
            {filteredArticles.length === 0 ? (
              <Card className="p-10 bg-amber-50/90 dark:bg-stone-950/90 border border-neutral-200 dark:border-neutral-800 rounded-[2.5rem] items-center">
                <View className="w-20 h-20 bg-neutral-50 dark:bg-neutral-800/50 rounded-full items-center justify-center mb-4 border border-neutral-100 dark:border-neutral-700/50">
                  <Text className="text-3xl grayscale opacity-60">🔍</Text>
                </View>
                <Text className="text-xl font-black text-neutral-900 dark:text-white mb-2 tracking-tight">No Articles Found</Text>
                <Text className="text-neutral-500 dark:text-neutral-400 text-center font-medium">Try adjusting your search terms.</Text>
              </Card>
            ) : (
              filteredArticles.map((article) => {
                const theme = getMoodTheme(article.mood);
                return (
                  <Card 
                    key={article.id}
                    className={`bg-white dark:bg-[#13131a] border ${theme.border} rounded-[2rem] shadow-sm overflow-hidden`}
                  >
                    <TouchableOpacity 
                      onPress={() => router.push(`/articles/${article.id}`)} 
                      activeOpacity={0.7}
                      className="p-6 md:p-8"
                    >
                      <View className={`absolute inset-0 opacity-40 dark:opacity-20 pointer-events-none ${theme.bg}`} />
                      
                      <View className="relative z-10">
                        <View className="flex-row justify-between items-center mb-5">
                          <View className={`px-3 py-1.5 rounded-full ${theme.badge}`}>
                            <Text className={`text-[10px] font-black uppercase tracking-widest ${theme.badge.split(' ')[3] || ''}`}>{article.mood}</Text>
                          </View>
                          <View className="flex-row items-center bg-neutral-50/80 dark:bg-neutral-800/80 px-2.5 py-1 rounded-full border border-neutral-200 dark:border-neutral-700/50 shadow-sm">
                            <Ionicons name="time-outline" size={12} color={isDark ? '#9ca3af' : '#64748b'} />
                            <Text className="text-[10px] font-bold text-neutral-600 dark:text-neutral-300 ml-1.5">{article.read_time}</Text>
                          </View>
                        </View>
                        
                        <Text className="text-2xl font-black text-neutral-900 dark:text-white leading-tight mb-3 tracking-tight">
                          {article.title}
                        </Text>
                        
                        <Text 
                          className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-4 leading-relaxed"
                          numberOfLines={2}
                        >
                          {article.short}
                        </Text>

                        {/* Perfectly Aligned Bottom Section */}
                        <View className="flex-row items-center justify-between w-full pt-5 mt-2 border-t border-neutral-200/60 dark:border-neutral-800/60">
                          
                          {/* Left: Wrapping Author & Date */}
                          <View className="flex-1 pr-4 justify-center">
                            <Text 
                              className="text-sm font-bold text-neutral-900 dark:text-white leading-tight"
                              numberOfLines={2}
                            >
                              {article.author || 'Unknown'}
                            </Text>
                            <Text className="text-[11px] font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400 mt-1.5">
                              {article.date || 'Recently'}
                            </Text>
                          </View>
                          
                          {/* Right: Fixed Action Arrow */}
                          <View className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-md flex-shrink-0 ${theme.iconBg}`}>
                            <Ionicons name="arrow-forward" size={20} color="white" />
                          </View>
                          
                        </View>
                      </View>
                    </TouchableOpacity>
                  </Card>
                )
              })
            )}
          </View>

        </View>
      </ScrollView>
    </View>
  );
}