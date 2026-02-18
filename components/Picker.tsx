import React from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, StyleSheet } from 'react-native';

interface Option {
  label: string;
  value: string | number;
  icon?: React.ReactNode; // Added icon support
}

interface PickerProps {
  visible: boolean;
  options: Option[];
  selectedValue?: string | number;
  onSelect: (value: string | number) => void;
  onClose: () => void;
  title?: string;
}

export default function PickerModal({ visible, options, selectedValue, onSelect, onClose, title }: PickerProps) {
  // Defensive: filter out undefined/null/empty values for keyExtractor
  const safeOptions = options.filter(o => o.value !== undefined && o.value !== null && o.value.toString() !== '');
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {title && <Text style={styles.title}>{title}</Text>}
          <FlatList
            data={safeOptions}
            keyExtractor={item => item.value.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.option, selectedValue === item.value && styles.selected]}
                onPress={() => {
                  onSelect(item.value);
                  onClose();
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {item.icon && <View style={{ marginRight: 8 }}>{item.icon}</View>}
                  <Text style={selectedValue === item.value ? styles.selectedText : undefined}>{item.label}</Text>
                </View>
              </TouchableOpacity>
            )}
          />
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 10,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  title: {
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 16,
    textAlign: 'center',
  },
  option: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  selected: {
    backgroundColor: '#e6f7f1',
  },
  selectedText: {
    color: '#2eaf7d',
    fontWeight: 'bold',
  },
  cancelBtn: {
    marginTop: 10,
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#eee',
    borderRadius: 8,
  },
});
