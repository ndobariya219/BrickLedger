import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

export interface DatePickerProps {
  label?: string;
  value: string | null;
  onChange: (date: string) => void;
  minimumDate?: Date;
  maximumDate?: Date;
  disabled?: boolean;
}

function formatDateDMY(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  label,
  value,
  onChange,
  minimumDate,
  maximumDate,
  disabled,
}) => {
  const [show, setShow] = useState(false);
  const raw = value || '';
  const isDMY = /^\d{2}-\d{2}-\d{4}$/.test(raw);
  const isISO = /^\d{4}-\d{2}-\d{2}$/.test(raw);
  const isISODateTime = /^\d{4}-\d{2}-\d{2}T/.test(raw);

  // Build a Date object safely from either DMY or ISO input
  let dateObj: Date = new Date();
  if (isDMY) {
    const [d, m, y] = raw.split('-').map(Number);
    dateObj = new Date(y, m - 1, d);
  } else if (isISO) {
    dateObj = new Date(raw);
  } else if (isISODateTime) {
    const parsed = new Date(raw);
    if (!isNaN(parsed.getTime())) {
      dateObj = parsed;
    }
  }

  const handleChange = (_: any, selectedDate?: Date) => {
    setShow(false);
    if (selectedDate) {
      onChange(formatDateDMY(selectedDate));
    }
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity
        style={[styles.input, disabled && styles.disabled]}
        onPress={() => !disabled && setShow(true)}
        disabled={disabled}
      >
        <Text style={raw ? styles.value : styles.placeholder}>
          {raw
            ? (
                isDMY
                  ? raw
                  : ((isISO || isISODateTime) && !isNaN(new Date(raw).getTime()))
                    ? formatDateDMY(new Date(raw))
                    : raw
              )
            : 'Select date (dd-mm-yyyy)'}
        </Text>
      </TouchableOpacity>
      {show && (
        <DateTimePicker
          value={dateObj}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: { fontWeight: 'bold', marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 12,
    backgroundColor: '#fff',
  },
  disabled: { backgroundColor: '#f2f2f2' },
  value: { color: '#222' },
  placeholder: { color: '#888' },
});
