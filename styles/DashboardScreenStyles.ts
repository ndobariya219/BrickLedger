import { StyleSheet, Platform, ColorSchemeName } from 'react-native';
import { getColors, getStyles } from './GlobalStyles';


export function getDashboardScreenStyles(scheme: ColorSchemeName = 'light') {
  const normalizedScheme = !scheme ? 'light' : scheme;
  const colors = getColors(normalizedScheme);
  const global = getStyles(normalizedScheme);
  return StyleSheet.create({
    container: {
      ...global.container,
      backgroundColor: global.container.backgroundColor,
    },
    headerRow: {
      ...global.row,
      width: '100%',
      marginBottom: 12,
    },
    section: {
      width: '100%',
      marginBottom: 14,
    },
  pickerContainer: {
      width: '100%',
      backgroundColor: global.card.backgroundColor,
      borderRadius: 20,
      marginBottom: 18,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    dropdown: {
      width: '100%',
      height: 48,
      borderWidth: 0,
      borderRadius: 14,
      backgroundColor: global.input.backgroundColor,
      elevation: 2,
    },
    chartCard: {
      width: '100%',
      backgroundColor: global.card.backgroundColor,
      borderRadius: 10,
      padding: 10,
      marginBottom: 12,
      elevation: 2,
      alignItems: 'center',
    },
    sectionCard: {
      width: '100%',
      backgroundColor: global.card.backgroundColor,
      borderRadius: 12,
      padding: 12,
      marginBottom: 12,
      elevation: 1,
    },
    noChartData: {
      color: global.text.color,
      fontSize: 14,
      marginTop: 12,
      marginBottom: 8,
    },
    legendRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginTop: 10,
      justifyContent: 'center',
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: 12,
      marginBottom: 6,
    },
    legendColor: {
      width: 14,
      height: 14,
      borderRadius: 7,
      marginRight: 6,
    },
    legendLabel: {
      fontSize: 13,
      color: '#444',
    },
    card: {
      ...global.card,
      width: '100%',
      borderRadius: 8,
      backgroundColor: global.card.backgroundColor,
      elevation: 1,
      marginBottom: 12,
      alignContent: 'center',
    },
    label: {
      fontSize: 14,
      color: global.text.color,
      fontWeight: '700',
      marginBottom: 6,
    },
    value: {
      fontSize: 12,
      fontWeight: '600',
      color: '#222',
    },
    valueAssets: {
      fontSize: 12,
      fontWeight: '600',
      color: '#17803d',
    },
    valueLiabilities: {
      fontSize: 10,
      fontWeight: '600',
      color: '#d32f2f',
    },
    valueEquity: {
      fontSize: 12,
      fontWeight: '600',
      color: '#1976d2',
    },
    valueNetEquity: {
      fontSize: 12,
      fontWeight: '600',
      color: '#8e24aa',
    },
    valueWorkingCapital: {
      fontSize: 12,
      fontWeight: '600',
      color: '#ff9800',
    },
    equity: {
      color: colors.primary,
    },
    metricsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: '100%',
      marginBottom: 16,
    },
    metricBox: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 10,
      padding: 14,
      marginHorizontal: 6,
      alignItems: 'center',
    },
    metricLabel: {
      fontSize: 14,
      color: colors.primary,
      marginBottom: 4,
    },
    metricValue: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.primary,
    },
    userCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    userInitial: {
      color: '#fff',
      fontWeight: 'bold',
      fontSize: 20,
    },
    headerText: {
      fontSize: 22,
      fontWeight: 'bold',
      color: '#222',
    },
    metricGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginHorizontal: -6,
    },
    metricCol: {
      width: '50%',
      paddingHorizontal: 6,
      marginBottom: 12,
    },
    listRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    listLabel: {
      fontSize: 14,
      color: '#444',
      flex: 1,
    },
    listValue: {
      fontSize: 16,
      fontWeight: 'bold',
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


