import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, type ViewProps } from 'react-native';

import { ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
  type?: ThemeColor;
  showOrbs?: boolean; // New prop to toggle the background
};

// Helper component to animate the floating balls
function FloatingOrb({ 
  className, 
  delay = 0, 
  duration = 4000, 
  moveY = -20, 
  scaleTo = 1.1 
}: { 
  className: string, 
  delay?: number, 
  duration?: number, 
  moveY?: number,
  scaleTo?: number
}) {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1, // Moves up and scales up
          duration: duration,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0, // Returns to original state
          duration: duration,
          useNativeDriver: true,
        }),
      ])
    );

    // Stagger the animations so they don't all move at the exact same time
    const timer = setTimeout(() => animation.start(), delay);
    return () => {
      clearTimeout(timer);
      animation.stop();
    };
  }, [animatedValue, delay, duration]);

  // Interpolate the 0-1 value into actual pixel movements and scales
  const translateY = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, moveY]
  });

  const scale = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [1, scaleTo]
  });

  return (
    <Animated.View
      className={className}
      style={{ transform: [{ translateY }, { scale }] }}
    />
  );
}

export function ThemedView({ 
  style, 
  lightColor, 
  darkColor, 
  type, 
  showOrbs = false, 
  children, 
  ...otherProps 
}: ThemedViewProps) {
  const theme = useTheme();
  const backgroundColor = theme[type ?? 'background'];

  return (
    <View 
      style={[{ backgroundColor, overflow: showOrbs ? 'hidden' : 'visible' }, style]} 
      {...otherProps}
    >
      
      {showOrbs && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none" className="z-0">
          
          {/* Top Left Orb - Indigo */}
          <FloatingOrb 
            className="absolute -top-20 -left-20 w-72 h-72 bg-indigo-400/20 dark:bg-indigo-500/15 rounded-full blur-[80px]" 
            duration={5000} 
            moveY={-30} 
            scaleTo={1.1}
          />
          
          {/* Bottom Right Orb - Fuchsia/Purple */}
          <FloatingOrb 
            className="absolute -bottom-32 -right-32 w-96 h-96 bg-fuchsia-400/20 dark:bg-purple-600/15 rounded-full blur-[100px]" 
            delay={1500} 
            duration={6000} 
            moveY={-40} 
            scaleTo={1.2}
          />
          
          {/* Center Right Orb - Teal/Emerald */}
          <FloatingOrb 
            className="absolute top-1/3 -right-20 w-64 h-64 bg-teal-400/15 dark:bg-emerald-500/10 rounded-full blur-[80px]" 
            delay={800} 
            duration={4500} 
            moveY={25} 
            scaleTo={1.05}
          />
          
        </View>
      )}

      {/* Main Content */}
      <View style={{ flex: 1, zIndex: 1 }}>
        {children}
      </View>
      
    </View>
  );
}


