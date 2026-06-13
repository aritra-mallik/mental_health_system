import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  Animated,
  Dimensions,
  TouchableOpacity,
  FlatList,
  ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');

const ONBOARDING_DATA = [
  {
    id: '1',
    title: 'Welcome to Mindful',
    description: 'Begin your journey to better mental health and clarity today.',
    image: require('../../assets/images/introduction_image.png'), 
  },
  {
    id: '2',
    title: 'Self Care',
    description: 'Take time out of your busy schedule to focus on your well-being.',
    image: require('../../assets/images/care_image.png'),
  },
  {
    id: '3',
    title: 'Mood Diary',
    description: 'Keep track of your emotions and reflect on your daily progress.',
    image: require('../../assets/images/mood_diary_image.png'),
  },
  {
    id: '4',
    title: 'Relax & Unwind',
    description: 'Discover techniques to help you relax, breathe, and find your center.',
    image: require('../../assets/images/relax_image.png'),
  },
  {
    id: '5',
    title: 'Ready to Start?',
    description: 'Join us today and make your mental health a priority.',
    image: require('../../assets/images/welcome.png'),
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const slidesRef = useRef<FlatList>(null);
  const [isRegisterLoading, setIsRegisterLoading] = useState(false);
  const [isLoginLoading, setIsLoginLoading] = useState(false);

  const handleRegisterRoute = () => {
    setIsRegisterLoading(true);
    // A small delay allows the spinner to animate beautifully before the screen transition
    setTimeout(() => {
      router.push('/accounts/register');
      setIsRegisterLoading(false); // Reset state when coming back
    }, 200); 
  };

  const handleLoginRoute = () => {
    setIsLoginLoading(true);
    setTimeout(() => {
      router.push('/accounts/login');
      setIsLoginLoading(false);
    }, 200);
  };

  const viewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems[0]) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const scrollToNext = () => {
    if (currentIndex < ONBOARDING_DATA.length - 1) {
      slidesRef.current?.scrollToIndex({ index: currentIndex + 1 });
    }
  };

  const skipToLast = () => {
    slidesRef.current?.scrollToIndex({ index: ONBOARDING_DATA.length - 1 });
  };

  // --- Button Animation Setup ---
  const lastIndex = ONBOARDING_DATA.length - 1;
  
  // "Next" button fades out and slides down slightly
  const nextBtnOpacity = scrollX.interpolate({
    inputRange: [(lastIndex - 1) * width, lastIndex * width],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const nextBtnTranslateY = scrollX.interpolate({
    inputRange: [(lastIndex - 1) * width, lastIndex * width],
    outputRange: [0, 20],
    extrapolate: 'clamp',
  });

  // "Register/Login" buttons fade in and slide up into place
  const authBtnsOpacity = scrollX.interpolate({
    inputRange: [(lastIndex - 1) * width, lastIndex * width],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const authBtnsTranslateY = scrollX.interpolate({
    inputRange: [(lastIndex - 1) * width, lastIndex * width],
    outputRange: [20, 0],
    extrapolate: 'clamp',
  });

  return (
    <View className="flex-1 bg-[#F4E4DB] relative">
      
      {/* Absolute Top Skip Button */}
      <View className="absolute top-14 right-6 z-50">
        {currentIndex < ONBOARDING_DATA.length - 1 ? (
          <TouchableOpacity onPress={skipToLast} className="p-2">
            <Text className="text-[#6F4E37] font-bold text-base bg-[#F4E4DB]/50 px-3 py-1 rounded-full overflow-hidden">
              Skip
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Main Carousel */}
      <View className="flex-[3]">
        <Animated.FlatList
          data={ONBOARDING_DATA}
          renderItem={({ item, index }) => {
            const isFirst = index === 0;
            const inputRange = [
              (index - 1) * width,
              index * width,
              (index + 1) * width,
            ];
            
            // Reduced to 0.15 (15% of screen) to make it drift VERY slowly and naturally
            const imageTranslateX = scrollX.interpolate({
              inputRange,
              outputRange: [width * 0.15, 0, -width * 0.15],
              extrapolate: 'clamp',
            });

            // Smooth subtle breathing effect
            const imageScale = scrollX.interpolate({
              inputRange,
              outputRange: [0.9, 1, 0.9],
              extrapolate: 'clamp',
            });

            const textTranslateX = scrollX.interpolate({
              inputRange,
              outputRange: [-width * 0.15, 0, width * 0.15],
              extrapolate: 'clamp',
            });

            const textTranslateY = scrollX.interpolate({
              inputRange,
              outputRange: [15, 0, 15],
              extrapolate: 'clamp',
            });

            const opacity = scrollX.interpolate({
              inputRange: [
                (index - 0.5) * width,
                index * width,
                (index + 0.5) * width,
              ],
              outputRange: [0, 1, 0],
              extrapolate: 'clamp',
            });

            return (
              <View 
                style={{ width }} 
                className={`items-center w-full ${isFirst ? 'justify-start pt-0' : 'justify-center'}`}
              >
                {/* Image Section */}
                <Animated.Image
                  source={item.image}
                  className={isFirst ? "w-full" : "w-80 h-80 mb-4"}
                  style={{ 
                    height: isFirst ? height * 0.55 : 320, 
                    resizeMode: isFirst ? 'cover' : 'contain',
                    opacity, 
                    transform: [
                      { translateX: imageTranslateX }, 
                      { scale: imageScale }
                    ] 
                  }}
                />
                
                {/* Text Section */}
                <Animated.View 
                  style={{ 
                    opacity, 
                    transform: [
                      { translateX: textTranslateX }, 
                      { translateY: textTranslateY }
                    ] 
                  }} 
                  className={`items-center px-8 ${isFirst ? 'mt-8' : ''}`}
                >
                  <Text className="text-3xl font-black text-[#4A3623] mb-4 text-center tracking-tight">
                    {item.title}
                  </Text>
                  <Text className="text-base text-[#6F4E37] text-center leading-relaxed">
                    {item.description}
                  </Text>
                </Animated.View>
              </View>
            );
          }}
          horizontal
          showsHorizontalScrollIndicator={false}
          pagingEnabled
          bounces={false}
          keyExtractor={(item) => item.id}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={16} // Buttery 60fps evaluation
          onViewableItemsChanged={viewableItemsChanged}
          viewabilityConfig={viewConfig}
          ref={slidesRef}
        />
      </View>

      {/* Bottom Section: Paginator & Buttons */}
      <View className="flex-1 justify-end px-8 pb-16">
        
        {/* Paginator Dots */}
        <View className="flex-row justify-center items-center mb-10">
          {ONBOARDING_DATA.map((_, i) => {
            const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [10, 28, 10],
              extrapolate: 'clamp',
            });
            const opacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.3, 1, 0.3],
              extrapolate: 'clamp',
            });

            return (
              <Animated.View
                key={i.toString()}
                className="h-2.5 rounded-full bg-[#4A3623] mx-1.5"
                style={{ width: dotWidth, opacity }}
              />
            );
          })}
        </View>

        {/* Dynamic Animated Action Buttons */}
        <View className="w-full h-32 relative justify-end">
          
          {/* Next Button Container */}
          <Animated.View 
            pointerEvents={currentIndex === lastIndex ? 'none' : 'auto'}
            style={{ 
              opacity: nextBtnOpacity, 
              transform: [{ translateY: nextBtnTranslateY }],
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0
            }}
          >
            <TouchableOpacity 
              onPress={scrollToNext}
              activeOpacity={0.8}
              className="w-full bg-[#4A3623] py-4 rounded-2xl items-center shadow-md shadow-black/10"
            >
              <Text className="text-white font-bold text-lg tracking-wide">
                Next
              </Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Register & Login Buttons Container */}
          <Animated.View 
            pointerEvents={currentIndex === lastIndex ? 'auto' : 'none'}
            style={{ 
              opacity: authBtnsOpacity, 
              transform: [{ translateY: authBtnsTranslateY }],
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0
            }}
          >
            <View className="flex-col w-full">
              
              {/* Register Button */}
              <TouchableOpacity 
                onPress={handleRegisterRoute}
                activeOpacity={0.8}
                disabled={isRegisterLoading}
                className="w-full bg-[#4A3623] py-4 rounded-2xl items-center shadow-md shadow-black/10 mb-4"
              >
                {isRegisterLoading ? (
                  <ActivityIndicator size="small" color="#F4E4DB" />
                ) : (
                  <Text className="text-white font-bold text-lg tracking-wide">
                    Register
                  </Text>
                )}
              </TouchableOpacity>
              
              {/* Login Button */}
              <TouchableOpacity 
                onPress={handleLoginRoute}
                activeOpacity={0.6}
                disabled={isLoginLoading}
                className="w-full bg-transparent py-4 rounded-2xl items-center border-2 border-[#4A3623]"
              >
                {isLoginLoading ? (
                  <ActivityIndicator size="small" color="#4A3623" />
                ) : (
                  <Text className="text-[#4A3623] font-bold text-lg tracking-wide">
                    Login
                  </Text>
                )}
              </TouchableOpacity>

            </View>
          </Animated.View>

        </View>
      </View>
    </View>
  );
}

// import React, { useState } from 'react';
// import { View, ScrollView, TouchableOpacity, Text } from 'react-native';
// import { useRouter } from 'expo-router';
// import { Button, Card } from 'heroui-native';

// // --- Static Data ---
// const WHO5_QUESTIONS = [
//   "I have felt cheerful and in good spirits",
//   "I have felt calm and relaxed",
//   "I have felt active and vigorous",
//   "I woke up feeling fresh and rested",
//   "My daily life has been filled with things that interest me"
// ];

// const WHO5_OPTIONS = [
//   { label: "All of the time", value: 5 },
//   { label: "Most of the time", value: 4 },
//   { label: "More than half of the time", value: 3 },
//   { label: "Less than half of the time", value: 2 },
//   { label: "Some of the time", value: 1 },
//   { label: "At no time", value: 0 }
// ];

// const FAQS = [
//   { q: "Is this therapy?", a: "No. SupportSync is a digital support and awareness platform. It is not a replacement for professional clinical care, therapy, or medical advice." },
//   { q: "Is my data safe?", a: "Absolutely. We utilize strict security measures. All conversations inside journals are encrypted locally on your device using AES-256-GCM. The server only ever sees ciphertext." },
//   { q: "Can I delete my data?", a: "Yes. Because your data lives securely on your device, it can be permanently erased by you at any time." }
// ];

// export default function LandingScreen() {
//   const router = useRouter();

//   // --- State ---
//   const [moodResponse, setMoodResponse] = useState<{mood: string, msg: string} | null>(null);
//   const [who5State, setWho5State] = useState<'intro' | 'form' | 'result'>('intro');
//   const [currentQIndex, setCurrentQIndex] = useState(0);
//   const [answers, setAnswers] = useState<(number | null)[]>(Array(5).fill(null));
//   const [who5Score, setWho5Score] = useState({ percentage: 0, band: '', msg: '', color: '' });
//   const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);

//   // --- Handlers ---
//   const handleMoodSelect = (mood: string, msg: string) => setMoodResponse({ mood, msg });

//   const handleWho5Select = (value: number) => {
//     const newAnswers = [...answers];
//     newAnswers[currentQIndex] = value;
//     setAnswers(newAnswers);
//   };

//   const calculateWHO5 = () => {
//     const total = answers.reduce((sum, val) => sum! + val!, 0);
//     const percentage = total! * 4;
    
//     let band = '', msg = '', color = '';
//     if (percentage >= 67) { band = "Good Well-Being"; color = "text-emerald-500 dark:text-emerald-400"; msg = "Your score suggests you're in a good place emotionally."; }
//     else if (percentage >= 50) { band = "Moderate Well-Being"; color = "text-amber-500 dark:text-amber-400"; msg = "Your score is in the moderate range. Small steps like rest and connection can help."; }
//     else if (percentage >= 29) { band = "Low Well-Being"; color = "text-rose-400 dark:text-rose-400"; msg = "Your score suggests some emotional difficulties. Consider speaking with someone you trust."; }
//     else { band = "Very Low Well-Being"; color = "text-rose-600 dark:text-rose-500"; msg = "Your score indicates significant distress. Please reach out to a professional."; }

//     setWho5Score({ percentage, band, msg, color });
//     setWho5State('result');
//   };

//   return (
//     <ScrollView 
//       className="flex-1 bg-neutral-50 dark:bg-black" 
//       contentContainerStyle={{ padding: 24, paddingBottom: 80, paddingTop: 60 }}
//       showsVerticalScrollIndicator={false}
//     >
      
//       {/* 1. HERO SECTION */}
//       <View className="items-center mb-12">
//         <View className="bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30 px-5 py-2 rounded-full mb-8">
//           <Text className="text-amber-600 dark:text-amber-400 text-[10px] font-black tracking-widest uppercase">
//             Safe · Private · Always Available
//           </Text>
//         </View>
        
//         <Text className="text-4xl font-black text-neutral-900 dark:text-white text-center tracking-tight">
//           Your Mind Deserves
//         </Text>
//         <Text className="text-4xl font-black text-amber-500 text-center mb-5 tracking-tight">
//           Genuine Support
//         </Text>
        
//         <Text className="text-base text-neutral-600 dark:text-neutral-400 text-center mb-8 leading-relaxed max-w-[90%]">
//           Talk freely. Feel heard. An extravagant, highly-secured space designed to support your emotional wellness.
//         </Text>
        
//         <View className="flex-row gap-4 flex-wrap justify-center w-full">
//           <Button 
//             color="primary" 
//             className="rounded-full px-8 shadow-sm"
//             onPress={() => router.push('/accounts/register')}
//           >
//             <Text className="font-bold text-white">BEGIN JOURNEY</Text>
//           </Button>
          
//           {/* FIX: Forced explicit Amber borders and text for the Log In button */}
//           <Button 
//             variant="bordered" 
//             className="rounded-full px-8 border-amber-500 dark:border-amber-500"
//             onPress={() => router.push('/accounts/login')}>
//             <Text className="font-bold text-amber-600 dark:text-amber-500">LOG IN</Text>
//           </Button>
//         </View>
//       </View>

//       {/* 2. MOOD CHECK-IN */}
//       <View className="mb-12">
//         <Text className="text-3xl font-black text-neutral-900 dark:text-white text-center mb-8 tracking-tight">
//           How's Your Energy <Text className="text-amber-500">Right Now?</Text>
//         </Text>
        
//         <View className="flex-row flex-wrap justify-center gap-4">
//           {[
//               {
//                 e: '😊',
//                 m: 'Good',
//                 txt: 'You\'re glowing! Keep that energy and share it.',
//                 color: 'emerald'
//               },
//               {
//                 e: '😌',
//                 m: 'Calm',
//                 txt: 'Stillness is a superpower. Enjoy this peaceful moment.',
//                 color: 'sky'
//               },
//               {
//                 e: '😢',
//                 m: 'Low',
//                 txt: 'It\'s okay to feel this way. You\'re not alone.',
//                 color: 'amber'
//               },
//               {
//                 e: '😰',
//                 m: 'Stressed',
//                 txt: 'Take one slow breath. Ground yourself.',
//                 color: 'rose'
//               }
//             ].map((item, idx) => (
//             <Card 
//               key={idx} 
//               className="p-5 items-center w-[46%] bg-white dark:bg-neutral-900 shadow-sm dark:shadow-none border border-neutral-200 dark:border-neutral-800 rounded-2xl"
//             >
//               <TouchableOpacity 
//                 activeOpacity={0.6}
//                 onPress={() => handleMoodSelect(item.m, item.txt)} 
//                 className="items-center w-full"
//               >
//                 <Text className="text-4xl mb-3">{item.e}</Text>
//                 <Text className="text-neutral-500 dark:text-neutral-400 text-[11px] font-black tracking-widest uppercase">
//                   {item.m}
//                 </Text>
//               </TouchableOpacity>
//             </Card>
//           ))}
//         </View>
        
//         {moodResponse && (
//           <View className="mt-6 p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30">
//             <Text className="text-xl font-black text-amber-600 dark:text-amber-400 mb-2">
//               {moodResponse.mood}
//             </Text>

//             <Text className="text-sm text-neutral-700 dark:text-neutral-200 leading-relaxed">
//               {moodResponse.msg}
//             </Text>
//           </View>
//         )}
//       </View>

//       {/* 3. WHO-5 ASSESSMENT */}
//       <View className="mb-12">
//         <Card className="p-8 bg-white dark:bg-neutral-900 shadow-sm dark:shadow-none border border-neutral-200 dark:border-neutral-800 rounded-3xl">
//           <Text className="text-2xl font-black text-neutral-900 dark:text-white text-center mb-8 tracking-tight">
//             WHO-5 Well-Being Check
//           </Text>
          
//           {who5State === 'intro' && (
//             <View className="items-center py-4">
//               <Text className="text-neutral-500 dark:text-neutral-400 mb-8 text-center leading-relaxed">
//                 5 simple questions · Validated scale · Under 2 minutes
//               </Text>
//               <Button color="primary" className="rounded-full w-full font-bold" onPress={() => setWho5State('form')}>
//                 START ASSESSMENT
//               </Button>
//             </View>
//           )}

//           {who5State === 'form' && (
//             <View>
//               <Text className="text-amber-500 dark:text-amber-400 text-[11px] font-black tracking-widest uppercase mb-4">
//                 Question {currentQIndex + 1} of 5
//               </Text>
//               <Text className="text-neutral-900 dark:text-white text-2xl font-bold mb-8 leading-snug">
//                 {WHO5_QUESTIONS[currentQIndex]}
//               </Text>
              
//               <View className="gap-3">
//                 {WHO5_OPTIONS.map((opt) => {
//                   const isSelected = answers[currentQIndex] === opt.value;
//                   return (
//                     <Button
//                       key={opt.value}
//                       variant="flat"
//                       // FIX: Force solid amber background when selected
//                       className={`justify-start px-5 h-14 rounded-2xl ${isSelected ? 'bg-amber-500 dark:bg-amber-500' : 'bg-neutral-100 dark:bg-neutral-800'}`}
//                       onPress={() => handleWho5Select(opt.value)}>
//                       <Text className={`text-sm ${isSelected ? 'text-white font-bold' : 'text-neutral-700 dark:text-neutral-200'}`}>
//                         {opt.label}
//                       </Text>
//                     </Button>
//                   );
//                 })}
//               </View>

//               <View className="flex-row justify-between items-center mt-8 pt-6 border-t border-neutral-100 dark:border-neutral-800">
                
//                 {/* FIX: Amber Back Button */}
//                 {currentQIndex > 0 ? (
//                   <Button variant="light" className="rounded-full" onPress={() => setCurrentQIndex(prev => prev - 1)}>
//                     <Text className="text-amber-600 dark:text-amber-500 font-bold">← BACK</Text>
//                   </Button>
//                 ) : <View />}

//                 {currentQIndex < 4 ? (
//                   <Button 
//                     variant="bordered"
//                     className={`rounded-full ${answers[currentQIndex] === null ? 'border-amber-500/30' : 'border-amber-500 dark:border-amber-500'}`}
//                     isDisabled={answers[currentQIndex] === null}
//                     onPress={() => setCurrentQIndex(prev => prev + 1)}>
//                     <Text className={`font-bold ${answers[currentQIndex] === null ? 'text-amber-500/50' : 'text-amber-600 dark:text-amber-500'}`}>NEXT →</Text>
//                   </Button>
//                 ) : (
//                   <Button 
//                     className={`rounded-full ${answers[currentQIndex] === null ? 'bg-amber-500/50' : 'bg-amber-500 dark:bg-amber-500'}`}
//                     isDisabled={answers[currentQIndex] === null}
//                     onPress={calculateWHO5}>
//                     <Text className="text-white font-bold">CALCULATE</Text>
//                   </Button>
//                 )}
//               </View>
//             </View>
//           )}

//           {who5State === 'result' && (
//             <View className="items-center py-6">
//               <Text className={`text-7xl font-black mb-3 tracking-tighter ${who5Score.color}`}>{who5Score.percentage}%</Text>
//               <Text className={`text-sm font-black tracking-widest uppercase mb-4 ${who5Score.color}`}>{who5Score.band}</Text>
//               <Text className="text-neutral-600 dark:text-neutral-300 text-center leading-relaxed mb-8 px-4">{who5Score.msg}</Text>
//               <Button variant="light" className="rounded-full" onPress={() => { setAnswers(Array(5).fill(null)); setCurrentQIndex(0); setWho5State('intro'); }}>
//                 <Text className="text-neutral-500 dark:text-neutral-400 font-bold">↩ RETAKE ASSESSMENT</Text>
//               </Button>
//             </View>
//           )}
//         </Card>
//       </View>

//       {/* 4. FAQS */}
//       <View className="mb-4">
//         <Text className="text-3xl font-black text-neutral-900 dark:text-white text-center mb-8 tracking-tight">
//           Frequently Asked <Text className="text-amber-500">Questions</Text>
//         </Text>
        
//         <View className="gap-4">
//           {FAQS.map((faq, idx) => (
//             <Card key={idx} className="p-6 bg-white dark:bg-neutral-900 shadow-sm dark:shadow-none border border-neutral-200 dark:border-neutral-800 rounded-2xl">
//               <TouchableOpacity 
//                 activeOpacity={0.7}
//                 onPress={() => setExpandedFAQ(expandedFAQ === idx ? null : idx)}>
//                 <View className="flex-row justify-between items-center">
//                   <Text className="text-neutral-900 dark:text-white text-base font-bold flex-1 pr-4">{faq.q}</Text>
//                   <Text className="text-amber-500 text-2xl font-light">{expandedFAQ === idx ? '−' : '+'}</Text>
//                 </View>
//                 {expandedFAQ === idx && (
//                   <Text className="text-neutral-600 dark:text-neutral-400 mt-4 text-sm leading-relaxed">
//                     {faq.a}
//                   </Text>
//                 )}
//               </TouchableOpacity>
//             </Card>
//           ))}
//         </View>
//       </View>

//     </ScrollView>
//   );
// }