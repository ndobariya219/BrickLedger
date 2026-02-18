import { StyleSheet, Platform, ColorSchemeName } from 'react-native';
import { getColors, getStyles } from './GlobalStyles';

export function getPropertiesScreenStyles(scheme: ColorSchemeName = 'light') {
  const normalizedScheme = !scheme ? 'light' : scheme;
  const colors = getColors(normalizedScheme);
  const global = getStyles(normalizedScheme);
  return StyleSheet.create({
    container: {
      ...global.container,
      padding: 0,
      backgroundColor: global.container.backgroundColor,
    },
    headerRow: {
      ...global.row,
      width: '100%',
      paddingHorizontal: 20,
      paddingTop: 32,
      marginBottom: 8,
    },
    pickerContainer: {
      width: '100%',
      backgroundColor: global.card.backgroundColor,
      borderRadius: 20,
      marginBottom: 10,
      paddingHorizontal: 16,
      paddingVertical: 8,
      elevation: 2,
    },
    dropdown: {
      width: '100%',
      height: 48,
      borderWidth: 0,
      borderRadius: 14,
      backgroundColor: global.input.backgroundColor,
    },
    listContent: {
      paddingHorizontal: 12,
      paddingBottom: 40,
    },
    propertyCard: {
      ...global.card,
      borderRadius: 20,
      padding: 20,
      marginBottom: 16,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: global.card.backgroundColor,
      elevation: 4
    },
    iconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: global.input.backgroundColor,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  propertyInfo: {
    flex: 1,
  },
  propertyTitle: {
      ...global.title,
      fontSize: 17,
      marginBottom: 2,
      color: global.title.color,
      fontWeight: 'bold',
  },
    address: {
      color: colors.secondary,
      fontSize: 13,
      marginBottom: 6,
    },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    flexWrap: 'wrap',
  },
    metric: {
      backgroundColor: colors.surface,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 4,
      marginRight: 8,
      marginBottom: 4,
      flexDirection: 'row',
      alignItems: 'center',
    },
    metricLabel: {
      color: colors.secondary,
      fontSize: 12,
      marginRight: 3,
    },
    metricValue: {
      color: colors.onSurface,
      fontWeight: '600',
      fontSize: 13,
    },
    marketValueHighlight: {
      backgroundColor: colors.primaryContainer,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 6,
      marginRight: 8,
      marginBottom: 8,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.outline,
    },
    marketValueText: {
      color: colors.primary,
      fontWeight: 'bold',
      fontSize: 18,
    },
    purchasePrice: {
      color: colors.secondary,
      fontSize: 12,
      marginTop: 2,
      marginBottom: 4,
      fontStyle: 'italic',
    },
    fab: {
      position: 'absolute',
      right: 24,
      bottom: 32,
      backgroundColor: colors.primary,
      width: 56,
      height: 56,
      borderRadius: 28,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 6,
    },
  });
}
