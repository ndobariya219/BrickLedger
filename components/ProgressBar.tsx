import React from 'react';
import { View, StyleSheet } from 'react-native';

export type ProgressBarProps = {
  value: number; // 0..1 or 0..100 when isPercent
  color?: string;
  backgroundColor?: string;
  height?: number;
  radius?: number;
  isPercent?: boolean;
};

export default function ProgressBar({ value, color = '#2eaf7d', backgroundColor = '#eafaf3', height = 10, radius = 6, isPercent = false }: ProgressBarProps) {
  const pct = isPercent ? Math.max(0, Math.min(100, value)) : Math.max(0, Math.min(1, value)) * 100;
  return (
    <View style={[styles.track, { backgroundColor, height, borderRadius: radius }]}> 
      <View style={[styles.fill, { width: `${pct}%`, backgroundColor: color, borderRadius: radius }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
});
