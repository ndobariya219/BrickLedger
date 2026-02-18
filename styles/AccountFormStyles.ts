import { StyleSheet } from 'react-native';
import { getStyles, getColors } from './GlobalStyles';

export const getAccountFormStyles = (scheme = 'light') => {
  const base = getStyles(scheme);
  const Colors = getColors(scheme);
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
    width: 340,
    maxWidth: '95%',
    elevation: 8,
  },
  title: {
    ...base.title,
    fontSize: 22,
    marginBottom: 12,
    color: base.title.color,
    textAlign: 'center',
  },
  label: {
    fontWeight: '600',
    marginTop: 6,
    marginBottom: 2,
    color: base.text.color,
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
  pickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 4,
    gap: 4,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: base.input.borderColor,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 4,
    backgroundColor: base.input.backgroundColor,
  },
  typeOptionActive: {
    backgroundColor: '#2eaf7d',
    borderColor: '#2eaf7d',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    gap: 8,
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
