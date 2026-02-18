import { StyleSheet, ColorSchemeName } from 'react-native';
import { getColors, getStyles } from './GlobalStyles';

export function getEntitiesScreenStyles(scheme: ColorSchemeName = 'light') {
  const normalizedScheme = !scheme ? 'light' : scheme;
  const colors = getColors(normalizedScheme);
  const global = getStyles(normalizedScheme);
  return StyleSheet.create({
    title: {
      ...global.title,
      fontSize: 24,
      fontWeight: 'bold',
    },
    addBtn: {
      backgroundColor: global.button.backgroundColor,
      borderRadius: 16,
      padding: 10,
    },
    card: {
      ...global.card,
      borderRadius: 20,
      padding: 20,
      marginBottom: 14,
      backgroundColor: global.card.backgroundColor,
      elevation: 4,
    },
    entityName: {
      fontSize: 18,
      fontWeight: '600',
    },
    entityType: {
      fontSize: 14,
  color: colors.secondary,
      marginTop: 2,
    },
    actionBtn: {
      marginLeft: 12,
    },
    formContainer: {
      backgroundColor: global.card.backgroundColor,
      borderRadius: 20,
      padding: 20,
      marginBottom: 16,
    },
    formLabel: {
      fontWeight: 'bold',
      marginTop: 8,
    },
    formInput: {
      ...global.input,
      borderRadius: 14,
      padding: 12,
      marginTop: 4,
    },
    typeRow: {
      flexDirection: 'row',
      marginTop: 8,
    },
    typeBtn: {
      padding: 10,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: global.input.borderColor,
      marginRight: 8,
  },
    typeBtnActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    typeBtnText: {
      color: colors.onSurface,
    },
    typeBtnTextActive: {
      color: colors.onPrimary,
      fontWeight: 'bold',
    },
    formActions: {
      flexDirection: 'row',
      marginTop: 16,
    },
    saveBtn: {
      backgroundColor: colors.primary,
      borderRadius: 6,
      padding: 10,
      marginRight: 8,
    },
    saveBtnText: {
      color: colors.onPrimary,
      fontWeight: 'bold',
    },
    cancelBtn: {
      backgroundColor: colors.secondaryContainer,
      borderRadius: 6,
      padding: 10,
    },
    cancelBtnText: {
      color: colors.onSecondaryContainer,
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
