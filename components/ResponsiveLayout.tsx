import React, { ReactNode } from 'react';
import { View, ViewStyle } from 'react-native';
import { useResponsive, SPACING, getContainerPadding, ResponsivePatterns, MAX_CONTENT_WIDTH } from '@/lib/responsive';

/**
 * Responsive Container
 * Centers content on wide screens, takes full width on mobile
 */
export function ResponsiveContainer({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const { width } = useResponsive();
  const padding = getContainerPadding(width);
  const shouldCenter = width >= MAX_CONTENT_WIDTH;

  return (
    <View
      style={[
        {
          flex: 1,
          paddingHorizontal: padding,
          alignItems: 'center',
        },
        style,
      ]}
    >
      <View
        style={{
          width: shouldCenter ? MAX_CONTENT_WIDTH : '100%',
          flex: 1,
        }}
      >
        {children}
      </View>
    </View>
  );
}

/**
 * Responsive Grid Layout
 * Adapts column count based on screen size
 */
export function ResponsiveGrid({
  children,
  gap = 12,
  compactCols = 1,
  defaultCols = 2,
  wideCols = 3,
}: {
  children: ReactNode | ReactNode[];
  gap?: number;
  compactCols?: number;
  defaultCols?: number;
  wideCols?: number;
}) {
  const { width } = useResponsive();
  const childArray = React.Children.toArray(children);

  // Determine columns
  let cols = compactCols;
  if (width >= 768 && width < 960) cols = defaultCols;
  if (width >= 960) cols = wideCols;

  const itemWidth = `${100 / cols}%`;

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -gap / 2 }}>
      {childArray.map((child, idx) => (
        <View key={idx} style={{ width: itemWidth, padding: gap / 2 }}>
          {child}
        </View>
      ))}
    </View>
  );
}

/**
 * Responsive Stack (Row/Column)
 * Stacks vertically on mobile, horizontally on desktop
 */
export function ResponsiveStack({
  children,
  gap = 12,
  direction = 'adaptive',
  style,
}: {
  children: ReactNode | ReactNode[];
  gap?: number;
  direction?: 'row' | 'column' | 'adaptive';
  style?: ViewStyle;
}) {
  const { width } = useResponsive();
  const isDesktop = width >= 960;

  const flexDirection =
    direction === 'adaptive' ? (isDesktop ? 'row' : 'column') : direction;

  return (
    <View
      style={[
        {
          flexDirection: flexDirection as any,
          gap,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/**
 * Responsive Sidebar Layout
 * Side-by-side on desktop, stacked on mobile
 */
export function ResponsiveSidebar({
  sidebar,
  content,
  gap = 16,
  sidebarWidth,
}: {
  sidebar: ReactNode;
  content: ReactNode;
  gap?: number;
  sidebarWidth?: number;
}) {
  const { width } = useResponsive();
  const isDesktop = width >= 960;

  if (!isDesktop) {
    return (
      <View style={{ flex: 1, gap }}>
        <View>{sidebar}</View>
        <View style={{ flex: 1 }}>{content}</View>
      </View>
    );
  }

  const finalSidebarWidth = sidebarWidth || 280;
  return (
    <View style={{ flexDirection: 'row', gap, flex: 1 }}>
      <View style={{ width: finalSidebarWidth }}>{sidebar}</View>
      <View style={{ flex: 1 }}>{content}</View>
    </View>
  );
}

/**
 * Responsive Metrics Row
 * Adjusts number of items per row based on screen size
 */
export function ResponsiveMetricsRow({
  children,
  itemsPerRow,
  gap = 12,
  style,
}: {
  children: ReactNode | ReactNode[];
  itemsPerRow?: { mobile?: number; tablet?: number; desktop?: number };
  gap?: number;
  style?: ViewStyle;
}) {
  const { width } = useResponsive();

  const defaults = { mobile: 1, tablet: 2, desktop: 3 };
  const items = { ...defaults, ...itemsPerRow };

  let cols = items.mobile;
  if (width >= 768 && width < 960) cols = items.tablet;
  if (width >= 960) cols = items.desktop;

  const childArray = React.Children.toArray(children);
  const itemWidth = `${100 / cols}%`;

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          flexWrap: 'wrap',
          marginHorizontal: -gap / 2,
        },
        style,
      ]}
    >
      {childArray.map((child, idx) => (
        <View key={idx} style={{ width: itemWidth, padding: gap / 2 }}>
          {child}
        </View>
      ))}
    </View>
  );
}

/**
 * Responsive Spacer
 * Variable spacing based on screen size
 */
export function ResponsiveSpacer({
  size = 'md',
  mobile,
  desktop,
}: {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'xxxl' | 'huge';
  mobile?: number;
  desktop?: number;
}) {
  const { width } = useResponsive();
  const isDesktop = width >= 960;

  const sizeMap = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    huge: 48,
  };

  let height = sizeMap[size];
  if (isDesktop && desktop) height = desktop;
  if (!isDesktop && mobile) height = mobile;

  return <View style={{ height }} />;
}

/**
 * Responsive Text that scales
 */
export function ResponsiveText({
  children,
  size = 'base',
  mobile,
  desktop,
  style,
  ...props
}: {
  children: ReactNode;
  size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
  mobile?: number;
  desktop?: number;
  style?: any;
  [key: string]: any;
}) {
  const { width } = useResponsive();
  const isDesktop = width >= 960;

  const sizeMap = {
    xs: 10,
    sm: 12,
    base: 14,
    lg: 16,
    xl: 18,
    '2xl': 20,
    '3xl': 24,
    '4xl': 28,
    '5xl': 32,
  };

  let fontSize = sizeMap[size];
  if (isDesktop && desktop) fontSize = desktop;
  if (!isDesktop && mobile) fontSize = mobile;

  return (
    <View style={[{ fontSize }, style]} {...props}>
      {children}
    </View>
  );
}
