import { Dimensions, Platform, useWindowDimensions } from 'react-native';

/**
 * Responsive Design System
 * 
 * Breakpoints:
 * - Mobile: < 480px (phones)
 * - Tablet: 480px - 960px (tablets)
 * - Desktop: >= 960px (laptops, desktops)
 * 
 * Usage:
 * - In components: use useResponsive() hook
 * - In styles: use getResponsiveValue() or getResponsiveStyles()
 */

export const BREAKPOINTS = {
  mobile: 0,
  mobileLarge: 480,
  tablet: 768,
  desktop: 960,
  desktopLarge: 1280,
  desktopXL: 1600,
} as const;

export type ScreenSize = 'mobile' | 'mobileLarge' | 'tablet' | 'desktop' | 'desktopLarge' | 'desktopXL';
export type DeviceType = 'phone' | 'tablet' | 'desktop';

/**
 * Determines device type based on width
 */
export function getDeviceType(width: number): DeviceType {
  if (width < BREAKPOINTS.tablet) return 'phone';
  if (width < BREAKPOINTS.desktop) return 'tablet';
  return 'desktop';
}

/**
 * Determines screen size category
 */
export function getScreenSize(width: number): ScreenSize {
  if (width < BREAKPOINTS.mobileLarge) return 'mobile';
  if (width < BREAKPOINTS.tablet) return 'mobileLarge';
  if (width < BREAKPOINTS.desktop) return 'tablet';
  if (width < BREAKPOINTS.desktopLarge) return 'desktop';
  if (width < BREAKPOINTS.desktopXL) return 'desktopLarge';
  return 'desktopXL';
}

/**
 * Hook to get responsive dimensions and device info
 */
export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const deviceType = getDeviceType(width);
  const screenSize = getScreenSize(width);
  const isPortrait = height > width;
  const isLandscape = width > height;

  return {
    width,
    height,
    deviceType,
    screenSize,
    isPortrait,
    isLandscape,
    isMobile: deviceType === 'phone',
    isTablet: deviceType === 'tablet',
    isDesktop: deviceType === 'desktop',
    isNarrow: width < BREAKPOINTS.desktop,
    isWide: width >= BREAKPOINTS.desktop,
    isVeryWide: width >= BREAKPOINTS.desktopLarge,
  };
}

/**
 * Get a responsive value based on screen width
 * Usage: getResponsiveValue(width, { mobile: 10, desktop: 20 })
 */
export function getResponsiveValue<T>(
  width: number,
  values: {
    mobile?: T;
    mobileLarge?: T;
    tablet?: T;
    desktop?: T;
    desktopLarge?: T;
    desktopXL?: T;
  }
): T {
  const screenSize = getScreenSize(width);
  return values[screenSize] ?? Object.values(values)[0] ?? (0 as T);
}

/**
 * Responsive spacing scale (in pixels)
 * Use these consistently across the app
 */
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

/**
 * Get responsive spacing
 * Typically larger on desktop, smaller on mobile
 */
export function getResponsiveSpacing(
  width: number,
  baseSpacing: keyof typeof SPACING,
  options?: { mobile?: keyof typeof SPACING; desktop?: keyof typeof SPACING }
): number {
  const isDesktop = width >= BREAKPOINTS.desktop;
  if (isDesktop && options?.desktop) {
    return SPACING[options.desktop];
  }
  if (!isDesktop && options?.mobile) {
    return SPACING[options.mobile];
  }
  return SPACING[baseSpacing];
}

/**
 * Get responsive font sizes
 */
export const FONT_SIZES = {
  xs: 10,
  sm: 12,
  base: 14,
  lg: 16,
  xl: 18,
  '2xl': 20,
  '3xl': 24,
  '4xl': 28,
  '5xl': 32,
} as const;

/**
 * Get responsive font size
 */
export function getResponsiveFontSize(
  width: number,
  baseSize: keyof typeof FONT_SIZES,
  options?: { mobile?: keyof typeof FONT_SIZES; desktop?: keyof typeof FONT_SIZES }
): number {
  const isDesktop = width >= BREAKPOINTS.desktop;
  if (isDesktop && options?.desktop) {
    return FONT_SIZES[options.desktop];
  }
  if (!isDesktop && options?.mobile) {
    return FONT_SIZES[options.mobile];
  }
  return FONT_SIZES[baseSize];
}

/**
 * Grid column count based on screen width
 * Useful for layouts
 */
export function getGridColumns(width: number, options?: { compact?: number; default?: number; wide?: number }): number {
  const defaults = { compact: 1, default: 2, wide: 3 };
  const opts = { ...defaults, ...options };

  if (width < BREAKPOINTS.tablet) return opts.compact;
  if (width < BREAKPOINTS.desktopLarge) return opts.default;
  return opts.wide;
}

/**
 * Get responsive container padding
 */
export function getContainerPadding(width: number): number {
  if (width < BREAKPOINTS.mobileLarge) return SPACING.md; // 12px
  if (width < BREAKPOINTS.tablet) return SPACING.lg; // 16px
  if (width < BREAKPOINTS.desktop) return SPACING.xl; // 20px
  return SPACING.xxl; // 24px
}

/**
 * Get max content width for centered layouts
 */
export const MAX_CONTENT_WIDTH = 1200;

export function shouldCenterContent(width: number): boolean {
  return width >= MAX_CONTENT_WIDTH;
}

/**
 * Common responsive style patterns
 */
export const ResponsivePatterns = {
  /**
   * Adaptive row: stacks on mobile, rows on desktop
   */
  adaptiveRow: (width: number) => ({
    flexDirection: width < BREAKPOINTS.desktop ? ('column' as const) : ('row' as const),
    justifyContent: width < BREAKPOINTS.desktop ? 'flex-start' : 'space-between',
  }),

  /**
   * Two column grid on desktop, single column on mobile
   */
  twoColumnGrid: (width: number, gap: number = 12) => ({
    flexDirection: width < BREAKPOINTS.desktop ? ('column' as const) : ('row' as const),
    gap,
  }),

  /**
   * Three column grid (desktop), two column (tablet), one column (mobile)
   */
  adaptiveGrid: (width: number, gap: number = 12) => {
    let flex = 1;
    if (width >= BREAKPOINTS.desktopLarge) {
      flex = 1 / 3; // 3 columns
    } else if (width >= BREAKPOINTS.desktop) {
      flex = 1 / 2; // 2 columns
    }
    return {
      flex,
      marginHorizontal: gap / 2,
      marginBottom: gap,
    };
  },

  /**
   * Sidebar layout: side-by-side on desktop, stacked on mobile
   */
  sidebarLayout: (width: number, gap: number = 16) => ({
    flexDirection: width < BREAKPOINTS.desktop ? ('column' as const) : ('row' as const),
    gap,
  }),

  /**
   * Sidebar dimensions
   */
  sidebarDimensions: (width: number) => {
    const sidebarWidth = Math.min(300, width * 0.3);
    const contentFlex = 1;
    return { sidebarWidth, contentFlex };
  },
};

/**
 * Platform-aware utilities
 */
export const isWeb = Platform.OS === 'web';
export const isNative = Platform.OS !== 'web';
export const isAndroid = Platform.OS === 'android';
export const isIOS = Platform.OS === 'ios';

/**
 * Helper to get shadow/elevation based on platform
 */
export function getElevation(
  shadowLevel: 1 | 2 | 3 | 4 | 5 = 1
): {
  shadowColor?: string;
  shadowOffset?: { width: number; height: number };
  shadowOpacity?: number;
  shadowRadius?: number;
  elevation?: number;
} {
  const elevationMap = {
    1: { elevation: 2, shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
    2: { elevation: 4, shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
    3: { elevation: 6, shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
    4: { elevation: 12, shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } },
    5: { elevation: 24, shadowOpacity: 0.25, shadowRadius: 24, shadowOffset: { width: 0, height: 12 } },
  };

  return {
    ...elevationMap[shadowLevel],
    shadowColor: '#000',
  };
}
