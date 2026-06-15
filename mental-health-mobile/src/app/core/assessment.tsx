import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Animated, Easing, ActivityIndicator, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ClipboardCheck, ArrowLeft, ArrowRight, CheckCircle2, Sparkles, RefreshCcw, Check, AlertCircle } from 'lucide-react-native';
import { Button } from 'heroui-native';
import { usePreferences } from '@/context/PreferencesContext';
import apiClient from '@/api/apiClient';

/* =========================
   QUESTION BANKS & DATA
========================= */
const QUESTIONS: Record<string, string[]> = {
  who5: [
    "I have felt cheerful and in good spirits",
    "I have felt calm and relaxed",
    "I have felt active and vigorous",
    "I woke up feeling fresh and rested",
    "My daily life has been filled with things that interest me"
  ],
  pss: [
    "Upset because of something unexpected?",
    "Unable to control important things?",
    "Felt nervous and stressed?",
    "Felt confident handling problems?",
    "Things going your way?",
    "Could not cope with tasks?",
    "Controlled irritations?",
    "Felt on top of things?",
    "Angered by things outside control?",
    "Difficulties piling up?"
  ],
  wemwbs: [
    "I've been feeling optimistic about the future",
    "I've been feeling useful",
    "I've been feeling relaxed",
    "I've been feeling interested in other people",
    "I've had energy to spare",
    "I've been dealing with problems well",
    "I've been thinking clearly",
    "I've been feeling good about myself",
    "I've been feeling close to other people",
    "I've been feeling confident",
    "I've been able to make up my own mind about things",
    "I've been feeling loved",
    "I've been interested in new things",
    "I've been feeling cheerful"
  ],
  isi: [
    "Difficulty falling asleep",
    "Difficulty staying asleep",
    "Waking too early",
    "Satisfaction with sleep",
    "Sleep noticeable to others",
    "Distress about sleep",
    "Interference with daily functioning"
  ]
};

const OPTIONS_MAP: Record<string, {label: string, value: number}[]> = {
  who5: [
    {label:"At no time", value:0}, {label:"Some of the time", value:1},
    {label:"Less than half", value:2}, {label:"More than half", value:3},
    {label:"Most of the time", value:4}, {label:"All the time", value:5}
  ],
  pss: [
    {label:"Never", value:0}, {label:"Almost never", value:1},
    {label:"Sometimes", value:2}, {label:"Fairly often", value:3},
    {label:"Very often", value:4}
  ],
  wemwbs: [
    {label:"None of the time", value:1}, {label:"Rarely", value:2},
    {label:"Some of the time", value:3}, {label:"Often", value:4},
    {label:"All of the time", value:5}
  ],
  isi: [
    {label:"None", value:0}, {label:"Mild", value:1},
    {label:"Moderate", value:2}, {label:"Severe", value:3},
    {label:"Very severe", value:4}
  ]
};

const TITLES: Record<string, string> = {
  who5: "Well-Being Index (WHO-5)",
  pss: "Perceived Stress Scale",
  wemwbs: "Mental Wellbeing Scale (WEMWBS)",
  isi: "Insomnia Severity Index",
};

const INSTRUCTIONS: Record<string, string> = {
  who5: "Reflect on how you have been feeling over the last 24 hours.",
  pss: "Consider your thoughts and feelings over the last one week.",
  wemwbs: "Reflect on your experiences and feelings over the last 2 weeks.",
  isi: "Think about your sleep patterns over the last one week.",
};

const MAX_SCORES: Record<string, number> = {
  who5: 25, pss: 40, wemwbs: 70, isi: 28
};

/* =========================
   HELPERS
========================= */
const mapRiskToMood = (risk: string) => {
  if (!risk) return "neutral";
  if (risk === "high_wellbeing") return "great";
  if (risk === "good_wellbeing") return "good";
  if (risk === "average_wellbeing") return "neutral";
  if (risk === "low_wellbeing") return "low";
  if (risk.includes("severe") || risk === "high") return "overwhelmed";
  if (risk.includes("moderate") || risk === "subthreshold") return "stressed";
  if (risk === "less" || risk === "no_insomnia") return "neutral";
  return "neutral";
};

const generateRecommendations = (type: string, risk: string) => {
  let category = 'good';
  if (risk.includes('severe') || risk.includes('high') || risk === 'low_wellbeing') category = 'severe';
  else if (risk.includes('moderate') || risk.includes('subthreshold') || risk === 'average_wellbeing') category = 'moderate';
  
  if ((type === 'wemwbs' && risk === 'high_wellbeing') || (type === 'who5' && risk === 'good_wellbeing')) category = 'good';
  else if ((type === 'wemwbs' && risk === 'low_wellbeing') || (type === 'who5' && risk === 'low_wellbeing')) category = 'severe';

  if (type === 'isi') { 
    if (category === 'severe') return [
      "Consult a healthcare provider or sleep specialist.",
      "Implement a strict digital curfew 1 to 2 hours before bed.",
      "Avoid caffeine and heavy meals entirely after midday.",
      "Keep your bedroom strictly for sleep—dark, quiet, and cool."
    ];
    if (category === 'moderate') return [
      "Maintain a consistent sleep schedule, even on weekends.",
      "Limit daytime naps to 20 minutes or avoid them entirely.",
      "Engage in relaxing activities before bed.",
      "Ensure your sleeping environment is distraction-free."
    ];
    return [
      "Keep maintaining your consistent sleep schedule.",
      "Continue protecting your wind-down time before bed.",
      "Stay physically active during the day.",
      "Stick to your current caffeine boundaries."
    ];
  }

  if (category === 'severe') return [
    "Reach out to a mental health professional for personalized guidance.",
    "Share how you are genuinely feeling with someone you deeply trust.",
    "Focus only on the immediate next step, rather than the big picture.",
    "Practice physical grounding (5-4-3-2-1 method) when panicked."
  ];
  
  if (category === 'moderate') return [
    "Incorporate 10 to 15 minutes of mindfulness or deep breathing daily.",
    "Engage in light physical activity, such as a 20-minute daily walk.",
    "Journal your thoughts to declutter your mind before bed.",
    "Ensure you are staying consistently hydrated and eating balanced meals."
  ];
  
  return [
    "Keep up your current effective coping strategies—they are working!",
    "Acknowledge your resilience and mental progress.",
    "Continue making dedicated time for activities that bring you joy.",
    "Maintain your baseline physical health routines."
  ];
};

export default function AssessmentScreen() {
  const router = useRouter();
  const { isDarkMode } = usePreferences();
  
  const [step, setStep] = useState(0);
  const [type, setType] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [result, setResult] = useState<any>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isStartingChat, setIsStartingChat] = useState(false);

  // Custom Alert State
  const [customAlert, setCustomAlert] = useState({ visible: false, title: '', message: '' });

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true
    }).start();
  }, [step]);

  const showThemeAlert = (title: string, message: string) => {
    setCustomAlert({ visible: true, title, message });
  };

  const selectType = (selectedType: string) => {
    setType(selectedType); setIndex(0); setAnswers([]); setStep(2);
  };

  const handleAnswer = (val: number) => {
    const newAnswers = [...answers];
    newAnswers[index] = val;
    setAnswers(newAnswers);
  };

  const submitAssessment = async () => {
    if (!type || answers.length === 0) return;
    setIsSubmitting(true);
    try {
      const response = await apiClient.post("/core/assessment/", { type, answers });
      if (response.data?.data) {
        setResult(response.data.data);
        setStep(5);
      }
    } catch (error) {
      console.error("Submission failed", error);
      showThemeAlert("Submission Failed", "We couldn't submit your assessment right now. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewReport = () => {
    setIsGeneratingReport(true);
    setTimeout(() => {
      setIsGeneratingReport(false);
      setStep(6);
    }, 800);
  };

  const goToChatWithContext = async () => {
    if (!result || !type) return;
    setIsStartingChat(true);
    try {
      const context = {
        overall_mood: mapRiskToMood(result.risk_level),
        overall_risk: result.risk_level,
        score: result.score
      };
      const response = await apiClient.post("/core/chat/session-with-context/", { context });
      if (response.data?.session_id) {
        router.push({ pathname: '/core/chatbot', params: { session_id: response.data.session_id } });
      } else {
        throw new Error("Invalid session ID");
      }
    } catch (e) {
      console.error("Failed to start contextual chat", e);
      showThemeAlert("Chat Error", "Unable to open a conversation right now. Please try again.");
    } finally {
      setIsStartingChat(false);
    }
  };

  const renderContent = () => {
    switch (step) {
      case 0: // Welcome
        return (
          <View className="flex-1 items-center justify-center py-10 px-4">
            <View className="w-20 h-20 bg-indigo-50/40 dark:bg-indigo-500/10 rounded-[2rem] items-center justify-center mb-8 border border-indigo-100 dark:border-indigo-500/20 transform -rotate-3 shadow-sm">
              <ClipboardCheck size={40} color={isDarkMode ? "#818cf8" : "#4f46e5"} strokeWidth={2} />
            </View>
            <Text className="text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-4 text-center">
              Mental Health Check
            </Text>
            <Text className="text-slate-500 dark:text-slate-400 mb-12 text-center text-lg leading-relaxed max-w-sm">
              Take a mindful moment to reflect on your current well-being and track your progress.
            </Text>
            
            <View className="w-full max-w-sm gap-4">
              <Button color="primary" className="w-full h-14 rounded-2xl bg-indigo-600/90 shadow-lg shadow-indigo-500/30" onPress={() => setStep(1)}>
                <Text className="font-bold text-white text-base">Begin Assessment</Text>
                <ArrowRight size={18} color="#ffffff" className="ml-2" />
              </Button>
              <Button variant="light" className="w-full h-14" onPress={() => router.push('/core/dashboard')}>
                <ArrowLeft size={18} color="#94a3b8" className="mr-2" />
                <Text className="font-bold text-slate-500 dark:text-slate-400 text-base">Return to Dashboard</Text>
              </Button>
            </View>
          </View>
        );

      case 1: // Select Area
        return (
          <View className="flex-1 py-6 px-2">
            <View className="items-center mb-10">
              <Text className="text-3xl font-black text-slate-900 dark:text-white tracking-tight text-center mb-2">Choose an Area</Text>
              <Text className="text-slate-500 dark:text-slate-400 text-center">Select the assessment that best aligns with your focus.</Text>
            </View>
            
            <View className="gap-4 w-full">
              {Object.keys(QUESTIONS).map((t) => (
                <TouchableOpacity 
                  key={t} activeOpacity={0.7} onPress={() => selectType(t)}
                  className="p-6 bg-amber-50/90 dark:bg-stone-950/90 border-2 border-slate-100 dark:border-neutral-800 rounded-[2rem] flex-row items-center justify-between shadow-sm dark:shadow-none"
                >
                  <View className="flex-1 pr-4">
                    <Text className="font-black text-lg text-slate-800 dark:text-slate-100 mb-1">{TITLES[t]}</Text>
                    <Text className="text-sm font-medium text-slate-500 dark:text-slate-400">Start Check-in</Text>
                  </View>
                  <View className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-500/10 items-center justify-center">
                    <ArrowRight size={18} color={isDarkMode ? "#818cf8" : "#4f46e5"} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 2: // Intro
        if (!type) return null;
        return (
          <View className="flex-1 items-center justify-center py-10 px-4">
            <View className="px-5 py-2 mb-8 bg-indigo-50 dark:bg-indigo-500/10 rounded-full border border-indigo-100 dark:border-indigo-500/20">
              <Text className="text-md font-bold tracking-widest text-indigo-700 dark:text-indigo-400 uppercase">
                {TITLES[type]}
              </Text>
            </View>
            <Text className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-6 text-center leading-snug">
              {INSTRUCTIONS[type]}
            </Text>
            <Text className="text-slate-500 dark:text-slate-400 mb-12 text-center text-lg leading-relaxed max-w-sm">
              Answer based on your genuine feelings. There are no right or wrong answers here.
            </Text>
            <Button color="primary" className="w-full max-w-sm h-14 rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-500/30" onPress={() => setStep(3)}>
              <Text className="font-bold text-white text-base">I'm Ready to Begin</Text>
            </Button>
          </View>
        );

      case 3: // Floating Question UI
        if (!type) return null;
        const totalQ = QUESTIONS[type].length;
        const qText = QUESTIONS[type][index];
        const opts = OPTIONS_MAP[type];
        const selected = answers[index];
        const pctText = Math.round(((index + 1) / totalQ) * 100);

        return (
          <View className="flex-1 py-2">
            
            {/* 3D Progress Bar */}
            <View style={{width: '100%', height: 12, backgroundColor: '#b8bcc8', borderRadius: 9999, marginBottom: 32, overflow: 'hidden', borderTopWidth: 0, borderBottomWidth: 0, borderLeftWidth: 0, borderRightWidth: 0}}>
              <View
                style={{width: `${Math.round(((index + 1) / totalQ) * 100)}%`, height: '100%', borderRadius: 9999, backgroundColor: '#4f46e5',
                  borderTopWidth: 3, borderTopColor: 'rgba(255,255,255,0.35)', borderBottomWidth: 2, borderBottomColor: 'rgba(0,0,0,0.2)', borderLeftWidth: 0, borderRightWidth: 0}}/>
            </View>
            
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-md font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                Question {index + 1} of {totalQ}
              </Text>
              <Text className="text-md font-bold text-slate-800 dark:text-slate-400">{pctText}% Complete</Text>
            </View>
            
            <Text className="text-3xl font-black text-slate-900 dark:text-white mb-10 leading-tight">
              {qText}
            </Text>

            <View className="flex-col gap-2 mb-10 w-full">
              {opts.map((o) => {
                const isSelected = selected === o.value;
                return (
                  <TouchableOpacity 
                    key={o.value} 
                    activeOpacity={0.7} 
                    onPress={() => handleAnswer(o.value)}
                    className={`p-4 rounded-[2rem] border-2 flex-row justify-between items-center transition-all ${
                      isSelected 
                        ? 'bg-indigo-50/10 dark:bg-indigo-500/10 border-indigo-500 shadow-lg shadow-indigo-500/20' 
                        : 'bg-amber-50/90 dark:bg-stone-950/90 border-transparent shadow-md shadow-slate-200/40 dark:shadow-none'
                    }`}
                  >
                    <Text className={`font-bold text-lg ${isSelected ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-200'}`}>
                      {o.label}
                    </Text>
                    <View className={`w-7 h-7 rounded-full border-[2.5px] items-center justify-center ${isSelected ? 'border-indigo-600' : 'border-slate-300 dark:border-neutral-600'}`}>
                      {isSelected && <View className="w-3.5 h-3.5 rounded-full bg-indigo-600/90" />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View className="flex-row justify-between items-center mt-auto pt-6">
              <TouchableOpacity onPress={() => index > 0 && setIndex(index - 1)} disabled={index === 0} className={`p-4 ${index === 0 ? 'opacity-0' : 'opacity-100'}`}>
                <Text className="font-bold text-slate-500 dark:text-slate-400">← Previous</Text>
              </TouchableOpacity>
              <Button 
                color="primary" className="h-14 px-10 rounded-2xl bg-indigo-600/90 shadow-lg shadow-indigo-500/30" 
                onPress={() => { if (selected !== undefined) { if (index + 1 < totalQ) setIndex(index + 1); else setStep(4); } }}
                isDisabled={selected === undefined}
              >
                <Text className="font-bold text-white text-base">{index === totalQ - 1 ? 'Review' : 'Next'}</Text>
              </Button>
            </View>
          </View>
        );

      case 4: // Floating Review UI
        if (!type) return null;
        return (
          <View className="flex-1 py-6">
            <View className="mb-10 text-center">
              <Text className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Review Answers</Text>
              <Text className="text-slate-500 dark:text-slate-400 mt-2">Tap any answer to jump back and change it.</Text>
            </View>

            <View className="gap-4 mb-12">
              {answers.map((ans, i) => (
                <TouchableOpacity 
                  key={i} activeOpacity={0.7} onPress={() => { setIndex(i); setStep(3); }}
                  className="p-5 bg-amber-50/90 dark:bg-stone-950/90 rounded-[1.5rem] shadow-sm border border-slate-100 dark:border-neutral-800 flex-row items-start gap-4 transition-all"
                >
                  <View className="w-10 h-10 rounded-full bg-slate-50/50 dark:bg-neutral-800/50 items-center justify-center border border-slate-200 dark:border-neutral-700 shrink-0">
                    <Text className="text-slate-500 dark:text-slate-400 font-black text-sm">{i + 1}</Text>
                  </View>
                  
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
                      {QUESTIONS[type][i]}
                    </Text>
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center gap-2">
                        <CheckCircle2 size={16} color="#10b981" />
                        <Text className="text-base font-black text-slate-900 dark:text-white">
                          {OPTIONS_MAP[type].find(o => o.value === ans)?.label}
                        </Text>
                      </View>
                      <View className="px-3 py-1 bg-indigo-50 dark:bg-indigo-500/10 rounded-full">
                        <Text className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Edit</Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            <View className="flex-col gap-4 mt-auto">
              <Button 
                onPress={submitAssessment} 
                isDisabled={isSubmitting}
                className="w-full h-16 rounded-2xl bg-indigo-600/90 shadow-lg shadow-indigo-500/30 flex-row justify-center items-center" 
              >
                {isSubmitting ? (
                  <>
                    <ActivityIndicator color="#ffffff" className="mr-3" />
                    <Text className="font-bold text-white text-base">Analyzing Data...</Text>
                  </>
                ) : (
                  <Text className="font-bold text-white text-base">Submit Assessment</Text>
                )}
              </Button>
              <Button variant="bordered" className="w-full h-14 rounded-2xl border-slate-300 dark:border-neutral-700" onPress={() => { setStep(3); setIndex(0); }}>
                <Text className="font-bold text-slate-600 dark:text-slate-300">Start Over</Text>
              </Button>
            </View>
          </View>
        );

      case 5: // Success
        return (
          <View className="flex-1 items-center justify-center py-10 px-4">
            <View className="w-24 h-24 bg-emerald-50/90 dark:bg-emerald-500/10 rounded-full items-center justify-center mb-8 border border-emerald-100 dark:border-emerald-500/20 shadow-lg shadow-emerald-500/20">
              <Check size={48} color="#10b981" strokeWidth={3} />
            </View>
            <Text className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-4 text-center">Assessment Complete</Text>
            <Text className="text-slate-500 dark:text-slate-400 mb-12 text-center text-lg max-w-sm">
              Your responses have been securely saved and analyzed.
            </Text>
            
            <Button 
              onPress={handleViewReport} 
              isDisabled={isGeneratingReport}
              className="w-full max-w-sm h-14 rounded-2xl bg-emerald-600/90 shadow-lg shadow-emerald-500/30 mb-4 flex-row items-center justify-center" 
            >
              {isGeneratingReport ? (
                <>
                  <ActivityIndicator color="#ffffff" className="mr-3" />
                  <Text className="font-bold text-white text-base">Generating Report...</Text>
                </>
              ) : (
                <Text className="font-bold text-white text-base">View Full Report</Text>
              )}
            </Button>
            
            <TouchableOpacity onPress={() => router.push('/core/dashboard')}>
              <Text className="font-bold text-slate-400">Return to Dashboard</Text>
            </TouchableOpacity>
          </View>
        );

      case 6: // Report
        if (!result || !type) return null;
        const recs = generateRecommendations(type, result.risk_level);
        const scorePct = (result.score / MAX_SCORES[type]) * 100;
        
        return (
          <View className="flex-1 py-4 px-2">
            <View className="items-center mb-8">
              <View className="px-4 py-1 mb-4 bg-indigo-50 dark:bg-indigo-500/10 rounded-full">
                <Text className="text-md font-bold tracking-widest text-indigo-700 dark:text-indigo-400 uppercase">{TITLES[type]} Result</Text>
              </View>
              <Text className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Your Analysis</Text>
            </View>

            <View className="flex-row gap-4 mb-6 h-36">
              {/* Score Box */}
              <View className="flex-1 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-3xl items-center justify-center shadow-sm">
                <Text className="text-md font-bold text-slate-400 uppercase tracking-widest mb-2">Total Score</Text>
                <Text className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter">{result.score}</Text>
                
                <View className="w-3/4 h-1.5 bg-slate-100 dark:bg-neutral-800 rounded-full mt-3 overflow-hidden">
                  <View style={{ width: `${scorePct}%` }} className="h-full bg-indigo-500 rounded-full" />
                </View>
              </View>

              {/* Risk Box */}
              <View className="flex-1 bg-indigo-600 rounded-3xl items-center justify-center shadow-lg shadow-indigo-500/30 p-2">
                <Text className="text-md font-bold text-indigo-200 uppercase tracking-widest mb-2 text-center">Severity Risk</Text>
                <Text className="text-2xl font-bold text-white capitalize text-center leading-tight">
                  {result.risk_level.replace('_', ' ')}
                </Text>
              </View>
            </View>

            {/* Insight Card */}
            <View className="bg-indigo-50/60 dark:bg-indigo-500/10 p-6 rounded-3xl border border-indigo-100 dark:border-indigo-500/20 mb-6">
              <Text className="text-sm font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-3">Assessment Insight</Text>
              <Text className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                {result.insight || "Your scores indicate minimal to no significant symptoms currently. Maintain your current routines."}
              </Text>
              <Text className="text-md text-slate-500 mt-4 italic">{result.disclaimer}</Text>
            </View>

            {/* Recommendations */}
            <View className="bg-slate-50/60 dark:bg-stone-950/90 p-6 rounded-3xl border border-slate-200 dark:border-neutral-800 mb-8 shadow-sm">
              <View className="flex-row items-center gap-2 mb-5">
                <CheckCircle2 size={20} color="#10b981" />
                <Text className="text-sm font-bold uppercase tracking-widest text-slate-800 dark:text-slate-200">Actionable Next Steps</Text>
              </View>
              <View className="gap-4">
                {recs.map((rec, i) => (
                  <View key={i} className="flex-row items-start gap-3">
                    <View className="mt-1 w-5 h-5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 items-center justify-center border border-emerald-100 dark:border-emerald-500/20 shrink-0">
                      <Check size={12} color="#10b981" strokeWidth={3} />
                    </View>
                    <Text className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-snug flex-1">{rec}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Actions */}
            <View className="gap-4 mb-4">
              <Button 
                onPress={goToChatWithContext} 
                isLoading={isStartingChat}
                className="w-full h-16 rounded-2xl bg-indigo-600/90 shadow-lg shadow-indigo-500/30"
              >
                {!isStartingChat && <Sparkles size={20} color="#ffffff" className="mr-2" />}
                <Text className="font-bold text-white text-base tracking-wide">Discuss with Smera</Text>
              </Button>
              
              <View className="flex-row gap-4">
                <Button variant="bordered" className="flex-1 h-12 rounded-xl border-slate-200 dark:border-neutral-700" onPress={() => router.push('/core/dashboard')}>
                  <Text className="font-bold text-slate-600 dark:text-slate-300">Dashboard</Text>
                </Button>
                <Button variant="flat" className="flex-1 h-12 rounded-xl bg-amber-100/90 dark:bg-amber-300/30" onPress={() => setStep(1)}>
                  <RefreshCcw size={16} color={isDarkMode ? "#cbd5e1" : "#475569"} className="mr-2" />
                  <Text className="font-bold text-slate-600 dark:text-slate-300">Retake</Text>
                </Button>
              </View>
            </View>
          </View>
        );

      default: return null;
    }
  };

  const isFloatingStep = step === 1 || step === 3 || step === 4;
  const containerClass = isFloatingStep 
    ? "w-full flex-1" 
    : "w-full bg-amber-50/90 dark:bg-stone-950/90 border border-white/60 dark:border-neutral-800 rounded-[2.5rem] shadow-xl overflow-hidden min-h-[500px] p-2 flex-col";

  return (
    <View className="flex-1 bg-transparent">
      <LinearGradient
        colors={isDarkMode ? ['rgba(30,27,75,0.15)', 'transparent'] : ['rgba(224,231,255,0.6)', 'transparent']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 300 }}
      />
      
      <ScrollView 
        contentContainerClassName="p-6 pb-32 pt-16 flex-grow" 
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>
          <View className={containerClass}>
            {renderContent()}
          </View>
        </Animated.View>
      </ScrollView>

      {/* THEME BASED CUSTOM ALERT MODAL */}
      <Modal transparent visible={customAlert.visible} animationType="fade">
        <View className="flex-1 bg-black/60 justify-center items-center px-6">
          <View className="bg-white dark:bg-neutral-900 w-full rounded-[2rem] p-8 items-center shadow-2xl border border-slate-100 dark:border-neutral-800">
            <View className="w-16 h-16 bg-red-50 dark:bg-red-500/10 rounded-full items-center justify-center mb-4 border border-red-100 dark:border-red-500/20">
              <AlertCircle size={32} color={isDarkMode ? "#ef4444" : "#dc2626"} strokeWidth={2.5} />
            </View>
            <Text className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-2 text-center">
              {customAlert.title}
            </Text>
            <Text className="text-slate-500 dark:text-slate-400 mb-8 text-center text-base leading-relaxed">
              {customAlert.message}
            </Text>
            <Button 
              color="primary" 
              className="w-full h-14 rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-500/30" 
              onPress={() => setCustomAlert({ ...customAlert, visible: false })}
            >
              <Text className="font-bold text-white text-base">Understood</Text>
            </Button>
          </View>
        </View>
      </Modal>
    </View>
  );
}