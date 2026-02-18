import { ColorSchemeName, StyleSheet } from 'react-native';
import { getStyles, getColors } from './GlobalStyles';

export function getOwnershipFormScreenStyles(scheme: ColorSchemeName = 'light') {
  const base = getStyles(scheme);
  const Colors = getColors(scheme);
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(33,0,93,0.10)', // Material You primary with opacity
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  container: {
    backgroundColor: base.card.backgroundColor,
    borderRadius: 20,
    padding: 28,
    minWidth: 320,
    maxWidth: 400,
    width: '90%',
  },
  title: {
    ...base.title,
    fontSize: 20,
    marginBottom: 14,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  entityPicker: {
    flex: 2,
    marginRight: 8,
  },
  entityBtn: {
    backgroundColor: base.input.backgroundColor,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginHorizontal: 2,
  },
  entityBtnSelected: {
    backgroundColor: '#2eaf7d', // Consider using Colors.secondaryContainer
  },
  entityBtnDisabled: {
    backgroundColor: '#E0E0E0',
    borderColor: base.input.borderColor,
    borderWidth: 1,
  },
  percentageBox: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  label: {
    fontWeight: '600',
    marginRight: 4,
    color: '#555',
  },
  input: {
    ...base.input,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 40,
    backgroundColor: '#fff',
  },
  removeBtn: {
    padding: 6,
    borderRadius: 4,
    marginLeft: 2,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2eaf7d',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignSelf: 'flex-start',
    marginTop: 6,
    marginBottom: 10,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  cancelBtn: {
    marginRight: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  saveBtn: {
    backgroundColor: '#2eaf7d',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 24,
  },
})
};  