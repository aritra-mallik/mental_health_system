import React, { useState } from 'react';
import { View, TouchableOpacity, TextInput, Keyboard, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Card, Button } from 'heroui-native';
import { usePreferences } from '@/context/PreferencesContext';
import { ArrowLeft, Moon, ListTodo, RotateCcw, Check, Calculator, Wind } from 'lucide-react-native';

const DEFAULT_TASKS = [
  "Dim overhead lights to 20% or use warm lamps",
  "Set phone to Do Not Disturb and place it across the room",
  "Lower bedroom temperature (65°F/18°C is optimal)",
  "Write down tomorrow's worries to clear your mind",
  "Drink a few sips of water to stay hydrated",
  "Read 10 pages of a physical book (No screens)"
];

const PHYSIOLOGY_DATA = [
  { emoji: "🧠", text: "Select a task to begin your wind-down routine." },
  { emoji: "📉", text: "Cortisol levels are dropping. Your nervous system is shifting." },
  { emoji: "🌡️", text: "Environmental shifts are signaling your brain. Core temp is lowering." },
  { emoji: "🧬", text: "Melatonin production is actively increasing. Heart rate is slowing." },
  { emoji: "🌊", text: "Brain waves are shifting from active Beta to calmer Alpha/Theta waves." },
  { emoji: "🔋", text: "Muscle tension is releasing. Your body is in the maintenance phase." },
  { emoji: "🌙", text: "Protocol Complete. You are fully primed for restorative REM sleep." }
];

export default function SleepSupportScreen() {
  const router = useRouter();
  const { isDarkMode } = usePreferences();
  
  const [tasks, setTasks] = useState<string[]>([...DEFAULT_TASKS]);
  const [completed, setCompleted] = useState<number[]>([]);
  
  const [wakeHour, setWakeHour] = useState("07");
  const [wakeMin, setWakeMin] = useState("00");
  const [isPM, setIsPM] = useState(false);
  const [cycleResults, setCycleResults] = useState<{label: string, count: number, time: string, desc: string, color: string}[] | null>(null);

  const toggleTask = (index: number) => {
    Keyboard.dismiss();
    if (completed.includes(index)) {
      setCompleted(completed.filter(i => i !== index));
    } else {
      setCompleted([...completed, index]);
    }
  };

  const resetTasks = () => {
    setTasks([...DEFAULT_TASKS]);
    setCompleted([]);
    Keyboard.dismiss();
  };

  const calculateCycles = () => {
    Keyboard.dismiss();
    let hourNum = parseInt(wakeHour) || 7;
    let minNum = parseInt(wakeMin) || 0;
    
    if (hourNum > 12) hourNum = 12;
    if (hourNum < 1) hourNum = 1;
    if (minNum > 59) minNum = 59;
    
    setWakeHour(hourNum.toString().padStart(2, '0'));
    setWakeMin(minNum.toString().padStart(2, '0'));

    let date = new Date();
    let calcHour = hourNum;
    if (isPM && calcHour !== 12) calcHour += 12;
    if (!isPM && calcHour === 12) calcHour = 0;
    
    date.setHours(calcHour, minNum, 0, 0);
    date.setMinutes(date.getMinutes() - 15); 

    const formatTime = (d: Date) => {
      let h = d.getHours();
      let m = d.getMinutes();
      let ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12;
      h = h ? h : 12; 
      let minStr = m < 10 ? '0'+m : m;
      return `${h}:${minStr} ${ampm}`;
    };

    setCycleResults([
      { count: 6, label: "Optimal Rest", desc: "Best for recovery", color: "#10b981", time: formatTime(new Date(date.getTime() - (9 * 60 * 60 * 1000))) },
      { count: 5, label: "Standard Rest", desc: "Average adult requirement", color: "#34d399", time: formatTime(new Date(date.getTime() - (7.5 * 60 * 60 * 1000))) },
      { count: 4, label: "Minimum Rest", desc: "Leaves you slightly fatigued", color: "#94a3b8", time: formatTime(new Date(date.getTime() - (6 * 60 * 60 * 1000))) }
    ]);
  };

  const progressPct = tasks.length > 0 ? (completed.length / tasks.length) * 100 : 0;
  const feedbackIndex = Math.floor((completed.length / tasks.length) * (PHYSIOLOGY_DATA.length - 1)) || 0;
  const currentFeedback = PHYSIOLOGY_DATA[feedbackIndex];

  return (
    <View className="flex-1 bg-transparent">
      <KeyboardAwareScrollView 
        /* Changed pb-20 to pb-32 here */
        contentContainerClassName="p-6 pb-32 pt-16" 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true} 
        extraScrollHeight={60}
      >
        
        {/* --- TOP NAVIGATION BAR --- */}
        <View className="flex-row justify-between items-center mb-6">
          <TouchableOpacity 
            onPress={() => router.back()} 
            className="w-12 h-12 bg-amber-50/90 dark:bg-stone-950/90 border border-neutral-200 dark:border-neutral-800 rounded-full items-center justify-center shadow-sm"
          >
            <ArrowLeft size={24} color={isDarkMode ? "#94a3b8" : "#475569"} />
          </TouchableOpacity>
        </View>

        {/* --- HERO GRADIENT HEADER AREA (HeroUI Embedded) --- */}
        <Card className="bg-indigo-950 rounded-[2.5rem] p-6 mb-10 border border-indigo-900 dark:border-indigo-500/20 overflow-hidden shadow-xl relative w-full">
          <LinearGradient
            colors={['#1e1b4b', '#020617']} 
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />
          <View className="absolute -top-10 -right-10 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl" />
          <View className="absolute -bottom-10 -left-10 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl" />

          <View className="w-16 h-16 bg-white/10 rounded-3xl border border-white/20 items-center justify-center mb-6 mx-auto">
            <Moon size={32} color="#a5b4fc" />
          </View>
          
          <Text className="text-3xl font-black text-center text-white mb-3 tracking-tight">
            Sleep Optimization
          </Text>
          
          <Text className="text-center text-sm font-medium text-indigo-200/90 leading-relaxed max-w-sm mx-auto">
            Calculate your optimal cycles, and personalize your environment for restorative rest.
          </Text>
        </Card>

        {/* --- PRE-SLEEP PROTOCOL PROTOCOL PROTOCOL --- */}
        <Card className="bg-amber-50/90 dark:bg-stone-950/90 rounded-[2.5rem] p-6 mb-10 shadow-sm dark:shadow-none border border-neutral-200 dark:border-neutral-800 w-full">
          <View className="flex-row justify-between items-center mb-4">
            <View className="flex-row items-center gap-2">
              <ListTodo size={20} color="#10b981" />
              <Text className="text-lg font-black text-neutral-900 dark:text-white">Pre-Sleep Protocol</Text>
            </View>
            
            <TouchableOpacity 
              activeOpacity={0.7}
              onPress={resetTasks} 
              className="flex-row items-center gap-1.5 bg-neutral-100/80 dark:bg-neutral-800/80 px-3 py-1.5 rounded-full border border-neutral-200 dark:border-neutral-700"
            >
              <RotateCcw size={12} color={isDarkMode ? "#94a3b8" : "#64748b"} />
              <Text className="text-[10px] font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-widest">Reset</Text>
            </TouchableOpacity>
          </View>

          <Text className="text-md text-neutral-500 dark:text-neutral-400 mb-6 font-medium leading-relaxed">
            Complete the operational checklist to structure a flawless neurological runway for deep rest.
          </Text>

          {/* Dynamic Task Loop */}
          <View className="gap-3 mb-6">
            {tasks.map((task, index) => {
              const isDone = completed.includes(index);
              return (
                <TouchableOpacity 
                  key={index} 
                  activeOpacity={0.7}
                  onPress={() => toggleTask(index)}
                  className={`flex-row items-center gap-4 p-4 rounded-2xl border transition-colors ${
                    isDone 
                      ? 'bg-emerald-500/10 border-emerald-500/20 dark:border-emerald-500/30' 
                      : 'bg-neutral-50 dark:bg-neutral-950/50 border-neutral-200/60 dark:border-neutral-800'
                  }`}
                >
                  <View 
                    className={`w-5 h-5 rounded-full border-2 items-center justify-center shrink-0 ${
                      isDone ? 'bg-emerald-50 border-emerald-500' : 'bg-transparent border-neutral-300 dark:border-neutral-600'
                    }`}
                  >
                    {isDone && <Check size={12} color="#10b981" strokeWidth={4} />}
                  </View>
                  
                  <Text 
                    className={`flex-1 font-semibold text-sm ${
                      isDone 
                        ? 'text-neutral-400 dark:text-neutral-600 line-through' 
                        : 'text-neutral-700 dark:text-neutral-300'
                    }`}
                  >
                    {task}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Biological Feedback Metrics */}
          <View className="pt-5 border-t border-neutral-100 dark:border-neutral-800/60">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Readiness Score</Text>
              <Text className="text-md font-black text-emerald-500">{Math.round(progressPct)}%</Text>
            </View>
            
            {/* Native Progress bar tracking layout */}
            <View className="w-full h-2 bg-neutral-100 dark:bg-neutral-950 rounded-full overflow-hidden border border-neutral-200 dark:border-neutral-800 mb-5 flex-row">
              <View style={{ width: `${progressPct}%` }} className="h-full bg-emerald-500 rounded-full" />
            </View>

            <View className={`p-4 rounded-2xl border ${
              completed.length === tasks.length 
                ? 'bg-emerald-500/10 border-emerald-500/20 dark:border-emerald-500/30' 
                : 'bg-neutral-50/80 dark:bg-neutral-950/80 border-neutral-200 dark:border-neutral-800'
            } flex-row items-start gap-3`}>
              <Text className="text-2xl mt-0.5">{currentFeedback.emoji}</Text>
              <Text className={`flex-1 font-bold text-md leading-relaxed ${
                completed.length === tasks.length ? 'text-emerald-700 dark:text-emerald-400' : 'text-neutral-600 dark:text-neutral-400'
              }`}>
                {currentFeedback.text}
              </Text>
            </View>
          </View>
        </Card>

        {/* --- SLEEP CYCLE CALCULATOR --- */}
        <Card className="bg-amber-50/90 dark:bg-stone-950/90 rounded-[2.5rem] p-6 mb-10 shadow-sm dark:shadow-none border border-neutral-200 dark:border-neutral-800 w-full">
          <View className="flex-row items-center gap-2 mb-3">
            <Calculator size={20} color={isDarkMode ? "#818cf8" : "#4f46e5"} />
            <Text className="text-lg font-black text-neutral-900 dark:text-white">Cycle Calculator</Text>
          </View>
          
          <Text className="text-md text-neutral-500 dark:text-neutral-400 mb-6 font-medium leading-relaxed">
            Humans sleep in 90-minute intervals. Waking mid-cycle creates sudden cognitive fog. Map out your target wake targets below.
          </Text>

          <View className="flex-row items-center gap-3 mb-4">
            <View className="flex-1 flex-row items-center justify-center bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl h-14 px-4">
              <TextInput
                value={wakeHour}
                onChangeText={setWakeHour}
                keyboardType="numeric"
                maxLength={2}
                onFocus={() => setWakeHour('')}
                style={{ padding: 0, includeFontPadding: false, textAlignVertical: 'center' }}
                className="text-2xl font-black text-neutral-900 dark:text-white text-center w-12"
              />
              <Text className="text-2xl font-black text-neutral-300 dark:text-neutral-700 mx-1 mb-1">:</Text>
              <TextInput
                value={wakeMin}
                onChangeText={setWakeMin}
                keyboardType="numeric"
                maxLength={2}
                onFocus={() => setWakeMin('')}
                style={{ padding: 0, includeFontPadding: false, textAlignVertical: 'center' }}
                className="text-2xl font-black text-neutral-900 dark:text-white text-center w-12"
              />
            </View>

            <TouchableOpacity 
              activeOpacity={0.7}
              onPress={() => setIsPM(!isPM)}
              className="bg-neutral-50/90 dark:bg-neutral-950/90 border border-neutral-200 dark:border-neutral-800 rounded-2xl w-20 h-14 items-center justify-center"
            >
              <Text className="text-base font-black text-indigo-600 dark:text-indigo-400">{isPM ? 'PM' : 'AM'}</Text>
            </TouchableOpacity>
          </View>

          {/* HeroUI Primary Action Button */}
          <Button 
            color="primary"
            className="w-full h-14 rounded-2xl bg-indigo-600 dark:bg-indigo-500 mb-4"
            onPress={calculateCycles}
          >
            <Text className="font-black text-white text-base tracking-wide">Calculate Bedtimes</Text>
          </Button>

          {cycleResults && (
            <View className="gap-3 mt-2 w-full">
              <Text className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1 ml-1">
                Suggested Bedtimes (Includes 15m buffer)
              </Text>
              
              {cycleResults.map((res, i) => (
                <View 
                  key={i} 
                  className={`flex-row justify-between items-center p-4 rounded-2xl border ${
                    i === 0 
                      ? 'bg-emerald-500/10 border-emerald-500/30 dark:border-emerald-500/20' 
                      : 'bg-neutral-50/80 dark:bg-neutral-950/80 border-neutral-200 dark:border-neutral-800'
                  }`}
                >
                  <View className="flex-1 pr-3">
                    <Text className={`font-black text-sm mb-0.5 ${i === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-900 dark:text-white'}`}>
                      {res.label} <Text className="font-bold text-[10px] opacity-60">({res.count} cycles)</Text>
                    </Text>
                    <Text className="text-[11px] text-neutral-500 dark:text-neutral-400 font-semibold leading-tight">{res.desc}</Text>
                  </View>

                  <Text className={`text-base font-black shrink-0 ${i === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-900 dark:text-white'}`}>
                    {res.time}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </Card>

        {/* --- DYNAMIC INTERACTION: FALLBACK TO CALM NOW --- */}
        <Card className="bg-amber-50/80 dark:bg-stone-950/80 border border-neutral-200 dark:border-neutral-800 p-6 rounded-[2.5rem] items-center text-center shadow-sm dark:shadow-none w-full">
          <View className="w-12 h-12 bg-blue-50 dark:bg-blue-500/10 rounded-2xl items-center justify-center mb-4 border border-blue-100 dark:border-blue-500/20">
            <Wind size={24} color={isDarkMode ? "#60a5fa" : "#2563eb"} />
          </View>
          
          <Text className="text-lg font-black text-neutral-900 dark:text-white mb-1.5">Can't fall asleep?</Text>
          
          <Text className="text-md text-neutral-500 dark:text-neutral-400 mb-5 font-medium text-center leading-relaxed">
            If you've been fully alert in bed for over 20 minutes, isolate yourself from the mattress environment. Initiate a calming grounding exercise until true fatigue initializes.
          </Text>
          
          {/* HeroUI Secondary Call Button */}
          <Button 
            variant="flat"
            color="default"
            className="w-full h-14 rounded-2xl bg-neutral-100/90 dark:bg-neutral-800/90 border border-neutral-200 dark:border-neutral-700"
            onPress={() => router.push('/core/calm_now')} 
          >
            <Text className="font-black text-neutral-700 dark:text-neutral-300 text-sm">Start 4-7-8 Breathing</Text>
          </Button>
        </Card>

        {/* Explicit bottom spacer to ensure the gap is physically rendered */}
        <View className="h-20 w-full" />

      </KeyboardAwareScrollView>
    </View>
  );
}