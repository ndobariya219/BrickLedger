import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, ActivityIndicator, Platform } from 'react-native';
import { MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { fetchSavingsAccountsForUser } from '@/lib/supabase/accounts';
import { fetchUserProperties } from '@/lib/supabase/properties';
import { useEntityContext } from '@/components/EntityContext';
import Picker from '@/components/Picker';
import { Logger } from '@/lib/logger';
import { useColorScheme } from '@/components/useColorScheme';
import { getAccountFormStyles } from '@/styles/AccountFormStyles';

const ACCOUNT_TYPE_ICON_MAP = {
  mortgage: { icon: <FontAwesome5 name="hand-holding-usd" size={22} color="#8e44ad" />, label: 'Mortgage' },
  savings: { icon: <FontAwesome5 name="piggy-bank" size={22} color="#27ae60" />, label: 'Savings' },
  deposits: { icon: <MaterialCommunityIcons name="bank" size={22} color="#007AFF" />, label: 'Deposits' },
  superannuation: { icon: <MaterialCommunityIcons name="account-cash" size={22} color="#f7b731" />, label: 'Superannuation' },
  stocks: { icon: <FontAwesome5 name="chart-line" size={22} color="#e67e22" />, label: 'Stocks' },
  mutual_funds: { icon: <MaterialCommunityIcons name="finance" size={22} color="#c0392b" />, label: 'Mutual Funds' },
  assets: { icon: <MaterialCommunityIcons name="diamond-stone" size={22} color="#2eaf7d" />, label: 'Assets' },
};

const ACCOUNT_TYPES = Object.keys(ACCOUNT_TYPE_ICON_MAP);

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  initialData?: any;
  loading?: boolean;
  isEdit?: boolean;
  onDelete?: () => Promise<void>;
}

export default function AccountForm({ visible, onClose, onSubmit, initialData = {}, loading, isEdit, onDelete }: Props) {
  const scheme = 'light'; //useColorScheme();
  const styles = getAccountFormStyles(scheme);
  const { entities, userId } = useEntityContext();
  const [form, setForm] = useState<any>(initialData);
  const [submitting, setSubmitting] = useState(false);
  const [offsetOptions, setOffsetOptions] = useState<any[]>([]);
  const [propertyOptions, setPropertyOptions] = useState<any[]>([]);
  const [showOffsetPicker, setShowOffsetPicker] = useState(false);
  const [showPropertyPicker, setShowPropertyPicker] = useState(false);

  // Only reset form when modal is opened
  useEffect(() => {
    if (visible) {
      Logger.debug('[AccountForm] Modal opened, setting form to initialData', { initialData }, 'AccountForm.tsx');
      setForm(initialData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, initialData?.id]);

  // Fetch offset/property options when type is mortgage and modal is visible
  useEffect(() => {
    const effectiveType = form.type || initialData.type;
    if (visible && effectiveType === 'mortgage' && userId) {
      Logger.debug('[AccountForm] Fetching savings accounts and properties for user', { userId, form, initialData }, 'AccountForm.tsx');
      fetchSavingsAccountsForUser(userId).then(({ data, error }) => {
        Logger.debug('[AccountForm] fetchSavingsAccountsForUser result', { data, error }, 'AccountForm.tsx');
        setOffsetOptions((data || []).map((o: any) => ({ ...o, id: String(o.id) })));
      });
      fetchUserProperties(userId).then(({ data, error }) => {
        Logger.debug('[AccountForm] fetchUserProperties result', { data, error }, 'AccountForm.tsx');
        setPropertyOptions((data || []).map((p: any) => ({ label: p.address, value: String(p.id) })));
      });
    } else if (visible) {
      Logger.debug('[AccountForm] Not mortgage or no userId, clearing options', { form, userId }, 'AccountForm.tsx');
      setOffsetOptions([]);
      setPropertyOptions([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, form.type, userId, initialData.type]);

  const handleChange = (key: string, value: any) => {
    Logger.debug('[AccountForm] handleChange called', { key, value, prevForm: form }, 'AccountForm.tsx');
    // Always update form immediately for UI reactivity
    if (key === 'type') {
      setForm((prev: any) => {
        const updated = { ...prev, type: value, offset_account_id: undefined, property_id: undefined };
        Logger.debug('[AccountForm] handleChange type setForm', { updated }, 'AccountForm.tsx');
        return updated;
      });
    } else {
      setForm((prev: any) => {
        const updated = { ...prev, [key]: value };
        Logger.debug('[AccountForm] handleChange setForm', { updated }, 'AccountForm.tsx');
        return updated;
      });
    }
  };

  // On save, do not include ownerships or UI-only fields
  const handleSave = async () => {
    setSubmitting(true);
    try {
      // Remove UI-only fields before submit
      const submitForm = { ...form };
      delete submitForm.currencyPickerOpen;
      await onSubmit(submitForm);
      onClose();
    } catch (e: any) {
      Logger.debug('AccountForm save error', { error: e, message: e?.message }, 'AccountForm.tsx');
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
      Logger.debug('AccountForm delete error', { error: e, message: e?.message }, 'AccountForm.tsx');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>{isEdit ? 'Edit' : 'Add'} Account</Text>
          {/* Type Picker */}
          <Text style={styles.label}>Type</Text>
          <View style={styles.pickerRow}>
            {ACCOUNT_TYPES.map(type => (
              <TouchableOpacity
                key={type}
                style={[styles.typeOption, form.type === type && styles.typeOptionActive]}
                onPress={() => handleChange('type', type)}
              >
                {(ACCOUNT_TYPE_ICON_MAP as Record<string, { icon: React.ReactNode; label: string }>)[type].icon}
                <Text style={{ marginLeft: 4, fontSize: 12 }}>{(ACCOUNT_TYPE_ICON_MAP as Record<string, { icon: React.ReactNode; label: string }>)[type].label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={styles.input}
            placeholder="Description"
            value={form.institution || ''}
            onChangeText={v => handleChange('institution', v)}
          />
          {/* Offset Account Picker for mortgage */}
          {form.type === 'mortgage' && (
            <>
              <Text style={styles.label}>Offset Account</Text>
              <TouchableOpacity
                style={styles.input}
                onPress={() => setShowOffsetPicker(true)}
                disabled={offsetOptions.length === 0}
              >
                <Text style={{ color: form.offset_account_id ? '#222' : '#888' }}>
                  {offsetOptions.find(o => o.id === form.offset_account_id)
                    ? `${offsetOptions.find(o => o.id === form.offset_account_id)?.institution || 'Savings'} - $${offsetOptions.find(o => o.id === form.offset_account_id)?.balance}`
                    : (offsetOptions.length === 0 ? 'No savings accounts available' : 'Select Offset Account')}
                </Text>
              </TouchableOpacity>
              <Picker
                visible={showOffsetPicker}
                options={offsetOptions.map(opt => ({ label: `${opt.institution || 'Savings'} - $${opt.balance}`, value: opt.id }))}
                selectedValue={form.offset_account_id}
                onSelect={(v: string | number) => handleChange('offset_account_id', v)}
                onClose={() => setShowOffsetPicker(false)}
                title="Select Offset Account"
              />
            </>
          )}
          {/* Property Picker for mortgage */}
          {form.type === 'mortgage' && (
            <>
              <Text style={styles.label}>Property</Text>
              <TouchableOpacity
                style={styles.input}
                onPress={() => setShowPropertyPicker(true)}
                disabled={propertyOptions.length === 0}
              >
                <Text style={{ color: form.property_id ? '#222' : '#888' }}>
                  {propertyOptions.find(o => o.value === form.property_id)?.label || (propertyOptions.length === 0 ? 'No properties available' : 'Select Property')}
                </Text>
              </TouchableOpacity>
              <Picker
                visible={showPropertyPicker}
                options={propertyOptions}
                selectedValue={form.property_id}
                onSelect={(v: string | number) => handleChange('property_id', v)}
                onClose={() => setShowPropertyPicker(false)}
                title="Select Property"
              />
            </>
          )}
          {/* Balance */}
          <Text style={styles.label}>Balance</Text>
          <View style={{ position: 'relative' }}>
            <TextInput
              style={[styles.input, { paddingLeft: 28 }]}
              placeholder="Balance"
              keyboardType={Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'}
              value={form.balance !== undefined && form.balance !== null ? form.balance.toString() : ''}
              onChangeText={v => {
                // Allow only numbers and up to 2 decimals
                const cleaned = v.replace(/[^\d.]/g, '');
                const match = cleaned.match(/^\d*(\.\d{0,2})?/);
                handleChange('balance', match ? match[0] : '');
              }}
            />
            <Text style={{ position: 'absolute', left: 10, top: 12, color: '#888', fontSize: 16 }}>$</Text>
          </View>
          {/* Interest Rate */}
          <Text style={styles.label}>Interest Rate (%)</Text>
          <TextInput
            style={styles.input}
            placeholder="Interest Rate"
            keyboardType={Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'}
            value={form.interest_rate !== undefined && form.interest_rate !== null ? String(form.interest_rate) : '0.00'}
            onChangeText={v => {
              // Allow only numbers and up to 2 decimals
              const cleaned = v.replace(/[^\d.]/g, '');
              const match = cleaned.match(/^\d*(\.\d{0,2})?/);
              handleChange('interest_rate', match ? match[0] : '');
            }}
          />
          {/* Currency */}
          <Text style={styles.label}>Currency</Text>
          <View style={styles.input}>
            <Picker
              visible={!!form.currencyPickerOpen}
              options={[
                { label: 'AUD ($)', value: 'AUD' },
                { label: 'USD ($)', value: 'USD' },
                { label: 'INR (₹)', value: 'INR' },
              ]}
              selectedValue={form.currency || 'AUD'}
              onSelect={v => handleChange('currency', v)}
              onClose={() => handleChange('currencyPickerOpen', false)}
              title="Select Currency"
            />
            <TouchableOpacity onPress={() => handleChange('currencyPickerOpen', true)}>
              <Text style={{ color: '#222', fontSize: 16 }}>
                {form.currency || 'AUD'}
              </Text>
            </TouchableOpacity>
          </View>
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
