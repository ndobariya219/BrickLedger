import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, TextInput, Alert, Platform } from 'react-native';
import { useEntityContext } from '@/components/EntityContext';
import { AntDesign, Feather } from '@expo/vector-icons';
import PickerModal from '@/components/Picker';
import { deletePropertyOwnerships } from '@/lib/supabase/ownership';
import { supabase } from '@/lib/supabase';
import { Logger } from '@/lib/logger';
import PropertyOwnershipFormStyles from '@/styles/PropertyOwnershipFormStyles';

interface Ownership {
  entityId: string;
  percentage: string;
}

interface PropertyOwnershipFormProps {
  visible: boolean;
  onClose: () => void;
  onSubmit?: (ownerships: Ownership[]) => void;
  initialOwnerships?: Ownership[];
  propertyId: string;
}

const PropertyOwnershipForm: React.FC<PropertyOwnershipFormProps> = ({ visible, onClose, onSubmit, initialOwnerships = [], propertyId }) => {
  const { entities } = useEntityContext();
  const scheme = 'light'; // useColorScheme() can be used here
  const styles = PropertyOwnershipFormStyles(scheme);
  const [ownerships, setOwnerships] = useState<Ownership[]>(initialOwnerships.length ? initialOwnerships : [{ entityId: '', percentage: '' }]);
  const [submitting, setSubmitting] = useState(false);
  const [activePickerIndex, setActivePickerIndex] = useState<number | null>(null);

  useEffect(() => {
    if (visible) {
      setOwnerships(initialOwnerships.length ? initialOwnerships : [{ entityId: '', percentage: '' }]);
    }
  }, [visible, initialOwnerships]);

  const handleAdd = () => {
    // Calculate remaining percentage
    const used = ownerships.reduce((sum, o) => sum + Number(o.percentage || 0), 0);
    const remaining = Math.max(0, 100 - used);
    setOwnerships([
      ...ownerships,
      { entityId: '', percentage: remaining > 0 ? String(remaining) : '' }
    ]);
  };

  const handleRemove = (idx: number) => {
    setOwnerships(ownerships.filter((_, i) => i !== idx));
  };

  const handleChange = (idx: number, field: 'entityId' | 'percentage', value: string) => {
    setOwnerships(ownerships.map((o, i) => (i === idx ? { ...o, [field]: value } : o)));
  };

  const handleSave = async () => {
    if (!propertyId) {
      Alert.alert('Error', 'Property ID is missing. Cannot update ownerships.');
      return;
    }
    for (const o of ownerships) {
      if (!o.entityId || !o.percentage) {
        Alert.alert('Validation', 'Please select entity and enter percentage for all rows.');
        return;
      }
      if (isNaN(Number(o.percentage)) || Number(o.percentage) <= 0 || Number(o.percentage) > 100) {
        Alert.alert('Validation', 'Percentage must be a number between 1 and 100.');
        return;
      }
    }
    const entityIds = ownerships.map((o) => o.entityId);
    if (new Set(entityIds).size !== entityIds.length) {
      Alert.alert('Validation', 'Each entity can only be added once.');
      return;
    }
    // Ensure total is exactly 100
    const total = ownerships.reduce((sum, o) => sum + Number(o.percentage || 0), 0);
    if (total !== 100) {
      Alert.alert('Validation', 'Total ownership percentage must be exactly 100%.');
      return;
    }
    setSubmitting(true);
    try {
      // Delete old ownerships
      await deletePropertyOwnerships(propertyId);
      // Insert new ownerships
      const rows = ownerships.map(o => ({
        property_id: propertyId,
        entity_id: o.entityId,
        percentage: Number(o.percentage)
      }));
      const { error } = await supabase.from('property_ownership').insert(rows);
      if (error) throw error;
      if (onSubmit) await Promise.resolve(onSubmit(ownerships));
      setSubmitting(false);
      onClose();
    } catch (error) {
      setSubmitting(false);
      Logger.error('Failed to update property ownerships', { error, propertyId, ownerships });
      Alert.alert('Error', 'Failed to update ownerships. Please try again.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal || styles.container}>
          <Text style={styles.title}>Edit Property Ownership</Text>
          <ScrollView style={{ maxHeight: 300 }}>
            {ownerships.map((o, idx) => (
              <View key={idx} style={styles.row}>
                {/* Entity Picker */}
                <View style={styles.entityPicker}>
                  <TouchableOpacity
                    style={[styles.entityBtn, o.entityId ? undefined : { opacity: 0.9 }]}
                    onPress={() => setActivePickerIndex(idx)}
                  >
                    {(() => {
                      const selectedEntity = entities.find(e => String(e.id) === String(o.entityId));
                      return (
                        <Text style={{ color: o.entityId ? '#222' : '#888' }}>
                          {o.entityId
                            ? (selectedEntity?.name || selectedEntity?.display_name || o.entityId)
                            : 'Select Entity'}
                        </Text>
                      );
                    })()}
                  </TouchableOpacity>
                </View>
                {/* Percentage Input */}
                <View style={styles.percentageBox}>
                  <Text style={styles.label}>%:</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType={Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'}
                    value={o.percentage}
                    onChangeText={(text) => handleChange(idx, 'percentage', text.replace(/[^0-9.]/g, ''))}
                    placeholder="0"
                    maxLength={5}
                  />
                </View>
                {/* Remove Button */}
                {ownerships.length > 1 && (
                  <TouchableOpacity onPress={() => handleRemove(idx)} style={styles.removeBtn}>
                    <Feather name="trash-2" size={18} color="#c0392b" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </ScrollView>
          {/* Add Entity Button */}
          {ownerships.length < entities.length && (
            <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
              <AntDesign name="plus" size={18} color="#fff" />
              <Text style={{ color: '#fff', marginLeft: 6 }}>Add Entity</Text>
            </TouchableOpacity>
          )}
          {/* Entity Picker Modal for selecting entity per row */}
          <PickerModal
            visible={activePickerIndex !== null}
            options={(entities.filter(e => e.id !== 'all') || []).map((en: any) => ({ label: en.name || en?.display_name || en.id, value: en.id }))}
            selectedValue={activePickerIndex !== null ? ownerships[activePickerIndex]?.entityId : undefined}
            onSelect={(val) => {
              if (activePickerIndex === null) return;
              handleChange(activePickerIndex, 'entityId', String(val));
            }}
            onClose={() => setActivePickerIndex(null)}
            title="Select Entity"
          />
          {/* Actions */}
          <View style={styles.actionsRow}>
            <TouchableOpacity onPress={onClose} style={styles.cancelBtn} disabled={submitting}>
              <Text style={{ color: '#007AFF', fontWeight: 'bold' }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave} style={styles.saveBtn} disabled={submitting}>
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default PropertyOwnershipForm;
