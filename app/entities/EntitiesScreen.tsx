import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, TextInput } from 'react-native';
import { Feather, AntDesign, MaterialCommunityIcons, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useEntityContext } from '@/components/EntityContext';
import { fetchUserEntities, createEntity, updateEntity, deleteEntity } from '@/lib/supabase/entities';
import { supabase } from '@/lib/supabase';
import { getEntitiesScreenStyles } from '@/styles/EntitiesScreenStyles';
import { useColorScheme } from '@/components/useColorScheme';

const ENTITY_TYPE_LABELS: Record<string, string> = {
  individual: 'Individual',
  trust: 'Trust',
  company: 'Company',
};

const ENTITY_TYPE_ICON_MAP: Record<string, { icon: (size?: number) => React.ReactNode; label: string }> = {
  individual: {
    icon: (size = 22) => <FontAwesome5 name="user" size={size} color="#007AFF" />, label: 'Individual',
  },
  trust: {
    icon: (size = 22) => <MaterialCommunityIcons name="account-group" size={size} color="#e67e22" />, label: 'Trust',
  },
  company: {
    icon: (size = 22) => <Ionicons name="business" size={size} color="#8e44ad" />, label: 'Company',
  },
};

const EntityForm = ({ entity, onSave, onCancel }: any) => {
  const [name, setName] = useState(entity?.name || '');
  const [type, setType] = useState(entity?.type || 'individual');
  const scheme = 'light'; //useColorScheme();
  const styles = getEntitiesScreenStyles(scheme);
  return (
    <View style={styles.formContainer}>
      <Text style={styles.formLabel}>Name</Text>
      <TextInput
        style={styles.formInput}
        value={name}
        onChangeText={setName}
        placeholder="Entity Name"
      />
      <Text style={styles.formLabel}>Type</Text>
      <View style={styles.typeRow}>
        {Object.keys(ENTITY_TYPE_LABELS).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.typeBtn, type === t && styles.typeBtnActive]}
            onPress={() => setType(t)}
          >
            <Text style={type === t ? styles.typeBtnTextActive : styles.typeBtnText}>{ENTITY_TYPE_LABELS[t]}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.formActions}>
        <TouchableOpacity style={styles.saveBtn} onPress={() => onSave({ name, type })}>
          <Text style={styles.saveBtnText}>Save</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function EntitiesScreen() {
  const { userId } = useEntityContext();
  const [entities, setEntities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formVisible, setFormVisible] = useState(false);
  const [editEntity, setEditEntity] = useState<any | null>(null);
  const scheme = 'light'; //useColorScheme();
  const styles = getEntitiesScreenStyles(scheme);

  async function loadEntities() {
    setLoading(true);
    setError(null);
    const { data, error } = await fetchUserEntities(userId);
    if (error) setError(error.message);
    setEntities(data || []);
    setLoading(false);
  }

  useEffect(() => {
    if (userId) loadEntities();
  }, [userId]);

  const handleAdd = () => {
    setEditEntity(null);
    setFormVisible(true);
  };
  const handleEdit = (entity: any) => {
    setEditEntity(entity);
    setFormVisible(true);
  };
  const handleDelete = (entity: any) => {
    Alert.alert('Delete Entity', `Are you sure you want to delete "${entity.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await deleteEntity(entity.id);
          loadEntities();
        }
      }
    ]);
  };
  const handleSave = async (values: any) => {
    if (editEntity) {
      await updateEntity(editEntity.id, values);
    } else {
      await createEntity({ ...values, user_id: userId });
    }
    setFormVisible(false);
    loadEntities();
  };

  if (loading) return <Text style={{ margin: 20 }}>Loading...</Text>;
  if (error) return <Text style={{ color: 'red', margin: 20 }}>{error}</Text>;

  return (
    <View style={{ flex: 1, padding: 16, backgroundColor: '#f9f9f9' }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
  <Text style={styles.title}>Entities</Text>
      </View>
      {formVisible ? (
        <EntityForm
          entity={editEntity}
          onSave={handleSave}
          onCancel={() => setFormVisible(false)}
        />
      ) : (
        <FlatList
          data={entities}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => {
            const typeInfo = ENTITY_TYPE_ICON_MAP[item.type] || {
              icon: (size = 22) => <AntDesign name="question" size={size} color="#888" />, label: item.type,
            };
            return (
              <View style={styles.card}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {typeInfo.icon(28)}
                    <View style={{ marginLeft: 10 }}>
                      <Text style={styles.entityName}>{item.name}</Text>
                      <Text style={styles.entityType}>{typeInfo.label}</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row' }}>
                    <TouchableOpacity onPress={() => handleEdit(item)} style={styles.actionBtn}>
                      <Feather name="edit-2" size={18} color="#007AFF" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(item)} style={styles.actionBtn}>
                      <Feather name="trash-2" size={18} color="#c0392b" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          }}
          contentContainerStyle={{ paddingBottom: 80 }}
          showsVerticalScrollIndicator={false}
        />
      )}
      {/* Floating Add Button */}
      {!formVisible && (
  <TouchableOpacity style={styles.fab} onPress={handleAdd}>
          <AntDesign name="plus" size={28} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
}
