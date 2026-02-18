import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getStyles, getColors } from '@/styles/GlobalStyles';
import type { ColorSchemeName } from 'react-native';

export type MetricCardProps = {
  scheme?: ColorSchemeName;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  color?: string;
  label: string;
  value: string;
  subtitle?: string;
  compact?: boolean;
};

export default function MetricCard({ scheme = 'light', icon, color = '#2eaf7d', label, value, subtitle, compact = false }: MetricCardProps) {
  const global = getStyles(scheme);
  const colors = getColors(scheme);
  return (
    <View style={[styles.card, { backgroundColor: global.card.backgroundColor, borderColor: colors.border }]}>
      <View style={styles.row}>
        {icon ? (
          <View style={[styles.iconWrap, { backgroundColor: color + '15' }]}> 
            <MaterialCommunityIcons name={icon} size={20} color={color} />
          </View>
        ) : null}
        <View style={{ flex: 1 }}>
          <Text style={[styles.label, { color: colors.muted }]} numberOfLines={1}>{label}</Text>
          <Text style={[styles.value, { color: colors.text }]} numberOfLines={1}>{value}</Text>
          {!!subtitle && <Text style={[styles.subtitle, { color: colors.muted }]} numberOfLines={1}>{subtitle}</Text>}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth,
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  label: {
    fontSize: 12,
    marginBottom: 4,
  },
  value: {
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 11,
    marginTop: 2,
  },
});
