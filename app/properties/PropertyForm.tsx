import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { addProperty } from '@/lib/supabase/properties';
import { useEntityContext } from '@/components/EntityContext';
import PropertyFormStyles from '@/styles/PropertyFormStyles';
import { useColorScheme } from '@/components/useColorScheme';
import { Picker } from '@react-native-picker/picker';

export default function PropertyForm() {
  const scheme = 'light'; //useColorScheme();
  const styles = PropertyFormStyles(scheme);
  const router = useRouter();
  const { userId } = useEntityContext();
  const [address, setAddress] = useState('');
  const [propertyType, setPropertyType] = useState('RESIDENTIAL');
  const [propertyCategory, setPropertyCategory] = useState('INVESTMENT');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [currentValue, setCurrentValue] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [status, setStatus] = useState('');
  const [saleDate, setSaleDate] = useState<Date | null>(null);
  const [showSaleDatePicker, setShowSaleDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!address || !purchasePrice || !currentValue) {
      Alert.alert('Missing Fields', 'Please fill all required fields.');
      return;
    }
    setLoading(true);
    try {
      const property = {
        address,
        propertytype: propertyType,
        propertycategory: propertyCategory,
        purchaseprice: Number(purchasePrice),
        currentvalue: Number(currentValue),
        purchasedate: purchaseDate.toISOString(),
        user_id: userId,
        status,
        saledate: status === 'sold' && saleDate ? saleDate.toISOString() : null,
      };
      const { error } = await addProperty(property);
      if (error) throw error;
      router.back();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to add property.');
    } finally {
      setLoading(false);
    }
  };

  return (
  <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Add New Property</Text>
      <Text style={styles.label}>Address *</Text>
      <TextInput
        style={styles.input}
        value={address}
        onChangeText={setAddress}
        placeholder="Enter property address"
      />
      <Text style={styles.label}>Property Type *</Text>
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.chip, propertyType === 'RESIDENTIAL' && styles.chipSelected]}
          onPress={() => setPropertyType('RESIDENTIAL')}
        >
          <Text style={propertyType === 'RESIDENTIAL' ? styles.chipTextSelected : styles.chipText}>Residential</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.chip, propertyType === 'COMMERCIAL' && styles.chipSelected]}
          onPress={() => setPropertyType('COMMERCIAL')}
        >
          <Text style={propertyType === 'COMMERCIAL' ? styles.chipTextSelected : styles.chipText}>Commercial</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.label}>Category *</Text>
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.chip, propertyCategory === 'INVESTMENT' && styles.chipSelected]}
          onPress={() => setPropertyCategory('INVESTMENT')}
        >
          <Text style={propertyCategory === 'INVESTMENT' ? styles.chipTextSelected : styles.chipText}>Investment</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.chip, propertyCategory === 'OWNER_OCCUPIED' && styles.chipSelected]}
          onPress={() => setPropertyCategory('OWNER_OCCUPIED')}
        >
          <Text style={propertyCategory === 'OWNER_OCCUPIED' ? styles.chipTextSelected : styles.chipText}>Owner Occupied</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.label}>Purchase Price *</Text>
      <TextInput
        style={styles.input}
        value={purchasePrice}
        onChangeText={setPurchasePrice}
        placeholder="e.g. 500000"
        keyboardType={Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'}
      />
      <Text style={styles.label}>Current Value *</Text>
      <TextInput
        style={styles.input}
        value={currentValue}
        onChangeText={setCurrentValue}
        placeholder="e.g. 600000"
        keyboardType={Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'}
      />
      <Text style={styles.label}>Purchase Date *</Text>
      <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.input}>
        <Text>{purchaseDate.toDateString()}</Text>
      </TouchableOpacity>
      {showDatePicker && (
        <DateTimePicker
          value={purchaseDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, date) => {
            setShowDatePicker(false);
            if (date) setPurchaseDate(date);
          }}
        />
      )}
      <View style={{ marginVertical: 12 }}>
        <Text style={styles.label}>Status</Text>
        <View style={styles.input}>
          <Picker
            selectedValue={status}
            onValueChange={(itemValue) => setStatus(itemValue)}
            style={{ height: 40 }}
          >
            <Picker.Item label="PPOR" value="ppor" />
            <Picker.Item label="LEASED" value="leased" />
            <Picker.Item label="FOR LEASE" value="for_lease" />
            <Picker.Item label="FOR SALE" value="for_sale" />
            <Picker.Item label="SOLD" value="sold" />
            <Picker.Item label="UNDER BUILD" value="under_build" />
            <Picker.Item label="UNDER OFFER" value="under_offer" />
            <Picker.Item label="PROSPECT" value="prospect" />
            <Picker.Item label="PENDING SETTLEMENT" value="pending_settlement" />
          </Picker>
        </View>
        {status === 'sold' && (
          <>
            <Text style={styles.label}>Sale Date</Text>
            <TouchableOpacity onPress={() => setShowSaleDatePicker(true)} style={styles.input}>
              <Text>{saleDate ? saleDate.toDateString() : 'Select sale date'}</Text>
            </TouchableOpacity>
            {showSaleDatePicker && (
              <DateTimePicker
                value={saleDate || new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, date) => {
                  setShowSaleDatePicker(false);
                  if (date) setSaleDate(date);
                }}
              />
            )}
          </>
        )}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginVertical: 8 }}>
        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: '#aaa', flex: 1, marginRight: 8 }]}
          onPress={() => router.back()}
          disabled={loading}
        >
          <Text style={[styles.submitBtnText, { color: '#fff' }]}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.submitBtn, { flex: 1 }]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitBtnText}>{loading ? 'Saving...' : 'Add Property'}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
