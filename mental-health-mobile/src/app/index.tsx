import '../global.css';
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';

// --- Static Data ---
const WHO5_QUESTIONS = [
  "I have felt cheerful and in good spirits",
  "I have felt calm and relaxed",
  "I have felt active and vigorous",
  "I woke up feeling fresh and rested",
  "My daily life has been filled with things that interest me"
];

const WHO5_OPTIONS = [
  { label: "All of the time", value: 5 },
  { label: "Most of the time", value: 4 },
  { label: "More than half of the time", value: 3 },
  { label: "Less than half of the time", value: 2 },
  { label: "Some of the time", value: 1 },
  { label: "At no time", value: 0 }
];

const FAQS = [
  { q: "Is this therapy?", a: "No. SupportSync is a digital support and awareness platform. It is not a replacement for professional clinical care, therapy, or medical advice." },
  { q: "Is my data safe?", a: "Absolutely. We utilize zero-knowledge architecture. All conversations and journals are encrypted locally on your device." },
  { q: "Can I delete my data?", a: "Yes. Because we use a zero-knowledge architecture, your data lives securely on your device and can be erased anytime." }
];

export default function LandingScreen() {
  const router = useRouter();

  // --- State ---
  const [moodResponse, setMoodResponse] = useState<{mood: string, msg: string} | null>(null);
  const [who5State, setWho5State] = useState<'intro' | 'form' | 'result'>('intro');
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(Array(5).fill(null));
  const [who5Score, setWho5Score] = useState({ percentage: 0, band: '', msg: '', color: '' });
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);

  // --- Handlers ---
  const handleMoodSelect = (mood: string, msg: string) => setMoodResponse({ mood, msg });

  const handleWho5Select = (value: number) => {
    const newAnswers = [...answers];
    newAnswers[currentQIndex] = value;
    setAnswers(newAnswers);
  };

  const calculateWHO5 = () => {
    const total = answers.reduce((sum, val) => sum! + val!, 0);
    const percentage = total! * 4;
    
    let band = '', msg = '', color = '';
    if (percentage >= 67) { band = "Good Well-Being"; color = "text-amber-400"; msg = "Your score suggests you're in a good place emotionally."; }
    else if (percentage >= 50) { band = "Moderate Well-Being"; color = "text-yellow-400"; msg = "Your score is in the moderate range. Small steps like rest and connection can help."; }
    else if (percentage >= 29) { band = "Low Well-Being"; color = "text-orange-400"; msg = "Your score suggests some emotional difficulties. Consider speaking with someone you trust."; }
    else { band = "Very Low Well-Being"; color = "text-rose-500"; msg = "Your score indicates significant distress. Please reach out to a professional."; }

    setWho5Score({ percentage, band, msg, color });
    setWho5State('result');
  };

  return (
    <ScrollView className="flex-1 bg-[#09090b]" contentContainerStyle={{ padding: 24, paddingBottom: 60 }}>
      
      {/* 1. HERO SECTION */}
      <View className="items-center mt-10 mb-10">
        <View className="bg-amber-500/10 border border-amber-500/30 px-4 py-2 rounded-full mb-6">
          <Text className="text-amber-200 text-[10px] font-bold tracking-widest uppercase">Safe · Private · Always Available</Text>
        </View>
        <Text className="text-4xl font-black text-white text-center">Your Mind Deserves</Text>
        <Text className="text-4xl font-black text-amber-400 text-center mb-4">Genuine Support</Text>
        <Text className="text-base text-zinc-400 text-center mb-8 leading-relaxed">Talk freely. Feel heard. An extravagant, highly-secured space designed to support your emotional wellness.</Text>
        
        <View className="flex-row gap-3 flex-wrap justify-center">
          <TouchableOpacity className="bg-amber-400 py-3.5 px-6 rounded-full" onPress={() => router.push('/accounts/register')}>
            <Text className="text-zinc-900 font-black tracking-wider text-xs">BEGIN JOURNEY</Text>
          </TouchableOpacity>
          <TouchableOpacity className="bg-white/5 border border-white/10 py-3.5 px-6 rounded-full" onPress={() => router.push('/accounts/login')}>
            <Text className="text-zinc-200 font-bold tracking-wider text-xs">LOG IN</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. MOOD CHECK-IN */}
      <View className="my-8">
        <Text className="text-3xl font-black text-white text-center mb-6">How's Your Energy <Text className="text-amber-400">Right Now?</Text></Text>
        <View className="flex-row flex-wrap justify-center gap-3">
          {[
            { e: '😊', m: 'Good', txt: 'You\'re glowing! Keep that energy and share it.' },
            { e: '😌', m: 'Calm', txt: 'Stillness is a superpower. Enjoy this peaceful moment.' },
            { e: '😢', m: 'Low', txt: 'It\'s neutral to feel this. You\'re not alone.' },
            { e: '😰', m: 'Stressed', txt: 'Take one slow breath. Ground yourself.' }
          ].map((item, idx) => (
            <TouchableOpacity key={idx} className="bg-zinc-900/70 border border-white/10 rounded-2xl p-4 items-center w-[45%]" onPress={() => handleMoodSelect(item.m, item.txt)}>
              <Text className="text-3xl mb-2">{item.e}</Text>
              <Text className="text-zinc-400 text-[10px] font-black tracking-widest uppercase">{item.m}</Text>
            </TouchableOpacity>
          ))}
        </View>
        
        {moodResponse && (
          <View className="mt-6 bg-zinc-900/80 border border-amber-500/30 p-5 rounded-2xl">
            <Text className="text-xl font-black text-white mb-2">{moodResponse.mood}</Text>
            <Text className="text-sm text-zinc-300 leading-relaxed">{moodResponse.msg}</Text>
          </View>
        )}
      </View>

      {/* 3. WHO-5 ASSESSMENT */}
      <View className="my-8 bg-zinc-900/70 border border-white/10 rounded-3xl p-6">
        <Text className="text-2xl font-black text-white text-center mb-6">WHO-5 Well-Being Check</Text>
        
        {who5State === 'intro' && (
          <View className="items-center py-5">
            <Text className="text-zinc-400 mb-6 text-center">5 simple questions · Validated scale · Under 2 minutes</Text>
            <TouchableOpacity className="bg-amber-400 py-3.5 px-6 rounded-full" onPress={() => setWho5State('form')}>
              <Text className="text-zinc-900 font-black tracking-wider text-xs">START ASSESSMENT</Text>
            </TouchableOpacity>
          </View>
        )}

        {who5State === 'form' && (
          <View>
            <Text className="text-amber-400 text-[10px] font-black tracking-widest uppercase mb-3">Question {currentQIndex + 1} of 5</Text>
            <Text className="text-white text-xl font-bold mb-6 leading-relaxed">{WHO5_QUESTIONS[currentQIndex]}</Text>
            
            {WHO5_OPTIONS.map((opt) => {
              const isSelected = answers[currentQIndex] === opt.value;
              return (
                <TouchableOpacity 
                  key={opt.value} 
                  className={`border p-4 rounded-xl mb-2 ${isSelected ? 'bg-amber-500/10 border-amber-400' : 'bg-zinc-900/50 border-white/10'}`}
                  onPress={() => handleWho5Select(opt.value)}
                >
                  <Text className={`text-sm ${isSelected ? 'text-amber-400 font-bold' : 'text-zinc-300'}`}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}

            <View className="flex-row justify-between items-center mt-6 pt-5 border-t border-white/10">
              {currentQIndex > 0 ? (
                <TouchableOpacity onPress={() => setCurrentQIndex(prev => prev - 1)}><Text className="text-zinc-400 font-bold tracking-wider text-xs">← BACK</Text></TouchableOpacity>
              ) : <View />}

              {currentQIndex < 4 ? (
                <TouchableOpacity 
                  disabled={answers[currentQIndex] === null}
                  className={`bg-white/5 border border-white/10 py-3 px-5 rounded-full ${answers[currentQIndex] === null ? 'opacity-50' : ''}`}
                  onPress={() => setCurrentQIndex(prev => prev + 1)}>
                  <Text className="text-zinc-200 font-bold tracking-wider text-xs">NEXT →</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  disabled={answers[currentQIndex] === null}
                  className={`bg-amber-400 py-3 px-5 rounded-full ${answers[currentQIndex] === null ? 'opacity-50' : ''}`}
                  onPress={calculateWHO5}>
                  <Text className="text-zinc-900 font-black tracking-wider text-xs">CALCULATE</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {who5State === 'result' && (
          <View className="items-center py-5">
            <Text className={`text-6xl font-black mb-2 ${who5Score.color}`}>{who5Score.percentage}%</Text>
            <Text className={`text-base font-black tracking-widest uppercase mb-3 ${who5Score.color}`}>{who5Score.band}</Text>
            <Text className="text-zinc-300 text-center leading-relaxed mb-5">{who5Score.msg}</Text>
            <TouchableOpacity onPress={() => { setAnswers(Array(5).fill(null)); setCurrentQIndex(0); setWho5State('intro'); }}>
              <Text className="text-zinc-400 font-bold tracking-wider text-xs">↩ RETAKE ASSESSMENT</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* 4. FAQS */}
      <View className="my-8">
        <Text className="text-3xl font-black text-white text-center mb-6">Frequently Asked <Text className="text-amber-400">Questions</Text></Text>
        {FAQS.map((faq, idx) => (
          <TouchableOpacity key={idx} className="bg-zinc-900/70 border border-white/10 rounded-3xl p-6 mb-4" onPress={() => setExpandedFAQ(expandedFAQ === idx ? null : idx)}>
            <View className="flex-row justify-between items-center">
              <Text className="text-zinc-200 text-base font-bold flex-1">{faq.q}</Text>
              <Text className="text-amber-400 text-2xl font-light">{expandedFAQ === idx ? '−' : '+'}</Text>
            </View>
            {expandedFAQ === idx && <Text className="text-zinc-400 mt-3 text-sm leading-relaxed">{faq.a}</Text>}
          </TouchableOpacity>
        ))}
      </View>

    </ScrollView>
  );
}