# Responsive Design Configuration Reference

This file documents all responsive design constants and configuration values used throughout the BrickLedger app.

## Breakpoint Configuration

```typescript
// File: lib/responsive.ts
BREAKPOINTS = {
  mobile: 0,           // 0px - start
  mobileLarge: 480,    // Large phones (480-768px)
  tablet: 768,         // Tablets (768-960px)  
  desktop: 960,        // Desktops and up (960px+)
  desktopLarge: 1280,  // Large monitors (1280px+)
  desktopXL: 1600,     // Extra large monitors (1600px+)
}
```

### Device Classification
```typescript
getDeviceType(width) returns:
- 'phone' if width < 768px
- 'tablet' if 768px <= width < 960px  
- 'desktop' if width >= 960px
```

### Screen Size Classification
```typescript
getScreenSize(width) returns:
- 'mobile' if width < 480px
- 'mobileLarge' if 480px <= width < 768px
- 'tablet' if 768px <= width < 960px
- 'desktop' if 960px <= width < 1280px
- 'desktopLarge' if 1280px <= width < 1600px
- 'desktopXL' if width >= 1600px
```

---

## Spacing Scale

```typescript
// File: lib/responsive.ts
SPACING = {
  xs: 4,        // Extra small - use for tiny gaps
  sm: 8,        // Small - use for compact spacing
  md: 12,       // Medium - default mobile spacing
  lg: 16,       // Large - default desktop padding
  xl: 20,       // Extra large
  xxl: 24,      // Double extra large - default desktop spacing
  xxxl: 32,     // Triple extra large
  huge: 48,     // Huge gaps
}
```

### Recommended Usage
```typescript
Mobile Default Padding:    SPACING.lg (16px)
Desktop Default Padding:   SPACING.xxl (24px)
Card Spacing:              SPACING.lg (16px)
Gap Between Items:         SPACING.md (12px) - mobile
                           SPACING.lg (16px) - desktop
Component Padding:         SPACING.md (12px) - mobile
                           SPACING.lg (16px) - desktop
```

---

## Font Size Scale

```typescript
// File: lib/responsive.ts
FONT_SIZES = {
  xs: 10,      // Extra small
  sm: 12,      // Small - mobile default
  base: 14,    // Base size
  lg: 16,      // Large
  xl: 18,      // Extra large
  '2xl': 20,   // 2x large
  '3xl': 24,   // 3x large
  '4xl': 28,   // 4x large
  '5xl': 32,   // 5x large - desktop default
}
```

### Recommended Usage
```typescript
Mobile Base Font:          FONT_SIZES.sm (12px)
Desktop Base Font:         FONT_SIZES.base (14px)
Mobile Heading:            FONT_SIZES.lg (16px)
Desktop Heading:           FONT_SIZES.xl (18px)
Mobile Title:              FONT_SIZES.xl (18px)
Desktop Title:             FONT_SIZES['2xl'] (20px)
Mobile Large Title:        FONT_SIZES['2xl'] (20px)
Desktop Large Title:       FONT_SIZES['3xl'] (24px)
```

---

## Dashboard Screen Configuration

### Responsive Breakpoints
```typescript
// getters/getDashboardScreenStyles()

Mobile (<960px):
- Padding: SPACING.lg (16px)
- Chart height: 300px
- Metrics: 1 column
- Gap between metrics: SPACING.lg (16px)
- Font size (label): FONT_SIZES.sm (12px)
- Font size (value): FONT_SIZES.lg (16px)

Desktop (>=960px):
- Padding: SPACING.xxl (24px)
- Chart height: 400px+
- Metrics: 2 columns
- Gap between metrics: SPACING.lg (16px)
- Font size (label): FONT_SIZES.base (14px)
- Font size (value): FONT_SIZES['2xl'] (20px)
```

### Grid Layout
```typescript
Mobile: 1 metric card per row
Desktop: 2 metric cards per row
Card Width: 50% on desktop, 100% on mobile
Column Gap: SPACING.md (12px)
```

---

## Properties Screen Configuration

### Responsive Breakpoints
```typescript
// styles/getPropertiesScreenStyles()

Mobile (<480px):
- Card width: 100%
- Image height: 180px
- Padding: SPACING.md (12px)
- Font size (title): FONT_SIZES.base (14px)

Mobile Large (480-768px):
- Card width: 100%
- Image height: 200px
- Padding: SPACING.lg (16px)
- Font size (title): FONT_SIZES.base (14px)

Tablet (768-960px):
- Card width: 50%
- Image height: 200px
- Padding: SPACING.lg (16px)
- Font size (title): FONT_SIZES.base (14px)

Desktop (>=960px):
- Card width: 50%
- Image height: 250px
- Padding: SPACING.lg (16px)
- Font size (title): FONT_SIZES.lg (16px)
```

### Grid Layout
```typescript
Mobile: 1 property card per row
Tablet: 2 property cards per row
Desktop: 2 property cards per row
Column Gap: SPACING.md (12px)
Row Gap: SPACING.lg (16px)
```

### Metrics Grid per Card
```typescript
Each property card contains a metrics grid:
- Mobile: 2 items per row
- Desktop: 2 items per row
- Item padding: SPACING.md (12px)
```

---

## Accounts Screen Configuration

### Responsive Breakpoints
```typescript
// styles/getAccountsScreenStyles()

Mobile (<960px):
- Card layout: COLUMN (vertical stacking)
- Card padding: SPACING.md (12px)
- Font size (label): FONT_SIZES.xs (10px)
- Font size (amount): FONT_SIZES.base (14px)

Desktop (>=960px):
- Card layout: ROW (horizontal)
- Card padding: SPACING.lg (16px)
- Font size (label): FONT_SIZES.sm (12px)
- Font size (amount): FONT_SIZES.lg (16px)
```

### Card Layout
```typescript
Mobile: 
  [Icon + Type]
  [Institution]
  [Balance]
  [Interest Rate]

Desktop:
  [Icon + Type + Institution] [Balance] [Interest Rate]
```

### FAB (Floating Action Button)
```typescript
Mobile:
- Size: 56x56px
- Position: right 16px, bottom 16px

Desktop:
- Size: 60x60px
- Position: right 24px, bottom 24px
```

---

## Transactions Screen Configuration

### Responsive Breakpoints
```typescript
// styles/getTransactionsScreenStyles()

Mobile (<960px):
- Filter layout: COLUMN (vertical)
- Card padding: SPACING.md (12px)
- Card layout: COLUMN
- Font size (amount): FONT_SIZES.base (14px)

Desktop (>=960px):
- Filter layout: ROW (horizontal)
- Card padding: SPACING.lg (16px)
- Card layout: ROW
- Font size (amount): FONT_SIZES.lg (16px)
```

### Filter Row Layout
```typescript
Mobile: 
  [Picker]
  [DatePicker]
  [TextInput]
  (vertically stacked)

Desktop:
  [Picker] [DatePicker] [TextInput]
  (horizontally aligned)
```

### Card Layout
```typescript
Mobile:
  [Icon + Description]
  [Amount]
  [Property] [Date]

Desktop:
  [Icon + Description] [Amount]
  [Property] [Date]
```

---

## Container & Content Width

```typescript
// File: lib/responsive.ts

Container Padding:
- Mobile (<480px): SPACING.md (12px)
- Mobile Large (480-768px): SPACING.lg (16px)
- Tablet (768-960px): SPACING.xl (20px)
- Desktop (>=960px): SPACING.xxl (24px)

Max Content Width: 1200px
(Content centers on very wide screens, full-width on others)

Sidebar Width: ~300px or 30% of container
(Whichever is smaller on desktop)
```

---

## Elevation/Shadow Configuration

```typescript
// File: lib/responsive.ts

getElevation() levels:

1 (Cards):
  elevation: 2
  shadowOpacity: 0.08
  shadowRadius: 4px
  shadowOffset: 0, 2

2 (Lifted Cards):
  elevation: 4
  shadowOpacity: 0.12
  shadowRadius: 8px
  shadowOffset: 0, 4

3 (Modals):
  elevation: 6
  shadowOpacity: 0.15
  shadowRadius: 12px
  shadowOffset: 0, 6

4 (Tooltips):
  elevation: 12
  shadowOpacity: 0.18
  shadowRadius: 16px
  shadowOffset: 0, 8

5 (FAB):
  elevation: 24
  shadowOpacity: 0.25
  shadowRadius: 24px
  shadowOffset: 0, 12
```

---

## Border Radius Configuration

```typescript
Compact (Mobile):
- Cards: 10px
- Buttons: 8px
- Inputs: 8px
- Containers: 10px

Standard (Desktop):
- Cards: 12-14px
- Buttons: 8px
- Inputs: 8px
- Containers: 12-14px

Large (Desktop Optional):
- Section cards: 16px
- Modals: 16px
```

---

## Platform Specific

```typescript
// File: lib/responsive.ts

isWeb:        Platform.OS === 'web'
isNative:     Platform.OS !== 'web'
isAndroid:    Platform.OS === 'android'
isIOS:        Platform.OS === 'ios'
```

---

## useResponsive Hook Return Value

```typescript
{
  width: number,                    // Window width in pixels
  height: number,                   // Window height in pixels
  deviceType: 'phone'|'tablet'|'desktop',
  screenSize: 'mobile'|'mobileLarge'|'tablet'|'desktop'|...,
  isPortrait: boolean,              // height > width
  isLandscape: boolean,             // width > height
  isMobile: boolean,                // deviceType === 'phone'
  isTablet: boolean,                // deviceType === 'tablet'
  isDesktop: boolean,               // deviceType === 'desktop'
  isNarrow: boolean,                // width < 960px
  isWide: boolean,                  // width >= 960px
  isVeryWide: boolean,              // width >= 1280px
}
```

---

## Grid Configuration

```typescript
// getGridColumns() returns column count:

Default: 1 column mobile, 2 columns desktop, 3 columns large
Compact: 1 column mobile, 1 column desktop, 2 columns large
Wide: 2 columns mobile, 3 columns desktop, 4 columns large

Options:
{
  compact?: number,   // Columns on mobile (default: 1)
  default?: number,   // Columns on tablet (default: 2)
  wide?: number,      // Columns on desktop (default: 3)
}
```

---

## Color Configuration

```typescript
// File: styles/GlobalStyles.ts (existing)

Colors adjust based on light/dark scheme but remain consistent
Mobile and Desktop use the same color palette
Only sizing/spacing/font changes with breakpoints
```

---

## Summary Table

| Property | Mobile | Tablet | Desktop |
|----------|--------|--------|---------|
| Padding | 12-16px | 16-20px | 24px |
| Gap | 8-12px | 12px | 16px |
| Base Font | 12px | 14px | 14px |
| Title Font | 16px | 18px | 20px |
| Card Width | 100% | 50% | 50% |
| Metrics Cols | 1 | 2 | 2-4 |
| Chart Height | 300px | 350px | 400px |
| FAB Size | 56x56 | 56x56 | 60x60 |
| Card Layout | Column | Column | Row/Column |
| Border Radius | 10px | 12px | 14px |

---

## Migration Checklist

When updating a screen, ensure:
- [ ] Import `useResponsive` from lib/responsive
- [ ] Import correct style function from ResponsiveScreenStyles
- [ ] Update grid containers with adaptive widths
- [ ] Update card layouts to use responsive styles
- [ ] Verify fonts scale (sm mobile, lg desktop)
- [ ] Verify spacing increases on desktop
- [ ] Test on mobile, tablet, desktop sizes
- [ ] Test portrait and landscape
- [ ] Check for text overflow
- [ ] Verify touch targets >= 44px on mobile

---

## Quick Commands

```typescript
// Get responsive info
const { isDesktop } = useResponsive();

// Use spacing
padding: SPACING.lg

// Use fonts
fontSize: FONT_SIZES.base

// Check screen type
if (deviceType === 'phone') { /* ... */ }

// Adapt layout
flexDirection: isDesktop ? 'row' : 'column'

// Adapt grid
width: isDesktop ? '50%' : '100%'

// Get spacing
const padding = getContainerPadding(width);
```

---

This configuration provides consistent responsive behavior across the entire app while maintaining a uniform look and feel on all devices.
