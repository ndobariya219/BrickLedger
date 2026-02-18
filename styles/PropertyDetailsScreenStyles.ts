import { StyleSheet } from 'react-native';
import { getStyles, getColors } from './GlobalStyles';
import { ColorSchemeName } from 'react-native';

const PropertyDetailsScreenStyles = (scheme: ColorSchemeName = 'light') => {
  const safeScheme = scheme === null ? 'light' : scheme;
  const base = getStyles(safeScheme);
  const Colors = getColors(safeScheme);
  return StyleSheet.create({
    container: {
      ...base.container,
      backgroundColor: '#f7f7f7',
      padding: 0,
    },
    input: {
      ...base.input,
      borderColor: base.input.borderColor,
      borderRadius: 14,
      padding: 14,
      fontSize: 16,
      backgroundColor: base.input.backgroundColor,
      color: base.input.color,
      marginBottom: 4,
    },
    label: {
      fontSize: 15,
      color: base.text.color,
      marginTop: 12,
      marginBottom: 4,
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
    editButton: {
      backgroundColor: Colors.primary,
      position: 'absolute',
      bottom: 32,
      right: 32,
      borderRadius: 32,
      padding: 16,
      elevation: 4,
      Color: '#000',
    },
    header: {
      ...base.row,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 32,
      marginBottom: 8,
    },
    iconBox: {
      backgroundColor: '#fff',
      borderRadius: 16,
      padding: 18,
      alignItems: 'center',
      marginBottom: 16,
      alignSelf: 'center',
      elevation: 3
    },
    value: {
      color: '#222',
      fontWeight: 'bold',
      fontSize: 17,
    },
  });
}


export default PropertyDetailsScreenStyles;
