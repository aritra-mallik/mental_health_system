import React from 'react';
import { ScrollView, View, TouchableOpacity, Text } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, AlertTriangle, Droplets, Sun, Brain, Headphones, Check, Leaf, Sparkles } from 'lucide-react-native';
import { Card, Button } from 'heroui-native';

export default function BurnoutRecoveryScreen() {
  const MICRO_TASKS = [
    { id: 1, title: "Hydrate", desc: "Drink exactly one glass of water. Notice the cool temperature. That is your only goal right now.", Icon: Droplets, color: "#3b82f6", bgClass: "bg-blue-50 dark:bg-blue-500/10", borderClass: "border-blue-100 dark:border-blue-500/20", iconBg: "bg-blue-100 dark:bg-blue-500/20", iconBorder: "border-blue-200 dark:border-blue-500/30" },
    { id: 2, title: "Change Scenery", desc: "Move from the bed to the couch, or open a single window to feel the fresh air on your face.", Icon: Sun, color: "#10b981", bgClass: "bg-emerald-50 dark:bg-emerald-500/10", borderClass: "border-emerald-100 dark:border-emerald-500/20", iconBg: "bg-emerald-100 dark:bg-emerald-500/20", iconBorder: "border-emerald-200 dark:border-emerald-500/30" },
    { id: 3, title: "Brain Dump", desc: "Write down 3 things weighing heavily on your mind, fold the paper, and physically put it away.", Icon: Brain, color: "#ef4444", bgClass: "bg-rose-50 dark:bg-rose-500/10", borderClass: "border-rose-100 dark:border-rose-500/20", iconBg: "bg-rose-100 dark:bg-rose-500/20", iconBorder: "border-rose-200 dark:border-rose-500/30" },
    { id: 4, title: "Sensory Shift", desc: "Play one familiar, calming song. Close your eyes and just listen. Do not look at a screen.", Icon: Headphones, color: "#06b6d4", bgClass: "bg-cyan-50 dark:bg-cyan-500/10", borderClass: "border-cyan-100 dark:border-cyan-500/20", iconBg: "bg-cyan-100 dark:bg-cyan-500/20", iconBorder: "border-cyan-200 dark:border-cyan-500/30" }
  ];

  return (
    <View className="flex-1 bg-neutral-50 dark:bg-black">
      <ScrollView contentContainerClassName="p-6 pb-20 pt-12" showsVerticalScrollIndicator={false}>
        
        <TouchableOpacity onPress={() => router.back()} className="w-12 h-12 rounded-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 items-center justify-center mb-8 shadow-sm">
          <ArrowLeft size={22} color="#64748b" />
        </TouchableOpacity>

        <LinearGradient
          colors={['#047857', '#022C22']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ borderRadius: 36, paddingHorizontal: 24, paddingVertical: 32, marginBottom: 48, overflow: 'hidden' }}
          className="relative shadow-xl border border-emerald-500/30">
          <View className="absolute -top-10 -right-10 w-48 h-48 bg-emerald-400/20 rounded-full blur-3xl" />
          
          <View className="w-16 h-16 bg-white/10 rounded-3xl border border-white/20 items-center justify-center mb-6 mx-auto">
            <Leaf size={32} color="#6ee7b7" />
          </View>
          
          <Text className="text-3xl font-black text-white text-center mb-4 tracking-tight">Burnout Recovery</Text>
          <Text className="text-emerald-100 text-center font-medium opacity-90 leading-relaxed max-w-sm mx-auto">
            You are running on empty. The goal today isn't productivity; it's gentle, guilt-free restoration.
          </Text>
        </LinearGradient>

        <Card className="flex-row items-start gap-4 p-6 rounded-3xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 mb-12 shadow-none">
          <AlertTriangle size={24} color="#fbbf24" className="mt-1" />
          <View className="flex-1">
            <Text className="font-black text-lg text-amber-700 dark:text-amber-400 mb-2">Permission to Rest</Text>
            <Text className="text-sm font-medium text-amber-800/80 dark:text-amber-200/70 leading-relaxed">
              Burnout is a physiological state, not a lack of willpower. If you cannot do any of the tasks below, your only task today is to rest.
            </Text>
          </View>
        </Card>

        <View className="mb-6">
          <View className="flex-row items-center gap-3 mb-2">
            <Sparkles size={22} color="#10b981" />
            <Text className="text-xl font-black text-neutral-900 dark:text-white tracking-wide">Micro-Activations</Text>
          </View>
          <Text className="text-sm text-neutral-500 dark:text-neutral-400 font-medium leading-relaxed">
            When everything feels too heavy, pick just ONE micro-task. Completely ignore the rest.
          </Text>
        </View>

        <View className="gap-4 mb-12">
          {MICRO_TASKS.map((task) => (
            <Card key={task.id} className={`p-6 ${task.bgClass} border ${task.borderClass} rounded-3xl shadow-none`}>
              <View className="flex-row justify-between items-start mb-4">
                <View className={`w-14 h-14 ${task.iconBg} border ${task.iconBorder} rounded-2xl items-center justify-center`}>
                  <task.Icon size={26} color={task.color} />
                </View>
                <View className="w-8 h-8 rounded-full bg-emerald-500 border-2 border-emerald-400/50 items-center justify-center">
                  <Check size={16} color="#ffffff" strokeWidth={3} />
                </View>
              </View>
              <Text className="font-black text-xl mb-2 text-neutral-900 dark:text-white">{task.title}</Text>
              <Text className="text-sm font-medium text-neutral-600 dark:text-neutral-300 leading-relaxed">{task.desc}</Text>
            </Card>
          ))}
        </View>

        <Card className="bg-white dark:bg-neutral-900 p-8 rounded-3xl border border-neutral-200 dark:border-neutral-800 mb-12 shadow-sm dark:shadow-none">
          <Text className="text-lg font-black text-neutral-900 dark:text-white mb-3">Energy Pacing Rule</Text>
          <Text className="text-sm text-neutral-500 dark:text-neutral-400 mb-8 font-medium leading-relaxed">
            When recovering from burnout, your perception of your energy is skewed. Whatever you think you have the energy to do today—cut it in half immediately.
          </Text>
          
          <View className="w-full h-4 bg-neutral-100 dark:bg-black rounded-full overflow-hidden flex-row border border-neutral-200 dark:border-neutral-800">
            <View className="w-1/2 h-full bg-emerald-500 rounded-full" />
            <View className="w-1/2 h-full bg-transparent" />
          </View>
          
          <View className="flex-row justify-between mt-4 px-1">
            <Text className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">What you do</Text>
            <Text className="text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">Saved for healing</Text>
          </View>
        </Card>
        
        <Button 
          className="bg-emerald-600 dark:bg-emerald-500 rounded-2xl h-14 w-full"
          onPress={() => router.push('/core/chatbot')}>
          <Text className="text-white font-black text-base tracking-wide">Talk to Smera about Burnout</Text>
        </Button>

      </ScrollView>
    </View>
  );
}