# Responsive Design Implementation Guide

## Overview

This guide explains how to implement responsive design across your BrickLedger app to support both mobile and desktop with optimal readability while maintaining a uniform look and feel.

## System Architecture

### Three Core Components

1. **Responsive Utilities** (`lib/responsive.ts`)
   - Screen detection (breakpoints, device types)
   - `useResponsive()` hook for components
   - Spacing and font size scales
   - Helper functions for layouts

2. **Responsive Layout Components** (`components/ResponsiveLayout.tsx`)
   - Pre-built components for common patterns
   - Drop-in replacements for basic layouts
   - Container, Grid, Stack, Sidebar, and Metrics components

3. **Responsive Styling** (`styles/ResponsiveScreenStyles.ts`)
   - Screen-specific responsive styles
   - Consistent across all screens
   - Uses breakpoints and responsive utilities

## Breakpoints

```typescript
mobile:        0px - 480px    (phones)
mobileLarge:   480px - 768px  (large phones)
tablet:        768px - 960px  (tablets)
desktop:       960px - 1280px (desktops)
desktopLarge:  1280px+        (large monitors)
```

## Key Patterns

### 1. Dashboard Screen (Mobile-First, but Desktop-Enhanced)

**Priority:** Mobile for viewing dashboards, Desktop for analysis

**Responsive Features:**
- Single column on mobile, 2-column grid for metrics on desktop
- Larger charts on desktop (400px min height vs 300px)
- Increased spacing and padding on desktop
- Larger font sizes for readability on desktop

**Implementation:**
```typescript
import { useResponsive } from '@/lib/responsive';
import { getDashboardScreenStyles } from '@/styles/ResponsiveScreenStyles';

export default function DashboardScreen() {
  const { width, isDesktop } = useResponsive();
  const styles = getDashboardScreenStyles(scheme);
  
  return (
    <ScrollView>
      {/* Metrics grid - 2 columns on desktop, 1 on mobile */}
      <View style={styles.metricsGridContainer}>
        <View style={styles.metricCardWrapper}>
          <MetricCard />
        </View>
        <View style={styles.metricCardWrapper}>
          <MetricCard />
        </View>
      </View>
      
      {/* Charts - larger on desktop */}
      <View style={styles.chartCard}>
        {/* Chart content */}
      </View>
    </ScrollView>
  );
}
```

### 2. Properties Screen (Mobile-First Viewing)

**Priority:** Mobile for browsing, Desktop for details

**Responsive Features:**
- Full width on mobile, 2-column grid on desktop
- Property images scale appropriately
- Metrics grid adapts
- Tap-friendly touch targets on mobile, clickable elements on desktop

**Implementation:**
```typescript
import { useResponsive } from '@/lib/responsive';
import { getPropertiesScreenStyles } from '@/styles/ResponsiveScreenStyles';

export default function PropertiesScreen() {
  const { width, isDesktop } = useResponsive();
  const styles = getPropertiesScreenStyles(scheme);
  
  return (
    <ScrollView>
      {/* Grid container with responsive column count */}
      <View style={styles.propertiesGridContainer}>
        {properties.map((prop) => (
          <View key={prop.id} style={styles.propertyCardWrapper}>
            <TouchableOpacity style={styles.propertyCard}>
              <Image style={styles.propertyImage} source={{ uri: prop.image }} />
              <Text style={styles.propertyName}>{prop.name}</Text>
              <Text style={styles.propertyAddress}>{prop.address}</Text>
              
              {/* Metrics grid */}
              <View style={styles.metricsGrid}>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Value</Text>
                  <Text style={styles.metricValue}>${prop.value}</Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>ROI</Text>
                  <Text style={styles.metricValue}>{prop.roi}%</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
```

### 3. Accounts Screen (Desktop-Optimized)

**Priority:** Desktop for management, Mobile for viewing

**Responsive Features:**
- Detailed account card layout adapts for desktop (row-based) vs mobile (column-based)
- Filter options layout changes
- Font sizes increase for desktop readability
- Action buttons adjust sizing

**Implementation:**
```typescript
import { useResponsive } from '@/lib/responsive';
import { getAccountsScreenStyles } from '@/styles/ResponsiveScreenStyles';

export default function AccountsScreen() {
  const { width, isDesktop } = useResponsive();
  const styles = getAccountsScreenStyles(scheme);
  
  return (
    <View style={styles.container}>
      {/* Filters */}
      <View style={styles.filterCard}>
        <View style={styles.cardRow}>
          <Text style={styles.typeLabel}>Account Type</Text>
          {/* Filter options */}
        </View>
      </View>
      
      {/* Accounts list */}
      <View style={styles.accountsListContainer}>
        {accounts.map((account) => (
          <TouchableOpacity key={account.id} style={styles.card}>
            {/* Desktop: row layout, Mobile: column layout */}
            <View style={styles.cardRow}>
              <View>
                <Text style={styles.typeLabel}>{account.type}</Text>
                <Text style={styles.institutionLarge}>{account.institution}</Text>
              </View>
              <Text style={account.type === 'mortgage' ? styles.amountRed : styles.amountGreen}>
                ${account.balance.toFixed(2)}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
```

### 4. Transactions Screen (Desktop-Optimized)

**Priority:** Desktop for data entry, Mobile for viewing

**Responsive Features:**
- Filter row adapts (row on desktop, column on mobile)
- Transaction cards with responsive layout
- Form fields adjust width
- Date/amount display adapts

**Implementation:**
```typescript
import { useResponsive } from '@/lib/responsive';
import { getTransactionsScreenStyles } from '@/styles/ResponsiveScreenStyles';

export default function TransactionsScreen() {
  const { width, isDesktop } = useResponsive();
  const styles = getTransactionsScreenStyles(scheme);
  
  return (
    <View style={styles.container}>
      {/* Filters - row on desktop, column on mobile */}
      <View style={styles.filterSection}>
        <View style={styles.filterRow}>
          <Picker style={{ flex: 1 }} />
          <DatePicker style={{ flex: 1 }} />
          <TextInput style={{ flex: 1 }} />
        </View>
      </View>
      
      {/* Transactions list */}
      <ScrollView style={styles.transactionsListContainer}>
        {transactions.map((tx) => (
          <TouchableOpacity key={tx.id} style={styles.card}>
            <View style={styles.cardContent}>
              {/* Desktop: row layout, Mobile: column layout */}
              <View style={styles.rowItem}>
                <Text>{tx.description}</Text>
                <Text style={styles.amount}>${tx.amount}</Text>
              </View>
              <View style={styles.rowItem}>
                <Text style={styles.propertySmall}>{tx.property.address}</Text>
                <Text style={styles.mutedText}>{tx.date}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
```

## Using Responsive Layout Components

Pre-built components for quick implementation:

### ResponsiveContainer
Centers content on large screens, full-width on mobile:
```typescript
import { ResponsiveContainer } from '@/components/ResponsiveLayout';

<ResponsiveContainer>
  <Text>Content will be centered on wide screens</Text>
</ResponsiveContainer>
```

### ResponsiveGrid
Adapts column count based on screen size:
```typescript
import { ResponsiveGrid } from '@/components/ResponsiveLayout';

<ResponsiveGrid compactCols={1} defaultCols={2} wideCols={3} gap={16}>
  <Card />
  <Card />
  <Card />
</ResponsiveGrid>
```

### ResponsiveStack
Stacks vertically on mobile, horizontally on desktop:
```typescript
import { ResponsiveStack } from '@/components/ResponsiveLayout';

<ResponsiveStack direction="adaptive" gap={16}>
  <Sidebar />
  <Content />
</ResponsiveStack>
```

### ResponsiveMetricsRow
Perfect for dashboard metrics:
```typescript
import { ResponsiveMetricsRow } from '@/components/ResponsiveLayout';

<ResponsiveMetricsRow 
  itemsPerRow={{ mobile: 1, tablet: 2, desktop: 4 }}
  gap={12}
>
  <MetricCard />
  <MetricCard />
  <MetricCard />
  <MetricCard />
</ResponsiveMetricsRow>
```

## Spacing & Typography Scale

### Responsive Spacing (SPACING constant)
```typescript
SPACING = {
  xs: 4,     // 4px
  sm: 8,     // 8px
  md: 12,    // 12px
  lg: 16,    // 16px
  xl: 20,    // 20px
  xxl: 24,   // 24px
  xxxl: 32,  // 32px
  huge: 48,  // 48px
}
```

**Usage:** Use consistently across all screens for uniform spacing

### Responsive Font Sizes (FONT_SIZES constant)
```typescript
FONT_SIZES = {
  xs: 10,
  sm: 12,
  base: 14,
  lg: 16,
  xl: 18,
  '2xl': 20,
  '3xl': 24,
  '4xl': 28,
  '5xl': 32,
}
```

**Rule:** Increase font sizes on desktop for better readability

## useResponsive Hook

Use in any component to get screen information:

```typescript
import { useResponsive } from '@/lib/responsive';

function MyComponent() {
  const { 
    width, 
    height, 
    deviceType,      // 'phone' | 'tablet' | 'desktop'
    isMobile,        // boolean
    isDesktop,       // boolean
    isPortrait,      // boolean
    isLandscape,     // boolean
    isNarrow,        // width < 960px
    isWide,          // width >= 960px
  } = useResponsive();

  return (
    <View style={{ 
      flex: 1, 
      padding: isMobile ? 12 : 24,
      flexDirection: isDesktop ? 'row' : 'column',
    }}>
      {/* Content */}
    </View>
  );
}
```

## Implementation Checklist

### Phase 1: Core Setup (Already Done)
- [x] Create `lib/responsive.ts` - Responsive utilities
- [x] Create `components/ResponsiveLayout.tsx` - Layout components
- [x] Create `styles/ResponsiveScreenStyles.ts` - Responsive styles

### Phase 2: Update Main Screens
- [ ] Update `DashboardScreen.tsx` to use `getDashboardScreenStyles()` and responsive layout
- [ ] Update `PropertiesScreen.tsx` to use `getPropertiesScreenStyles()` and grid
- [ ] Update `AccountsScreen.tsx` to use `getAccountsScreenStyles()` and responsive layout
- [ ] Update `TransactionsScreen.tsx` to use `getTransactionsScreenStyles()` and responsive layout

### Phase 3: Update Forms & Modals
- [ ] Update `AccountForm.tsx` for responsive width
- [ ] Update `PropertyForm.tsx` for responsive layout
- [ ] Update `TransactionForm.tsx` for responsive input sizing

### Phase 4: Test & Refine
- [ ] Test on mobile (< 480px width)
- [ ] Test on tablet (768px - 960px)
- [ ] Test on desktop (960px+)
- [ ] Test in portrait and landscape
- [ ] Verify web version looks good

## Best Practices

1. **Use Breakpoints Consistently**
   - Always use the same breakpoints across screens
   - 960px is the main mobile→desktop threshold

2. **Scale Typography**
   - Smaller fonts on mobile (12-14px base)
   - Larger fonts on desktop (16-18px base)

3. **Adapt Layout**
   - Single column on mobile
   - Multi-column on desktop
   - Use flexible width instead of fixed widths

4. **Touch Targets**
   - Minimum 44px tap targets on mobile
   - Can be smaller on desktop

5. **Content Width**
   - Full width on mobile and tablet
   - Max 1200px centered on desktop

6. **Spacing**
   - Use SPACING constants
   - More generous spacing on desktop
   - Tighter spacing on mobile

7. **Images & Media**
   - Scale based on container width
   - Use aspect ratios consistently

## Common Patterns Reference

### Responsive Row/Column
```typescript
flexDirection: isDesktop ? 'row' : 'column',
gap: isDesktop ? 24 : 12,
```

### Responsive Grid
```typescript
width: isDesktop ? '50%' : isTablet ? '50%' : '100%',
paddingHorizontal: isDesktop ? 12 : 8,
```

### Responsive Padding
```typescript
paddingHorizontal: isDesktop ? 24 : 16,
paddingVertical: isDesktop ? 20 : 12,
```

### Responsive Font
```typescript
fontSize: isDesktop ? 18 : 14,
fontWeight: isDesktop ? '600' : '500',
```

## Troubleshooting

**Issue:** Styles not updating on resize
- **Solution:** Use `useResponsive()` hook to trigger re-renders

**Issue:** Layout looks compressed on mobile
- **Solution:** Reduce padding/margin on mobile (use `isDesktop` check)

**Issue:** Text too small on desktop
- **Solution:** Increase font sizes when `isDesktop` is true

**Issue:** Images look distorted
- **Solution:** Use consistent aspect ratios and `resizeMode="cover"`

## Migration Example

### Before (Not Responsive)
```typescript
<View style={{ padding: 16, gap: 16 }}>
  <View style={{ flex: 1, flexDirection: 'row', gap: 16 }}>
    <Card />
    <Card />
    <Card />
  </View>
</View>
```

### After (Responsive)
```typescript
import { useResponsive } from '@/lib/responsive';

const { width, isDesktop } = useResponsive();

<ResponsiveContainer>
  <View style={{ padding: isDesktop ? 24 : 16, gap: isDesktop ? 20 : 12 }}>
    <ResponsiveGrid defaultCols={1} wideCols={3} gap={isDesktop ? 20 : 12}>
      <Card />
      <Card />
      <Card />
    </ResponsiveGrid>
  </View>
</ResponsiveContainer>
```

## Additional Resources

- Responsive Design Patterns: `components/ResponsiveLayout.tsx`
- Utility Functions: `lib/responsive.ts`
- Style Templates: `styles/ResponsiveScreenStyles.ts`
- Spacing Scale: `lib/responsive.ts` (SPACING constant)
- Font Scale: `lib/responsive.ts` (FONT_SIZES constant)
