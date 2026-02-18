
import { StyleSheet } from 'react-native';


// Blue theme palette with light/dark support
export const getColors = (scheme: 'light' | 'dark' = 'light') =>
  scheme === 'dark'
    ? {
        primary: '#1976D2', // Blue 700
        onPrimary: '#FFFFFF',
        primaryContainer: '#033670ff',
        onPrimaryContainer: '#E3F2FD',
        secondary: '#90CAF9',
        onSecondary: '#0D47A1',
        secondaryContainer: '#1E293B',
        onSecondaryContainer: '#E3F2FD',
        background: '#121212',
        surface: '#1A1A1A',
        surfaceVariant: '#23272F',
        onSurface: '#F4F4F4',
        outline: '#3B82F6',
        error: '#EF5350',
        onError: '#FFFFFF',
        success: '#4CAF50',
        warning: '#FFD600',
        info: '#2196F3',
        disabled: '#263238',
        disabledText: '#90A4AE',
      }
    : {
        primary: '#1976D2', // Blue 700
        onPrimary: '#FFFFFF',
        primaryContainer: '#E3F2FD',
        onPrimaryContainer: '#0D47A1',
        secondary: '#1565C0',
        onSecondary: '#FFFFFF',
        secondaryContainer: '#BBDEFB',
        onSecondaryContainer: '#0D47A1',
        background: '#F4F8FB',
        surface: '#FFFFFF',
        surfaceVariant: '#E3F2FD',
        onSurface: '#1A237E',
        outline: '#1976D2',
        error: '#D32F2F',
        onError: '#FFFFFF',
        success: '#388E3C',
        warning: '#FFA000',
        info: '#1976D2',
        disabled: '#E3E3E3',
        disabledText: '#90A4AE',
      };

// Usage: pass color scheme to getStyles(scheme)
export const getStyles = (scheme: 'light' | 'dark' = 'light') => {
  const Colors = getColors(scheme);
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: Colors.background,
      padding: 20,
    },
    title: {
      fontSize: 26,
      fontWeight: '700',
      color: Colors.onSurface,
      marginBottom: 14,
      letterSpacing: 0.1,
    },
    subtitle: {
      fontSize: 20,
      fontWeight: '600',
      color: Colors.secondary,
      marginBottom: 10,
      letterSpacing: 0.05,
    },
    text: {
      fontSize: 16,
      color: Colors.onSurface,
      letterSpacing: 0.03,
    },
    input: {
      borderWidth: 1,
      borderColor: Colors.outline,
      borderRadius: 14,
      padding: 14,
      marginBottom: 14,
      fontSize: 16,
      backgroundColor: Colors.surface,
      color: Colors.onSurface,
    },
    button: {
      backgroundColor: Colors.primary,
      paddingVertical: 14,
      paddingHorizontal: 24,
      borderRadius: 16,
      alignItems: 'center',
      marginVertical: 10,
      elevation: 3,
    },
    buttonText: {
      color: Colors.onPrimary,
      fontSize: 17,
      fontWeight: '700',
      letterSpacing: 0.05,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    card: {
      backgroundColor: Colors.surface,
      borderRadius: 20,
      padding: 5,
      marginVertical: 2,
      elevation: 4,
    },
    divider: {
      height: 1,
      backgroundColor: Colors.outline,
      marginVertical: 12,
    },
    disabled: {
      backgroundColor: Colors.disabled,
      color: Colors.disabledText,
    },
  });
};
