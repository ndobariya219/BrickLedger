import React, { useState, useRef } from 'react';
import { Modal, View, Text, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, Alert, Platform } from 'react-native';
import { getAccountsScreenStyles } from '@/styles/TransactionFormStyles';
import PickerModal from '@/components/Picker';
import { DatePicker } from '@/components/DatePicker';
import { MaterialCommunityIcons, FontAwesome5, Ionicons, FontAwesome } from '@expo/vector-icons';
import { Transaction } from '@/lib/supabase/transaction';
import { parseDMYtoISO } from '@/lib/dateFormat';

const TRANSACTION_TYPE_ICON_MAP: Record<string, { icon: React.ReactNode; label: string }> = {
  INTEREST: { icon: <MaterialCommunityIcons name="percent" size={18} color="#007AFF" />, label: 'Interest' },
  OUT_OF_POCKET: { icon: <FontAwesome5 name="money-bill-wave" size={18} color="#27ae60" />, label: 'Out-of-Pocket' },
  CAPITAL_EXPENSE: { icon: <MaterialCommunityIcons name="tools" size={18} color="#e67e22" />, label: 'Capital Expense' },
  MORTGAGE: { icon: <FontAwesome5 name="hand-holding-usd" size={18} color="#8e44ad" />, label: 'Mortgage' },
  RENT: { icon: <Ionicons name="home" size={18} color="#2eaf7d" />, label: 'Rent' },
  EXPENSE: { icon: <FontAwesome name="file-text-o" size={18} color="#c0392b" />, label: 'Expense' },
};

interface Option { label: string; value: string | number; icon?: React.ReactNode }

type WorksheetRow = {
  amount: string | number;
  description?: string;
  date?: string;
  type?: string;
  propertyid?: number | string;
  entity_id?: number;
};

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmitBulk: (rows: WorksheetRow[]) => Promise<void>;
  propertyOptions: Option[];
  accountOptions: Option[];
}

function emptyRow(): WorksheetRow {
  return { amount: '', description: '', date: '', type: '', propertyid: undefined } as WorksheetRow;
}

export default function TransactionWorksheet({ visible, onClose, onSubmitBulk, propertyOptions, accountOptions }: Props) {
  const styles = getAccountsScreenStyles('light');
  const [rows, setRows] = useState<WorksheetRow[]>([emptyRow()]);
  const [submitting, setSubmitting] = useState(false);
  const [activeTypePickerRow, setActiveTypePickerRow] = useState<number | null>(null);
  const [activePropertyPickerRow, setActivePropertyPickerRow] = useState<number | null>(null);
  const [pasteModalVisible, setPasteModalVisible] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [rowErrors, setRowErrors] = useState<Record<number, string>>({});
  const [confirmVisible, setConfirmVisible] = useState(false);
  const scrollRef = useRef<ScrollView | null>(null);

  const transactionTypeOptions = Object.entries(TRANSACTION_TYPE_ICON_MAP).map(([value, { icon, label }]) => ({ value, label, icon }));

  const updateRow = (idx: number, key: keyof WorksheetRow, value: any) => {
    setRows(r => r.map((row, i) => i === idx ? { ...row, [key]: value } : row));
  };

  const addRow = () => setRows(r => [...r, emptyRow()]);
  const removeRow = (idx: number) => setRows(r => r.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    // Validate all rows first
    const errors: Record<number, string> = {};
    const normalized: WorksheetRow[] = rows.map((r, idx) => {
      const copy = { ...r } as WorksheetRow;
      copy.amount = copy.amount !== undefined && copy.amount !== null ? String(copy.amount).trim() : '';
      if (copy.date && /^\d{2}-\d{2}-\d{4}$/.test(String(copy.date))) {
        copy.date = parseDMYtoISO(String(copy.date));
      }
      if (!copy.amount || isNaN(Number(copy.amount))) errors[idx] = (errors[idx] ? errors[idx] + '; ' : '') + 'Invalid amount';
      if (!copy.propertyid) errors[idx] = (errors[idx] ? errors[idx] + '; ' : '') + 'Property required';
      if (!copy.type) errors[idx] = (errors[idx] ? errors[idx] + '; ' : '') + 'Type required';
      if (!copy.date) errors[idx] = (errors[idx] ? errors[idx] + '; ' : '') + 'Date required';
      return copy;
    }).filter((r, i) => !errors[i]);

    if (Object.keys(errors).length > 0) {
      setRowErrors(errors);
      Alert.alert('Validation', 'Please fix invalid rows highlighted in red before submitting.');
      return;
    }

    if (normalized.length === 0) {
      Alert.alert('No rows', 'No valid rows to add.');
      return;
    }

    // Show confirmation summary
    setConfirmVisible(true);
  };

  const confirmAndSubmit = async () => {
    setConfirmVisible(false);
    setSubmitting(true);
    try {
      const finalRows = rows.map(r => ({ ...r, amount: Number(r.amount) } as WorksheetRow));
      await onSubmitBulk(finalRows);
      setRows([emptyRow()]);
      setRowErrors({});
      onClose();
    } catch (e) {
      console.warn('Worksheet submit error (confirm)', e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={[styles.modal, { maxHeight: '85%' }]}>
          <Text style={styles.title}>Add Transactions Worksheet</Text>
          <ScrollView ref={el => (scrollRef.current = el)} style={{ maxHeight: 320 }}>
            {rows.map((row, idx) => (
              <View key={idx} style={{ marginBottom: 8, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontWeight: '600' }}>Row {idx + 1}</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity onPress={() => addRow()} style={{ padding: 6 }}>
                      <Text style={{ color: '#2eaf7d' }}>+ Add</Text>
                    </TouchableOpacity>
                    {rows.length > 1 && (
                      <TouchableOpacity onPress={() => removeRow(idx)} style={{ padding: 6 }}>
                        <Text style={{ color: '#c0392b' }}>Remove</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
                <View style={{ marginTop: 8 }}>
                  <TextInput
                    style={styles.input}
                    placeholder="Amount"
                    keyboardType={Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'}
                    value={row.amount !== undefined && row.amount !== null ? String(row.amount) : ''}
                    onChangeText={v => updateRow(idx, 'amount', v.replace(/[^\d.-]/g, ''))}
                  />
                  {rowErrors[idx] ? <Text style={{ color: '#c0392b', marginBottom: 6 }}>{rowErrors[idx]}</Text> : null}
                  <TextInput
                    style={styles.input}
                    placeholder="Description"
                    value={row.description || ''}
                    onChangeText={v => updateRow(idx, 'description', v)}
                  />
                  <DatePicker label="Date" value={row.date || ''} onChange={v => updateRow(idx, 'date', v)} />
                  <TouchableOpacity style={styles.input} onPress={() => setActiveTypePickerRow(idx)}>
                    <Text style={{ color: row.type ? '#222' : '#888' }}>{row.type ? TRANSACTION_TYPE_ICON_MAP[row.type as string]?.label || row.type : 'Select Type'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.input} onPress={() => setActivePropertyPickerRow(idx)}>
                    <Text style={{ color: row.propertyid ? '#222' : '#888' }}>{propertyOptions.find(o => o.value === row.propertyid)?.label || 'Select Property'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
            <TouchableOpacity style={styles.button} onPress={onClose} disabled={submitting}>
              <Text>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, { backgroundColor: '#ddd' }]} onPress={() => setPasteModalVisible(true)} disabled={submitting}>
              <Text>Paste CSV</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, { backgroundColor: '#2eaf7d' }]} onPress={handleSubmit} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff' }}>Add All</Text>}
            </TouchableOpacity>
          </View>

          <PickerModal
            visible={activeTypePickerRow !== null}
            options={transactionTypeOptions}
            selectedValue={activeTypePickerRow !== null ? rows[activeTypePickerRow].type : undefined}
            onSelect={(v) => {
              if (activeTypePickerRow !== null) updateRow(activeTypePickerRow, 'type', v as string);
              setActiveTypePickerRow(null);
            }}
            onClose={() => setActiveTypePickerRow(null)}
            title="Select Transaction Type"
          />

          <PickerModal
            visible={activePropertyPickerRow !== null}
            options={propertyOptions}
            selectedValue={activePropertyPickerRow !== null ? rows[activePropertyPickerRow].propertyid : undefined}
            onSelect={(v) => {
              if (activePropertyPickerRow !== null) updateRow(activePropertyPickerRow, 'propertyid', v as number);
              setActivePropertyPickerRow(null);
            }}
            onClose={() => setActivePropertyPickerRow(null)}
            title="Select Property"
          />
          {/* Paste CSV modal */}
          <Modal visible={pasteModalVisible} animationType="slide" transparent>
            <View style={styles.overlay}>
              <View style={styles.modal}>
                <Text style={styles.title}>Paste CSV rows</Text>
                <Text style={{ marginBottom: 8 }}>Paste CSV with columns: amount,date(dd-mm-yyyy),type,property,label(optional)</Text>
                <TextInput value={pasteText} onChangeText={setPasteText} multiline style={[styles.input, { height: 120 }]} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <TouchableOpacity style={styles.button} onPress={() => setPasteModalVisible(false)}><Text>Cancel</Text></TouchableOpacity>
                  <TouchableOpacity style={[styles.button, { backgroundColor: '#2eaf7d' }]} onPress={() => {
                    const lines = pasteText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
                    const newRows: WorksheetRow[] = lines.map(line => {
                      const parts = line.split(',').map(p => p.trim());
                      return {
                        amount: parts[0] || '',
                        date: parts[1] || '',
                        type: parts[2] || '',
                        propertyid: propertyOptions.find(p => p.label === (parts[3] || ''))?.value || undefined,
                        description: parts[4] || '',
                      } as WorksheetRow;
                    });
                    setRows(r => [...r, ...newRows]);
                    setPasteText('');
                    setPasteModalVisible(false);
                  }}><Text style={{ color: '#fff' }}>Import</Text></TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          {/* Confirmation modal */}
          <Modal visible={confirmVisible} animationType="fade" transparent>
            <View style={styles.overlay}>
              <View style={styles.modal}>
                <Text style={styles.title}>Confirm Add Transactions</Text>
                <Text style={{ marginBottom: 8 }}>Rows: {rows.length}</Text>
                <Text style={{ marginBottom: 12 }}>Total: ${rows.reduce((s, r) => s + (Number(r.amount) || 0), 0).toLocaleString()}</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <TouchableOpacity style={styles.button} onPress={() => setConfirmVisible(false)}><Text>Cancel</Text></TouchableOpacity>
                  <TouchableOpacity style={[styles.button, { backgroundColor: '#2eaf7d' }]} onPress={confirmAndSubmit}><Text style={{ color: '#fff' }}>Confirm</Text></TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </View>
      </View>
    </Modal>
  );
}
