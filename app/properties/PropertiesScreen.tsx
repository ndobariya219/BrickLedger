import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, FlatList, Platform } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useEntityContext } from '@/components/EntityContext';
import { fetchUserProperties } from '@/lib/supabase/properties';
import { fetchPropertiesForEntity } from '@/lib/supabase/dashboard';
import { fetchEntityOwnershipsForProperties } from '@/lib/supabase/ownership';
import { format } from 'date-fns';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getPropertiesScreenStyles } from '@/styles/PropertiesScreenStyles';
import { useColorScheme } from '@/components/useColorScheme';
import { Logger } from '@/lib/logger';

export default function PropertiesScreen() {
  const { entities, selectedEntity, setSelectedEntity, loading: entityLoading, error: entityError, userId } = useEntityContext();
  const router = useRouter();
  const params = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [ownerships, setOwnerships] = useState<any[]>([]);
  const [liabilities, setLiabilities] = useState<any[]>([]);
  const scheme = 'light'; //useColorScheme();
  const styles = getPropertiesScreenStyles(scheme);

  useEffect(() => {
  }, [entities, selectedEntity, entityLoading, entityError, userId]);

  useEffect(() => {
    // If navigated with entityId param, update context
    let entityId = params.entityId;
    if (Array.isArray(entityId)) entityId = entityId[0];
    if (entityId && entityId !== selectedEntity) {
      setSelectedEntity(entityId);
    }
  }, [params.entityId]);

  const fetchEntitiesAndProperties = async () => {
    setLoading(true);
    setError(null);
    try {
      let propertiesData, propError;
      if (selectedEntity !== 'all') {
        const propRes = await fetchPropertiesForEntity(selectedEntity);
        propertiesData = propRes.data;
        propError = propRes.error;
      } else {
        const propRes = await fetchUserProperties(userId);
        propertiesData = propRes.data;
        propError = propRes.error;
      }
      if (propError) {
        setError('Error fetching properties: ' + propError.message);
        setLoading(false);
        return;
      }
      setProperties(propertiesData || []);
    } catch (err: any) {
      setError('Unexpected error: ' + (err?.message || String(err)));
      Logger.error('Error fetching properties', { error: err }, 'PropertiesScreen');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntitiesAndProperties();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEntity, userId]);

  useFocusEffect(
    React.useCallback(() => {
      fetchEntitiesAndProperties();
    }, [selectedEntity, userId])
  );

  useEffect(() => {
    async function fetchOwnerships() {
      if (selectedEntity !== 'all' && properties.length > 0) {
        const { data, error } = await fetchEntityOwnershipsForProperties(selectedEntity);
        if (!error) setOwnerships(data || []);
      } else {
        setOwnerships([]);
      }
    }
    fetchOwnerships();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEntity, properties]);

  useEffect(() => {
    async function fetchLiabilities() {
      if (selectedEntity !== 'all' && properties.length > 0) {
        // Use fetchMortgagesForEntity for the selected entity
        const { data, error } = await import('@/lib/supabase/accounts').then(mod => mod.fetchMortgagesByPropertyIds(properties.map((p: any) => p.id)));
        if (!error) setLiabilities(data || []);
        else setLiabilities([]);
      } else if (selectedEntity === 'all' && userId) {
        // Use fetchUserMortgageAccounts for all entities
        const { data, error } = await import('@/lib/supabase/accounts').then(mod => mod.fetchUserMortgageAccounts(userId));
        if (!error) setLiabilities(data || []);
        else setLiabilities([]);
      } else {
        setLiabilities([]);
      }
    }
    fetchLiabilities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEntity, properties, userId]);

  const getCategoryIcon = (category: string, type: string) => {
    if (category === 'OWNER_OCCUPIED' && type === 'RESIDENTIAL') {
      return <MaterialCommunityIcons name="home-account" size={32} color="#007AFF" />;
    }
    if (category === 'INVESTMENT' && type === 'RESIDENTIAL') {
      return <MaterialCommunityIcons name="home-variant" size={32} color="#007AFF" />;
    }
    if (category === 'INVESTMENT' && type === 'COMMERCIAL') {
      return <MaterialCommunityIcons name="office-building" size={32} color="#007AFF" />;
    }
    return null;
  };

  const renderProperty = ({ item }: { item: any }) => {

    let liability = null;
    let lvr = null;
    let capitalGrowth = null;
    let annualisedReturn = null;
    let formattedPurchaseDate = item.purchasedate ? format(new Date(item.purchasedate), 'dd/MM/yyyy') : '';
    let formattedSaleDate = item.saledate ? format(new Date(item.saledate), 'dd/MM/yyyy') : '';
    // Ownership
    let percent = 100;
    let share = item.currentvalue;
    if (selectedEntity !== 'all') {
      const ownership = ownerships.find((o: any) => o.property_id === item.id);
      if (ownership) {
        percent = Number(ownership.percentage ?? ownership.ownership_percent) || 0;
      }
    }
    // Liabilities (mortgage)
    const propertyLiability = liabilities.filter((l: any) => l.property_id === item.id);
    let liabilityValue = propertyLiability.reduce((total: number, liab: any) => total + (liab.balance || 0), 0);
    let lvrValue = liabilityValue && item.currentvalue ? (liabilityValue / item.currentvalue) * 100 : null;
    // Capital Growth
    let growth = item.purchaseprice && item.currentvalue ? ((item.currentvalue - item.purchaseprice) / item.purchaseprice) * 100 : null;
    // Annualised Return
    let annualised = null;
    if (item.purchaseprice && item.currentvalue && item.purchasedate) {
      const years = Math.max(1 / 12, (new Date().getTime() - new Date(item.purchasedate).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      annualised = Math.pow(item.currentvalue / item.purchaseprice, 1 / years) - 1;
    }
    // Sold property logic
    const isSold = item.status === 'sold' && item.saledate && new Date(item.saledate) <= new Date();
    return (
      <TouchableOpacity onPress={() => router.push({ pathname: '/properties/PropertyDetailsScreen', params: { property: JSON.stringify(item) } })} activeOpacity={0.85}>
        <View style={[styles.propertyCard, { borderColor: isSold ? '#c0392b' : '#007AFF', borderWidth: isSold ? 3 : 2, opacity: isSold ? 0.5 : 1 }]}>
          <View style={styles.iconContainer}>{getCategoryIcon(item.propertycategory, item.propertytype)}</View>
          <View style={styles.propertyInfo}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {/* Tag pill */}
              {item.status && (
                <View
                  style={{
                    backgroundColor:
                      item.status === 'sold'
                        ? '#c0392b'
                        : item.status === 'ppor'
                          ? '#27ae60'
                          : item.status === 'leased'
                            ? '#2980b9'
                            : item.status === 'under_build' || item.status === 'pending_settlement' || item.status === 'prospect'
                              ? '#e67e22'
                              : item.status === 'for_sale' || item.status === 'under_offer' 
                                ? '#8e44ad'
                                : item.status === 'for_lease'
                                  ? '#16a085'
                                  : '#fff',
                    borderRadius: 8,
                    paddingHorizontal: 8,
                    marginRight: 8,
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}>
                    {item.status.toUpperCase()?.replaceAll('_', ' ')}
                  </Text>
                </View>
              )}
              {/* Address/title, single line, ellipsis */}
              <Text
                style={[styles.propertyTitle, { flexShrink: 1 }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {item.address}
              </Text>
            </View>
            <Text style={styles.purchasePrice}>Purchased for ${item.purchaseprice?.toLocaleString?.() ?? item.purchaseprice} on {formattedPurchaseDate}</Text>
            {isSold && item.saledate && (
              <Text style={{ color: '#c0392b', fontWeight: 'bold', marginBottom: 2, marginTop: 2 }}>Sold: {formattedSaleDate}</Text>
            )}
            <View style={styles.metricsRow}>
              <View style={styles.marketValueHighlight}>
                <Text style={styles.metricLabel}>{isSold ? 'Sold @' : 'Estimated Value'}</Text>
                <Text style={styles.marketValueText}>${item.currentvalue?.toLocaleString?.() ?? item.currentvalue}</Text>
              </View>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Liability</Text>
                <Text style={styles.metricValue}>${liabilityValue?.toLocaleString?.() ?? liabilityValue}</Text>
              </View>
              {lvrValue !== null && (
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>LVR</Text>
                  <Text style={styles.metricValue}>{lvrValue.toFixed(2)}%</Text>
                </View>
              )}
              {growth !== null && (
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>Growth</Text>
                  <Text style={styles.metricValue}>{growth.toFixed(2)}%</Text>
                </View>
              )}
              {annualised !== null && (
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>Annualised</Text>
                  <Text style={styles.metricValue}>{(annualised * 100).toFixed(2)}%</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', flex: 1 }]}>
        <ActivityIndicator size="large" color="#2eaf7d" />
      </View>
    );
  }
  if (error) {
    return (
      <View style={[styles.container, { justifyContent: 'center', flex: 1 }]}>
        <Text style={{ color: 'red', fontSize: 16, textAlign: 'center' }}>{error}</Text>
      </View>
    );
  }
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={{ fontSize: 26, fontWeight: 'bold', color: '#222' }}>Properties</Text>
      </View>
      <FlatList
        data={properties.sort((a, b) => {
          // also put sold properties at the end regardless of date
          if (a.status === 'sold' && b.status !== 'sold') return 1;
          if (a.status !== 'sold' && b.status === 'sold') return -1;
          // then sort by purchase date ascending
          const dateA = a.purchasedate ? new Date(a.purchasedate).getTime() : 0;
          const dateB = b.purchasedate ? new Date(b.purchasedate).getTime() : 0;
          return dateA - dateB;
        })}
        keyExtractor={(item) => item.id?.toString() ?? Math.random().toString()}
        renderItem={renderProperty}
        ListEmptyComponent={<Text style={{ color: '#aaa', textAlign: 'center', marginTop: 24 }}>No properties found.</Text>}
        contentContainerStyle={styles.listContent}
      />
      {/* Floating Add Button */}
      <TouchableOpacity
        style={[styles.fab]}
        onPress={() => router.push({ pathname: '/properties/PropertyForm' })}
        activeOpacity={0.9}
        accessibilityLabel="Add Property"
      >
        <MaterialCommunityIcons name="plus" size={32} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}
