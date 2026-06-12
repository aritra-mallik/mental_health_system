// app/core/dashboard.tsx
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  View, ScrollView, TouchableOpacity, RefreshControl, 
  Animated, Dimensions, TouchableWithoutFeedback, Text, useColorScheme, Image, Easing
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Path, Polygon, Defs, Stop, LinearGradient as SvgLinearGradient } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import * as Speech from 'expo-speech'; 
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../api/apiClient';
import Sidebar from '../sidebar';

const { width, height } = Dimensions.get('window');

const SMERA_LINES = [
  "It's okay to feel however you're feeling right now. ❤️",
  "In case no one told you today: I'm really glad you're here. 🌟",
  "You’ve survived 100% of your hardest days. You're doing great. 💪",
  "You don't have to figure everything out today. Just breathe. 🕊️",
  "Pause for a second. What's one thing you can hear right now? 👂",
  "Close your eyes and take one slow, deep breath with me. 🌬️",
  "Your thoughts are like clouds; let them just float by for a bit. ☁️",
  "Feeling overwhelmed? Let's name three things you can see. 👀",
  "Is your phone on night mode? Your eyes deserve a rest, too. 📱",
  "When was the last time you stretched? Reach for the sky! ☁️",
  "Remember to drink a little water. Your body will thank you. 💧",
  "A five-minute break can change your whole afternoon. ☕"
];

export default function DashboardScreen() {
  const router = useRouter();
  const { logout } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  // --- Sidebar Controls ---
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const slideAnim = useRef(new Animated.Value(-width * 0.8)).current;

  const toggleSidebar = () => {
    if (isSidebarOpen) {
      Animated.timing(slideAnim, { toValue: -width * 0.8, duration: 300, useNativeDriver: true }).start(() => setSidebarOpen(false));
    } else {
      setSidebarOpen(true);
      Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
    }
  };

  // --- Core Animations ---
  const smeraFloatAnim = useRef(new Animated.Value(0)).current;
  const smeraMiniFloatAnim = useRef(new Animated.Value(0)).current;
  const guidePulseAnim = useRef(new Animated.Value(1)).current;
  const bellAlertAnim = useRef(new Animated.Value(0)).current;
  const pingAnim = useRef(new Animated.Value(0)).current;

  // --- Dynamic Dashboard States ---
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userName, setUserName] = useState("Friend");
  const [greetingText, setGreetingText] = useState("Greetings");
  const [smeraQuote, setSmeraQuote] = useState("Hey! I'm here if you want to talk. ✨");
  
  // Voice Alerts & Logs
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [alertData, setAlertData] = useState({ msg: "Your emotional patterns appear relatively steady today.", level: "green" });
  const [recommendation, setRecommendation] = useState<{type: string, recommended: string[]}>({ type: 'clean', recommended: [] });
  const [appointment, setAppointment] = useState<any>(null);
  
  // Card Counters
  const [currentMood, setCurrentMood] = useState<string>("--");
  const [lastCheckInDate, setLastCheckInDate] = useState<string>("--");
  const [latestTestName, setLatestTestName] = useState<string>("--");
  const [journalCount, setJournalCount] = useState<number>(0);
  
  // Analytics Cache & Filter States
  const [moodTrendsRaw, setMoodTrendsRaw] = useState<any[]>([]);
  const [moodEventsRaw, setMoodEventsRaw] = useState<any[]>([]);
  const [assessmentsRaw, setAssessmentsRaw] = useState<any[]>([]);
  
  const [eventRange, setEventRange] = useState<'24h' | '7d'>('24h');
  const [assessMode, setAssessMode] = useState<'all' | 'date'>('all');
  const [selectedAssessDate, setSelectedAssessDate] = useState<string | null>(null);
  const [assessVisible, setAssessVisible] = useState({ who5: true, pss: true, wemwbs: true, isi: true });
  
  // Curated Content Slider
  const [articles, setArticles] = useState<any[]>([]);
  const [articleIndex, setArticleIndex] = useState(0);
  const [isAutoFeed, setIsAutoFeed] = useState(true);

  // --- Clean up Speech on unmount to prevent ghost talking ---
  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  // --- Initialize Time & Date Based Logic ---
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreetingText("Good Morning");
    else if (hour < 18) setGreetingText("Good Afternoon");
    else setGreetingText("Good Evening");
  }, []);

  const recentDates = Array.from({length: 14}, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d;
  });

  // --- Loops & Timers ---
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(smeraFloatAnim, { toValue: -10, duration: 3000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(smeraFloatAnim, { toValue: 0, duration: 3000, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(smeraMiniFloatAnim, { toValue: -6, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(smeraMiniFloatAnim, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(guidePulseAnim, { toValue: 1.5, duration: 2000, useNativeDriver: true }),
        Animated.timing(guidePulseAnim, { toValue: 1, duration: 2000, useNativeDriver: true })
      ])
    ).start();

    Animated.loop(
      Animated.timing(pingAnim, { toValue: 1, duration: 1500, useNativeDriver: true })
    ).start();
  }, []);

  useEffect(() => {
    if (isVoiceEnabled) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(bellAlertAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
          Animated.timing(bellAlertAnim, { toValue: -1, duration: 100, useNativeDriver: true }),
          Animated.timing(bellAlertAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
          Animated.timing(bellAlertAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
          Animated.delay(2000)
        ])
      ).start();
    } else {
      bellAlertAnim.setValue(0);
    }
  }, [isVoiceEnabled]);

  useEffect(() => {
    const quoteInterval = setInterval(() => {
      setSmeraQuote(SMERA_LINES[Math.floor(Math.random() * SMERA_LINES.length)]);
    }, 10000);
    return () => clearInterval(quoteInterval);
  }, []);

  useEffect(() => {
    let slideInterval: NodeJS.Timeout;
    if (isAutoFeed && articles.length > 1) {
      slideInterval = setInterval(() => {
        setArticleIndex((prev) => (prev + 1) % articles.length);
      }, 10000);
    }
    return () => clearInterval(slideInterval);
  }, [isAutoFeed, articles.length]);

  // --- REST Framework Data Loader ---
  const fetchDashboardData = async () => {
    try {
      const [
        profileRes, alertRes, moodTrendRes, currentMoodRes, 
        assessHistoryRes, recRes, journalRes, appointmentRes, articlesRes
      ] = await Promise.all([
        apiClient.get('/user/profile/').catch(() => null),
        apiClient.get('/core/live-alert/').catch(() => null),
        apiClient.get('/core/mood-trends/?range=all').catch(() => null),
        apiClient.get('/core/current-mood/').catch(() => null),
        apiClient.get('/core/assessment-history/').catch(() => null),
        apiClient.get('/core/assessment-recommendations/').catch(() => null),
        apiClient.get('/core/journal/').catch(() => null),
        apiClient.get('/consultation/today-appointment/').catch(() => null),
        apiClient.get('/articles/').catch(() => null)
      ]);

      if (profileRes?.data?.display_name) setUserName(profileRes.data.display_name);
      if (alertRes?.data?.alert) setAlertData(alertRes.data.alert);
      if (journalRes?.data) setJournalCount(journalRes.data.length || 0);
      if (appointmentRes?.data?.hasAppointment) setAppointment(appointmentRes.data);
      if (articlesRes?.data) setArticles(articlesRes.data);

      if (currentMoodRes?.data?.mood) {
        const moodStr = currentMoodRes.data.mood;
        setCurrentMood(moodStr.charAt(0).toUpperCase() + moodStr.slice(1));
      } else {
        setCurrentMood(assessHistoryRes?.data?.length > 0 ? "Catch Up" : "Let's Begin");
      }

      if (assessHistoryRes?.data && assessHistoryRes.data.length > 0) {
        setAssessmentsRaw(assessHistoryRes.data);
        const sorted = [...assessHistoryRes.data].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const latest = sorted[0];
        const dateObj = new Date(latest.created_at);
        setLastCheckInDate(`${dateObj.getDate()}/${dateObj.getMonth() + 1}/${dateObj.getFullYear()}`);
        
        const titles: Record<string, string> = { who5: "WHO-5", pss: "PSS", wemwbs: "WEMWBS", isi: "ISI" };
        setLatestTestName(titles[latest.assessment_type] || latest.assessment_type.toUpperCase());
        
        if (!selectedAssessDate) {
          setSelectedAssessDate(dateObj.toDateString());
        }
      }

      if (moodTrendRes?.data) setMoodTrendsRaw(moodTrendRes.data);
      if (recRes?.data) setRecommendation(recRes.data);

    } catch (error) {
      console.log("Failed loading dashboard REST resources:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchDashboardData(); }, []));

  useEffect(() => {
    const fetchMoodEvents = async () => {
      try {
        const res = await apiClient.get(`/core/mood-events/?range=${eventRange}`);
        if (res.data) setMoodEventsRaw(res.data);
      } catch (err) {
        console.log("Failed fetching mood timelines:", err);
      }
    };
    fetchMoodEvents();
  }, [eventRange]);

  // --- Dynamic Color Styles Map ---
  const getAlertTheme = () => {
    switch (alertData.level) {
      case "red": return { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-400', dot: 'bg-red-500', border: 'border-red-200 dark:border-red-800/50' };
      case "orange": return { bg: 'bg-[#fff7ed] dark:bg-orange-900/20', text: 'text-[#ea580c] dark:text-orange-400', dot: 'bg-[#f97316]', border: 'border-[#ffedd5] dark:border-orange-800/50' };
      case "yellow": return { bg: 'bg-[#fffbeb] dark:bg-yellow-900/20', text: 'text-[#d97706] dark:text-yellow-500', dot: 'bg-[#f59e0b]', border: 'border-[#fef08a] dark:border-yellow-800/50' };
      case "green": return { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500', border: 'border-emerald-200 dark:border-emerald-800/50' };
      default: return { bg: 'bg-slate-50 dark:bg-slate-900/40', text: 'text-slate-600 dark:text-slate-400', dot: 'bg-slate-400', border: 'border-slate-200 dark:border-slate-800' };
    }
  };

  const getMoodTaxonomyColor = (mood: string) => {
    const m = (mood || 'neutral').toLowerCase().trim();
    switch(m) {
      case 'good': return { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-600 dark:text-green-400', border: 'border-green-200 dark:border-green-800/50' };
      case 'great': return { bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-800/50' };
      case 'low': return { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800/50' };
      case 'stressed': return { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-600 dark:text-red-400', border: 'border-red-200 dark:border-red-800/50' };
      case 'overwhelmed': return { bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-800/50' };
      default: return { bg: 'bg-slate-50 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-300', border: 'border-slate-200 dark:border-slate-700' };
    }
  };

  // --- QuickChart Engine Builders ---
  const themeText = isDark ? '#9ca3af' : '#4b5563';
  const themeGrid = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
  const pointBgBase = isDark ? '#1e293b' : '#ffffff';

  const getMoodTrendsChartUrl = () => {
    if (!moodTrendsRaw.length) return null;
    const recent = moodTrendsRaw.slice(-7);
    const scoreMap = (score: number) => Math.max(0, Math.min(5, score + 3));
    const paletteMap: Record<number, string> = { 0: '#ef4444', 1: '#3b82f6', 2: '#f97316', 3: '#94a3b8', 4: '#10b981', 5: '#a855f7' };
    
    const mappedScores = recent.map(d => scoreMap(d.score));
    const pointBorders = mappedScores.map(score => paletteMap[Math.round(score)] || paletteMap[3]);

    const config = {
      type: 'line',
      data: {
        labels: recent.map(d => new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
        datasets: [{
          data: mappedScores,
          showLine: false,
          pointBackgroundColor: isDark ? 'rgba(30,41,59,0.8)' : '#fff',
          pointBorderColor: pointBorders,
          pointBorderWidth: 4,
          pointRadius: 10
        }]
      },
      options: {
        plugins: { legend: { display: false } },
        scales: {
          y: { min: 0, max: 5, ticks: { padding: 12, callback: `(val) => { return ['OVERWHELMED', 'LOW', 'STRESSED', 'NEUTRAL', 'GOOD', 'GREAT'][val]; }`, color: themeText, font: { size: 12, weight: 'bold' } }, grid: { color: themeGrid, drawBorder: false }, border: { display: false } },
          x: { ticks: { padding: 8, color: themeText, font: { size: 13, weight: 'bold' } }, grid: { display: false }, border: { display: false } }
        }
      }
    };
    return `https://quickchart.io/chart?v=3&w=600&h=300&devicePixelRatio=2&bkg=transparent&c=${encodeURIComponent(JSON.stringify(config).replace(/"(\(val\).*?)"/g, '$1'))}`;
  };

  const getRawEventsChartUrl = () => {
    if (!moodEventsRaw.length) return null;
    const moodMap: Record<string, number> = { overwhelmed: 0, low: 1, stressed: 2, neutral: 3, good: 4, great: 5 };
    const recent = moodEventsRaw.slice(-10);

    const config = {
      type: 'line',
      data: {
        labels: recent.map(d => new Date(d.created_at || d.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })),
        datasets: [{
          data: recent.map(d => moodMap[(d.mood || '').toLowerCase()] ?? 3),
          borderColor: '#ec4899', backgroundColor: 'rgba(236,72,153,0.15)', borderWidth: 4, fill: true, tension: 0.4,
          pointRadius: 8, pointBackgroundColor: '#ec4899', pointBorderColor: '#ffffff', pointBorderWidth: 3
        }]
      },
      options: {
        plugins: { legend: { display: false } },
        scales: {
          y: { min: 0, max: 5, ticks: { padding: 12, callback: `(val) => { return ['Overwhelmed', 'Low', 'Stressed', 'Neutral', 'Good', 'Great'][val]; }`, color: themeText, font: { size: 12, weight: 'bold' }, stepSize: 1 }, grid: { color: themeGrid } },
          x: { ticks: { display: false }, grid: { display: false } }
        }
      }
    };
    return `https://quickchart.io/chart?v=3&w=600&h=300&devicePixelRatio=2&bkg=transparent&c=${encodeURIComponent(JSON.stringify(config).replace(/"(\(val\).*?)"/g, '$1'))}`;
  };

  const getAssessmentChartUrl = () => {
    if (!assessmentsRaw.length) return null;
    
    let chartData = [...assessmentsRaw];
    let dates = [];

    if (assessMode === 'date' && selectedAssessDate) {
      chartData = chartData.filter(d => new Date(d.created_at).toDateString() === selectedAssessDate);
      dates = [...new Set(chartData.map(d => new Date(d.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })))].reverse();
    } else {
      dates = [...new Set(chartData.map(d => new Date(d.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })))].reverse().slice(-6);
    }

    const lineColors: Record<string, string> = { who5: '#8b5cf6', pss: '#f43f5e', wemwbs: '#f59e0b', isi: '#10b981' };
    const datasets: any[] = [];

    ['who5', 'pss', 'wemwbs', 'isi'].forEach(type => {
      if (assessVisible[type as keyof typeof assessVisible]) {
        const typeData = dates.map(timeLabel => {
          const records = chartData.filter(d => {
            const timeCheck = assessMode === 'date' 
              ? new Date(d.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
              : new Date(d.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            return timeCheck === timeLabel && d.assessment_type === type;
          });
          if (!records.length) return null;
          return records.reduce((sum, r) => sum + r.score, 0) / records.length;
        });

        if (typeData.some(val => val !== null)) {
          datasets.push({
            label: type.toUpperCase(), data: typeData, borderColor: lineColors[type], borderWidth: 4, fill: false, spanGaps: true,
            pointBackgroundColor: pointBgBase, pointBorderColor: lineColors[type], pointBorderWidth: 3, pointRadius: 7, tension: 0.4
          });
        }
      }
    });

    const config = {
      type: 'line', data: { labels: dates, datasets },
      options: {
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { padding: 12, color: themeText, font: { size: 12, weight: 'bold' } }, grid: { color: themeGrid, drawBorder: false }, border: { display: false } },
          x: { ticks: { padding: 12, color: themeText, font: { size: 12, weight: 'bold' } }, grid: { display: false }, border: { display: false } }
        }
      }
    };
    return `https://quickchart.io/chart?v=3&w=600&h=300&devicePixelRatio=2&bkg=transparent&c=${encodeURIComponent(JSON.stringify(config))}`;
  };

  // --- NATIVE EXPO SPEECH TRIGGER ---
  const triggerVoiceSynthesis = async () => {
    const nextVoiceState = !isVoiceEnabled;
    setIsVoiceEnabled(nextVoiceState);

    if (nextVoiceState && alertData?.msg) {
      Speech.stop(); // Stop any previous speech
      Speech.speak(alertData.msg, {
        language: 'en',
        pitch: 1.1,
        rate: 0.9,
        // Automatically turn off the ringing bell animation when done
        onDone: () => setIsVoiceEnabled(false),
        onError: () => setIsVoiceEnabled(false),
      });
    } else {
      // If user toggles it off mid-sentence
      Speech.stop();
    }
  };

  const toggleAssessmentMode = () => {
    setAssessMode(prev => prev === 'all' ? 'date' : 'all');
  };

  const currentArticle = articles[articleIndex];
  const activeAlertTheme = getAlertTheme();
  const bellRotation = bellAlertAnim.interpolate({ inputRange: [-1, 1], outputRange: ['-0.2rad', '0.2rad'] });
  
  // Interpolations for pulsing elements
  const pingScale = pingAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.5] });
  const pingOpacity = pingAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 0] });

  return (
    <View className="flex-1 bg-slate-50 dark:bg-[#0B1120]">
      <ScrollView 
        contentContainerClassName="p-5 pb-36 pt-16"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchDashboardData(); }} tintColor={isDark ? '#818cf8' : '#4f46e5'} />}
      >
        {/* --- Top Navbar --- */}
        <View className="flex-row justify-between items-center mb-6">
          <TouchableOpacity onPress={toggleSidebar} className="w-12 h-12 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/50 rounded-full items-center justify-center shadow-sm z-10">
            <Ionicons name="menu" size={24} color={isDark ? '#f8fafc' : '#0f172a'} />
          </TouchableOpacity>
        </View>

        {/* --- 1. Smera Hero Segment --- */}
        <LinearGradient 
          colors={isDark ? ['#1e1b4b', '#0f172a'] : ['#eef2ff', '#ffffff']}
          className="border border-white/50 dark:border-slate-800/50 rounded-[3.5rem] p-8 md:p-12 mb-8 shadow-sm items-center overflow-hidden"
        >
           <View className="relative w-36 h-36 items-center justify-center mb-6">
             <Animated.View style={{ transform: [{ scale: guidePulseAnim }] }} className="absolute inset-0 bg-indigo-400/20 rounded-full" />
             <Animated.View style={{ transform: [{ translateY: smeraFloatAnim }] }} className="bg-white dark:bg-slate-700 p-5 rounded-full border-4 border-white dark:border-slate-600 shadow-xl z-10">
                <Svg width="80" height="80" viewBox="0 0 100 100" fill="none">
                  <Circle cx="50" cy="50" r="45" fill="#EEF2FF" stroke="#C7D2FE" strokeWidth="2"/>
                  <Circle cx="35" cy="45" r="4" fill="#4F46E5" />
                  <Circle cx="65" cy="45" r="4" fill="#4F46E5" />
                  <Path d="M40 65C40 65 45 70 50 70C55 70 60 65 60 65" stroke="#4F46E5" strokeWidth="3.5" strokeLinecap="round"/>
                  <Circle cx="30" cy="55" r="5" fill="#FED7AA" />
                  <Circle cx="70" cy="55" r="5" fill="#FED7AA" />
                </Svg>
             </Animated.View>
             <View className="absolute -bottom-2 bg-indigo-600 px-4 py-1 rounded-full z-20 shadow-md">
                <Text className="text-white text-[10px] font-bold uppercase tracking-widest">Breathe</Text>
             </View>
           </View>

           <Text className="text-4xl font-black text-slate-800 dark:text-white tracking-tight mb-2 text-center">
             {greetingText}, <Text className="text-indigo-600 dark:text-indigo-400">{userName}.</Text>
           </Text>
           <Text className="text-base font-medium text-slate-500 dark:text-slate-400 text-center mb-8 px-4">
             I'm Smera. Whenever things feel heavy, or if you just need a friendly chat, I'm right here for you.
           </Text>

           <View className="flex-col w-full gap-4">
             <TouchableOpacity onPress={() => router.push('/core/chatbot')} className="w-full bg-indigo-600 py-4 rounded-2xl shadow-lg flex-row items-center justify-center">
               <Text className="text-white font-bold text-base mr-2">Chat with Smera</Text>
               <Ionicons name="arrow-forward" size={18} color="#fff" />
             </TouchableOpacity>
             
             <TouchableOpacity onPress={() => router.push('/core/assessment')} className="w-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 py-3 px-4 rounded-2xl flex-row items-center justify-center shadow-sm">
               <View className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/30 items-center justify-center mr-3">
                 <Ionicons name="shield-checkmark" size={18} color={isDark ? '#818cf8' : '#4f46e5'} />
               </View>
               <View className="flex-1">
                 <Text className="text-slate-800 dark:text-white font-black text-sm">Mindful Check-in</Text>
                 <Text className="text-[10px] font-medium text-slate-500 dark:text-slate-400">Take a moment to map your feelings</Text>
               </View>
             </TouchableOpacity>
           </View>
        </LinearGradient>

        {/* --- 2. Live Alert & Up Next Dashboard Block --- */}
        <LinearGradient 
          colors={isDark ? ['#1e1b4b', '#2e1065'] : ['#e0e7ff', '#fae8ff']}
          className="rounded-[2.5rem] p-6 mb-8 shadow-sm overflow-hidden border border-white/60 dark:border-indigo-900/50"
        >
          <View className="flex-row items-stretch gap-4 mb-5">
             <TouchableOpacity onPress={triggerVoiceSynthesis} className="w-12 h-12 rounded-xl bg-[#fef3c7] dark:bg-amber-900/40 items-center justify-center border border-[#fde68a] dark:border-amber-800/50">
               <Animated.View style={{ transform: [{ rotate: bellRotation }] }}>
                 <Ionicons name="notifications" size={22} color={isVoiceEnabled ? '#d97706' : '#f59e0b'} />
               </Animated.View>
             </TouchableOpacity>
             <View className="flex-1 justify-center">
                <Text className="font-black text-xl text-slate-800 dark:text-white tracking-tight">Smera's Live Alert</Text>
                <Text className="text-sm text-slate-500 dark:text-slate-300 font-medium">Real-time wellbeing status</Text>
             </View>
          </View>
          
          <View className={`rounded-2xl p-4 border flex-row items-center gap-3 mb-5 ${activeAlertTheme.bg} ${activeAlertTheme.border}`}>
             <View className={`w-2 h-2 rounded-full ${activeAlertTheme.dot}`} />
             <Text className={`flex-1 text-sm font-bold leading-relaxed ${activeAlertTheme.text}`}>{alertData.msg}</Text>
          </View>

          <View className="border-t border-indigo-200/50 dark:border-indigo-800/50 pt-5">
            <Text className="text-[10px] font-black text-[#8b5cf6] dark:text-purple-400 uppercase tracking-widest mb-3">Up Next For You:</Text>
            {recommendation.recommended.length > 0 ? (
              <View>
                <Text className="text-sm font-bold text-[#ea580c] dark:text-orange-400 mb-3">A gentle check-in might help today</Text>
                <View className="flex-row flex-wrap gap-2">
                  {recommendation.recommended.map((rec, i) => (
                    <TouchableOpacity key={i} onPress={() => router.push('/core/assessment')} className="px-4 py-2 bg-[#fff7ed] dark:bg-orange-900/30 border border-[#ffedd5] dark:border-orange-800/50 rounded-xl shadow-sm">
                      <Text className="text-[#ea580c] dark:text-orange-400 text-xs font-black tracking-wide">⏳ {rec.toUpperCase()} due</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : (
              <View className="px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/30 rounded-xl self-start">
                <Text className="text-emerald-600 dark:text-emerald-400 text-sm font-bold">You're doing well — no check-ins needed now</Text>
              </View>
            )}
          </View>
        </LinearGradient>

        {/* --- 3. Dynamic Clinical Appointment Alert Banner --- */}
        {appointment && (
          <LinearGradient colors={['#f59e0b', '#d97706']} className="rounded-2xl p-5 mb-8 shadow-md flex-row items-center">
             <View className="w-12 h-12 bg-white/20 rounded-xl items-center justify-center mr-4 border border-white/20"><Text className="text-2xl">🗓️</Text></View>
             <View className="flex-1">
                <Text className="text-white font-black text-base tracking-tight">Upcoming Session</Text>
                <Text className="text-amber-50 text-md mt-0.5 leading-relaxed">
                  You have a <Text className="font-bold uppercase bg-white/20 px-1 rounded">{appointment.mode}</Text> consultation today with {appointment.counselor} at {appointment.time}
                </Text>
             </View>
          </LinearGradient>
        )}

        {/* --- 4. Overview Cards --- */}
        <View className="flex-col gap-6 mb-8">
          {/* Current Mood Card */}
          <View className="w-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[2.5rem] p-6 shadow-sm overflow-hidden relative">
             <View className="absolute -right-10 -top-10 w-40 h-40 bg-fuchsia-100 dark:bg-fuchsia-900/20 rounded-full opacity-50" />
             <View className="absolute -bottom-10 -left-10 w-32 h-32 bg-indigo-50 dark:bg-indigo-900/20 rounded-full opacity-50" />
             
             <View className="relative z-10 flex-row items-center gap-4 mb-8">
                <View className="w-14 h-14 bg-blue-50 dark:bg-blue-900/30 rounded-2xl items-center justify-center border border-blue-100 dark:border-blue-800/50">
                    <Ionicons name="happy-outline" size={28} color={isDark ? "#60a5fa" : "#3b82f6"} />
                </View>
                <View className="flex-1">
                   <Text className="text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight capitalize">{currentMood}</Text>
                   <Text className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-1">Current Mood</Text>
                </View>
             </View>

             <View className="relative z-10 flex-row pt-5 justify-between">
                <View className="items-start flex-1">
                   <Text className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Latest Test</Text>
                   <Text className="text-lg font-black text-slate-800 dark:text-slate-200 uppercase">{latestTestName}</Text>
                </View>
                <View className="items-end flex-1">
                   <Text className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Last Check-In</Text>
                   <Text className="text-lg font-black text-slate-800 dark:text-slate-200">{lastCheckInDate}</Text>
                </View>
             </View>
          </View>

          {/* Fundamental Guidance Room */}
          <TouchableOpacity onPress={() => router.push('/core/recovery_hub')} className="w-full rounded-[2.5rem] overflow-hidden shadow-sm">
             <View className="w-full bg-[#059669] dark:bg-[#047857] p-8 justify-between relative overflow-hidden">
                <View className="absolute -right-12 -top-12 w-48 h-48 bg-white/10 rounded-full" />
                <View className="flex-row justify-between mb-5 relative z-10">
                  <View className="w-14 h-14 bg-white/20 rounded-2xl items-center justify-center border border-white/20 shadow-inner">
                      <Ionicons name="flash" size={28} color="#fff" />
                  </View>
                  <View className="w-8 h-8 rounded-full bg-white/20 items-center justify-center">
                      <Ionicons name="chevron-forward" size={16} color="#fff" />
                  </View>
                </View>
                <View className="relative z-10">
                  <Text className="text-2xl font-black text-white leading-tight mb-2 tracking-tight">Fundamental Guidance Room</Text>
                  <Text className="text-emerald-50 text-sm font-medium leading-relaxed">Access grounded routines, sleep protocols, and immediate panic relief tools.</Text>
                </View>
             </View>
          </TouchableOpacity>
        </View>

        {/* --- 5. Private Diary Box Banner --- */}
        <TouchableOpacity onPress={() => router.push('/core/journal')} className="mb-8 relative w-full rounded-[2.5rem] overflow-hidden shadow-md border border-indigo-100 dark:border-white/10">
          <LinearGradient 
            colors={isDark ? ['#312e81', '#1e293b', '#4c1d95'] : ['#fef3c7', '#ffffff', '#fdf4ff']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            className="w-full p-6 py-8 relative overflow-hidden"
          >
            <View className="absolute -right-8 -bottom-8 opacity-30 dark:opacity-10">
               <Ionicons name="lock-closed" size={180} color={isDark ? "#c7d2fe" : "#a78bfa"} />
            </View>

            <View className="absolute right-8 top-[-2] z-20 shadow-lg">
              <Svg width="28" height="60" viewBox="0 0 28 60">
                <Defs>
                  <SvgLinearGradient id="ribbonGrad" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor="#fbbf24" />
                    <Stop offset="1" stopColor="#d97706" />
                  </SvgLinearGradient>
                </Defs>
                <Polygon points="0,0 28,0 28,60 14,48 0,60" fill="url(#ribbonGrad)" />
              </Svg>
            </View>

            <View className="relative z-30 pr-10">
              <View className="flex-row flex-wrap items-center gap-3 mb-4">
                <View className="px-3 py-1.5 bg-green-50 dark:bg-white/5 rounded-full border border-green-200 dark:border-white/10 flex-row items-center shadow-sm">
                  <View className="relative w-2 h-2 mr-2">
                    <Animated.View style={{ transform: [{ scale: pingScale }], opacity: pingOpacity }} className="absolute inset-0 rounded-full bg-green-400" />
                    <View className="relative w-2 h-2 rounded-full bg-green-500" />
                  </View>
                  <Text className="text-green-700 dark:text-indigo-100 text-[10px] font-black uppercase tracking-widest">Private-Insights</Text>
                </View>
                <View className="px-3 py-1.5 bg-indigo-50/80 dark:bg-indigo-900/30 rounded-full border border-indigo-200 dark:border-indigo-800/50 flex-row items-center shadow-sm">
                  <Ionicons name="lock-closed" size={10} color={isDark ? '#a5b4fc' : '#4f46e5'} style={{ marginRight: 4 }} />
                  <Text className="text-indigo-700 dark:text-indigo-300 text-[10px] font-black uppercase tracking-widest">{journalCount} Entries</Text>
                </View>
              </View>
              <Text className="text-3xl font-black text-slate-800 dark:text-white mb-2 tracking-wide" style={{ fontFamily: 'Georgia' }}>Private Diary</Text>
              <Text className="text-slate-500 dark:text-indigo-100/70 text-sm font-medium leading-relaxed w-full">
                A secure sanctuary for your mind. Document your journey and release your thoughts freely. No one else has the key.
              </Text>
            </View>

            <View className="absolute right-6 bottom-6 w-12 h-12 bg-indigo-50 dark:bg-white/10 border border-indigo-100 dark:border-white/20 rounded-full items-center justify-center z-30 shadow-sm">
              <Ionicons name="add" size={24} color={isDark ? '#fff' : '#4f46e5'} />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* --- 6. Clinical Expert Care Section --- */}
        <TouchableOpacity onPress={() => router.push('/consultation/consultation')} className="mb-8 relative w-full rounded-[2.5rem] overflow-hidden shadow-sm border border-slate-200 dark:border-slate-700">
           <LinearGradient colors={isDark ? ['#1e293b', '#0f172a'] : ['#ffffff', '#f8fafc']} className="p-8 items-center text-center relative overflow-hidden">
             
             <View className="absolute -top-4 -left-4 opacity-5 pointer-events-none transform -rotate-12">
               <Ionicons name="medkit" size={120} color="#f43f5e" />
             </View>
             
             <View className="absolute top-5 right-5 flex-row items-center gap-1.5 bg-white/90 dark:bg-slate-800/90 border border-emerald-100 dark:border-emerald-800/50 px-2.5 py-1 rounded-full shadow-sm z-10">
                <View className="relative w-1.5 h-1.5">
                  <Animated.View style={{ transform: [{ scale: pingScale }], opacity: pingOpacity }} className="absolute inset-0 rounded-full bg-emerald-400" />
                  <View className="relative w-1.5 h-1.5 rounded-full bg-emerald-500" />
                </View>
                <Text className="text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Bookings</Text>
             </View>
             
             <LinearGradient colors={['#e11d48', '#ec4899']} className="w-16 h-16 rounded-2xl items-center justify-center mb-5 shadow-md border border-white/20 mt-4">
                <Ionicons name="shield-checkmark" size={28} color="#fff" />
             </LinearGradient>
             
             <Text className="text-2xl font-black text-slate-800 dark:text-white tracking-tight mb-2">Clinical Care</Text>
             <Text className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-widest mb-2 mt-1">Board-Certified Providers</Text>
             <Text className="text-xs font-medium text-slate-500 dark:text-slate-400 text-center mb-6 leading-relaxed px-2">
               Consult securely with a licensed specialist to evaluate and manage your mental wellbeing.
             </Text>
             
             <LinearGradient colors={['#e11d48', '#ec4899']} className="w-full py-4 rounded-xl flex-row justify-center items-center shadow-md">
               <Text className="text-white font-black text-xs uppercase tracking-widest mr-2">Request Appointment</Text>
               <Ionicons name="arrow-forward" size={16} color="#fff" />
             </LinearGradient>
           </LinearGradient>
        </TouchableOpacity>

        {/* =========================================
            --- 7. ANALYTICS HUB (CHARTS) --- 
        ============================================= */}
        <View className="mb-6">
          <View className="flex-row items-center justify-between mb-5 px-1">
            <Text className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Analytics</Text>
          </View>
          
          {/* A. Mood Trends Chart */}
          <View className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[2rem] p-6 mb-6 shadow-sm overflow-hidden">
             <View className="flex-row justify-between items-start mb-6">
               <View className="flex-row items-center gap-3">
                 <View className="w-10 h-10 bg-cyan-50 dark:bg-cyan-900/30 rounded-xl items-center justify-center border border-cyan-100 dark:border-cyan-800/50">
                   <Ionicons name="happy" size={20} color="#0891b2" />
                 </View>
                 <View>
                   <Text className="text-lg font-black text-slate-800 dark:text-white tracking-tight">Mood Trends</Text>
                   <Text className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">Average daily feelings</Text>
                 </View>
               </View>
               <View className="px-3 py-1.5 border border-cyan-200 dark:border-cyan-800/50 bg-cyan-50 dark:bg-cyan-900/20 rounded-xl shadow-sm">
                  <Text className="text-[9px] font-black uppercase tracking-widest text-cyan-600 dark:text-cyan-400">Timeline</Text>
               </View>
             </View>
             <View className="w-full items-center justify-center min-h-[260px]">
               {getMoodTrendsChartUrl() ? (
                 <Image source={{ uri: getMoodTrendsChartUrl()! }} className="w-full h-[260px]" style={{ resizeMode: 'contain' }} />
               ) : (
                 <Text className="text-slate-400 text-sm italic py-8 font-medium">Gathering metrics records...</Text>
               )}
             </View>
          </View>

          {/* B. Raw Mood Events Timeline */}
          <View className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[2rem] p-6 mb-6 shadow-sm overflow-hidden">
             <View className="flex-col sm:flex-row justify-between items-start mb-6 gap-4">
               <View className="flex-row items-center gap-3">
                 <View className="w-10 h-10 bg-pink-50 dark:bg-pink-900/30 rounded-xl items-center justify-center border border-pink-100 dark:border-pink-800/50">
                   <Ionicons name="pulse" size={20} color="#db2777" />
                 </View>
                 <View>
                   <Text className="text-lg font-black text-slate-800 dark:text-white tracking-tight">Raw Mood Events</Text>
                   <Text className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">Every check-in plotted</Text>
                 </View>
               </View>
               <View className="flex-row items-center gap-3 w-full justify-between sm:justify-end mt-2">
                 <View className="flex-row bg-slate-100 dark:bg-slate-700 p-1 rounded-xl shadow-inner">
                   <TouchableOpacity onPress={() => setEventRange('24h')} className={`px-3 py-1.5 rounded-lg ${eventRange === '24h' ? 'bg-amber-500 shadow-sm' : ''}`}>
                     <Text className={`text-[10px] font-bold uppercase ${eventRange === '24h' ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`}>24H</Text>
                   </TouchableOpacity>
                   <TouchableOpacity onPress={() => setEventRange('7d')} className={`px-3 py-1.5 rounded-lg ${eventRange === '7d' ? 'bg-amber-500 shadow-sm' : ''}`}>
                     <Text className={`text-[10px] font-bold uppercase ${eventRange === '7d' ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`}>7D</Text>
                   </TouchableOpacity>
                 </View>
                 <View className="px-3 py-1.5 border border-pink-200 dark:border-pink-800/50 bg-pink-50 dark:bg-pink-900/20 rounded-xl shadow-sm">
                    <Text className="text-[9px] font-black uppercase tracking-widest text-pink-600 dark:text-pink-400">Timeline</Text>
                 </View>
               </View>
             </View>
             <View className="w-full items-center justify-center min-h-[260px]">
               {getRawEventsChartUrl() ? (
                 <Image source={{ uri: getRawEventsChartUrl()! }} className="w-full h-[260px]" style={{ resizeMode: 'contain' }} />
               ) : (
                 <Text className="text-slate-400 text-sm italic py-8 font-medium">Processing history logs...</Text>
               )}
             </View>
          </View>

          {/* C. Clinical Assessment Score Tracker */}
          <View className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[2rem] p-6 shadow-sm overflow-hidden">
             <View className="flex-col md:flex-row justify-between items-start mb-4 gap-4">
               <View className="flex-row items-center gap-3">
                 <View className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl items-center justify-center border border-emerald-100 dark:border-emerald-800/50">
                   <Ionicons name="clipboard" size={24} color="#10b981" />
                 </View>
                 <View>
                   <Text className="text-xl font-black text-slate-800 dark:text-white tracking-tight">Assessment Scores</Text>
                   <Text className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">Tap any data point to view daily breakdown</Text>
                 </View>
               </View>

               <View className="flex-col w-full items-end gap-3">
                 <View className="flex-row items-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-1.5 shadow-inner border border-slate-200/60 dark:border-slate-700/50 w-full justify-between sm:justify-start">
                   <TouchableOpacity onPress={() => setAssessMode('all')} className={`flex-1 sm:flex-none items-center justify-center px-4 py-2 rounded-xl transition-all ${assessMode === 'all' ? 'bg-emerald-500 shadow-md' : ''}`}>
                      <Text className={`text-xs font-bold ${assessMode === 'all' ? 'text-white' : 'text-slate-500 dark:text-slate-300'}`}>All Time</Text>
                   </TouchableOpacity>
                   <TouchableOpacity onPress={toggleAssessmentMode} className={`flex-1 sm:flex-none items-center justify-center px-4 py-2 rounded-xl flex-row gap-2 transition-all ml-1 ${assessMode === 'date' ? 'bg-emerald-500 shadow-md' : ''}`}>
                      <Ionicons name="calendar-outline" size={14} color={assessMode === 'date' ? '#fff' : (isDark ? '#cbd5e1' : '#64748b')} />
                      <Text className={`text-xs font-bold ${assessMode === 'date' ? 'text-white' : 'text-slate-500 dark:text-slate-300'}`}>
                         {assessMode === 'date' && selectedAssessDate ? new Date(selectedAssessDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Pick Date'}
                      </Text>
                   </TouchableOpacity>
                 </View>
                 
                 {/* Mobile Optimized Horizontal Date Scroller */}
                 {assessMode === 'date' && (
                   <ScrollView horizontal showsHorizontalScrollIndicator={false} className="w-full mt-2">
                     <View className="flex-row gap-2 pl-1 pr-4">
                       {recentDates.map((d, i) => {
                         const dateStr = d.toDateString();
                         const isSelected = selectedAssessDate === dateStr;
                         return (
                           <TouchableOpacity 
                             key={i} 
                             onPress={() => setSelectedAssessDate(dateStr)}
                             className={`px-4 py-2.5 rounded-2xl border ${isSelected ? 'bg-emerald-50 border-emerald-500 dark:bg-emerald-900/30' : 'bg-white border-slate-100 dark:bg-slate-800 dark:border-slate-700'} items-center justify-center min-w-[65px]`}
                           >
                             <Text className={`text-[10px] font-black uppercase tracking-widest ${isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
                               {d.toLocaleDateString('en-US', { weekday: 'short' })}
                             </Text>
                             <Text className={`text-lg font-black mt-0.5 ${isSelected ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-700 dark:text-slate-300'}`}>
                               {d.getDate()}
                             </Text>
                           </TouchableOpacity>
                         )
                       })}
                     </View>
                   </ScrollView>
                 )}
               </View>
             </View>

             {/* FIXED: WEMWBS Filter Buttons */}
             <View className="flex-row flex-wrap gap-2.5 mb-6 z-10">
               {['who5', 'pss', 'wemwbs', 'isi'].map((type) => {
                 const flags: Record<string, string> = { who5: '#8b5cf6', pss: '#f43f5e', wemwbs: '#f59e0b', isi: '#10b981' };
                 const isChecked = assessVisible[type as keyof typeof assessVisible];
                 return (
                   <TouchableOpacity 
                      key={type}
                      onPress={() => setAssessVisible(prev => ({...prev, [type]: !prev[type as keyof typeof assessVisible]}))}
                      className={`flex-row items-center px-4 py-2 rounded-full border bg-white dark:bg-slate-800 shadow-sm flex-shrink-0 ${isChecked ? 'border-slate-300 dark:border-slate-500' : 'border-slate-100 dark:border-slate-700'}`}
                   >
                     <View style={{ backgroundColor: isChecked ? flags[type] : 'transparent', borderColor: isChecked ? flags[type] : '#cbd5e1' }} className="w-5 h-5 rounded-full border-2 mr-2 items-center justify-center flex-shrink-0">
                       {isChecked && <Ionicons name="checkmark" size={12} color="#fff" />}
                     </View>
                     <Text numberOfLines={1} className={`text-xs font-black uppercase tracking-wide flex-shrink-0 ${isChecked ? 'text-slate-800 dark:text-white' : 'text-slate-400 dark:text-slate-500'}`}>
                       {type === 'who5' ? 'WHO-5' : type}
                     </Text>
                   </TouchableOpacity>
                 )
               })}
             </View>

             <View className="w-full items-center justify-center min-h-[260px]">
               {getAssessmentChartUrl() ? (
                 <Image source={{ uri: getAssessmentChartUrl()! }} className="w-full h-[260px]" style={{ resizeMode: 'contain' }} />
               ) : (
                 <Text className="text-slate-400 text-sm italic py-8 font-medium">Processing metrics axes...</Text>
               )}
             </View>
          </View>
        </View>

        {/* --- 8. Curated Content Slider Component --- */}
        <View className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-6 rounded-[2rem] shadow-sm mb-6">
          <View className="flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
             <View className="flex-row items-center gap-4">
               <View className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-900/30 items-center justify-center border border-purple-100 dark:border-purple-800/50 shadow-inner">
                  <Ionicons name="book" size={24} color="#9333ea" />
               </View>
               <View>
                 <Text className="text-xl font-black text-slate-800 dark:text-white tracking-tight">Curated Readings</Text>
                 <Text className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5">Insights tailored for your journey</Text>
               </View>
             </View>
             
             {articles.length > 1 && (
                <View className="flex-row bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700/50 rounded-2xl p-1.5 shadow-sm items-center w-full sm:w-auto justify-between sm:justify-start">
                  <TouchableOpacity onPress={() => setArticleIndex((prev) => (prev - 1 + articles.length) % articles.length)} className="p-2.5 bg-white dark:bg-slate-800 rounded-xl shadow-sm">
                    <Ionicons name="chevron-back" size={16} color={isDark ? '#94a3b8' : '#64748b'} />
                  </TouchableOpacity>
                  
                  <TouchableOpacity onPress={() => setIsAutoFeed(!isAutoFeed)} className="px-4 border-l border-r border-slate-200 dark:border-slate-700/50 flex-row items-center gap-2">
                    <View className="relative w-2.5 h-2.5">
                      {isAutoFeed && <Animated.View style={{ transform: [{ scale: pingScale }], opacity: pingOpacity }} className="absolute inset-0 rounded-full bg-purple-400" />}
                      <View className={`w-2.5 h-2.5 rounded-full ${isAutoFeed ? 'bg-purple-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                    </View>
                    <Text className={`text-xs font-bold tracking-widest uppercase ${isAutoFeed ? 'text-purple-600 dark:text-purple-400' : 'text-slate-400'}`}>Auto-Feed</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity onPress={() => setArticleIndex((prev) => (prev + 1) % articles.length)} className="p-2.5 bg-white dark:bg-slate-800 rounded-xl shadow-sm">
                    <Ionicons name="chevron-forward" size={16} color={isDark ? '#94a3b8' : '#64748b'} />
                  </TouchableOpacity>
                </View>
             )}
          </View>
          
          {currentArticle ? (
            <TouchableOpacity onPress={() => router.push(`/articles/${currentArticle.id}`)} className="bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 rounded-[1.5rem] p-6 shadow-sm overflow-hidden relative">
              <View className="absolute inset-0 bg-gradient-to-br from-purple-50/50 to-transparent dark:from-purple-900/10 dark:to-transparent pointer-events-none" />
              <View className="relative z-10">
                <View className="flex-row justify-between items-center mb-5">
                  <View className={`px-3 py-1.5 rounded-lg border shadow-sm ${getMoodTaxonomyColor(currentArticle.mood).bg} ${getMoodTaxonomyColor(currentArticle.mood).border}`}>
                    <Text className={`text-xs font-black uppercase tracking-wider ${getMoodTaxonomyColor(currentArticle.mood).text}`}>
                      {currentArticle.mood}
                    </Text>
                  </View>
                  <View className="flex-row items-center bg-slate-50 dark:bg-slate-900/50 px-2.5 py-1 rounded-md border border-slate-100 dark:border-slate-700/50">
                    <Ionicons name="time-outline" size={14} color="#94a3b8" />
                    <Text className="text-xs font-bold text-slate-400 ml-1.5">{currentArticle.read_time}</Text>
                  </View>
                </View>
                <Text className="text-xl font-black text-slate-800 dark:text-white mb-3 leading-tight tracking-tight">{currentArticle.title}</Text>
                <Text className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed mb-6" numberOfLines={2}>{currentArticle.short}</Text>
                <View className="flex-row justify-between items-center pt-5 border-t border-slate-100 dark:border-slate-700">
                   <Text className="text-xs font-bold uppercase tracking-widest text-slate-400">Read Article</Text>
                   <View className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 flex items-center justify-center shadow-sm">
                     <Ionicons name="arrow-forward" size={16} color={isDark ? '#818cf8' : '#4f46e5'} />
                   </View>
                </View>
              </View>
            </TouchableOpacity>
          ) : (
             <View className="p-6 items-center justify-center bg-white dark:bg-slate-800 rounded-[1.5rem] border border-slate-100 dark:border-slate-700">
               <Text className="text-slate-400 text-sm font-medium">No readings matched today.</Text>
             </View>
          )}
        </View>
      </ScrollView>

      {/* --- Floating Action Component Widget (Smera Mini) --- */}
      <View className="absolute bottom-6 right-6 z-50 flex-col items-end">
         <View className="mb-4 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-5 py-3 rounded-3xl rounded-br-none shadow-2xl border border-indigo-100 dark:border-slate-700 max-w-[200px]">
           <Text className="text-slate-700 dark:text-slate-200 text-sm font-medium leading-relaxed">{smeraQuote}</Text>
         </View>

         <TouchableOpacity onPress={() => router.push('/core/chatbot')} className="relative p-1 bg-white dark:bg-slate-800 rounded-full shadow-2xl">
            <Animated.View style={{ transform: [{ scale: pingScale }], opacity: pingOpacity }} className="absolute inset-0 rounded-full bg-indigo-400" />
            <Animated.View style={{ transform: [{ translateY: smeraMiniFloatAnim }] }} className="relative bg-indigo-50 dark:bg-slate-900 rounded-full p-2 border-2 border-indigo-100 dark:border-slate-700 overflow-hidden">
              <Svg width="55" height="55" viewBox="0 0 100 100">
                <Circle cx="50" cy="50" r="45" fill="#EEF2FF" stroke="#C7D2FE" strokeWidth="2"/>
                <Circle cx="35" cy="45" r="4.5" fill="#4F46E5" />
                <Circle cx="65" cy="45" r="4.5" fill="#4F46E5" />
                <Path d="M40 65C40 65 45 70 50 70C55 70 60 65 60 65" stroke="#4F46E5" strokeWidth="3.5" strokeLinecap="round"/>
                <Circle cx="30" cy="55" r="5" fill="#FED7AA" />
                <Circle cx="70" cy="55" r="5" fill="#FED7AA" />
              </Svg>
            </Animated.View>
            <View className="absolute top-1 right-1 flex h-4 w-4">
              <Animated.View style={{ transform: [{ scale: pingScale }], opacity: pingOpacity }} className="absolute inset-0 rounded-full bg-indigo-400" />
              <View className="relative inline-flex rounded-full h-4 w-4 bg-indigo-600 border-2 border-white dark:border-slate-800" />
            </View>
         </TouchableOpacity>
      </View>

      {/* --- Sidebar Drawer Layer --- */}
      {isSidebarOpen && (
        <TouchableWithoutFeedback onPress={toggleSidebar}>
          <View style={{ position: 'absolute', top: 0, left: 0, width, height, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100 }} />
        </TouchableWithoutFeedback>
      )}
      
      <View style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: width * 0.8, zIndex: 101 }} pointerEvents={isSidebarOpen ? "auto" : "none"}>
        <Sidebar slideAnim={slideAnim} toggleSidebar={toggleSidebar} logout={logout} />
      </View>
    </View>
  );
}