import { StyleSheet } from 'react-native';
import { getStyles, getColors } from './GlobalStyles';

export const getAccountsScreenStyles = (scheme = 'light') => {
  const base = getStyles(scheme);
  const Colors = getColors(scheme);
  return StyleSheet.create({
    filterCard: {
      backgroundColor: Colors.surface,
      borderRadius: 14,
      paddingVertical: 12,
      paddingHorizontal: 10,
      marginBottom: 10,
      elevation: 2,
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
    },
    filterSection: {
      marginBottom: 10,
    },
    filterHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 6,
    },
    filterHeaderIcon: {
      marginRight: 6,
      opacity: 0.7,
      color: Colors.secondary,
    },
    filterLabel: {
      fontWeight: '600',
      color: base.text.color,
    },
    filterOption: {
      backgroundColor: Colors.secondaryContainer,
      borderRadius: 18,
      paddingHorizontal: 12,
      paddingVertical: 6,
      marginHorizontal: 4,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    filterOptionActive: {
      backgroundColor: Colors.primary,
      borderColor: Colors.primary,
    },
    filterOptionText: {
      color: base.text.color,
      fontSize: 13,
      fontWeight: '500',
    },
    filterOptionTextActive: {
      color: Colors.onPrimary,
      fontSize: 13,
      fontWeight: '600',
    },
    card: {
      ...base.card,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: Colors.outline,
      padding: 10,
      marginBottom: 18,
      backgroundColor: base.card.backgroundColor,
      elevation: 4,
    },
    typeRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    typeLabel: {
      fontWeight: '600',
      fontSize: 12,
      color: base.subtitle.color,
    },
    institutionLarge: {
      fontSize: 12,
      color: base.title.color,
      fontWeight: '700',
      marginBottom: 2,
    },
    amountGreen: {
      fontSize: 16,
      fontWeight: 'bold',
      color: Colors.success,
      marginTop: 0,
    },
    amountRed: {
      fontSize: 16,
      fontWeight: 'bold',
      color: Colors.error,
      marginTop: 0,
    },
    instActionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 0,
      gap: 4,
    },
    balanceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 2,
      marginBottom: 2,
    },
    cardActionsRowInline: {
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: 8,
    },
    actionBtn: {
      padding: 8,
      borderRadius: 4,
      marginLeft: 8,
    },
    fab: {
      position: 'absolute',
      right: 24,
      bottom: 32,
      backgroundColor: Colors.primary,
      width: 56,
      height: 56,
      borderRadius: 28,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 6,
    },
    ownershipBox: {
      backgroundColor: Colors.surfaceVariant,
      borderRadius: 6,
      padding: 8,
      marginTop: 8,
      marginBottom: 4,
    },
    ownershipTitle: {
      fontWeight: '600',
      color: Colors.success,
      marginBottom: 2,
      fontSize: 14,
    },
    ownershipBarContainer: {
      flexDirection: 'row',
      height: 14,
      marginBottom: 4,
      overflow: 'hidden',
      borderRadius: 7,
    },
    ownershipLabelsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginTop: 2,
    },
    ownershipText: {
      color: Colors.onSurface,
      fontSize: 13,
      marginBottom: 1,
    },
  });
};
