import React from 'react';
import { Platform, StyleSheet, Text as RNText, type TextProps, type TextStyle } from 'react-native';

import { Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePreferences } from '@/context/PreferencesContext';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();
  const { fontSize } = usePreferences();

  let scaleMultiplier = 1;
  if (fontSize === 'small') scaleMultiplier = 0.85;
  if (fontSize === 'large') scaleMultiplier = 1.25;

  const combinedStyles = [
    { color: theme[themeColor ?? 'text'] },
    type === 'default' && styles.default,
    type === 'title' && styles.title,
    type === 'small' && styles.small,
    type === 'smallBold' && styles.smallBold,
    type === 'subtitle' && styles.subtitle,
    type === 'link' && styles.link,
    type === 'linkPrimary' && styles.linkPrimary,
    type === 'code' && styles.code,
    style,
  ];

  const flatStyle = StyleSheet.flatten(combinedStyles) as TextStyle || {};
  
  // CRITICAL FIX: Ensure the extracted sizes are strictly numbers, never strings or undefined.
  const rawFontSize = flatStyle.fontSize;
  const baseFontSize = typeof rawFontSize === 'number' ? rawFontSize : parseFloat(rawFontSize as any) || 16;
  
  const rawLineHeight = flatStyle.lineHeight;
  const baseLineHeight = typeof rawLineHeight === 'number' ? rawLineHeight : (rawLineHeight ? parseFloat(rawLineHeight as any) : undefined);

  return (
    <RNText
      style={[
        flatStyle,
        { 
          // Safely apply math only to valid numbers
          fontSize: baseFontSize * scaleMultiplier,
          ...(baseLineHeight && { lineHeight: baseLineHeight * scaleMultiplier })
        }
      ]}
      {...rest}
    />
  );
}

export const Text = ThemedText;

const styles = StyleSheet.create({
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  smallBold: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  default: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500',
  },
  title: {
    fontSize: 48,
    fontWeight: '600',
    lineHeight: 52,
  },
  subtitle: {
    fontSize: 32,
    lineHeight: 44,
    fontWeight: '600',
  },
  link: {
    lineHeight: 30,
    fontSize: 14,
  },
  linkPrimary: {
    lineHeight: 30,
    fontSize: 14,
    color: '#3c87f7',
  },
  code: {
    fontFamily: Fonts?.mono || 'monospace',
    fontWeight: Platform.select({ android: '700' as const }) ?? '500',
    fontSize: 12,
  },
});