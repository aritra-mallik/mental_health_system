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
import * as Speech from 'expo-speech'; // <-- IMPORT EXPO SPEECH
import { useAuth } from '@/context/AuthContext';
import apiClient from '@/api/apiClient';
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
  const [isAutoFeed, setIsAutoFeed] = useState(true);const alertPulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(alertPulseAnim, {
          toValue: 0.5, // Fades to 50% opacity
          duration: 1000, // Takes 1 second to fade out
          useNativeDriver: true,
        }),
        Animated.timing(alertPulseAnim, {
          toValue: 1, // Fades back to 100%
          duration: 1000, // Takes 1 second to fade in
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [alertPulseAnim]);

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
    else if (hour < 22) setGreetingText("Good Evening");
    else setGreetingText("Late Night");
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
  const themeGrid = isDark ? '#3F444B' : '#C0C0C0';
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
          pointBackgroundColor: isDark ? '#0c0a09e6' : '#fffbebe6',
          pointBorderColor: pointBorders,
          pointBorderWidth: 4,
          pointRadius: 10
        }]
      },
      options: {
        layout: { 
          // Added general padding so the chart doesn't hug the very edges of the image container
          padding: { top: 10, bottom: 10, left: 10, right: 20 } 
        },
        plugins: { 
          legend: { display: false },
          title: {
            display: true,
            text: [
              '🤩 GREAT   •   🙂 GOOD   •   😐 NEUTRAL', 
              '😰 STRESSED   •   😔 LOW   •   😫 OVERWHELMED'
            ],
            color: themeText,
            // Added lineHeight to give the two rows of text some vertical breathing room
            font: { size: 23, weight: 'bold', lineHeight: 1.5 },
            // Doubled the bottom padding to push the chart grid further down away from the text
            padding: { top: 10, bottom: 40 }
          }
        },
        scales: {
          y: { 
            min: 0, 
            max: 5, 
            ticks: { 
              padding: 12, 
              callback: `(val) => { return ['😫', '😔', '😰', '😐', '🙂', '🤩'][val]; }`, 
              color: themeText, 
              font: { size: 16, weight: 'bold' } 
            }, 
            grid: { color: themeGrid, drawBorder: false }, 
            border: { display: false } 
          },
          x: { ticks: { padding: 8, color: themeText, font: { size: 13, weight: 'bold' } }, grid: { display: false }, border: { display: false } }
        }
      }
    };
    // Increased the QuickChart height parameter (h=400) to give the 6 rows of emojis proper space
    return `https://quickchart.io/chart?v=3&w=600&h=530&devicePixelRatio=2&bkg=transparent&c=${encodeURIComponent(JSON.stringify(config).replace(/"(\(val\).*?)"/g, '$1'))}`;
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
        layout: { 
          // Added global padding to prevent graph cropping on the canvas edges
          padding: { top: 10, bottom: 10, left: 10, right: 20 } 
        },
        plugins: { 
          legend: { display: false },
          // Added the two-row text map legend at the top
          title: {
            display: true,
            text: [
              '🤩 GREAT   •   🙂 GOOD   •   😐 NEUTRAL', 
              '😰 STRESSED   •   😔 LOW   •   😫 OVERWHELMED'
            ],
            color: themeText,
            font: { size: 23, weight: 'bold', lineHeight: 1.5 },
            padding: { top: 10, bottom: 40 }
          }
        },
        scales: {
          y: { 
            min: 0, 
            max: 5, 
            ticks: { 
              padding: 12, 
              // Replaced text labels with emojis
              callback: `(val) => { return ['😫', '😔', '😰', '😐', '🙂', '🤩'][val]; }`, 
              color: themeText, 
              font: { size: 16, weight: 'bold' }, // Bumped up for readability
              stepSize: 1 
            }, 
            grid: { color: themeGrid } 
          },
          x: { ticks: { display: false }, grid: { display: false } }
        }
      }
    };
    // Increased chart height parameter from h=300 to h=400 to make room for the new elements
    return `https://quickchart.io/chart?v=3&w=640&h=600&devicePixelRatio=2&bkg=transparent&c=${encodeURIComponent(JSON.stringify(config).replace(/"(\(val\).*?)"/g, '$1'))}`;
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
    return `https://quickchart.io/chart?v=3&w=600&h=600&devicePixelRatio=2&bkg=transparent&c=${encodeURIComponent(JSON.stringify(config))}`;
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
    <View className="flex-1 bg-transparent">
      <ScrollView 
        contentContainerClassName="p-5 pb-36 pt-16"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchDashboardData(); }} tintColor={isDark ? '#818cf8' : '#4f46e5'} />}
      >
        {/* --- Top Navbar --- */}
        <View className="flex-row justify-between items-center mb-6">
          <TouchableOpacity onPress={toggleSidebar} className="w-12 h-12 bg-amber-50/90 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-700/50 rounded-full items-center justify-center shadow-sm z-10">
            <Ionicons name="menu" size={24} color={isDark ? '#f8fafc' : '#0f172a'} />
          </TouchableOpacity>
        </View>

        {appointment && (
          <Animated.View 
            style={{ opacity: alertPulseAnim }} 
            className="mb-8 shadow-lg shadow-orange-500/30">
            <LinearGradient 
              colors={['#f59e0b', '#ea580c']} 
              style={{ borderRadius: 9999 }} // <--- This forces the rounding
              className="p-2 pr-5 flex-row items-center border border-orange-300/40">
              {/* Calendar Icon */}
              <View className="w-11 h-11 bg-white/20 rounded-full items-center justify-center mr-3 border border-white/20">
                  <Text className="text-xl">🗓️</Text>
              </View>
              
              {/* Content Section */}
              <View className="flex-1 justify-center">
                  
                  {/* Header with Blinker */}
                  <View className="flex-row items-center mb-0.5">
                    {/* The Blinker Dot */}
                    <View className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse mr-2 border border-white/50" />
                    <Text className="text-white font-black text-xs tracking-wider uppercase">
                      Upcoming Session
                    </Text>
                  </View>
                  
                  {/* Condensed Details */}
                  <Text className="text-orange-50 text-xs leading-snug pr-2" numberOfLines={2}>
                    You have an <Text className="font-extrabold uppercase">{appointment.mode}</Text> consultation today with {appointment.counselor} at <Text className="font-extrabold text-white">{appointment.time}</Text>
                  </Text>
                  
              </View>
            </LinearGradient>
          </Animated.View>
        )}

        {/* --- 1. Smera Hero Segment --- */}
        <View className="h-auto rounded-[3.5rem] pt-8 pb-4 px-4 mb-2 items-center justify-start overflow-hidden">
            
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
           <Text className="text-base font-medium text-slate-700 dark:text-slate-300 text-center mb-0 px-4 -mt-0">
             I'm Smera. Whenever things feel heavy, or if you just need a friendly chat, I'm right here for you.
           </Text>
        </View>

        {/* --- Dual Action Row: Assessment Board & Cloud Chat --- */}
        <View className="w-full flex-row gap-4 mb-8">

          {/* LEFT: Mindful Check-in (The Realistic Clipboard) */}
          <TouchableOpacity 
            onPress={() => router.push('/core/assessment')} 
            activeOpacity={0.9} 
            className="flex-1 h-[150px] relative">
            
            {/* border-b-4 and border-r-2 create the 3D thickness of the physical board */}
            <View className="absolute inset-0 bg-[#D4A373] dark:bg-[#6b3805] rounded-xl shadow-md border-b-4 border-r-2 border-[#A67C52] dark:border-[#874f17]" />

            {/* Positioned slightly inward to show the board around the edges */}
            <View 
              className="absolute top-5 left-3 right-3 bottom-2 bg-[#fcfbf9] dark:bg-slate-800 rounded-sm overflow-hidden z-10" 
              style={{ elevation: 3, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 3, shadowOffset: {width: 0, height: 2} }}>
              
              {/* Classic Legal Pad Lines */}
              <View className="absolute left-4 top-0 bottom-0 w-[1px] bg-red-300/80 dark:bg-red-900/50" />
              <View className="absolute top-[25px] w-full h-[1px] bg-blue-200/60 dark:bg-slate-500/60" />
              <View className="absolute top-[50px] w-full h-[1px] bg-blue-200/60 dark:bg-slate-500/60" />
              <View className="absolute top-[75px] w-full h-[1px] bg-blue-200/60 dark:bg-slate-500/60" />
              <View className="absolute top-[100px] w-full h-[1px] bg-blue-200/60 dark:bg-slate-500/60" />

              {/* Paper Content */}
              <View className="flex-1 pt-5 px-1 pb-5 items-center justify-center relative z-20">
                <View className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/50 items-center justify-center border border-indigo-100 dark:border-indigo-800/50 shadow-sm mb-1.5">
                  <Ionicons name="shield-checkmark" size={14} color={isDark ? '#818cf8' : '#4f46e5'} />
                </View>
                
                <Text className="text-slate-800 dark:text-white font-black text-[17px] text-center tracking-tight mb-0.3">
                  Mindful Check-in
                </Text>
                <Text className="text-[12px] font-bold text-slate-500 dark:text-slate-400 text-center leading-tight px-1">
                  Map your feelings
                </Text>
              </View>

            </View>

            {/* LAYER 3: The Metallic Clip Mechanism */}
            
            {/* Part A: Clip Base (Attached to the board) */}
            <View className="absolute top-1 left-1/2 -ml-7 w-14 h-4 bg-slate-400 dark:bg-slate-700 rounded-sm border border-slate-500 dark:border-slate-600 shadow-sm z-10 flex-row justify-between items-center px-1.5">
              {/* Two metallic rivets bolting it to the board */}
              <View className="w-1.5 h-1.5 rounded-full bg-slate-600 dark:bg-slate-900 shadow-inner" />
              <View className="w-1.5 h-1.5 rounded-full bg-slate-600 dark:bg-slate-900 shadow-inner" />
            </View>
            
            {/* Part B: Clip Lever (Pressing down on the paper) */}
            <View className="absolute top-4 left-1/2 -ml-5 w-10 h-4 bg-slate-300 dark:bg-slate-600 rounded-b-md shadow-md border-x border-b border-slate-400 dark:border-slate-500 z-20 items-center">
              {/* Metallic shine/reflection highlight on the curve */}
              <View className="w-6 h-0.5 bg-white/60 dark:bg-white/10 mt-0.5 rounded-full" />
            </View>

          </TouchableOpacity>


          {/* RIGHT: Chat with Smera (The Oval Cloud Bot) */}
          <TouchableOpacity 
            onPress={() => router.push('/core/chatbot')} 
            activeOpacity={0.9} 
            className="flex-1 h-[150px] relative">
            {/* Main Oval Cloud Body */}
            <View className="absolute inset-0 rounded-[45px] rounded-bl-[12px] overflow-hidden shadow-md bg-white dark:bg-indigo-950 border border-sky-100 dark:border-indigo-800">
              
              <LinearGradient 
                colors={isDark ? ['#1e1b4b', '#312e81', '#1e1b4b'] : ['#ffffff', '#f0f9ff', '#e0f2fe']} 
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                className="w-full h-full absolute inset-0"/>

              {/* Cloud Fluff (Volumetric overlapping circles) */}
              <View className="absolute -top-8 -right-4 w-28 h-28 bg-sky-100/60 dark:bg-indigo-500/20 rounded-full" />
              <View className="absolute top-8 -left-12 w-32 h-32 bg-sky-200/40 dark:bg-purple-500/20 rounded-full" />
              <View className="absolute -bottom-8 right-6 w-24 h-24 bg-white/80 dark:bg-indigo-400/20 rounded-full" />
              <View className="absolute top-1/2 left-1/2 -ml-12 -mt-12 w-24 h-24 bg-sky-300/20 dark:bg-indigo-300/10 rounded-full blur-xl" />

              {/*  Cloud Content */}
              <View className="flex-1 items-center justify-center px-2 py-3 relative z-10">
                
                {/* Smera's AI Face Avatar */}
                <View className="relative w-11 h-11 items-center justify-center mb-2 drop-shadow-sm">
                  
                  <Svg width="44" height="44" viewBox="0 0 100 100" fill="none">
                    <Circle cx="50" cy="50" r="45" fill="#EEF2FF" stroke="#C7D2FE" strokeWidth="2" />
                    <Circle cx="35" cy="45" r="4" fill="#4F46E5" />
                    <Circle cx="65" cy="45" r="4" fill="#4F46E5" />
                    <Path d="M40 65C40 65 45 70 50 70C55 70 60 65 60 65" stroke="#4F46E5" strokeWidth="3.5" strokeLinecap="round" />
                    <Circle cx="30" cy="55" r="5" fill="#FED7AA" opacity="0.8" />
                    <Circle cx="70" cy="55" r="5" fill="#FED7AA" opacity="0.8" />
                  </Svg>

                  {/* Tiny green "online" indicator light */}
                  <View className="absolute top-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-[2px] border-white dark:border-[#312E81] shadow-sm z-20" />
                </View>

                <Text className="text-slate-700 dark:text-indigo-50 font-black text-[13px] text-center tracking-tight mb-2">
                  Chat with Smera
                </Text>

                {/* Ethereal Action Pill */}
                <View className="flex-row items-center bg-sky-500 dark:bg-indigo-500 px-3.5 py-1.5 rounded-full shadow-sm">
                  <Text className="text-white text-[9px] font-black uppercase tracking-widest mr-1.5">Connect</Text>
                  <Ionicons name="chatbubble-ellipses" size={10} color="#fff" />
                </View>

              </View>
            </View>
            
            {/* External Cloud Puff Tail */}
            <View className="absolute -bottom-1 -left-1 w-6 h-6 bg-[#e0f2fe] dark:bg-[#1e1b4b] rounded-full border border-sky-100 dark:border-indigo-800 -z-10 shadow-sm" />

          </TouchableOpacity>

        </View>

        {/* --- 2. Live Alert & Up Next Dashboard Block (Giant Bell UI) --- */}
        <View className="items-center w-full mb-12 px-4">

          {/* 1. Bell Top Loop / Hanger (U-shape handle) - slightly enlarged to match the steeper dome */}
          <View className="w-12 h-12 border-[6px] border-[#b45309] dark:border-[#78350f] rounded-t-full -mb-6 z-0" />

          {/* 2. Bell Body - Dramatically curved top and rounded bottom corners */}
          <LinearGradient 
            colors={isDark ? ['#5c2404', '#270f01'] : ['#fde047', '#d97706']}
            className="w-full p-6 pt-10 shadow-2xl border-2 border-white/40 dark:border-amber-600/30 z-10 overflow-hidden"
            style={{
              borderTopLeftRadius: 120,   // Dramatically increased to create a steep, proper bell dome
              borderTopRightRadius: 120,
              borderBottomLeftRadius: 32, // Smooth rounded bottom corners for the body
              borderBottomRightRadius: 32
            }}
          >
            {/* Header Section */}
            <View className="mb-6 items-center">
              <Text className="font-black text-2xl text-amber-950 dark:text-amber-50 tracking-tight">Smera's Live Alert</Text>
              <Text className="text-sm text-amber-800 dark:text-amber-200/80 font-medium mt-1">Real-time wellbeing status</Text>
            </View>
            
            {/* Alert Data */}
            <View className={`rounded-2xl p-4 border flex-row items-center gap-3 mb-6 bg-white/20 dark:bg-black/20 border-white/40 dark:border-white/10`}>
              <View className={`w-3 h-3 rounded-full ${activeAlertTheme.dot || 'bg-amber-500'}`} />
              <Text className={`flex-1 text-sm font-bold leading-relaxed text-amber-950 dark:text-amber-50`}>
                {alertData.msg}
              </Text>
            </View>

            {/* Up Next Section */}
            <View className="border-t border-amber-700/20 dark:border-amber-500/20 pt-5 items-center">
              <Text className="text-[10px] font-black text-amber-900 dark:text-amber-400 uppercase tracking-widest mb-3">
                Up Next For You:
              </Text>
              
              {recommendation.recommended.length > 0 ? (
                <View className="items-center w-full">
                  <Text className="text-sm font-bold text-amber-900 dark:text-amber-300 mb-3 text-center">
                    A gentle check-in might help today
                  </Text>
                  <View className="flex-row flex-wrap justify-center gap-2">
                    {recommendation.recommended.map((rec, i) => (
                      <TouchableOpacity 
                        key={i} 
                        onPress={() => router.push('/core/assessment')} 
                        className="px-4 py-2 bg-white/30 dark:bg-black/30 border border-white/50 dark:border-amber-500/30 rounded-xl shadow-sm"
                      >
                        <Text className="text-amber-950 dark:text-amber-100 text-md font-black tracking-wide">
                          ⏳ {rec.toUpperCase()} due
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ) : (
                <View className="px-4 py-2 bg-white/30 dark:bg-black/30 border border-white/50 dark:border-amber-500/30 rounded-xl">
                  <Text className="text-amber-950 dark:text-amber-100 text-sm font-bold text-center">
                    You're doing well — no check-ins needed now
                  </Text>
                </View>
              )}
            </View>
          </LinearGradient>

          {/* 3. Bell Lip (Flared bottom edge with perfectly matching rounded corners) */}
          <LinearGradient 
            colors={isDark ? ['#4a1c02', '#270f01'] : ['#eab308', '#b45309']}
            className="w-[106%] h-10 -mt-6 z-20 border-2 border-white/30 dark:border-black/50 shadow-lg" 
            style={{
              borderRadius: 24 
            }}/>

          {/* 4. Bell Clapper (The TTS Trigger - fully exposed below the lip) */}
          <TouchableOpacity 
            onPress={triggerVoiceSynthesis} 
            activeOpacity={0.8}
            className="w-16 h-16 bg-[#78350f] dark:bg-[#1a0901] rounded-full -mt-3 z-0 items-center justify-center shadow-2xl border-2 border-amber-600/50 dark:border-black"
          >
            <Ionicons 
              name={isVoiceEnabled ? "volume-high" : "volume-medium"} 
              size={26} 
              color={isVoiceEnabled ? '#fde047' : '#d97706'} 
            />
          </TouchableOpacity>

        </View>

        {/* --- 4. Overview Cards --- */}
        <View className="flex-col gap-6 mb-8">
          {/* --- Cloud-Themed Current Mood Card --- */}
          <View className="w-full mb-8 pt-10 px-2 relative">

            
            {/* Left Puff */}
            <View className="absolute top-4 left-6 w-28 h-28 bg-amber-50/90 dark:bg-slate-950 rounded-full" />
            {/* Center-Right Large Puff */}
            <View className="absolute -top-2 right-10 w-36 h-36 bg-amber-50/90 dark:bg-slate-950 rounded-full" />
            {/* Small Connector Puff */}
            <View className="absolute top-2 right-1/2 w-20 h-20 bg-amber-50/90 dark:bg-slate-950 rounded-full translate-x-10" />

            {/* Uses extreme rounded corners to form the pill-like bottom of the cloud */}
            <View className="w-full bg-amber-50/90 dark:bg-slate-950 rounded-[3.5rem] p-8 relative overflow-hidden z-10">
              
              {/* Soft atmospheric internal gradients (Airy sky tones instead of fuchsia) */}
              <View className="absolute -right-10 -top-10 w-48 h-48 bg-sky-50 dark:bg-sky-900/20 rounded-full opacity-60" />
              <View className="absolute -bottom-10 -left-10 w-40 h-40 bg-indigo-50 dark:bg-indigo-900/20 rounded-full opacity-60" />

              {/* Header Section */}
              <View className="relative z-20 flex-row items-center gap-5 mb-8">
                {/* Soft Floating Icon Bubble */}
                <View className="w-16 h-16 bg-sky-100/50 dark:bg-sky-900/40 rounded-full items-center justify-center">
                  <Ionicons name="happy-outline" size={32} color={isDark ? "#60a5fa" : "#3b82f6"} />
                </View>

                <View className="flex-1">
                  <Text className="text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight capitalize">
                    {currentMood}
                  </Text>
                  <Text className="text-[10px] font-bold text-sky-500 dark:text-sky-400 uppercase tracking-widest mt-1">
                    Current Mood
                  </Text>
                </View>
              </View>

              {/* Data Section */}
              <View className="relative z-20 flex-row pt-5 justify-between border-t border-slate-100 dark:border-slate-700/50">
                <View className="items-start flex-1">
                  <Text className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">
                    Latest Test
                  </Text>
                  <Text className="text-lg font-black text-slate-800 dark:text-slate-200 uppercase">
                    {latestTestName}
                  </Text>
                </View>

                <View className="items-end flex-1">
                  <Text className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">
                    Last Check-In
                  </Text>
                  <Text className="text-lg font-black text-slate-800 dark:text-slate-200">
                    {lastCheckInDate}
                  </Text>
                </View>
              </View>

            </View>
          </View>

          {/* --- Fundamental Guidance Room (Architectural UI) --- */}
          <TouchableOpacity 
            onPress={() => router.push('/core/recovery_hub')} activeOpacity={0.9} 
            className="w-full rounded-[2.5rem] overflow-hidden shadow-lg mb-8 h-[250px]">
            <View className="w-full h-full relative bg-[#064e3b] dark:bg-[#022c22]">
              
              {/* --- ARCHITECTURE --- */}
              
              {/* 1. The Floor (Warm Wood/Taupe) */}
              <View className="absolute bottom-0 w-full h-[35%] bg-[#8b5a2b] dark:bg-[#3f2a14]">
                {/* Floor Depth Gradient */}
                <LinearGradient 
                  colors={['rgba(0,0,0,0.6)', 'rgba(0,0,0,0)']} 
                  className="w-full h-5 absolute top-0"
                />
                {/* A soft oval "rug" on the floor for depth */}
                <View 
                  className="absolute bottom-6 left-10 w-40 h-12 bg-[#022c22]/30 border border-[#0f5132]/20 rounded-full"
                  style={{ transform: [{ scaleY: 0.6 }] }}
                />
              </View>

              {/* 2. The Baseboard (Separates Wall and Floor) */}
              <View className="absolute bottom-[35%] w-full h-2 bg-[#022c22] dark:bg-[#011a14] border-t border-[#0f5132]" />

              {/* 3. The Doorway / Arch (Navigation Action) */}
              <View className="absolute right-6 bottom-[35%] w-16 h-36 border-t-4 border-x-4 border-[#022c22] dark:border-[#011a14] bg-[#022c22] rounded-t-full justify-end items-center overflow-hidden z-10">
                <LinearGradient 
                  colors={['#10b981', '#064e3b']} 
                  start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
                  className="absolute inset-0 top-1 opacity-80 rounded-t-full"
                />
                <View className="mb-6 w-8 h-8 rounded-full bg-white/20 items-center justify-center backdrop-blur-md shadow-sm border border-white/30">
                  <Ionicons name="enter-outline" size={16} color="#fff" style={{ transform: [{ translateX: 1 }] }} />
                </View>
              </View>

              {/* 4. Ceiling & Lighting */}
              <View className="absolute top-0 right-[25%] items-center z-10 pointer-events-none">
                <View className="w-0.5 h-8 bg-[#022c22]" />
                <View className="w-10 h-4 bg-amber-600 rounded-t-full border border-amber-800" /> 
                <View className="w-4 h-1.5 bg-yellow-100 rounded-b-full shadow-[0_0_10px_rgba(253,224,71,0.8)]" /> 
                <LinearGradient 
                  colors={['rgba(253,224,71,0.15)', 'transparent']} 
                  className="w-32 h-40 absolute top-12 rounded-full blur-2xl"
                />
              </View>


              {/* --- CONTENT --- */}

              {/* Header & Icon (Wall Mounted) */}
              <View className="absolute top-6 left-6 right-32 z-20 pointer-events-none">
                <View className="flex-row items-center mb-3">
                  <View className="w-10 h-10 bg-[#022c22]/80 rounded-xl items-center justify-center border border-[#10b981]/30 shadow-sm">
                    <Ionicons name="flash" size={20} color="#34d399" />
                  </View>
                  <View className="ml-3 px-2 py-1 bg-white/5 rounded-md border border-white/10">
                    <Text className="text-[#6ee7b7] text-[9px] font-black uppercase tracking-widest">Sanctuary</Text>
                  </View>
                </View>
                <Text 
                  className="text-[22px] font-black text-white leading-tight"
                  style={{ textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 }}
                >
                  Fundamental{'\n'}Guidance Room
                </Text>
              </View>

              {/* WIDE DESCRIPTION BOX (Floating Foreground HUD) */}
              {/* Spreads left-5 to right-5, overlapping the floor like a sleek modern dashboard */}
              <View className="absolute bottom-5 left-5 right-5 z-40 px-4 py-3.5 bg-white/10 dark:bg-black/40 border border-white/20 dark:border-white/10 rounded-2xl backdrop-blur-xl shadow-lg flex-row items-center">
                {/* Small green accent line to add premium UI polish */}
                <View className="w-1.5 h-full min-h-[30px] bg-[#34d399] rounded-full mr-3 opacity-80" />
                <Text className="text-emerald-50 text-xs font-medium leading-relaxed flex-1">
                  Access grounded routines, sleep protocols, and immediate panic relief tools.
                </Text>
              </View>

            </View>
          </TouchableOpacity>
        </View>

        {/* --- 5. Private Diary Box Banner --- */}
        <TouchableOpacity 
          onPress={() => router.push('/core/journal')} 
          activeOpacity={0.9}
          className="mb-8 relative w-full h-[220px]"
        >
          {/* LAYER 1: "Paper" Pages Peeking Out */}
          {/* These sit slightly to the right of the cover to look like the edge of the book's pages */}
          <View className="absolute top-2 bottom-2 right-0 left-8 bg-[#fdfbf7] dark:bg-slate-300 rounded-r-3xl shadow-sm border border-amber-900/10 dark:border-white/10" />
          <View className="absolute top-3 bottom-3 right-[-4px] left-8 bg-[#f4ebd8] dark:bg-slate-400 rounded-r-3xl shadow-sm" />

          {/* LAYER 2: Main Leather Cover */}
          <LinearGradient 
            // Rich saddle brown leather for light mode, deep midnight blue/purple leather for dark mode
            colors={isDark ? ['#1e1b4b', '#2e1065', '#172554'] : ['#8B4513', '#A0522D', '#6b3e1b']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            className="absolute top-0 bottom-0 left-0 right-3 p-6 py-8 rounded-l-md rounded-r-[2rem] shadow-2xl overflow-hidden"
          >
            {/* SPINE SHADOW: Dark gradient on the left edge to simulate the book's spine */}
            <LinearGradient
              colors={['rgba(0,0,0,0.6)', 'rgba(0,0,0,0.1)', 'transparent']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              className="absolute left-0 top-0 bottom-0 w-10 z-10"
            />

            {/* STITCHING: Dashed border set inward from the edge */}
            <View 
              pointerEvents="none" 
              className="absolute inset-2 border-[1.5px] border-dashed border-white/30 dark:border-white/20 rounded-l-sm rounded-r-[1.5rem] z-20" 
            />

            {/* EMBOSSED WATERMARK: The lock icon pushed back into the leather */}
            <View className="absolute -right-4 -bottom-4 opacity-10 dark:opacity-20 z-0">
              <Ionicons name="lock-closed" size={160} color="#000000" />
            </View>

            {/* BOOKMARK RIBBON: Hanging over the pages */}
            <View className="absolute right-6 top-[-2] z-30 shadow-lg drop-shadow-xl">
              <Svg width="32" height="70" viewBox="0 0 28 60">
                <Defs>
                  <SvgLinearGradient id="ribbonGrad" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor={isDark ? "#b91c1c" : "#991b1b"} /> 
                    <Stop offset="1" stopColor={isDark ? "#7f1d1d" : "#450a0a"} />
                  </SvgLinearGradient>
                </Defs>
                <Polygon points="0,0 28,0 28,60 14,48 0,60" fill="url(#ribbonGrad)" />
              </Svg>
            </View>

            {/* MAIN CONTENT AREA */}
            <View className="relative z-30 pr-12 pl-4">
              {/* Badges/Stickers */}
              <View className="flex-row flex-wrap items-center gap-3 mb-3">
                <View className="px-3 py-1 bg-black/20 dark:bg-black/30 rounded-full border border-white/20 flex-row items-center backdrop-blur-md">
                  <View className="relative w-2 h-2 mr-2">
                    <Animated.View style={{ transform: [{ scale: pingScale }], opacity: pingOpacity }} className="absolute inset-0 rounded-full bg-green-400" />
                    <View className="relative w-2 h-2 rounded-full bg-green-500" />
                  </View>
                  <Text className="text-amber-50 dark:text-indigo-100 text-[9px] font-bold uppercase tracking-widest">Secured</Text>
                </View>
                
                <View className="px-3 py-1 bg-white/10 rounded-full border border-white/20 flex-row items-center">
                  <Ionicons name="journal" size={10} color="#fef3c7" style={{ marginRight: 4 }} />
                  <Text className="text-amber-50 dark:text-indigo-100 text-[9px] font-bold uppercase tracking-widest">{journalCount} Entries</Text>
                </View>
              </View>

              {/* Title & Subtitle */}
              <Text 
                className="text-3xl font-black text-[#fef3c7] dark:text-indigo-50 mb-1 tracking-wider" 
                style={{ fontFamily: 'Georgia', textShadowColor: 'rgba(0, 0, 0, 0.5)', textShadowOffset: {width: 0, height: 2}, textShadowRadius: 2 }}
              >
                Private Diary
              </Text>
              
              <Text className="text-[#e2e8f0] dark:text-indigo-200/80 text-md font-medium leading-relaxed w-[70%] italic" style={{ fontFamily: 'Georgia' }}>
                A secure sanctuary for your mind. Document your journey freely—no one else has the key.
              </Text>
            </View>

            {/* METAL CLASP / ADD BUTTON: Redesigned to look like a metallic or leather journal clasp */}
            <View className="absolute right-0 top-1/2 -mt-2 w-10 h-12 bg-amber-600/90 dark:bg-slate-700/90 border border-amber-400/50 dark:border-slate-400/50 rounded-l-2xl items-center justify-center z-40 shadow-xl">
              <Ionicons name="key-outline" size={20} color="#fef3c7" />
            </View>

          </LinearGradient>
        </TouchableOpacity>

        {/* --- 6. Clinical Expert Care Section (Doctor's Bag) --- */}
        <TouchableOpacity 
          onPress={() => router.push('/consultation/consultation')} 
          activeOpacity={0.9}
          // Added mt-6 to make room for the bag handle peeking out the top
          className="mb-8 mt-6 relative w-full"
        >
          {/* LAYER 1: The Leather Handle */}
          <View className="absolute -top-5 left-1/2 -ml-12 w-24 h-12 border-[6px] border-[#3E1F15] dark:border-[#1A0D08] rounded-t-3xl z-0 shadow-sm" />

          {/* LAYER 2: The Outer Leather Bag Shell */}
          <LinearGradient 
            // Rich mahogany/vintage maroon for the bag exterior
            colors={isDark ? ['#2D1610', '#1A0D08'] : ['#5A2D1F', '#3E1F15']} 
            className="w-full rounded-[2rem] shadow-xl overflow-hidden pt-4 pb-6 px-3 relative z-10"
          >
            {/* Brass Hardware Frame (The open metal mouth of the bag) */}
            <View className="absolute top-0 w-full h-4 bg-amber-600/90 border-b border-amber-900 shadow-sm flex-row justify-between px-10 items-center">
              <View className="w-5 h-2 bg-amber-300 border border-amber-200 rounded-sm shadow-sm" /> 
              <View className="w-5 h-2 bg-amber-300 border border-amber-200 rounded-sm shadow-sm" /> 
            </View>

            {/* LAYER 3: The Open Interior (Lining & Contents) */}
            <View className="w-full bg-amber-100/20 dark:bg-stone-800/30 rounded-xl p-6 items-center shadow-inner relative border border-[#3E1F15]/20 dark:border-black/50 mt-1">
              
              {/* Background Watermark inside the bag */}
              <View className="absolute top-1/2 left-1/2 -mt-16 -ml-16 opacity-5 pointer-events-none transform -rotate-12">
                <Ionicons name="medkit" size={120} color="#e11d48" />
              </View>
              
              {/* Availability Badge */}
              <View className="absolute top-4 right-4 flex-row items-center gap-1.5 bg-emerald-50 dark:bg-slate-700 border border-emerald-100 dark:border-emerald-800 px-2.5 py-1 rounded-full shadow-sm z-10">
                <View className="relative w-1.5 h-1.5">
                  <Animated.View style={{ transform: [{ scale: pingScale }], opacity: pingOpacity }} className="absolute inset-0 rounded-full bg-emerald-400" />
                  <View className="relative w-1.5 h-1.5 rounded-full bg-emerald-500" />
                </View>
                <Text className="text-[9px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400">Available</Text>
              </View>
              
              {/* Clinical Emblem */}
              <View className="w-14 h-14 bg-rose-50 dark:bg-rose-900/30 rounded-full items-center justify-center mb-3 mt-2 shadow-sm border border-rose-100 dark:border-rose-800/50">
                <Ionicons name="medkit" size={26} color="#e11d48" />
              </View>
              
              {/* Typography adjusted for a more formal, trusted medical look */}
              <Text className="text-2xl font-black text-white tracking-tight mb-1" style={{ fontFamily: 'Georgia' }}>
                Clinical Care
              </Text>
              <Text className="text-[9px] font-bold text-rose-300/80 dark:text-rose-400 uppercase tracking-widest mb-3">
                Board-Certified Providers
              </Text>
              
              <Text className="text-sm font-medium text-slate-300 dark:text-slate-400 text-center mb-6 leading-relaxed px-2">
                Consult securely with a licensed specialist to evaluate and manage your mental wellbeing.
              </Text>
              
              {/* Action Button - Styled like a medical prescription pad or modern pill block */}
              <LinearGradient colors={['#e11d48', '#be123c']} className="w-full py-3.5 rounded-2xl flex-row justify-center items-center shadow-md border border-rose-400/30">
                <Text className="text-white font-black text-sm uppercase tracking-widest mr-2">Request Appointment</Text>
                <Ionicons name="arrow-forward" size={16} color="#fff" />
              </LinearGradient>

            </View>

            {/* LAYER 4: The Bottom Fold (Gives depth to the leather exterior) */}
            <View className="absolute bottom-0 w-full h-6 bg-black/20 justify-center items-center rounded-b-[2rem]">
              <View className="w-12 h-1 rounded-full bg-white/20" />
            </View>

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
          <View className="bg-amber-50/90 dark:bg-stone-950/90 border border-slate-100 dark:border-slate-700 rounded-[2rem] p-6 mb-6 shadow-sm overflow-hidden">
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
          <View className="bg-amber-50/90 dark:bg-stone-950/90 border border-slate-100 dark:border-slate-700 rounded-[2rem] p-6 mb-6 shadow-sm overflow-hidden">
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
          <View className="bg-amber-50/90 dark:bg-stone-950/90 border border-slate-100 dark:border-slate-700 rounded-[2rem] p-6 shadow-sm overflow-hidden">
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
                 <View className="flex-row items-center bg-amber-50/90 dark:bg-stone-950/90 rounded-2xl p-1.5 shadow-inner border border-slate-200/60 dark:border-slate-700/50 w-full justify-between sm:justify-start">
                   <TouchableOpacity onPress={() => setAssessMode('all')} className={`flex-1 sm:flex-none items-center justify-center px-4 py-2 rounded-xl transition-all ${assessMode === 'all' ? 'bg-emerald-500 shadow-md' : ''}`}>
                      <Text className={`text-md font-bold ${assessMode === 'all' ? 'text-white' : 'text-slate-500 dark:text-slate-300'}`}>All Time</Text>
                   </TouchableOpacity>
                   <TouchableOpacity onPress={toggleAssessmentMode} className={`flex-1 sm:flex-none items-center justify-center px-4 py-2 rounded-xl flex-row gap-2 transition-all ml-1 ${assessMode === 'date' ? 'bg-emerald-500 shadow-md' : ''}`}>
                      <Ionicons name="calendar-outline" size={14} color={assessMode === 'date' ? '#fff' : (isDark ? '#cbd5e1' : '#64748b')} />
                      <Text className={`text-md font-bold ${assessMode === 'date' ? 'text-white' : 'text-slate-500 dark:text-slate-300'}`}>
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
                      className={`flex-row items-center px-4 py-2 rounded-full border bg-amber-50/90 dark:bg-stone-950/90 shadow-sm flex-shrink-0 ${isChecked ? 'border-slate-300 dark:border-slate-500' : 'border-slate-100 dark:border-slate-700'}`}
                   >
                     <View style={{ backgroundColor: isChecked ? flags[type] : 'transparent', borderColor: isChecked ? flags[type] : '#cbd5e1' }} className="w-5 h-5 rounded-full border-2 mr-2 items-center justify-center flex-shrink-0">
                       {isChecked && <Ionicons name="checkmark" size={12} color="#fff" />}
                     </View>
                     <Text numberOfLines={1} className={`text-md font-black uppercase tracking-wide flex-shrink-0 ${isChecked ? 'text-slate-800 dark:text-white' : 'text-slate-400 dark:text-slate-500'}`}>
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
        <View className="bg-amber-50/90 dark:bg-stone-950/90 border border-slate-100 dark:border-slate-700 p-6 rounded-[2rem] shadow-sm mb-6">
          <View className="flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
             <View className="flex-row items-center gap-4">
               <View className="w-12 h-12 rounded-2xl bg-amber-50/70 dark:bg-stone-900/70 items-center justify-center border border-purple-100 dark:border-purple-800/50 shadow-inner">
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
                    <Text className={`text-md font-bold tracking-widest uppercase ${isAutoFeed ? 'text-purple-600 dark:text-purple-400' : 'text-slate-400'}`}>Auto-Feed</Text>
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
                    <Text className={`text-md font-black uppercase tracking-wider ${getMoodTaxonomyColor(currentArticle.mood).text}`}>
                      {currentArticle.mood}
                    </Text>
                  </View>
                  <View className="flex-row items-center bg-slate-50 dark:bg-slate-900/50 px-2.5 py-1 rounded-md border border-slate-100 dark:border-slate-700/50">
                    <Ionicons name="time-outline" size={14} color="#94a3b8" />
                    <Text className="text-md font-bold text-slate-400 ml-1.5">{currentArticle.read_time}</Text>
                  </View>
                </View>
                <Text className="text-xl font-black text-slate-800 dark:text-white mb-3 leading-tight tracking-tight">{currentArticle.title}</Text>
                <Text className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed mb-6" numberOfLines={2}>{currentArticle.short}</Text>
                <View className="flex-row justify-between items-center pt-5 border-t border-slate-100 dark:border-slate-700">
                   <Text className="text-md font-bold uppercase tracking-widest text-slate-400">Read Article</Text>
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
      <View className="absolute bottom-10 right-6 z-50 flex-col items-end">
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