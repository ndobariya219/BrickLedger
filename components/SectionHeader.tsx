import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { getStyles, getColors } from '@/styles/GlobalStyles';
import type { ColorSchemeName } from 'react-native';

export type SectionHeaderProps = {
  scheme?: ColorSchemeName;
  title: string;
  actionLabel?: string;
  onPressAction?: () => void;
};

export default function SectionHeader({ scheme = 'light', title, actionLabel, onPressAction }: SectionHeaderProps) {
  const global = getStyles(scheme);
  const colors = getColors(scheme);
  return (
    <View style={styles.row}>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {!!actionLabel && !!onPressAction && (
        <TouchableOpacity onPress={onPressAction} hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}>
          <Text style={[styles.action, { color: colors.primary }]}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  action: {
    fontSize: 12,
    fontWeight: '600',
  },
});
