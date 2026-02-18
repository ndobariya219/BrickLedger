
import { StyleSheet, ColorSchemeName } from 'react-native';
import { getColors, getStyles } from './GlobalStyles';

export function getUserAccountScreenStyles(scheme: ColorSchemeName = 'light') {
  const normalizedScheme = !scheme ? 'light' : scheme;
  const colors = getColors(normalizedScheme);
  const global = getStyles(normalizedScheme);
  return StyleSheet.create({
    container: {
      ...global.container,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
      backgroundColor: global.container.backgroundColor,
    },
    avatar: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: global.button.backgroundColor,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 24,
    },
    avatarText: {
      color: colors.onPrimary,
      fontSize: 32,
      fontWeight: 'bold',
    },
    title: {
      ...global.title,
      fontSize: 24,
      marginBottom: 32,
      color: global.title.color,
    },
    button: {
      ...global.button,
      width: '100%',
      maxWidth: 320,
      paddingVertical: 14,
      backgroundColor: global.button.backgroundColor,
      borderRadius: 16,
      marginBottom: 16,
      alignItems: 'center',
      borderWidth: 0,
    },
    logoutButton: {
      backgroundColor: colors.error,
      borderColor: colors.error,
    },
    buttonText: {
      ...global.buttonText,
      fontSize: 16,
      color: global.buttonText.color,
      fontWeight: 'bold',
    },
    card: {
      width: '100%',
      maxWidth: 420,
      borderWidth: 1,
      borderColor: colors.surfaceVariant,
      backgroundColor: colors.surface,
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: global.title.color,
    },
  });
}
