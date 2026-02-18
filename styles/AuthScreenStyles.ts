import { StyleSheet, ColorSchemeName } from 'react-native';
import { getColors, getStyles } from './GlobalStyles';

export function getAuthScreenStyles(scheme: ColorSchemeName = 'light') {
  const normalizedScheme = !scheme ? 'light' : scheme;
  const colors = getColors(normalizedScheme);
  const global = getStyles(normalizedScheme);
  return StyleSheet.create({
    container: {
      ...global.container,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    logo: {
      width: 96,
      height: 96,
      marginBottom: 16,
  marginTop: 40,
      borderRadius: 24,
      backgroundColor: global.card.backgroundColor,
      alignSelf: 'center',
    },
    welcome: {
      fontSize: 28,
      fontWeight: 'bold',
      marginBottom: 8,
      color: global.subtitle.color,
      textAlign: 'center',
      letterSpacing: 0.5,
    },
    subtitle: {
      ...global.subtitle,
      fontSize: 16,
      color: global.text.color,
      marginBottom: 28,
      textAlign: 'center',
      paddingHorizontal: 8,
      lineHeight: 22,
    },
    formCard: {
      width: '100%',
      backgroundColor: global.card.backgroundColor,
      borderRadius: 20,
      padding: 24,
      elevation: 4,
      marginBottom: 18,
    },
    title: {
      ...global.title,
      fontSize: 24,
      marginBottom: 24,
      color: global.title.color,
    },
    input: {
      ...global.input,
      width: '100%',
      height: 48,
      paddingHorizontal: 12,
      marginBottom: 12,
      backgroundColor: colors.surface,
    },
    passwordRow: {
      flexDirection: 'row',
      alignItems: 'center',
      width: '100%',
      marginBottom: 12,
    },
    button: {
      ...global.button,
      width: '100%',
      height: 48,
      backgroundColor: colors.primary,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 8,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonText: {
      ...global.buttonText,
      fontSize: 18,
    },
    linkButton: {
      paddingVertical: 8,
      alignItems: 'center',
    },
    linkButtonText: {
      color: colors.primary,
      fontSize: 16,
      textDecorationLine: 'underline',
    },
  });
}
