import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, Dimensions, type DimensionValue } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useEntityContext } from '@/components/EntityContext';
import { fetchUserProperties } from '@/lib/supabase/properties';
import { fetchPropertiesForEntity } from '@/lib/supabase/dashboard';
import { fetchEntityOwnershipsForProperties } from '@/lib/supabase/ownership';
import { format } from 'date-fns';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getPropertiesScreenStyles } from '@/styles/PropertiesScreenStyles';
import { Logger } from '@/lib/logger';

export default function PropertiesScreen() {
  const { entities, selectedEntity, setSelectedEntity, loading: entityLoading, error: entityError, userId } = useEntityContext();
  const router = useRouter();
  const params = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ownerships, setOwnerships] = useState<any[]>([]);
  const [liabilities, setLiabilities] = useState<any[]>([]);
  const scheme = 'light'; //useColorScheme();
  const styles = getPropertiesScreenStyles(scheme);
  const windowWidth = Dimensions.get('window').width;
  const isCompactMetrics = windowWidth < 760;
  const uiTheme = {
    pageBg: '#f3f6fb',
    surface: '#ffffff',
    surfaceSoft: '#f7f9fd',
    border: '#d6e0ee',
    divider: '#e7eef8',
    textPrimary: '#0b1f3d',
    textSecondary: '#1e3a64',
    textMuted: '#60738f',
    accent: '#102a54',
    accentSoft: '#e8eef9',
    radiusCard: 16,
    radiusItem: 10,
  } as const;
  const semanticColors = {
    info: '#0f2b57',
    infoSoft: '#e9eef9',
    success: '#1e4a84',
    successSoft: '#eaf2ff',
    violet: '#355f9d',
    violetSoft: '#eef3ff',
    warning: '#9b6a00',
    warningSoft: '#fff5d9',
    orange: '#a26500',
    orangeSoft: '#fff1cc',
    danger: '#b4232a',
    iconChip: '#ffffff',
  } as const;
  const webUi = {
    shellBg: '#f7f9fe',
    shellBorder: '#dbe4f2',
    shellInset: '#edf2f9',
    shellRadius: 22,
    sectionShadow: {
      shadowColor: '#0f172a',
      shadowOpacity: 0.06,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
      elevation: 2,
    },
  } as const;
  const sectionCardStyle = {
    backgroundColor: uiTheme.surface,
    borderRadius: uiTheme.radiusCard,
    borderWidth: 1,
    borderColor: uiTheme.border,
    ...webUi.sectionShadow,
  } as const;
  const tileIconSizing = {
    cardChip: windowWidth < 760 ? 34 : 38,
    cardIcon: windowWidth < 760 ? 19 : 22,
    metricChip: windowWidth < 760 ? 18 : 20,
    metricIcon: windowWidth < 760 ? 11 : 12,
  } as const;

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
        const entityIds: any[] = [selectedEntity];
        const { data, error } = await fetchEntityOwnershipsForProperties(entityIds);
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

  const getCategoryIcon = (category: string, type: string, status?: string) => {
    const normalizedCategory = String(category || '').toUpperCase();
    const normalizedType = String(type || '').toUpperCase();
    const normalizedStatus = String(status || '').toUpperCase();

    // Status-first overrides for key lifecycle states.
    if (normalizedStatus === 'LEASED') {
      return { name: 'key-variant' as const, color: semanticColors.success };
    }
    if (normalizedStatus === 'UNDER_BUILD') {
      return { name: 'hammer-wrench' as const, color: semanticColors.warning };
    }
    if (normalizedStatus === 'SOLD') {
      return { name: 'home-export-outline' as const, color: semanticColors.orange };
    }

    // Primary mappings by category + type for clearer semantics.
    if (normalizedCategory === 'OWNER_OCCUPIED' && normalizedType === 'RESIDENTIAL') {
      return { name: 'home-account' as const, color: semanticColors.info };
    }
    if (normalizedCategory === 'INVESTMENT' && normalizedType === 'RESIDENTIAL') {
      return { name: 'home-city-outline' as const, color: semanticColors.success };
    }
    if (normalizedCategory === 'INVESTMENT' && normalizedType === 'COMMERCIAL') {
      return { name: 'office-building-outline' as const, color: semanticColors.violet };
    }

    // Type-first fallbacks.
    if (normalizedType === 'RESIDENTIAL') {
      return { name: 'home-outline' as const, color: semanticColors.info };
    }
    if (normalizedType === 'COMMERCIAL') {
      return { name: 'office-building-outline' as const, color: semanticColors.violet };
    }
    if (normalizedType === 'INDUSTRIAL') {
      return { name: 'factory' as const, color: semanticColors.warning };
    }
    if (normalizedType === 'LAND' || normalizedType === 'RURAL') {
      return { name: 'pine-tree' as const, color: semanticColors.orange };
    }

    // Category-first fallback and final default.
    if (normalizedCategory === 'OWNER_OCCUPIED') {
      return { name: 'home-account' as const, color: semanticColors.info };
    }
    if (normalizedCategory === 'INVESTMENT') {
      return { name: 'chart-line-variant' as const, color: semanticColors.success };
    }
    return { name: 'domain' as const, color: semanticColors.info };
  };

  const renderProperty = (item: any) => {
    let formattedPurchaseDate = item.purchasedate ? format(new Date(item.purchasedate), 'dd/MM/yyyy') : '';
    let formattedSaleDate = item.saledate ? format(new Date(item.saledate), 'dd/MM/yyyy') : '';
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
    const status = String(item.status || '').toLowerCase();
    const statusColor =
      status === 'sold'
        ? semanticColors.danger
        : status === 'ppor'
          ? semanticColors.success
          : status === 'leased'
            ? semanticColors.info
            : status === 'under_build' || status === 'pending_settlement' || status === 'prospect'
              ? semanticColors.warning
              : status === 'for_sale' || status === 'under_offer'
                ? semanticColors.violet
                : status === 'for_lease'
                  ? semanticColors.info
                  : uiTheme.textSecondary;
    const propertyIcon = getCategoryIcon(item.propertycategory, item.propertytype, item.status);
    const metricTiles = [
      {
        key: 'value',
        label: isSold ? 'Sold @' : 'Estimated Value',
        value: `$${item.currentvalue?.toLocaleString?.() ?? item.currentvalue}`,
        icon: 'cash-multiple' as const,
        color: semanticColors.success,
        backgroundColor: semanticColors.successSoft,
      },
      {
        key: 'liability',
        label: 'Liability',
        value: `$${liabilityValue?.toLocaleString?.() ?? liabilityValue}`,
        icon: 'credit-card-outline' as const,
        color: semanticColors.violet,
        backgroundColor: semanticColors.violetSoft,
      },
      {
        key: 'lvr',
        label: 'LVR',
        value: lvrValue !== null ? `${lvrValue.toFixed(2)}%` : null,
        icon: 'percent' as const,
        color: semanticColors.orange,
        backgroundColor: semanticColors.orangeSoft,
      },
      {
        key: 'growth',
        label: 'Growth',
        value: growth !== null ? `${growth.toFixed(2)}%` : null,
        icon: 'trending-up' as const,
        color: semanticColors.warning,
        backgroundColor: semanticColors.warningSoft,
      },
      {
        key: 'annualised',
        label: 'Annualised',
        value: annualised !== null ? `${(annualised * 100).toFixed(2)}%` : null,
        icon: 'chart-line' as const,
        color: semanticColors.info,
        backgroundColor: semanticColors.infoSoft,
      },
    ].filter((m) => m.value !== null);
    const metricTileWidth = `${100 / Math.max(metricTiles.length, 1)}%` as DimensionValue;

    return (
      <TouchableOpacity onPress={() => router.push({ pathname: '/properties/PropertyDetailsScreen', params: { property: JSON.stringify(item) } })} activeOpacity={0.85}>
        <View
          style={[
            styles.propertyCard,
            {
              borderColor: isSold ? '#c0392b' : uiTheme.border,
              borderWidth: 1,
              borderRadius: uiTheme.radiusCard,
              opacity: isSold ? 0.7 : 1,
              backgroundColor: uiTheme.surface,
              paddingVertical: 14,
              paddingHorizontal: 14,
              alignItems: 'flex-start',
              flexDirection: 'column',
              ...webUi.sectionShadow,
              position: 'relative',
            },
          ]}
        >
          <View
            style={{
              position: 'absolute',
              right: 12,
              top: 12,
              width: tileIconSizing.cardChip,
              height: tileIconSizing.cardChip,
              borderRadius: tileIconSizing.cardChip / 2,
              backgroundColor: semanticColors.iconChip,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MaterialCommunityIcons name={propertyIcon.name} size={tileIconSizing.cardIcon} color={propertyIcon.color} />
          </View>

          <View style={[styles.propertyInfo, { width: '100%', paddingRight: 48 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {/* Tag pill */}
              {item.status && (
                <View
                  style={{
                    backgroundColor: statusColor,
                    borderRadius: 8,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
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
                style={[styles.propertyTitle, { flexShrink: 1, color: uiTheme.textPrimary, fontWeight: '800' }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {item.address}
              </Text>
            </View>
            <Text style={[styles.purchasePrice, { color: uiTheme.textMuted }]}>Purchased for ${item.purchaseprice?.toLocaleString?.() ?? item.purchaseprice} on {formattedPurchaseDate}</Text>
            {isSold && item.saledate && (
              <Text style={{ color: semanticColors.danger, fontWeight: 'bold', marginBottom: 2, marginTop: 2 }}>Sold: {formattedSaleDate}</Text>
            )}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4, marginTop: 6 }}>
              {metricTiles.map((metric) => (
                <View key={metric.key} style={{ width: metricTileWidth, paddingHorizontal: 3, marginBottom: 6 }}>
                  <View
                    style={{
                      borderRadius: uiTheme.radiusItem,
                      backgroundColor: metric.backgroundColor,
                      borderWidth: 1,
                      borderColor: uiTheme.border,
                      minHeight: isCompactMetrics ? 58 : 64,
                      paddingVertical: 8,
                      paddingHorizontal: 8,
                      paddingRight: 24,
                      justifyContent: 'space-between',
                      position: 'relative',
                    }}
                  >
                    <View
                      style={{
                        position: 'absolute',
                        right: 6,
                        top: 6,
                        width: tileIconSizing.metricChip,
                        height: tileIconSizing.metricChip,
                        borderRadius: tileIconSizing.metricChip / 2,
                        backgroundColor: semanticColors.iconChip,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <MaterialCommunityIcons name={metric.icon} size={tileIconSizing.metricIcon} color={metric.color} />
                    </View>
                    <Text style={{ fontSize: 9, color: uiTheme.textMuted, fontWeight: '500' }} numberOfLines={1}>{metric.label}</Text>
                    <Text style={{ fontSize: isCompactMetrics ? 15 : 17, fontWeight: '800', color: metric.color, marginTop: 3 }} numberOfLines={1}>{metric.value}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const categoryOrder = [
    'ppor',
    'leased',
    'investment',
    'for_lease',
    'for_sale',
    'under_offer',
    'under_build',
    'pending_settlement',
    'prospect',
    'sold',
  ];

  const formatStatusLabel = (status: string) => status.toUpperCase().replaceAll('_', ' ');

  const groupedProperties = useMemo(() => {
    const sorted = [...properties].sort((a, b) => {
      const dateA = a.purchasedate ? new Date(a.purchasedate).getTime() : 0;
      const dateB = b.purchasedate ? new Date(b.purchasedate).getTime() : 0;
      return dateA - dateB;
    });

    const groupsMap = new Map<string, any[]>();
    sorted.forEach((property) => {
      const key = String(property.status || 'uncategorized').toLowerCase();
      if (!groupsMap.has(key)) groupsMap.set(key, []);
      groupsMap.get(key)!.push(property);
    });

    const orderedKeys = Array.from(groupsMap.keys()).sort((a, b) => {
      const ai = categoryOrder.indexOf(a);
      const bi = categoryOrder.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });

    return orderedKeys.map((key) => ({ key, label: formatStatusLabel(key), items: groupsMap.get(key) || [] }));
  }, [properties]);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', flex: 1 }]}>
        <ActivityIndicator size="large" color={uiTheme.accent} />
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
    <View style={[styles.container, { backgroundColor: uiTheme.pageBg }]}> 
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 72, paddingHorizontal: 18, paddingTop: 16 }}
      >
        <View style={{ flex: 1, width: '100%', alignSelf: 'center' }}>
          <View
            style={{
              backgroundColor: webUi.shellBg,
              borderWidth: 1,
              borderColor: webUi.shellBorder,
              borderRadius: webUi.shellRadius,
              paddingHorizontal: 14,
              paddingVertical: 14,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderWidth: 1,
                borderColor: webUi.shellInset,
                borderRadius: 14,
                backgroundColor: '#ffffff',
                paddingHorizontal: 12,
                paddingVertical: 8,
                marginBottom: 12,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: uiTheme.accent, marginRight: 8 }} />
                <Text style={{ fontSize: 12, fontWeight: '700', color: uiTheme.textSecondary }}>Portfolio Assets</Text>
              </View>
              <View style={{ borderRadius: 999, backgroundColor: uiTheme.accentSoft, paddingHorizontal: 10, paddingVertical: 5 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: uiTheme.accent }}>Properties View</Text>
              </View>
            </View>

            <View style={[styles.headerRow, { marginBottom: 14, marginTop: 4, paddingHorizontal: 8 }]}> 
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 30, fontWeight: '800', color: uiTheme.textPrimary }}>Properties</Text>
                <Text style={{ fontSize: 13, color: uiTheme.textMuted, marginTop: 4 }}>Portfolio holdings grouped by lifecycle status</Text>
              </View>
            </View>

        {groupedProperties.length === 0 ? (
          <Text style={{ color: uiTheme.textMuted, textAlign: 'center', marginTop: 24 }}>No properties found.</Text>
        ) : (
          groupedProperties.map((group) => (
            <View key={group.key} style={[sectionCardStyle, { marginBottom: 14, paddingVertical: 12, paddingHorizontal: 12 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: uiTheme.accent, marginRight: 8 }} />
                <Text style={{ fontSize: 13, fontWeight: '800', color: uiTheme.textSecondary, marginRight: 8 }}>
                  {group.label}
                </Text>
                <View style={{ borderRadius: 999, backgroundColor: uiTheme.accentSoft, paddingHorizontal: 8, paddingVertical: 2 }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: uiTheme.accent }}>{group.items.length}</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 }}>
                {group.items.map((property, idx) => (
                  <View key={property.id?.toString() ?? `${group.key}-${property.address}`} style={{ width: '50%', paddingHorizontal: 6 }}>
                    <View style={{ marginBottom: idx < group.items.length - 1 ? 8 : 0 }}>
                      {renderProperty(property)}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ))
        )}
          </View>
        </View>
      </ScrollView>
      {/* Floating Add Button */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: uiTheme.accent }]}
        onPress={() => router.push({ pathname: '/properties/PropertyForm' })}
        activeOpacity={0.9}
        accessibilityLabel="Add Property"
      >
        <MaterialCommunityIcons name="plus" size={32} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}
