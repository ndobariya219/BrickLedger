# Migration Guide: Updating Screens for Responsive Design

This guide shows how to update each screen to use the new responsive design system.

## 1. Dashboard Screen Migration

### Current Issue
- No responsive layout
- Fixed sizing that looks odd on desktop
- Doesn't adapt to screen width

### Changes Required

**Step 1: Update imports**
```typescript
// Add imports
import { useResponsive } from '@/lib/responsive';
import { getDashboardScreenStyles } from '@/styles/ResponsiveScreenStyles';
```

**Step 2: Replace style import**
```typescript
// OLD
const styles = getDashboardScreenStyles(scheme);

// NEW - Already works, but now responsive!
const styles = getDashboardScreenStyles(scheme);
```

**Step 3: Update metrics grid layout**
```typescript
// OLD - Single column always
<View style={styles.metricsRow}>
  <MetricBox />
  <MetricBox />
  <MetricBox />
</View>

// NEW - 2 columns on desktop, 1 on mobile
<View style={styles.metricsGridContainer}>
  {metrics.map((metric, idx) => (
    <View key={idx} style={styles.metricCardWrapper}>
      <MetricBox metric={metric} />
    </View>
  ))}
</View>
```

**Step 4: Update chart sizing**
```typescript
// The new styles automatically scale chart container
// Charts will be taller on desktop (400px+) vs mobile (300px)
// Just use the chartCard style - it handles the rest
<View style={styles.chartCard}>
  {/* Your chart component */}
</View>
```

**Step 5: Update spacing**
```typescript
// OLD
paddingHorizontal: 16
marginBottom: 12

// NEW - Uses responsive styling from getDashboardScreenStyles
// No changes needed - already handled!
```

---

## 2. Properties Screen Migration

### Current Issue
- Hard-coded grid layout
- No adaptation for different screen sizes
- Properties cards not optimized for desktop viewing

### Changes Required

**Step 1: Update grid wrapper**
```typescript
// OLD - Fixed single column
{properties.map(property => (
  <TouchableOpacity key={property.id} style={{ width: '100%' }}>
    <PropertyCard {...property} />
  </TouchableOpacity>
))}

// NEW - 2 columns on desktop, 1 on mobile via wrapper
<View style={styles.propertiesGridContainer}>
  {properties.map(property => (
    <View key={property.id} style={styles.propertyCardWrapper}>
      <TouchableOpacity style={styles.propertyCard}>
        <PropertyCard {...property} />
      </TouchableOpacity>
    </View>
  ))}
</View>
```

**Step 2: Update card content layout**
```typescript
// OLD - Not adapted
<View style={{ padding: 12 }}>
  <Image source={{ uri: property.image }} style={{ height: 200, width: '100%' }} />
  <Text>{property.name}</Text>
</View>

// NEW - Uses responsive sizing
<View style={styles.propertyCard}>
  <Image source={{ uri: property.image }} style={styles.propertyImage} />
  <Text style={styles.propertyName}>{property.name}</Text>
  <Text style={styles.propertyAddress}>{property.address}</Text>
  
  {/* Metrics grid adapts automatically */}
  <View style={styles.metricsGrid}>
    <View style={styles.metricItem}>
      <Text style={styles.metricLabel}>Value</Text>
      <Text style={styles.metricValue}>${property.value}</Text>
    </View>
    <View style={styles.metricItem}>
      <Text style={styles.metricLabel}>ROI</Text>
      <Text style={styles.metricValue}>{property.roi}%</Text>
    </View>
  </View>
</View>
```

**Step 3: Update filter section**
```typescript
// OLD
<View style={{ padding: 12, marginBottom: 12 }}>
  {/* filters */}
</View>

// NEW - Uses responsive styles
<View style={styles.filterCard}>
  {/* filters - automatically scaled for desktop */}
</View>
```

**Step 4: Get responsive info (optional, for extra customization)**
```typescript
import { useResponsive } from '@/lib/responsive';

// Inside component
const { width, isDesktop } = useResponsive();

// Use for custom logic if needed
if (isDesktop) {
  // Desktop-specific behavior
}
```

---

## 3. Accounts Screen Migration

### Current Issue
- Card layout doesn't adapt
- Information density not optimized for desktop
- Font sizes same on all devices

### Changes Required

**Step 1: Update styles import**
```typescript
// OLD
const styles = getAccountsScreenStyles(scheme);

// NEW - Already works, but now responsive!
// No change needed - it's already using the new system
```

**Step 2: Update card layout to be adaptive**
```typescript
// OLD - Always same layout
<View style={styles.card}>
  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
    <Text>{account.type}</Text>
    <Text>${account.balance}</Text>
  </View>
</View>

// NEW - Adapts to screen
<View style={styles.card}>
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
</View>
```

**Step 3: Update filter layout**
```typescript
// OLD - Always horizontal
<View style={{ flexDirection: 'row', gap: 8 }}>
  <Picker />
  <TextInput />
</View>

// NEW - Uses new responsive styles
<View style={styles.filterCard}>
  {/* Content automatically adapts via styles */}
</View>
```

**Step 4: Update container padding**
```typescript
// OLD
paddingHorizontal: 16

// NEW - Handled automatically by getDashboardScreenStyles
// Just use: style={styles.container}
```

---

## 4. Transactions Screen Migration

### Current Issue
- Filter row doesn't adapt
- Transaction cards not optimized for desktop
- Forms not responsive

### Changes Required

**Step 1: Update filter section layout**
```typescript
// OLD - Always in column
<View style={{ flexDirection: 'column', gap: 8 }}>
  <Picker />
  <DatePicker />
  <TextInput />
</View>

// NEW - Row on desktop, column on mobile
<View style={styles.filterSection}>
  <View style={styles.filterRow}>
    {/* Content automatically adapts via styles */}
  </View>
</View>
```

**Step 2: Update transaction card layout**
```typescript
// OLD - Fixed layout
<TouchableOpacity style={styles.card}>
  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
    <Text>{transaction.description}</Text>
    <Text>${transaction.amount}</Text>
  </View>
</TouchableOpacity>

// NEW - Adaptive layout via styles
<TouchableOpacity style={styles.card}>
  <View style={styles.cardContent}>
    {/* Desktop: row layout, Mobile: column layout */}
    <View style={styles.rowItem}>
      <Text>{transaction.description}</Text>
      <Text style={styles.amount}>${transaction.amount}</Text>
    </View>
    <View style={styles.rowItem}>
      <Text style={styles.propertySmall}>{transaction.property.address}</Text>
      <Text style={styles.mutedText}>{transaction.date}</Text>
    </View>
  </View>
</TouchableOpacity>
```

**Step 3: Font sizes handled automatically**
```typescript
// The new styles automatically use larger fonts on desktop
// No manual fontSize changes needed!
// Example: styles.amount uses responsive sizing
```

---

## 5. Forms Migration

### Account Form
```typescript
// OLD - Fixed width
<TextInput style={{ width: '100%', height: 44 }} />

// NEW - Use responsive sizing
import { useResponsive } from '@/lib/responsive';

const { isDesktop } = useResponsive();

<TextInput 
  style={{ 
    width: '100%', 
    height: isDesktop ? 48 : 44,
    fontSize: isDesktop ? 16 : 14,
  }} 
/>
```

### Property Form
```typescript
// OLD
<View style={{ flexDirection: 'row', gap: 8 }}>
  <TextInput style={{ flex: 1 }} />
  <TextInput style={{ flex: 1 }} />
</View>

// NEW - Stack on mobile
import { useResponsive } from '@/lib/responsive';

const { isDesktop } = useResponsive();

<View style={{ 
  flexDirection: isDesktop ? 'row' : 'column', 
  gap: 12 
}}>
  <TextInput style={{ flex: 1 }} />
  <TextInput style={{ flex: 1 }} />
</View>
```

---

## Testing Each Screen

### Dashboard
- [ ] Mobile (< 480px): Single column metrics, small charts
- [ ] Desktop (960px+): 2-column metrics, large charts
- [ ] Verify spacing increases on desktop

### Properties  
- [ ] Mobile: Full-width cards
- [ ] Tablet: 2-column grid
- [ ] Desktop: 2-column grid with larger cards
- [ ] Images scale appropriately

### Accounts
- [ ] Mobile: Card details in column
- [ ] Desktop: Card details in row
- [ ] Font sizes increase
- [ ] Spacing expands

### Transactions
- [ ] Mobile: Filter controls stacked
- [ ] Desktop: Filter controls in row
- [ ] Card content adapts
- [ ] Date/amount positioning adjusts

---

## Quick Wins (Low Effort, High Impact)

1. **Just update styles import** - Many screens already work with minimal changes
2. **Use ResponsiveGrid component** - Wraps items automatically
3. **Apply new responsive styles** - They handle all the adaptation
4. **Test on desktop** - See immediate improvements
5. **Minor tweaks** - Adjust specific layouts as needed

---

## Common Patterns

### Check if desktop:
```typescript
const { isDesktop } = useResponsive();
if (isDesktop) { /* do something */ }
```

### Scale font:
```typescript
fontSize: isDesktop ? 18 : 14
```

### Adapt layout:
```typescript
flexDirection: isDesktop ? 'row' : 'column'
```

### Use grid wrapper:
```typescript
width: isDesktop ? '50%' : '100%'
```

### Scale spacing:
```typescript
padding: isDesktop ? 24 : 12
```

---

## Summary

Each screen needs these core updates:

1. Import `useResponsive` from `@/lib/responsive`
2. Use new responsive style functions (already exported)
3. Wrap lists in grid containers with adaptive widths
4. Update card layouts to use adaptive flexDirection
5. Test on multiple screen sizes

Most of the work is already done - the new styles handle 80% of responsiveness automatically!
