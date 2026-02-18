import { StyleSheet } from 'react-native';
import { getStyles, getColors } from './GlobalStyles';

import { ColorSchemeName } from 'react-native';
const PropertyFormStyles = (scheme: ColorSchemeName = 'light') => {
  const safeScheme = scheme === null ? 'light' : scheme;
  const base = getStyles(safeScheme);
  const Colors = getColors(safeScheme);
  return StyleSheet.create({
    container: {
      ...base.container,
      padding: 24,
      backgroundColor: base.card.backgroundColor,
      flexGrow: 1,
    },
    title: {
      ...base.title,
      fontSize: 24,
      marginBottom: 18,
      color: base.title.color,
      textAlign: 'center',
    },
    label: {
      fontSize: 15,
      color: base.text.color,
      marginTop: 12,
      marginBottom: 4,
    },
    input: {
      ...base.input,
      borderColor: base.input.borderColor,
      borderRadius: 14,
      padding: 14,
      fontSize: 16,
      backgroundColor: base.input.backgroundColor,
      marginBottom: 4,
    },
    row: {
      flexDirection: 'row',
      marginBottom: 8,
    },
    chip: {
      borderWidth: 1,
      borderColor: base.input.borderColor,
      borderRadius: 16,
      paddingVertical: 8,
      paddingHorizontal: 18,
      marginRight: 8,
      marginBottom: 8,
      backgroundColor: base.input.backgroundColor,
    },
    chipSelected: {
      backgroundColor: Colors.primary,
      borderColor: Colors.primary,
    },
    chipText: {
      color: Colors.onSurface,
      fontWeight: '600',
    },
    chipTextSelected: {
      color: Colors.onPrimary,
      fontWeight: '700',
    },
    submitBtn: {
      backgroundColor: Colors.primary,
      paddingVertical: 14,
      borderRadius: 16,
      alignItems: 'center',
      marginVertical: 18,
    },
    submitBtnText: {
      color: Colors.onPrimary,
      fontSize: 17,
      fontWeight: '700',
      letterSpacing: 0.05,
    },
  });
};



export default PropertyFormStyles;
