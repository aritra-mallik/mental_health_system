import React from 'react';
import { View, ScrollView, TouchableOpacity, useColorScheme, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function AboutScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Updated to include specific colorful glassmorphic classes for each card
  const features = [
    {
      title: "AI Emotional Support",
      description: "Chat securely with Smera for emotional guidance, wellness conversations, and mindful daily support.",
      icon: "chatbubbles",
      cardGlass: "bg-indigo-50/70 dark:bg-indigo-900/20 border-indigo-200/50 dark:border-indigo-500/30",
      iconBg: "bg-indigo-100 dark:bg-indigo-500/30",
      iconColor: isDark ? '#818cf8' : '#4f46e5'
    },
    {
      title: "Secure Journaling",
      description: "Your private thoughts remain encrypted and protected with secure digital journaling and emotional tracking.",
      icon: "journal",
      cardGlass: "bg-purple-50/70 dark:bg-purple-900/20 border-purple-200/50 dark:border-purple-500/30",
      iconBg: "bg-purple-100 dark:bg-purple-500/30",
      iconColor: isDark ? '#c084fc' : '#9333ea'
    },
    {
      title: "Professional Consultation",
      description: "Connect with mental health professionals for personalized support and guided wellness care.",
      icon: "medkit",
      cardGlass: "bg-rose-50/70 dark:bg-rose-900/20 border-rose-200/50 dark:border-rose-500/30",
      iconBg: "bg-rose-100 dark:bg-rose-500/30",
      iconColor: isDark ? '#fb7185' : '#e11d48'
    },
    {
      title: "Visual Mood Graphs",
      description: "Analyze emotional patterns using interactive wellness graphs, mood analytics, and progress tracking dashboards.",
      icon: "trending-up",
      cardGlass: "bg-emerald-50/70 dark:bg-emerald-900/20 border-emerald-200/50 dark:border-emerald-500/30",
      iconBg: "bg-emerald-100 dark:bg-emerald-500/30",
      iconColor: isDark ? '#34d399' : '#10b981'
    },
    {
      title: "Interactive Experience",
      description: "Enjoy a smooth and calming digital experience with modern UI, dark mode, responsive layouts, and real-time interactions.",
      icon: "sparkles",
      cardGlass: "bg-amber-50/70 dark:bg-amber-900/20 border-amber-200/50 dark:border-amber-500/30",
      iconBg: "bg-amber-100 dark:bg-amber-500/30",
      iconColor: isDark ? '#fbbf24' : '#d97706'
    },
    {
      title: "Smart Assessments",
      description: "Complete scientifically inspired mental wellness assessments for anxiety, depression, stress, and emotional health tracking.",
      icon: "clipboard",
      cardGlass: "bg-cyan-50/70 dark:bg-cyan-900/20 border-cyan-200/50 dark:border-cyan-500/30",
      iconBg: "bg-cyan-100 dark:bg-cyan-500/30",
      iconColor: isDark ? '#22d3ee' : '#06b6d4'
    }
  ];

  return (
    <View className="flex-1 bg-white dark:bg-neutral-900">
      <ScrollView 
        contentContainerClassName="p-6 pb-24 pt-16"
        showsVerticalScrollIndicator={false}
      >
        {/* --- HEADER --- */}
        <View className="flex-row justify-between items-center mb-10">
          <TouchableOpacity 
            onPress={() => router.back()}
            className="w-12 h-12 bg-white/60 dark:bg-neutral-900/40 rounded-full items-center justify-center border border-neutral-200/50 dark:border-neutral-800/50"
          >
            <Ionicons name="arrow-back" size={24} color={isDark ? '#f8fafc' : '#0f172a'} />
          </TouchableOpacity>
        </View>

        {/* --- HERO SECTION --- */}
        <View className="items-center mb-12">
          
          <View className="bg-indigo-50/80 dark:bg-indigo-500/20 px-5 py-2.5 rounded-full mb-6 border border-indigo-200/50 dark:border-indigo-500/30">
            <Text className="text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-widest text-center">
              About Smera Mental Health System
            </Text>
          </View>

          <Text className="text-5xl font-black text-neutral-900 dark:text-white text-center leading-[3.5rem] mb-6 tracking-tight">
            Your Digital {'\n'}
            <Text className="text-indigo-600 dark:text-indigo-400">Mental Wellness</Text>{'\n'}
            Companion
          </Text>

          <Text className="text-base text-neutral-600 dark:text-neutral-300 text-center px-2 leading-relaxed font-medium">
            Smera is an AI-powered mental health support system designed to provide emotional guidance, secure journaling, assessments, and professional consultation in a safe digital environment.
          </Text>

        </View>

        {/* --- FEATURES GRID --- */}
        <View className="flex-col gap-4">
          {features.map((feature, index) => (
            <View 
              key={index} 
              className={`rounded-[2.5rem] p-8 border ${feature.cardGlass}`}
            >
              
              <View className={`w-16 h-16 rounded-2xl items-center justify-center mb-6 ${feature.iconBg}`}>
                <Ionicons name={feature.icon as any} size={28} color={feature.iconColor} />
              </View>

              <Text className="text-2xl font-black text-neutral-900 dark:text-white mb-3 tracking-tight">
                {feature.title}
              </Text>

              <Text className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed font-medium">
                {feature.description}
              </Text>

            </View>
          ))}
        </View>

        {/* --- FOOTER VERSION --- */}
        <View className="items-center justify-center mt-12 mb-6">
          <Ionicons name="leaf" size={24} color={isDark ? '#475569' : '#cbd5e1'} className="mb-2" />
          <Text className="text-md font-bold text-neutral-400 dark:text-neutral-600 uppercase tracking-widest">
            Smera v1.0.0
          </Text>
        </View>

      </ScrollView>
    </View>
  );
}