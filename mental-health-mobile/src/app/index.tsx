import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Card } from 'heroui-native';

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
  { q: "Is my data safe?", a: "Absolutely. We utilize strict security measures. All conversations inside journals are encrypted locally on your device using AES-256-GCM. The server only ever sees ciphertext." },
  { q: "Can I delete my data?", a: "Yes. Because your data lives securely on your device, it can be permanently erased by you at any time." }
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
    if (percentage >= 67) { band = "Good Well-Being"; color = "text-emerald-500 dark:text-emerald-400"; msg = "Your score suggests you're in a good place emotionally."; }
    else if (percentage >= 50) { band = "Moderate Well-Being"; color = "text-amber-500 dark:text-amber-400"; msg = "Your score is in the moderate range. Small steps like rest and connection can help."; }
    else if (percentage >= 29) { band = "Low Well-Being"; color = "text-rose-400 dark:text-rose-400"; msg = "Your score suggests some emotional difficulties. Consider speaking with someone you trust."; }
    else { band = "Very Low Well-Being"; color = "text-rose-600 dark:text-rose-500"; msg = "Your score indicates significant distress. Please reach out to a professional."; }

    setWho5Score({ percentage, band, msg, color });
    setWho5State('result');
  };

  return (
    <ScrollView 
      className="flex-1 bg-neutral-50 dark:bg-black" 
      contentContainerStyle={{ padding: 24, paddingBottom: 80, paddingTop: 60 }}
      showsVerticalScrollIndicator={false}
    >
      
      {/* 1. HERO SECTION */}
      <View className="items-center mb-12">
        <View className="bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30 px-5 py-2 rounded-full mb-8">
          <Text className="text-amber-600 dark:text-amber-400 text-[10px] font-black tracking-widest uppercase">
            Safe · Private · Always Available
          </Text>
        </View>
        
        <Text className="text-4xl font-black text-neutral-900 dark:text-white text-center tracking-tight">
          Your Mind Deserves
        </Text>
        <Text className="text-4xl font-black text-amber-500 text-center mb-5 tracking-tight">
          Genuine Support
        </Text>
        
        <Text className="text-base text-neutral-600 dark:text-neutral-400 text-center mb-8 leading-relaxed max-w-[90%]">
          Talk freely. Feel heard. An extravagant, highly-secured space designed to support your emotional wellness.
        </Text>
        
        <View className="flex-row gap-4 flex-wrap justify-center w-full">
          <Button 
            color="primary" 
            className="rounded-full px-8 shadow-sm"
            onPress={() => router.push('/accounts/register')}
          >
            <Text className="font-bold text-white">BEGIN JOURNEY</Text>
          </Button>
          
          {/* FIX: Forced explicit Amber borders and text for the Log In button */}
          <Button 
            variant="bordered" 
            className="rounded-full px-8 border-amber-500 dark:border-amber-500"
            onPress={() => router.push('/accounts/login')}>
            <Text className="font-bold text-amber-600 dark:text-amber-500">LOG IN</Text>
          </Button>
        </View>
      </View>

      {/* 2. MOOD CHECK-IN */}
      <View className="mb-12">
        <Text className="text-3xl font-black text-neutral-900 dark:text-white text-center mb-8 tracking-tight">
          How's Your Energy <Text className="text-amber-500">Right Now?</Text>
        </Text>
        
        <View className="flex-row flex-wrap justify-center gap-4">
          {[
              {
                e: '😊',
                m: 'Good',
                txt: 'You\'re glowing! Keep that energy and share it.',
                color: 'emerald'
              },
              {
                e: '😌',
                m: 'Calm',
                txt: 'Stillness is a superpower. Enjoy this peaceful moment.',
                color: 'sky'
              },
              {
                e: '😢',
                m: 'Low',
                txt: 'It\'s okay to feel this way. You\'re not alone.',
                color: 'amber'
              },
              {
                e: '😰',
                m: 'Stressed',
                txt: 'Take one slow breath. Ground yourself.',
                color: 'rose'
              }
            ].map((item, idx) => (
            <Card 
              key={idx} 
              className="p-5 items-center w-[46%] bg-white dark:bg-neutral-900 shadow-sm dark:shadow-none border border-neutral-200 dark:border-neutral-800 rounded-2xl"
            >
              <TouchableOpacity 
                activeOpacity={0.6}
                onPress={() => handleMoodSelect(item.m, item.txt)} 
                className="items-center w-full"
              >
                <Text className="text-4xl mb-3">{item.e}</Text>
                <Text className="text-neutral-500 dark:text-neutral-400 text-[11px] font-black tracking-widest uppercase">
                  {item.m}
                </Text>
              </TouchableOpacity>
            </Card>
          ))}
        </View>
        
        {moodResponse && (
          <View className="mt-6 p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30">
            <Text className="text-xl font-black text-amber-600 dark:text-amber-400 mb-2">
              {moodResponse.mood}
            </Text>

            <Text className="text-sm text-neutral-700 dark:text-neutral-200 leading-relaxed">
              {moodResponse.msg}
            </Text>
          </View>
        )}
      </View>

      {/* 3. WHO-5 ASSESSMENT */}
      <View className="mb-12">
        <Card className="p-8 bg-white dark:bg-neutral-900 shadow-sm dark:shadow-none border border-neutral-200 dark:border-neutral-800 rounded-3xl">
          <Text className="text-2xl font-black text-neutral-900 dark:text-white text-center mb-8 tracking-tight">
            WHO-5 Well-Being Check
          </Text>
          
          {who5State === 'intro' && (
            <View className="items-center py-4">
              <Text className="text-neutral-500 dark:text-neutral-400 mb-8 text-center leading-relaxed">
                5 simple questions · Validated scale · Under 2 minutes
              </Text>
              <Button color="primary" className="rounded-full w-full font-bold" onPress={() => setWho5State('form')}>
                START ASSESSMENT
              </Button>
            </View>
          )}

          {who5State === 'form' && (
            <View>
              <Text className="text-amber-500 dark:text-amber-400 text-[11px] font-black tracking-widest uppercase mb-4">
                Question {currentQIndex + 1} of 5
              </Text>
              <Text className="text-neutral-900 dark:text-white text-2xl font-bold mb-8 leading-snug">
                {WHO5_QUESTIONS[currentQIndex]}
              </Text>
              
              <View className="gap-3">
                {WHO5_OPTIONS.map((opt) => {
                  const isSelected = answers[currentQIndex] === opt.value;
                  return (
                    <Button
                      key={opt.value}
                      variant="flat"
                      // FIX: Force solid amber background when selected
                      className={`justify-start px-5 h-14 rounded-2xl ${isSelected ? 'bg-amber-500 dark:bg-amber-500' : 'bg-neutral-100 dark:bg-neutral-800'}`}
                      onPress={() => handleWho5Select(opt.value)}>
                      <Text className={`text-sm ${isSelected ? 'text-white font-bold' : 'text-neutral-700 dark:text-neutral-200'}`}>
                        {opt.label}
                      </Text>
                    </Button>
                  );
                })}
              </View>

              <View className="flex-row justify-between items-center mt-8 pt-6 border-t border-neutral-100 dark:border-neutral-800">
                
                {/* FIX: Amber Back Button */}
                {currentQIndex > 0 ? (
                  <Button variant="light" className="rounded-full" onPress={() => setCurrentQIndex(prev => prev - 1)}>
                    <Text className="text-amber-600 dark:text-amber-500 font-bold">← BACK</Text>
                  </Button>
                ) : <View />}

                {currentQIndex < 4 ? (
                  <Button 
                    variant="bordered"
                    className={`rounded-full ${answers[currentQIndex] === null ? 'border-amber-500/30' : 'border-amber-500 dark:border-amber-500'}`}
                    isDisabled={answers[currentQIndex] === null}
                    onPress={() => setCurrentQIndex(prev => prev + 1)}>
                    <Text className={`font-bold ${answers[currentQIndex] === null ? 'text-amber-500/50' : 'text-amber-600 dark:text-amber-500'}`}>NEXT →</Text>
                  </Button>
                ) : (
                  <Button 
                    className={`rounded-full ${answers[currentQIndex] === null ? 'bg-amber-500/50' : 'bg-amber-500 dark:bg-amber-500'}`}
                    isDisabled={answers[currentQIndex] === null}
                    onPress={calculateWHO5}>
                    <Text className="text-white font-bold">CALCULATE</Text>
                  </Button>
                )}
              </View>
            </View>
          )}

          {who5State === 'result' && (
            <View className="items-center py-6">
              <Text className={`text-7xl font-black mb-3 tracking-tighter ${who5Score.color}`}>{who5Score.percentage}%</Text>
              <Text className={`text-sm font-black tracking-widest uppercase mb-4 ${who5Score.color}`}>{who5Score.band}</Text>
              <Text className="text-neutral-600 dark:text-neutral-300 text-center leading-relaxed mb-8 px-4">{who5Score.msg}</Text>
              <Button variant="light" className="rounded-full" onPress={() => { setAnswers(Array(5).fill(null)); setCurrentQIndex(0); setWho5State('intro'); }}>
                <Text className="text-neutral-500 dark:text-neutral-400 font-bold">↩ RETAKE ASSESSMENT</Text>
              </Button>
            </View>
          )}
        </Card>
      </View>

      {/* 4. FAQS */}
      <View className="mb-4">
        <Text className="text-3xl font-black text-neutral-900 dark:text-white text-center mb-8 tracking-tight">
          Frequently Asked <Text className="text-amber-500">Questions</Text>
        </Text>
        
        <View className="gap-4">
          {FAQS.map((faq, idx) => (
            <Card key={idx} className="p-6 bg-white dark:bg-neutral-900 shadow-sm dark:shadow-none border border-neutral-200 dark:border-neutral-800 rounded-2xl">
              <TouchableOpacity 
                activeOpacity={0.7}
                onPress={() => setExpandedFAQ(expandedFAQ === idx ? null : idx)}>
                <View className="flex-row justify-between items-center">
                  <Text className="text-neutral-900 dark:text-white text-base font-bold flex-1 pr-4">{faq.q}</Text>
                  <Text className="text-amber-500 text-2xl font-light">{expandedFAQ === idx ? '−' : '+'}</Text>
                </View>
                {expandedFAQ === idx && (
                  <Text className="text-neutral-600 dark:text-neutral-400 mt-4 text-sm leading-relaxed">
                    {faq.a}
                  </Text>
                )}
              </TouchableOpacity>
            </Card>
          ))}
        </View>
      </View>

    </ScrollView>
  );
}