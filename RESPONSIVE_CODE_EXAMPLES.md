# Responsive Design - Code Examples & Snippets

Copy-paste ready code examples for common responsive patterns.

## Example 1: Responsive Container

```typescript
import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useResponsive, SPACING } from '@/lib/responsive';

export default function ResponsiveContainerExample() {
  const { isDesktop } = useResponsive();

  return (
    <ScrollView
      style={{
        flex: 1,
        paddingHorizontal: isDesktop ? SPACING.xxl : SPACING.lg,
        paddingVertical: SPACING.lg,
      }}
    >
      <Text style={{ fontSize: isDesktop ? 20 : 16, fontWeight: '700' }}>
        Responsive Title
      </Text>
      
      <View
        style={{
          marginTop: isDesktop ? SPACING.xl : SPACING.lg,
          gap: isDesktop ? SPACING.lg : SPACING.md,
        }}
      >
        {/* Content goes here */}
      </View>
    </ScrollView>
  );
}
```

---

## Example 2: Responsive Grid Layout

```typescript
import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useResponsive, SPACING } from '@/lib/responsive';

interface Item {
  id: string;
  title: string;
  value: number;
}

interface Props {
  items: Item[];
}

export default function ResponsiveGridExample({ items }: Props) {
  const { width, isDesktop } = useResponsive();
  const isTablet = width >= 768 && width < 960;

  // Calculate columns based on breakpoint
  let columns = 1; // mobile
  if (isTablet) columns = 2;
  if (isDesktop) columns = 3;

  const gap = SPACING.lg;
  const itemWidth = `${100 / columns}%`;

  return (
    <ScrollView>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          marginHorizontal: -gap / 2,
          paddingHorizontal: SPACING.lg,
          paddingVertical: SPACING.lg,
        }}
      >
        {items.map((item) => (
          <View
            key={item.id}
            style={{
              width: itemWidth,
              paddingHorizontal: gap / 2,
              marginBottom: gap,
            }}
          >
            <View
              style={{
                backgroundColor: '#fff',
                borderRadius: isDesktop ? 14 : 10,
                padding: isDesktop ? SPACING.lg : SPACING.md,
              }}
            >
              <Text style={{ fontSize: isDesktop ? 16 : 14, fontWeight: '700' }}>
                {item.title}
              </Text>
              <Text style={{ fontSize: isDesktop ? 20 : 18, fontWeight: '700', marginTop: 8 }}>
                {item.value}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
```

---

## Example 3: Responsive Metrics Dashboard

```typescript
import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useResponsive, SPACING, FONT_SIZES } from '@/lib/responsive';
import { ResponsiveMetricsRow } from '@/components/ResponsiveLayout';

interface Metric {
  id: string;
  label: string;
  value: string;
  color: string;
}

export default function DashboardMetricsExample() {
  const metrics: Metric[] = [
    { id: '1', label: 'Total Assets', value: '$1.2M', color: '#2eaf7d' },
    { id: '2', label: 'Total Liabilities', value: '$500K', color: '#d32f2f' },
    { id: '3', label: 'Net Equity', value: '$700K', color: '#1976d2' },
    { id: '4', label: 'ROI', value: '12.5%', color: '#ff9800' },
  ];

  return (
    <ScrollView>
      <ResponsiveMetricsRow
        itemsPerRow={{ mobile: 1, tablet: 2, desktop: 4 }}
        gap={SPACING.lg}
      >
        {metrics.map((metric) => (
          <MetricCard key={metric.id} metric={metric} />
        ))}
      </ResponsiveMetricsRow>
    </ScrollView>
  );
}

function MetricCard({ metric }: { metric: Metric }) {
  const { isDesktop } = useResponsive();

  return (
    <View
      style={{
        backgroundColor: '#f5f5f5',
        borderRadius: isDesktop ? 14 : 10,
        padding: isDesktop ? SPACING.lg : SPACING.md,
        alignItems: 'center',
      }}
    >
      <Text
        style={{
          fontSize: isDesktop ? FONT_SIZES.sm : FONT_SIZES.xs,
          color: '#666',
          marginBottom: SPACING.sm,
        }}
      >
        {metric.label}
      </Text>
      <Text
        style={{
          fontSize: isDesktop ? FONT_SIZES['2xl'] : FONT_SIZES.xl,
          fontWeight: '700',
          color: metric.color,
        }}
      >
        {metric.value}
      </Text>
    </View>
  );
}
```

---

## Example 4: Responsive Form Layout

```typescript
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { useResponsive, SPACING, FONT_SIZES } from '@/lib/responsive';

export default function ResponsiveFormExample() {
  const [formData, setFormData] = useState({ name: '', email: '', phone: '' });
  const { isDesktop } = useResponsive();

  const handleChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = () => {
    console.log('Form submitted:', formData);
  };

  return (
    <ScrollView
      style={{
        flex: 1,
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.xxl,
      }}
    >
      <Text style={{ fontSize: FONT_SIZES.xl, fontWeight: '700', marginBottom: SPACING.lg }}>
        Contact Form
      </Text>

      {/* Two-column layout on desktop, single column on mobile */}
      <View
        style={{
          flexDirection: isDesktop ? 'row' : 'column',
          gap: isDesktop ? SPACING.lg : SPACING.md,
        }}
      >
        {/* Name field - full width on mobile, half width on desktop */}
        <View style={{ flex: isDesktop ? 1 : 1 }}>
          <Text style={{ fontSize: FONT_SIZES.sm, marginBottom: SPACING.sm, fontWeight: '600' }}>
            Full Name
          </Text>
          <TextInput
            style={{
              borderWidth: 1,
              borderColor: '#ddd',
              borderRadius: 8,
              paddingHorizontal: SPACING.md,
              paddingVertical: isDesktop ? SPACING.md : SPACING.sm,
              fontSize: FONT_SIZES.base,
            }}
            placeholder="John Doe"
            value={formData.name}
            onChangeText={(text) => handleChange('name', text)}
          />
        </View>

        {/* Email field */}
        <View style={{ flex: isDesktop ? 1 : 1 }}>
          <Text style={{ fontSize: FONT_SIZES.sm, marginBottom: SPACING.sm, fontWeight: '600' }}>
            Email
          </Text>
          <TextInput
            style={{
              borderWidth: 1,
              borderColor: '#ddd',
              borderRadius: 8,
              paddingHorizontal: SPACING.md,
              paddingVertical: isDesktop ? SPACING.md : SPACING.sm,
              fontSize: FONT_SIZES.base,
            }}
            placeholder="john@example.com"
            value={formData.email}
            onChangeText={(text) => handleChange('email', text)}
          />
        </View>
      </View>

      {/* Phone field - full width always */}
      <View style={{ marginTop: isDesktop ? SPACING.lg : SPACING.md }}>
        <Text style={{ fontSize: FONT_SIZES.sm, marginBottom: SPACING.sm, fontWeight: '600' }}>
          Phone
        </Text>
        <TextInput
          style={{
            borderWidth: 1,
            borderColor: '#ddd',
            borderRadius: 8,
            paddingHorizontal: SPACING.md,
            paddingVertical: isDesktop ? SPACING.md : SPACING.sm,
            fontSize: FONT_SIZES.base,
          }}
          placeholder="+1 (555) 123-4567"
          value={formData.phone}
          onChangeText={(text) => handleChange('phone', text)}
        />
      </View>

      {/* Submit button */}
      <TouchableOpacity
        style={{
          backgroundColor: '#1976d2',
          borderRadius: 8,
          paddingVertical: isDesktop ? SPACING.lg : SPACING.md,
          alignItems: 'center',
          marginTop: isDesktop ? SPACING.xl : SPACING.lg,
        }}
        onPress={handleSubmit}
      >
        <Text style={{ color: '#fff', fontSize: FONT_SIZES.base, fontWeight: '600' }}>
          Submit Form
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
```

---

## Example 5: Dashboard Screen (Complete)

```typescript
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useResponsive, SPACING, FONT_SIZES } from '@/lib/responsive';
import { ResponsiveGrid, ResponsiveMetricsRow } from '@/components/ResponsiveLayout';
import { getDashboardScreenStyles } from '@/styles/ResponsiveScreenStyles';

interface DashboardData {
  totalAssets: number;
  totalLiabilities: number;
  netEquity: number;
  roi: number;
  properties: Array<{ id: string; name: string; value: number }>;
  recentTransactions: Array<{ id: string; description: string; amount: number }>;
}

export default function DashboardScreenExample() {
  const { isDesktop, width } = useResponsive();
  const scheme = 'light';
  const styles = getDashboardScreenStyles(scheme);

  const data: DashboardData = {
    totalAssets: 1200000,
    totalLiabilities: 500000,
    netEquity: 700000,
    roi: 12.5,
    properties: [
      { id: '1', name: 'Property 1', value: 450000 },
      { id: '2', name: 'Property 2', value: 350000 },
      { id: '3', name: 'Property 3', value: 400000 },
    ],
    recentTransactions: [
      { id: '1', description: 'Mortgage Payment', amount: -2500 },
      { id: '2', description: 'Rental Income', amount: 3000 },
      { id: '3', description: 'Maintenance', amount: -800 },
    ],
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <Text style={{ fontSize: isDesktop ? FONT_SIZES['3xl'] : FONT_SIZES['2xl'], fontWeight: '700', marginBottom: SPACING.xl }}>
        Dashboard
      </Text>

      {/* Top metrics - responsive grid */}
      <ResponsiveMetricsRow
        itemsPerRow={{ mobile: 1, tablet: 2, desktop: 4 }}
        gap={SPACING.lg}
      >
        <MetricCard label="Total Assets" value={`$${(data.totalAssets / 1000000).toFixed(1)}M`} color="#2eaf7d" />
        <MetricCard label="Liabilities" value={`$${(data.totalLiabilities / 1000).toFixed(0)}K`} color="#d32f2f" />
        <MetricCard label="Net Equity" value={`$${(data.netEquity / 1000).toFixed(0)}K`} color="#1976d2" />
        <MetricCard label="ROI" value={`${data.roi}%`} color="#ff9800" />
      </ResponsiveMetricsRow>

      {/* Properties section */}
      <Text style={{ fontSize: isDesktop ? FONT_SIZES.xl : FONT_SIZES.lg, fontWeight: '700', marginTop: SPACING.xl, marginBottom: SPACING.lg }}>
        Properties
      </Text>
      <ResponsiveGrid compactCols={1} defaultCols={2} wideCols={3} gap={SPACING.lg}>
        {data.properties.map((prop) => (
          <PropertyCard key={prop.id} property={prop} />
        ))}
      </ResponsiveGrid>

      {/* Recent Transactions section */}
      <Text style={{ fontSize: isDesktop ? FONT_SIZES.xl : FONT_SIZES.lg, fontWeight: '700', marginTop: SPACING.xl, marginBottom: SPACING.lg }}>
        Recent Transactions
      </Text>
      <View style={{ gap: SPACING.md }}>
        {data.recentTransactions.map((tx) => (
          <TransactionCard key={tx.id} transaction={tx} />
        ))}
      </View>

      {/* Bottom spacing */}
      <View style={{ height: SPACING.xl }} />
    </ScrollView>
  );
}

function MetricCard({ label, value, color }: { label: string; value: string; color: string }) {
  const { isDesktop } = useResponsive();

  return (
    <View
      style={{
        backgroundColor: '#f5f5f5',
        borderRadius: isDesktop ? 14 : 10,
        padding: isDesktop ? SPACING.lg : SPACING.md,
        alignItems: 'center',
      }}
    >
      <Text style={{ fontSize: FONT_SIZES.xs, color: '#666', marginBottom: SPACING.sm }}>
        {label}
      </Text>
      <Text style={{ fontSize: isDesktop ? FONT_SIZES['2xl'] : FONT_SIZES.xl, fontWeight: '700', color }}>
        {value}
      </Text>
    </View>
  );
}

function PropertyCard({ property }: { property: { id: string; name: string; value: number } }) {
  const { isDesktop } = useResponsive();

  return (
    <TouchableOpacity
      style={{
        backgroundColor: '#fff',
        borderRadius: isDesktop ? 14 : 10,
        padding: isDesktop ? SPACING.lg : SPACING.md,
        borderWidth: 1,
        borderColor: '#ddd',
      }}
    >
      <Text style={{ fontSize: isDesktop ? FONT_SIZES.base : FONT_SIZES.sm, fontWeight: '700' }}>
        {property.name}
      </Text>
      <Text style={{ fontSize: isDesktop ? FONT_SIZES.lg : FONT_SIZES.base, fontWeight: '700', color: '#2eaf7d', marginTop: SPACING.sm }}>
        ${(property.value / 1000).toFixed(0)}K
      </Text>
    </TouchableOpacity>
  );
}

function TransactionCard({ transaction }: { transaction: { id: string; description: string; amount: number } }) {
  const { isDesktop } = useResponsive();
  const isExpense = transaction.amount < 0;

  return (
    <View
      style={{
        backgroundColor: '#fff',
        borderRadius: isDesktop ? 12 : 10,
        padding: isDesktop ? SPACING.lg : SPACING.md,
        borderWidth: 1,
        borderColor: '#ddd',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <Text style={{ fontSize: isDesktop ? FONT_SIZES.base : FONT_SIZES.sm }}>
        {transaction.description}
      </Text>
      <Text style={{ fontSize: isDesktop ? FONT_SIZES.base : FONT_SIZES.sm, fontWeight: '700', color: isExpense ? '#d32f2f' : '#2eaf7d' }}>
        {isExpense ? '-' : '+'} ${Math.abs(transaction.amount).toLocaleString()}
      </Text>
    </View>
  );
}
```

---

## Example 6: Properties List (Mobile & Desktop Optimized)

```typescript
import React, { useState } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { useResponsive, SPACING, FONT_SIZES } from '@/lib/responsive';
import { getPropertiesScreenStyles } from '@/styles/ResponsiveScreenStyles';

interface Property {
  id: string;
  name: string;
  address: string;
  image: string;
  value: number;
  bedrooms: number;
  bathrooms: number;
  area: number;
  roi: number;
}

export default function PropertiesScreenExample() {
  const { isDesktop, width } = useResponsive();
  const scheme = 'light';
  const styles = getPropertiesScreenStyles(scheme);

  const [properties] = useState<Property[]>([
    {
      id: '1',
      name: 'Beachfront Villa',
      address: '123 Ocean Drive, Sydney NSW',
      image: 'https://via.placeholder.com/400x300',
      value: 850000,
      bedrooms: 4,
      bathrooms: 3,
      area: 280,
      roi: 8.5,
    },
    {
      id: '2',
      name: 'Inner City Apartment',
      address: '456 City Lane, Melbourne VIC',
      image: 'https://via.placeholder.com/400x300',
      value: 550000,
      bedrooms: 2,
      bathrooms: 2,
      area: 120,
      roi: 6.2,
    },
    {
      id: '3',
      name: 'Suburban House',
      address: '789 Green Street, Brisbane QLD',
      image: 'https://via.placeholder.com/400x300',
      value: 450000,
      bedrooms: 3,
      bathrooms: 2,
      area: 200,
      roi: 7.8,
    },
  ]);

  // Calculate columns based on screen width
  const itemsPerRow = isDesktop ? 2 : 1;
  const itemWidth = 100 / itemsPerRow;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Properties</Text>

      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          marginHorizontal: -SPACING.md,
        }}
      >
        {properties.map((property) => (
          <View
            key={property.id}
            style={{
              width: `${itemWidth}%`,
              paddingHorizontal: SPACING.md,
              marginBottom: SPACING.lg,
            }}
          >
            <PropertyCard property={property} />
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function PropertyCard({ property }: { property: Property }) {
  const { isDesktop } = useResponsive();
  const styles = getPropertiesScreenStyles('light');

  return (
    <TouchableOpacity style={styles.propertyCard}>
      <Image
        source={{ uri: property.image }}
        style={styles.propertyImage}
      />

      <Text style={styles.propertyName}>{property.name}</Text>
      <Text style={styles.propertyAddress}>{property.address}</Text>

      {/* Metrics Grid */}
      <View style={styles.metricsGrid}>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Value</Text>
          <Text style={styles.metricValue}>
            ${(property.value / 1000).toFixed(0)}K
          </Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Beds</Text>
          <Text style={styles.metricValue}>{property.bedrooms}</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Baths</Text>
          <Text style={styles.metricValue}>{property.bathrooms}</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>ROI</Text>
          <Text style={styles.metricValue}>{property.roi}%</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>View</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>Edit</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}
```

---

## Example 7: Responsive Filter Bar

```typescript
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useResponsive, SPACING, FONT_SIZES } from '@/lib/responsive';

export default function ResponsiveFilterBarExample() {
  const { isDesktop, width } = useResponsive();
  const [activeFilter, setActiveFilter] = useState('all');

  const filters = [
    { id: 'all', label: 'All' },
    { id: 'active', label: 'Active' },
    { id: 'archived', label: 'Archived' },
    { id: 'pending', label: 'Pending' },
  ];

  // Mobile: wrap in horizontal scroll, Desktop: all visible
  return (
    <View
      style={{
        backgroundColor: '#f5f5f5',
        borderRadius: isDesktop ? 14 : 10,
        padding: isDesktop ? SPACING.lg : SPACING.md,
        marginBottom: SPACING.lg,
      }}
    >
      <ScrollView
        horizontal={!isDesktop}
        showsHorizontalScrollIndicator={false}
        scrollEnabled={!isDesktop}
        style={{ marginHorizontal: isDesktop ? 0 : -SPACING.md }}
      >
        <View
          style={{
            flexDirection: 'row',
            gap: SPACING.md,
            paddingHorizontal: isDesktop ? 0 : SPACING.md,
          }}
        >
          {filters.map((filter) => (
            <TouchableOpacity
              key={filter.id}
              style={{
                backgroundColor:
                  activeFilter === filter.id ? '#1976d2' : '#fff',
                borderRadius: 20,
                paddingHorizontal: SPACING.lg,
                paddingVertical: SPACING.sm,
                minWidth: isDesktop ? 'auto' : 80,
                alignItems: 'center',
              }}
              onPress={() => setActiveFilter(filter.id)}
            >
              <Text
                style={{
                  color: activeFilter === filter.id ? '#fff' : '#333',
                  fontSize: isDesktop ? FONT_SIZES.sm : FONT_SIZES.xs,
                  fontWeight: '600',
                }}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
```

---

## Example 8: Responsive Card with Adaptive Layout

```typescript
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useResponsive, SPACING, FONT_SIZES } from '@/lib/responsive';

interface AccountData {
  type: string;
  institution: string;
  balance: number;
  interestRate?: number;
}

export default function AdaptiveAccountCard({ account }: { account: AccountData }) {
  const { isDesktop } = useResponsive();
  const isLiability = account.type === 'mortgage' || account.type === 'loan';

  return (
    <TouchableOpacity
      style={{
        backgroundColor: '#fff',
        borderRadius: isDesktop ? 12 : 10,
        borderWidth: 1,
        borderColor: '#ddd',
        padding: isDesktop ? SPACING.lg : SPACING.md,
        marginBottom: SPACING.lg,
      }}
    >
      {/* Desktop: Row layout, Mobile: Column layout */}
      <View
        style={{
          flexDirection: isDesktop ? 'row' : 'column',
          justifyContent: isDesktop ? 'space-between' : 'flex-start',
          alignItems: isDesktop ? 'center' : 'flex-start',
          gap: isDesktop ? 0 : SPACING.md,
        }}
      >
        {/* Left side: Type and Institution */}
        <View style={{ flex: isDesktop ? 1 : 0 }}>
          <Text style={{ fontSize: FONT_SIZES.xs, color: '#666', fontWeight: '600' }}>
            {account.type.toUpperCase()}
          </Text>
          <Text
            style={{
              fontSize: isDesktop ? FONT_SIZES.base : FONT_SIZES.sm,
              fontWeight: '700',
              color: '#222',
              marginTop: SPACING.xs,
            }}
          >
            {account.institution}
          </Text>
        </View>

        {/* Middle: Balance */}
        <View>
          <Text style={{ fontSize: FONT_SIZES.xs, color: '#666', fontWeight: '600', marginBottom: SPACING.xs }}>
            Balance
          </Text>
          <Text
            style={{
              fontSize: isDesktop ? FONT_SIZES.lg : FONT_SIZES.base,
              fontWeight: '700',
              color: isLiability ? '#d32f2f' : '#2eaf7d',
            }}
          >
            ${Math.abs(account.balance).toLocaleString()}
          </Text>
        </View>

        {/* Right side: Interest Rate */}
        {account.interestRate !== undefined && (
          <View style={{ alignItems: isDesktop ? 'flex-end' : 'flex-start' }}>
            <Text style={{ fontSize: FONT_SIZES.xs, color: '#666', fontWeight: '600', marginBottom: SPACING.xs }}>
              Interest Rate
            </Text>
            <Text style={{ fontSize: FONT_SIZES.base, fontWeight: '700', color: '#1976d2' }}>
              {account.interestRate}%
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}
```

---

These examples demonstrate the core patterns you'll use throughout your app. Copy and adapt them to your specific needs!
