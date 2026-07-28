# Quick Reference: Responsive Design

## Import Statements

```typescript
// Utilities
import { useResponsive, SPACING, FONT_SIZES, getResponsiveValue } from '@/lib/responsive';

// Components
import { 
  ResponsiveContainer, 
  ResponsiveGrid, 
  ResponsiveStack,
  ResponsiveMetricsRow,
  ResponsiveSidebar 
} from '@/components/ResponsiveLayout';

// Styles
import { 
  getDashboardScreenStyles,
  getPropertiesScreenStyles,
  getAccountsScreenStyles,
  getTransactionsScreenStyles,
} from '@/styles/ResponsiveScreenStyles';
```

## Breakpoints

| Name | Width | Use Case |
|------|-------|----------|
| mobile | < 480px | Phones |
| mobileLarge | 480-768px | Large phones |
| tablet | 768-960px | Tablets |
| desktop | 960px+ | Desktops & laptops |

## useResponsive() Hook

```typescript
const { 
  width,           // number
  height,          // number
  deviceType,      // 'phone' | 'tablet' | 'desktop'
  screenSize,      // 'mobile' | 'mobileLarge' | 'tablet' | 'desktop' | ...
  isMobile,        // boolean
  isTablet,        // boolean
  isDesktop,       // boolean
  isPortrait,      // boolean
  isLandscape,     // boolean
  isNarrow,        // width < 960px
  isWide,          // width >= 960px
  isVeryWide,      // width >= 1280px
} = useResponsive();
```

## Spacing Constants

```typescript
SPACING.xs      // 4px
SPACING.sm      // 8px
SPACING.md      // 12px (mobile default)
SPACING.lg      // 16px
SPACING.xl      // 20px
SPACING.xxl     // 24px (desktop default)
SPACING.xxxl    // 32px
SPACING.huge    // 48px
```

## Font Size Constants

```typescript
FONT_SIZES.xs      // 10px
FONT_SIZES.sm      // 12px (mobile default)
FONT_SIZES.base    // 14px
FONT_SIZES.lg      // 16px
FONT_SIZES.xl      // 18px
FONT_SIZES['2xl']  // 20px
FONT_SIZES['3xl']  // 24px
FONT_SIZES['4xl']  // 28px
FONT_SIZES['5xl']  // 32px (desktop default)
```

## Common Responsive Patterns

### Conditional Layout
```typescript
<View style={{ 
  flexDirection: isDesktop ? 'row' : 'column',
  gap: isDesktop ? 24 : 12,
  padding: isDesktop ? SPACING.xxl : SPACING.lg,
}}>
```

### Grid Wrapper
```typescript
<View style={{ 
  width: isDesktop ? '50%' : '100%',
  paddingHorizontal: SPACING.md,
  marginBottom: SPACING.lg,
}}>
```

### Responsive Metrics
```typescript
<View style={{
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: isDesktop ? SPACING.lg : SPACING.md,
}}>
  {/* Metric items */}
</View>
```

### Font Scaling
```typescript
<Text style={{
  fontSize: isDesktop ? FONT_SIZES.lg : FONT_SIZES.base,
  fontWeight: isDesktop ? '600' : '500',
}}>
```

### Card with Responsive Padding
```typescript
<View style={{
  padding: isDesktop ? SPACING.lg : SPACING.md,
  borderRadius: isDesktop ? 14 : 10,
  marginBottom: SPACING.lg,
}}>
```

## Component Shortcuts

### Grid of Items (2 columns desktop, 1 mobile)
```typescript
<ResponsiveGrid compactCols={1} defaultCols={2} gap={16}>
  <Card /> <Card /> <Card />
</ResponsiveGrid>
```

### Dashboard Metrics
```typescript
<ResponsiveMetricsRow itemsPerRow={{ mobile: 1, desktop: 4 }}>
  <Metric /> <Metric /> <Metric /> <Metric />
</ResponsiveMetricsRow>
```

### Sidebar Layout
```typescript
<ResponsiveSidebar
  sidebar={<Sidebar />}
  content={<Content />}
  gap={16}
  sidebarWidth={300}
/>
```

### Adaptive Stack
```typescript
<ResponsiveStack direction="adaptive" gap={16}>
  <Item1 /> <Item2 />
</ResponsiveStack>
```

## Implementation Steps

1. **Get responsive data:**
   ```typescript
   const { isDesktop, width } = useResponsive();
   const styles = getScreenStyles(scheme);
   ```

2. **Use in JSX:**
   ```typescript
   <View style={styles.container}>
     <View style={isDesktop ? styles.desktopLayout : styles.mobileLayout}>
   </View>
   ```

3. **Or use pre-built components:**
   ```typescript
   <ResponsiveGrid defaultCols={2}>
     {items.map(item => <Card key={item.id} />)}
   </ResponsiveGrid>
   ```

## Responsive Styles by Screen

### DashboardScreen
- Mobile: 1-column metrics, smaller charts (300px)
- Desktop: 2-column metrics, larger charts (400px)
- Increased padding/spacing on desktop

### PropertiesScreen  
- Mobile: Full-width property cards (100%)
- Tablet: 2-column grid
- Desktop: 2-column grid with larger images/text

### AccountsScreen
- Mobile: Stack layout for card details
- Desktop: Row layout for card details
- Increased font sizes on desktop

### TransactionsScreen
- Mobile: Stacked filter row
- Desktop: Horizontal filter row
- Responsive card layouts

## Testing Checklist

- [ ] Mobile (< 480px): Readable, no overflow
- [ ] Large phone (480-768px): Good spacing
- [ ] Tablet (768-960px): Grid layout working
- [ ] Desktop (960px+): Multi-column layouts
- [ ] Very wide (1280px+): Max width applied
- [ ] Portrait: Layouts adapt
- [ ] Landscape: Layouts adapt
- [ ] Web: Responsive CSS working
- [ ] Native: Platform-specific adjustments

## Pro Tips

1. **Always use the hook:** `useResponsive()` for dynamic updates
2. **Prefer components:** Use `ResponsiveGrid`, `ResponsiveStack` for consistency
3. **Scale typography:** Always increase font sizes on desktop
4. **Generous spacing:** More space on desktop, tighter on mobile
5. **Max width:** Center content on very wide screens
6. **Test often:** Check on actual devices/emulators
7. **Use constants:** Always use SPACING and FONT_SIZES constants
8. **Consistent padding:** Use `getContainerPadding(width)` for consistent margins

## Debugging

**Check what size you're at:**
```typescript
const { width, deviceType } = useResponsive();
console.log(`Width: ${width}px, Type: ${deviceType}`);
```

**Verify breakpoints:**
- Mobile: 0-480
- Mobile Large: 480-768  
- Tablet: 768-960
- Desktop: 960+

**Common issues:**
- Content overflowing? Reduce padding on mobile
- Text too small? Increase fontSize on desktop
- Layout broken? Check flexDirection changes
- Spacing weird? Use SPACING constants consistently
