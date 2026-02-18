import { useColorScheme } from '@/components/useColorScheme';
import { getAccountsScreenStyles } from '@/styles/TransactionFormStyles';
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, ActivityIndicator, Platform } from 'react-native';
import { Transaction } from '@/lib/supabase/transaction';
import PickerModal from '@/components/Picker';
import { MaterialCommunityIcons, FontAwesome5, Ionicons, FontAwesome } from '@expo/vector-icons';
import { DatePicker } from '@/components/DatePicker';
import { formatDateDMY, parseDMYtoISO } from '@/lib/dateFormat';
import { Logger } from '@/lib/logger';


const TRANSACTION_TYPE_ICON_MAP: Record<string, { icon: React.ReactNode; label: string }> = {
  INTEREST: {
    icon: <MaterialCommunityIcons name="percent" size={22} color="#007AFF" />,
    label: 'Interest',
  },
  OUT_OF_POCKET: {
    icon: <FontAwesome5 name="money-bill-wave" size={22} color="#27ae60" />,
    label: 'Out-of-Pocket',
  },
  CAPITAL_EXPENSE: {
    icon: <MaterialCommunityIcons name="tools" size={22} color="#e67e22" />,
    label: 'Capital Expense',
  },
  MORTGAGE: {
    icon: <FontAwesome5 name="hand-holding-usd" size={22} color="#8e44ad" />,
    label: 'Mortgage',
  },
  RENT: {
    icon: <Ionicons name="home" size={22} color="#2eaf7d" />,
    label: 'Rent',
  },
  EXPENSE: {
    icon: <FontAwesome name="file-text-o" size={22} color="#c0392b" />,
    label: 'Expense',
  },
};

interface Option { label: string; value: string | number; }
interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Transaction>) => Promise<void>;
  initialData?: Partial<Transaction>;
  loading?: boolean;
  isEdit?: boolean;
  propertyOptions: Option[];
  accountOptions: Option[];
  onDelete?: () => Promise<void>;
}

export default function TransactionForm({ visible, onClose, onSubmit, initialData = {}, loading, isEdit, propertyOptions, accountOptions, onDelete }: Props) {
  const scheme = 'light'; //useColorScheme();
  const styles = getAccountsScreenStyles(scheme);
  const [form, setForm] = useState<Partial<Transaction>>(initialData);
  const [submitting, setSubmitting] = useState(false);
  const [showPropertyPicker, setShowPropertyPicker] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);

  // Generate transaction type options from TRANSACTION_TYPE_ICON_MAP
  const transactionTypeOptions = Object.entries(TRANSACTION_TYPE_ICON_MAP).map(([value, { icon, label }]) => ({
    value,
    label,
    icon,
  }));

  useEffect(() => {
    setForm(initialData);
  }, [initialData, visible]);

  const handleChange = (key: keyof Transaction, value: any) => {
    setForm(f => ({ ...f, [key]: value }));
  };

  const handleSave = async () => {
    setSubmitting(true);
    try {
      // Convert date to yyyy-mm-dd for backend
      const submitForm = { ...form };
      if (submitForm.date && /^\d{2}-\d{2}-\d{4}$/.test(submitForm.date)) {
        submitForm.date = parseDMYtoISO(submitForm.date);
      }
      await onSubmit(submitForm);
      onClose();
    } catch (e: any) {
      Logger.debug('TransactionForm save error', { error: e, message: e?.message }, 'TransactionForm.tsx');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setSubmitting(true);
    try {
      await onDelete();
      onClose();
    } catch (e: any) {
      Logger.debug('TransactionForm delete error', { error: e, message: e?.message }, 'TransactionForm.tsx');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>{isEdit ? 'Edit' : 'Add'} Transaction</Text>
          <View style={{ position: 'relative' }}>
            <TextInput
              style={[styles.input, { paddingLeft: 28 }]}
              placeholder="Amount"
              keyboardType={Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'}
              value={form.amount !== undefined && form.amount !== null ? form.amount.toString() : ''}
              onChangeText={v => {
                // Allow negative numbers and up to 2 decimals
                const cleaned = v.replace(/[^\d.-]/g, '');
                // Match optional leading '-', digits, optional decimal, up to 2 decimals
                const match = cleaned.match(/^(-)?\d*(\.\d{0,2})?/);
                handleChange('amount', match ? match[0] : '');
              }}
            />
            <Text style={{ position: 'absolute', left: 10, top: 12, color: '#888', fontSize: 16 }}>$</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="Description"
            value={form.description || ''}
            onChangeText={v => handleChange('description', v)}
          />
          <DatePicker
            label="Date"
            value={form.date || ''}
            onChange={v => handleChange('date', v)}
          />
          {/* Transaction Type Picker */}
          <TouchableOpacity style={styles.input} onPress={() => setShowTypePicker(true)}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {form.type && TRANSACTION_TYPE_ICON_MAP[form.type]?.icon && (
                <View style={{ marginRight: 8 }}>{TRANSACTION_TYPE_ICON_MAP[form.type].icon}</View>
              )}
              <Text style={{ color: form.type ? '#222' : '#888' }}>
                {form.type ? TRANSACTION_TYPE_ICON_MAP[form.type]?.label || form.type : 'Select Transaction Type'}
              </Text>
            </View>
          </TouchableOpacity>
          <PickerModal
            visible={showTypePicker}
            options={transactionTypeOptions}
            selectedValue={form.type}
            onSelect={v => handleChange('type', v)}
            onClose={() => setShowTypePicker(false)}
            title="Select Transaction Type"
          />
          {/* Property Picker */}
          <TouchableOpacity style={styles.input} onPress={() => setShowPropertyPicker(true)}>
            <Text style={{ color: form.propertyid ? '#222' : '#888' }}>
              {propertyOptions.find(o => o.value === form.propertyid)?.label || 'Select Property'}
            </Text>
          </TouchableOpacity>
          <PickerModal
            visible={showPropertyPicker}
            options={propertyOptions}
            selectedValue={form.propertyid}
            onSelect={v => handleChange('propertyid', v)}
            onClose={() => setShowPropertyPicker(false)}
            title="Select Property"
          />
          <View style={styles.row}>
            {isEdit && onDelete ? (
              <TouchableOpacity style={[styles.button, { backgroundColor: '#D32F2F' }]} onPress={handleDelete} disabled={submitting}>
                {submitting && loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <MaterialCommunityIcons name="trash-can-outline" size={20} color="#fff" />
                )}
              </TouchableOpacity>
            ) : <View />}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity style={styles.button} onPress={onClose} disabled={submitting}>
                <MaterialCommunityIcons name="close" size={20} color="#222" />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, { backgroundColor: '#2eaf7d' }]} onPress={handleSave} disabled={submitting}>
                {submitting || loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <MaterialCommunityIcons name="content-save" size={20} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
