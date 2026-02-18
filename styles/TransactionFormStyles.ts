import { StyleSheet } from 'react-native';
import { getStyles, getColors } from './GlobalStyles';

import { ColorSchemeName } from 'react-native';
export const getAccountsScreenStyles = (scheme: ColorSchemeName = 'light') => {
  const normalizedScheme: 'light' | 'dark' = scheme === 'dark' ? 'dark' : 'light';
  const base = getStyles(normalizedScheme);
  const Colors = getColors(normalizedScheme);
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(33,0,93,0.10)', // Material You primary with opacity
      justifyContent: 'center',
      alignItems: 'center',
    },
    modal: {
      backgroundColor: base.card.backgroundColor,
      borderRadius: 20,
      padding: 28,
      width: '90%',
      maxWidth: 400,
    },
    title: {
      ...base.title,
      fontSize: 18,
      marginBottom: 16,
      textAlign: 'center',
    },
    input: {
    ...base.input,
      width: '100%',
      height: 48,
      paddingHorizontal: 8,
      marginBottom: 6,
      backgroundColor: base.input.backgroundColor,
      color: base.input.color,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 8,
    },
    button: {
      ...base.button,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 4,
      backgroundColor: '#eee',
    },
  });
};


